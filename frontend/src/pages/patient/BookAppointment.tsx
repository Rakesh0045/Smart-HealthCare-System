import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doctorApi, appointmentApi, paymentApi } from '../../api'
import { PageHeader, LoadingSpinner, DoctorCard } from '../../components/common'
import { Search, Calendar, Clock, ChevronRight, CheckCircle2, CreditCard, X } from 'lucide-react'
import toast from 'react-hot-toast'

const STEPS = ['Select Doctor', 'Choose Date & Slot', 'Confirm & Pay']

declare global { interface Window { Razorpay: any } }

export default function BookAppointment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(0)
  const [doctors, setDoctors] = useState<any[]>([])
  const [specializations, setSpecializations] = useState<string[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [reason, setReason] = useState('')
  const [isFirstVisit, setIsFirstVisit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [filters, setFilters] = useState({ specialization: '', name: '', maxFee: '' })
  const [booked, setBooked] = useState<any>(null)

  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  useEffect(() => {
    const preDoc = searchParams.get('doctorId')
    Promise.all([
      doctorApi.getAll(),
      doctorApi.getSpecializations(),
    ]).then(([d, s]) => {
      const docs = d.data.data || []
      setDoctors(docs)
      setSpecializations(s.data.data || [])
      if (preDoc) {
        const found = docs.find((doc: any) => doc.id === parseInt(preDoc))
        if (found) { setSelectedDoctor(found); setStep(1) }
      }
    })
  }, [])

  const handleSearch = async () => {
    setLoading(true)
    try {
      const { data } = await doctorApi.search({
        specialization: filters.specialization || undefined,
        name: filters.name || undefined,
        maxFee: filters.maxFee || undefined,
      })
      setDoctors(data.data || [])
    } finally { setLoading(false) }
  }

  const handleDateChange = async (date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    if (!selectedDoctor || !date) return
    setSlotsLoading(true)
    try {
      const { data } = await doctorApi.getSlots(selectedDoctor.id, date)
      setSlots(data.data || [])
    } finally { setSlotsLoading(false) }
  }

  const handleBook = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      toast.error('Please select all required fields'); return
    }
    setLoading(true)
    try {
      const { data } = await appointmentApi.book({
        doctorId: selectedDoctor.id,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        reason, isFirstVisit,
      })
      setBooked(data.data)
      setStep(3)
      toast.success('Appointment booked successfully!')
    } finally { setLoading(false) }
  }

  const handlePayment = async () => {
    if (!booked) return
    setLoading(true)
    try {
      const { data } = await paymentApi.createOrder(booked.id)
      const order = data.data

      // Load Razorpay script
      if (!window.Razorpay) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://checkout.razorpay.com/v1/checkout.js'
          s.onload = () => res(); s.onerror = () => rej()
          document.head.appendChild(s)
        })
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Smart Healthcare',
        description: `Appointment with Dr. ${selectedDoctor.name}`,
        order_id: order.orderId,
        handler: async (response: any) => {
          await paymentApi.verify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            appointmentId: booked.id,
          })
          toast.success('Payment successful! 🎉')
          navigate('/patient/appointments')
        },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#2563eb' },
      })
      rzp.open()
    } finally { setLoading(false) }
  }

  // ── Step 0: Select Doctor ─────────────────────────────────────────────────
  const renderStep0 = () => (
    <div className="space-y-4">
      {/* Search filters */}
      <div className="card">
        <h3 className="font-medium text-slate-700 mb-3">Filter Doctors</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Specialization</label>
            <select value={filters.specialization} onChange={e => setFilters({...filters, specialization: e.target.value})}
              className="input">
              <option value="">All Specializations</option>
              {specializations.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Doctor Name</label>
            <input value={filters.name} onChange={e => setFilters({...filters, name: e.target.value})}
              placeholder="Search by name..." className="input" />
          </div>
          <div>
            <label className="label">Max Fee (₹)</label>
            <input type="number" value={filters.maxFee}
              onChange={e => setFilters({...filters, maxFee: e.target.value})}
              placeholder="e.g., 500" className="input" />
          </div>
        </div>
        <button onClick={handleSearch} className="btn-primary mt-3">
          <Search className="w-4 h-4" /> Search
        </button>
      </div>

      {/* Doctor list */}
      {loading ? <LoadingSpinner /> : (
        <div className="grid gap-4">
          {doctors.length === 0 ? (
            <div className="card text-center py-10 text-slate-400">No doctors found</div>
          ) : doctors.map(doc => (
            <DoctorCard key={doc.id} doctor={doc} action={
              <button onClick={() => { setSelectedDoctor(doc); setStep(1) }}
                className="btn-primary text-sm">
                Select Doctor <ChevronRight className="w-4 h-4" />
              </button>
            } />
          ))}
        </div>
      )}
    </div>
  )

  // ── Step 1: Date & Slot ───────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-4">
      {selectedDoctor && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Dr. {selectedDoctor.name}</p>
              <p className="text-sm text-blue-600">{selectedDoctor.specialization} • ₹{selectedDoctor.consultationFee}</p>
            </div>
            <button onClick={() => { setSelectedDoctor(null); setStep(0) }}
              className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      <div className="card">
        <label className="label">Select Date *</label>
        <input type="date" value={selectedDate} min={today} max={maxDate}
          onChange={e => handleDateChange(e.target.value)} className="input max-w-xs" />
      </div>

      {selectedDate && (
        <div className="card">
          <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Available Slots
          </h3>
          {slotsLoading ? <LoadingSpinner size="sm" /> : slots.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">
              No available slots on this date. Try another date.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {slots.map((slot, i) => (
                <button key={i} onClick={() => setSelectedSlot(slot)}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                    selectedSlot?.startTime === slot.startTime
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}>
                  {slot.startTime?.slice(0,5)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedSlot && (
        <button onClick={() => setStep(2)} className="btn-primary">
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )

  // ── Step 2: Confirm ───────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-4 max-w-xl">
      <div className="card">
        <h3 className="font-semibold text-slate-900 mb-4">Appointment Summary</h3>
        <div className="space-y-3 text-sm">
          {[
            ['Doctor', `Dr. ${selectedDoctor?.name}`],
            ['Specialization', selectedDoctor?.specialization],
            ['Hospital', selectedDoctor?.hospital || '—'],
            ['Date', new Date(selectedDate).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })],
            ['Time', `${selectedSlot?.startTime?.slice(0,5)} – ${selectedSlot?.endTime?.slice(0,5)}`],
            ['Fee', `₹${selectedDoctor?.consultationFee}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-slate-500">{k}</span>
              <span className="font-medium text-slate-900 text-right">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="label">Reason for visit</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Briefly describe your symptoms or reason for visit..."
            rows={3} className="input resize-none" />
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="firstVisit" checked={isFirstVisit}
            onChange={e => setIsFirstVisit(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="firstVisit" className="text-sm text-slate-600">
            This is my first visit to this doctor
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
        <button onClick={handleBook} disabled={loading} className="btn-primary flex-1">
          {loading ? 'Booking...' : 'Confirm Appointment'}
        </button>
      </div>
    </div>
  )

  // ── Step 3: Success ───────────────────────────────────────────────────────
  const renderSuccess = () => (
    <div className="max-w-md mx-auto text-center space-y-6">
      <div className="card py-10">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Appointment Booked!</h2>
        <p className="text-slate-500 text-sm mb-6">
          Your appointment with Dr. {selectedDoctor?.name} has been confirmed. Check your email for details.
        </p>
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-left space-y-2 mb-6">
          <p><span className="text-slate-500">Date:</span> <span className="font-medium">{selectedDate}</span></p>
          <p><span className="text-slate-500">Time:</span> <span className="font-medium">{selectedSlot?.displayTime}</span></p>
          <p><span className="text-slate-500">Appointment ID:</span> <span className="font-medium">#{booked?.id}</span></p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePayment} disabled={loading} className="btn-primary flex-1">
            <CreditCard className="w-4 h-4" />
            {loading ? 'Processing...' : 'Pay Now ₹' + selectedDoctor?.consultationFee}
          </button>
        </div>
        <button onClick={() => navigate('/patient/appointments')}
          className="text-sm text-slate-500 hover:text-slate-700 mt-3 block w-full">
          Pay Later → View Appointments
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Book Appointment" subtitle="Find and schedule with the right doctor" />

      {/* Stepper */}
      {step < 3 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                i === step ? 'bg-blue-600 text-white' :
                i < step ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
              }`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-5 h-5 flex items-center justify-center">{i+1}</span>}
                {label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderSuccess()}
    </div>
  )
}
