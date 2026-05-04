import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doctorApi, appointmentApi, paymentApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import { Search, Calendar, Clock, ChevronRight, CheckCircle2, CreditCard, X, Star, MapPin, Award, DollarSign, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const STEPS = ['Select Doctor', 'Choose Date & Slot', 'Confirm & Pay']

declare global { interface Window { Razorpay: any } }

export default function BookAppointment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rescheduleAppointmentId = searchParams.get('reschedule') ? Number(searchParams.get('reschedule')) : null
  const payAppointmentId = searchParams.get('payAppointment') ? Number(searchParams.get('payAppointment')) : null
  const isPayAppointmentMode = Number.isFinite(payAppointmentId)
  const isRescheduleMode = Number.isFinite(rescheduleAppointmentId) && !isPayAppointmentMode
  const preDoctorId = searchParams.get('doctorId')
  const preDoctorName = searchParams.get('doctorName')
  const preDoctorSpecialization = searchParams.get('specialization')
  const preDate = searchParams.get('date')
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
  const [rescheduleSource, setRescheduleSource] = useState<any>(null)
  const [bookingNotice, setBookingNotice] = useState<string | null>(null)
  const autoPayTriggered = useRef(false)

  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const loadSlotsForDoctor = async (doctorId: number, date: string) => {
    if (!date) return
    setSlotsLoading(true)
    try {
      const { data } = await doctorApi.getSlots(doctorId, date)
      setSlots(data.data || [])
    } finally {
      setSlotsLoading(false)
    }
  }

  const formatDisplayTime = (start?: string, end?: string) => {
    const format = (time?: string) => {
      if (!time) return '--:--'
      const [h, m] = time.split(':')
      const hour = parseInt(h, 10)
      if (Number.isNaN(hour)) return time
      return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
    }
    return `${format(start)} - ${format(end)}`
  }

  const normalizeDoctorLabel = (value?: string) => (value || '').replace(/^dr\.?\s*/i, '').trim().toLowerCase()
  const isPastDate = (date: string) => new Date(date).setHours(0, 0, 0, 0) < new Date(today).setHours(0, 0, 0, 0)

  const findEarliestAvailableSlot = async (doctorId: number) => {
    const maxDays = Math.ceil((new Date(maxDate).getTime() - new Date(today).getTime()) / 86400000)
    for (let offset = 0; offset <= maxDays; offset += 1) {
      const candidateDate = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0]
      const { data } = await doctorApi.getSlots(doctorId, candidateDate)
      const availableSlots = data.data || []
      if (availableSlots.length > 0) {
        return { date: candidateDate, slot: availableSlots[0], slots: availableSlots }
      }
    }
    return null
  }

  const prefillFollowUpBooking = async (doctor: any, requestedDate?: string) => {
    if (!requestedDate) {
      setStep(1)
      return
    }

    if (!isPastDate(requestedDate)) {
      setSelectedDate(requestedDate)
      await loadSlotsForDoctor(doctor.id, requestedDate)
      setStep(1)
      return
    }

    setBookingNotice('The follow-up date has already passed. Showing the earliest available slot instead.')
    const earliest = await findEarliestAvailableSlot(doctor.id)
    if (earliest) {
      setSelectedDate(earliest.date)
      setSlots(earliest.slots)
      setSelectedSlot(earliest.slot)
      setStep(2)
      return
    }

    setSelectedDate(today)
    setStep(1)
  }

  useEffect(() => {
    const appointmentLookupId = isPayAppointmentMode ? payAppointmentId : (isRescheduleMode ? rescheduleAppointmentId : null)
    const appointmentRequest = appointmentLookupId ? appointmentApi.getById(appointmentLookupId) : Promise.resolve(null)

    Promise.all([doctorApi.getAll(), doctorApi.getSpecializations(), appointmentRequest]).then(([d, s, appointmentRes]) => {
      const docs = d.data.data || []
      setDoctors(docs)
      // Normalize specializations to an array of strings (handles strings or objects)
      const specsRaw = s?.data?.data || []
      // helpful debug when API returns unexpected shape
      console.debug('getSpecializations response:', s?.data)
      const specs = specsRaw.map((sp: any) =>
        typeof sp === 'string' ? sp : (sp.name || sp.specialization || sp.value || JSON.stringify(sp))
      )
      setSpecializations(specs)
      const sourceAppointment = appointmentRes?.data?.data || null
      if (sourceAppointment) {
        setReason(sourceAppointment.reason || '')
        setIsFirstVisit(sourceAppointment.isFirstVisit ?? true)
        if (isRescheduleMode) {
          setRescheduleSource(sourceAppointment)
        }
      }

      const resolvedDoctor = (() => {
        if (preDoctorId) {
          return docs.find((doc: any) => doc.id === parseInt(preDoctorId))
        }
        if (sourceAppointment?.doctorId) {
          return docs.find((doc: any) => doc.id === sourceAppointment.doctorId)
        }
        if (preDoctorName) {
          const targetName = normalizeDoctorLabel(preDoctorName)
          const targetSpecialization = preDoctorSpecialization?.trim().toLowerCase()
          const nameMatches = docs.filter((doc: any) => {
            const docName = normalizeDoctorLabel(doc.name)
            const docSpecialization = (doc.specialization || '').trim().toLowerCase()
            const nameMatchesTarget = docName === targetName || docName.includes(targetName) || targetName.includes(docName)
            const specializationMatches = !targetSpecialization || docSpecialization === targetSpecialization
            return nameMatchesTarget && specializationMatches
          })
          return nameMatches[0] || docs.find((doc: any) => normalizeDoctorLabel(doc.name) === targetName)
        }
        return null
      })()

      if (isPayAppointmentMode && sourceAppointment) {
        const paymentDoctor = resolvedDoctor || {
          id: sourceAppointment.doctorId,
          name: sourceAppointment.doctorName,
          specialization: sourceAppointment.doctorSpecialization,
          consultationFee: sourceAppointment.consultationFee,
        }
        setSelectedDoctor(paymentDoctor)
        setSelectedDate(sourceAppointment.appointmentDate || '')
        setSelectedSlot({
          startTime: sourceAppointment.startTime,
          endTime: sourceAppointment.endTime,
          displayTime: formatDisplayTime(sourceAppointment.startTime, sourceAppointment.endTime),
        })
        setBooked(sourceAppointment)
        setStep(3)
        return
      }

      if (resolvedDoctor) {
        setSelectedDoctor(resolvedDoctor)
        void prefillFollowUpBooking(resolvedDoctor, preDate ?? undefined)
      } else if (preDate) {
        setSelectedDate(preDate)
      }
    })
  }, [])

  useEffect(() => {
    if (!isPayAppointmentMode) return
    if (!booked || step !== 3 || autoPayTriggered.current) return

    autoPayTriggered.current = true
    void handlePayment()
  }, [booked, step, isPayAppointmentMode])

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
    await loadSlotsForDoctor(selectedDoctor.id, date)
  }

  const handleBook = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      toast.error('Please select all required fields'); return
    }
    setLoading(true)
    try {
      const payload = {
        doctorId: selectedDoctor.id,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        reason, isFirstVisit,
      }

      const { data } = isRescheduleMode && rescheduleAppointmentId
        ? await appointmentApi.reschedule(rescheduleAppointmentId, payload)
        : await appointmentApi.book(payload)

      setBooked(data.data)
      setStep(3)
      toast.success(isRescheduleMode ? 'Appointment rescheduled successfully!' : 'Appointment booked successfully!')
    } catch (err: any) {
      const status = err.response?.status
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to book appointment'
      
      if (status === 409 && isRescheduleMode) {
        toast.error('You can only reschedule an appointment once. Please contact support for further changes.', { duration: 6000 })
      } else if (status === 409) {
        toast.error(message)
      } else {
        toast.error(message)
      }
    } finally { setLoading(false) }
  }

  const handlePayment = async () => {
    if (!booked) return
    if (booked.paymentStatus === 'PAID' || (isRescheduleMode && rescheduleSource?.paymentStatus === 'PAID')) {
      toast.success('This appointment is already paid.')
      navigate('/patient/appointments')
      return
    }
    setLoading(true)
    try {
      const { data } = await paymentApi.createOrder(booked.id)
      const order = data.data
      if (order?.status === 'ALREADY_PAID') {
        toast.success('This appointment is already paid.')
        navigate('/patient/appointments')
        return
      }
      if (!window.Razorpay) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://checkout.razorpay.com/v1/checkout.js'
          s.onload = () => res(); s.onerror = () => rej()
          document.head.appendChild(s)
        })
      }
      const rzp = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency,
        name: 'Smart Healthcare', description: `Appointment with Dr. ${selectedDoctor.name}`,
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

  const handlePayAtAppointment = async () => {
    if (!booked) return
    setLoading(true)
    try {
      await paymentApi.payAtAppointment(booked.id)
      toast.success('Pay at appointment time selected')
      navigate('/patient/appointments')
    } finally { setLoading(false) }
  }

  // ── Step 0: Select Doctor ─────────────────────────────────────────────────
  const renderStep0 = () => (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        .book-page { font-family: 'Sora', sans-serif; }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(14px); } to { opacity:1;transform:translateY(0); } }

        .doc-card {
          background: white; border-radius: 16px;
          border: 1.5px solid #e6f7f5;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: all 0.2s; cursor: pointer;
          animation: fadeSlide 0.4s ease both;
        }
        .doc-card:hover {
          border-color: #054694;
          box-shadow: 0 6px 24px rgba(13,148,136,0.12);
          transform: translateY(-2px);
        }
        .doc-card-selected {
          border-color: #054694 !important;
          box-shadow: 0 6px 24px rgba(13,148,136,0.2) !important;
          background: #f0fdfa !important;
        }

        .filter-input {
          width: 100%; padding: 10px 14px; border-radius: 10px;
          border: 1.5px solid #e6f7f5; background: #fafffe;
          color: #0f172a; font-size: 13px; font-family: 'Sora', sans-serif;
          outline: none; transition: all 0.2s; box-sizing: border-box;
        }
        .filter-input:focus { border-color: #054694; background: white; box-shadow: 0 0 0 3px rgba(13,148,136,0.08); }
        .filter-input::placeholder { color: #94a3b8; }

        .search-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 10px;
          background: linear-gradient(135deg, #054694, #0891b2);
          color: white; border: none; font-size: 13px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s;
          white-space: nowrap;
        }
        .search-btn:hover { opacity: 0.9; }

        .spec-chip {
          padding: 6px 14px; border-radius: 20px;
          font-size: 12px; font-weight: 600; cursor: pointer;
          border: 1.5px solid #e6f7f5; background: white;
          color: #64748b; font-family: 'Sora', sans-serif;
          transition: all 0.18s; white-space: nowrap;
        }
        .spec-chip:hover { border-color: #054694; color: #054694; }
        .spec-chip-active { background: #054694 !important; color: white !important; border-color: #054694 !important; }

        .select-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 10px;
          background: linear-gradient(135deg, #054694, #0891b2);
          color: white; border: none; font-size: 12px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s;
        }
        .select-btn:hover { opacity: 0.9; transform: scale(1.03); }
      `}</style>

      <div className="book-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Filter Bar — full width */}
        <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e6f7f5', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', animation: 'fadeSlide 0.4s ease both' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#054694', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 14px' }}>Search & Filter</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Specialization</label>
              <select value={filters.specialization} onChange={e => setFilters({ ...filters, specialization: e.target.value })} className="filter-input">
                <option value="">All Specializations</option>
                {specializations.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Doctor Name</label>
              <input value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name..." className="filter-input" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Max Fee (₹)</label>
              <input type="number" value={filters.maxFee} onChange={e => setFilters({ ...filters, maxFee: e.target.value })}
                placeholder="e.g. 500" className="filter-input" />
            </div>
            <button className="search-btn" onClick={handleSearch}>
              <Search style={{ width: 15, height: 15 }} /> Search
            </button>
          </div>

          {/* Specialization chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {['All', ...specializations.slice(0, 10)].map(s => (
              <button key={s}
                className={`spec-chip ${(s === 'All' && !filters.specialization) || filters.specialization === s ? 'spec-chip-active' : ''}`}
                onClick={async () => {
                  const spec = s === 'All' ? '' : s
                  setFilters(f => ({ ...f, specialization: spec }))
                  setLoading(true)
                  const { data } = await doctorApi.search({ specialization: spec || undefined })
                  setDoctors(data.data || [])
                  setLoading(false)
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Doctor Grid — full width */}
        {loading ? <LoadingSpinner /> : (
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 12px', fontFamily: 'Sora, sans-serif' }}>
              {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} available
            </p>
            {doctors.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e6f7f5', padding: '48px', textAlign: 'center' }}>
                <p style={{ color: '#94a3b8', fontSize: 14, fontFamily: 'Sora, sans-serif' }}>No doctors found matching your criteria</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {doctors.map((doc, idx) => (
                  <div key={doc.id} className="doc-card" style={{ padding: '20px', animationDelay: `${idx * 0.04}s` }}>
                    {/* Top row: avatar + name + specialization */}
                    <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                      <div style={{ width: 54, height: 54, borderRadius: 14, background: 'linear-gradient(135deg, #054694, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 20, flexShrink: 0, fontFamily: 'Sora, sans-serif' }}>
                        {doc.name?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px', fontFamily: 'Sora, sans-serif' }}>Dr. {doc.name}</p>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#054694', margin: 0, fontFamily: 'Sora, sans-serif' }}>{doc.specialization}</p>
                          </div>
                          {doc.rating > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '3px 8px', flexShrink: 0 }}>
                              <Star style={{ width: 11, height: 11, color: '#f59e0b', fill: '#f59e0b' }} />
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', fontFamily: 'Sora, sans-serif' }}>{doc.rating?.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info pills */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                      {[
                        { icon: MapPin, label: doc.hospital || 'N/A', color: '#64748b' },
                        { icon: Award, label: `${doc.experience || 0} yrs exp`, color: '#7c3aed' },
                        { icon: DollarSign, label: `₹${doc.consultationFee}`, color: '#10b981' },
                        { icon: Clock, label: `${doc.slotDuration || 30} min`, color: '#0891b2' },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 8, background: '#fafffe', border: '1px solid #f0fdf4' }}>
                          <item.icon style={{ width: 12, height: 12, color: item.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Sora, sans-serif' }}>{item.label}</span>
                        </div>
                      ))}
                    </div>

                    {doc.bio && (
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: 'Sora, sans-serif' }}>{doc.bio}</p>
                    )}

                    <button className="select-btn" style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => {
                        setSelectedDoctor(doc)
                        void prefillFollowUpBooking(doc, selectedDate || preDate || '')
                      }}>
                      Select Doctor <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )

  // ── Step 1: Date & Slot ───────────────────────────────────────────────────
  const renderStep1 = () => (
    <>
      <style>{`
        .book-page { font-family: 'Sora', sans-serif; }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(14px); } to { opacity:1;transform:translateY(0); } }
        .date-input {
          padding: 10px 14px; border-radius: 10px;
          border: 1.5px solid #e6f7f5; background: #fafffe;
          color: #0f172a; font-size: 13px; font-family: 'Sora', sans-serif;
          outline: none; transition: all 0.2s;
        }
        .date-input:focus { border-color: #054694; background: white; box-shadow: 0 0 0 3px rgba(13,148,136,0.08); }
        .slot-btn {
          padding: 10px 8px; border-radius: 10px; border: 1.5px solid #e6f7f5;
          background: white; color: #0f172a; font-size: 12px; font-weight: 600;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.18s; text-align: center;
        }
        .slot-btn:hover { border-color: #054694; background: #f0fdfa; color: #054694; }
        .slot-btn-active { background: linear-gradient(135deg, #054694, #0891b2) !important; color: white !important; border-color: #054694 !important; box-shadow: 0 4px 12px rgba(13,148,136,0.3) !important; }
        .continue-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 12px 28px; border-radius: 12px;
          background: linear-gradient(135deg, #054694, #0891b2);
          color: white; border: none; font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s;
        }
        .continue-btn:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,148,136,0.25); }
      `}</style>

      <div className="book-page" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left: Selected Doctor Card */}
        <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #ccfbf1', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', animation: 'fadeSlide 0.4s ease both' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#054694', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 14px', fontFamily: 'Sora, sans-serif' }}>Selected Doctor</p>
          {selectedDoctor && (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #054694, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18, flexShrink: 0, fontFamily: 'Sora, sans-serif' }}>
                  {selectedDoctor.name?.charAt(0)}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: 'Sora, sans-serif' }}>Dr. {selectedDoctor.name}</p>
                  <p style={{ fontSize: 12, color: '#054694', fontWeight: 600, margin: 0, fontFamily: 'Sora, sans-serif' }}>{selectedDoctor.specialization}</p>
                </div>
              </div>
              {[
                ['Hospital', selectedDoctor.hospital || '—'],
                ['Experience', `${selectedDoctor.experience} years`],
                ['Fee', `₹${selectedDoctor.consultationFee}`],
                ['Slot Duration', `${selectedDoctor.slotDuration || 30} min`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0fdf4' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'Sora, sans-serif' }}>{k}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>{v}</span>
                </div>
              ))}
              {!isRescheduleMode && (
                <button onClick={() => { setSelectedDoctor(null); setStep(0) }}
                  style={{ marginTop: 14, width: '100%', padding: '8px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <X style={{ width: 13, height: 13 }} /> Change Doctor
                </button>
              )}
            </>
          )}
        </div>

        {/* Right: Date + Slots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Date picker */}
          <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e6f7f5', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', animation: 'fadeSlide 0.4s ease both' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#054694', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 14px', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar style={{ width: 14, height: 14 }} /> Select Date
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <input type="date" value={selectedDate} min={today} max={maxDate}
                onChange={e => handleDateChange(e.target.value)} className="date-input" />
              {selectedDate && (
                <div style={{ padding: '10px 16px', borderRadius: 10, background: '#f0fdfa', border: '1px solid #ccfbf1' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#054694', margin: 0, fontFamily: 'Sora, sans-serif' }}>
                    {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Slots */}
          {selectedDate && (
            <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e6f7f5', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', animation: 'fadeSlide 0.4s ease both' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#054694', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 14px', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock style={{ width: 14, height: 14 }} /> Available Time Slots
              </p>
              {slotsLoading ? <LoadingSpinner size="sm" /> : slots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', border: '2px dashed #e6f7f5', borderRadius: 12 }}>
                  <p style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'Sora, sans-serif' }}>No available slots on this date. Try another date.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                  {slots.map((slot, i) => (
                    <button key={i}
                      className={`slot-btn ${selectedSlot?.startTime === slot.startTime ? 'slot-btn-active' : ''}`}
                      onClick={() => setSelectedSlot(slot)}>
                      {slot.startTime?.slice(0, 5)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedSlot && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="continue-btn" onClick={() => setStep(2)}>
                Continue to Confirm <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )

  // ── Step 2: Confirm ───────────────────────────────────────────────────────
  const renderStep2 = () => (
    <>
      <style>{`
        .book-page { font-family: 'Sora', sans-serif; }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(14px); } to { opacity:1;transform:translateY(0); } }
        .confirm-input {
          width: 100%; padding: 12px 14px; border-radius: 10px;
          border: 1.5px solid #e6f7f5; background: #fafffe;
          color: #0f172a; font-size: 13px; font-family: 'Sora', sans-serif;
          outline: none; transition: all 0.2s; box-sizing: border-box;
        }
        .confirm-input:focus { border-color: #054694; background: white; box-shadow: 0 0 0 3px rgba(13,148,136,0.08); }
        .confirm-input::placeholder { color: #94a3b8; }
        .confirm-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 12px 28px; border-radius: 12px;
          background: linear-gradient(135deg, #054694, #0891b2);
          color: white; border: none; font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s; flex: 1; justify-content: center;
        }
        .confirm-btn:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,148,136,0.25); }
        .confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .back-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 12px 24px; border-radius: 12px;
          background: white; border: 1.5px solid #e6f7f5;
          color: #64748b; font-size: 14px; font-weight: 600;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.18s;
        }
        .back-btn:hover { border-color: #054694; color: #054694; }
      `}</style>

      <div className="book-page" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left: Summary */}
        <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e6f7f5', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', animation: 'fadeSlide 0.4s ease both' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#054694', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 20px', fontFamily: 'Sora, sans-serif' }}>Appointment Summary</p>

          {/* Doctor info */}
          <div style={{ display: 'flex', gap: 14, padding: '16px', borderRadius: 12, background: '#f0fdfa', border: '1px solid #054694', marginBottom: 18 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #054694, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18, flexShrink: 0, fontFamily: 'Sora, sans-serif' }}>
              {selectedDoctor?.name?.charAt(0)}
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 2px', fontFamily: 'Sora, sans-serif' }}>Dr. {selectedDoctor?.name}</p>
              <p style={{ fontSize: 12, color: '#054694', fontWeight: 600, margin: 0, fontFamily: 'Sora, sans-serif' }}>{selectedDoctor?.specialization}</p>
              {selectedDoctor?.hospital && <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0', fontFamily: 'Sora, sans-serif' }}>{selectedDoctor.hospital}</p>}
            </div>
          </div>

          {/* Details */}
          {[
            ['Date', new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
            ['Time', `${selectedSlot?.startTime?.slice(0, 5)} – ${selectedSlot?.endTime?.slice(0, 5)}`],
            ['Duration', `${selectedDoctor?.slotDuration || 30} minutes`],
            ['Consultation Fee', `₹${selectedDoctor?.consultationFee}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0fdf4' }}>
              <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Sora, sans-serif' }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif', textAlign: 'right', maxWidth: '55%' }}>{v}</span>
            </div>
          ))}

          {/* Total */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #054694, #0891b2)', marginTop: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: 'Sora, sans-serif' }}>Total Amount</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'white', fontFamily: 'Sora, sans-serif' }}>₹{selectedDoctor?.consultationFee}</span>
          </div>
        </div>

        {/* Right: Additional Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e6f7f5', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', animation: 'fadeSlide 0.4s 0.1s ease both' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#054694', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 16px', fontFamily: 'Sora, sans-serif' }}>Visit Details</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8, fontFamily: 'Sora, sans-serif' }}>Reason for visit</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for visit..."
                rows={4} className="confirm-input" style={{ resize: 'none' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: '#f0fdfa', border: '1px solid #054694', cursor: 'pointer' }}
              onClick={() => setIsFirstVisit(!isFirstVisit)}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isFirstVisit ? '#054694' : '#e2e8f0'}`, background: isFirstVisit ? '#054694' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                {isFirstVisit && <CheckCircle2 style={{ width: 12, height: 12, color: 'white' }} />}
              </div>
              <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, fontFamily: 'Sora, sans-serif' }}>This is my first visit to this doctor</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
            <button className="confirm-btn" onClick={handleBook} disabled={loading}>
              {loading ? (isRescheduleMode ? 'Rescheduling...' : 'Booking...') : (isRescheduleMode ? 'Confirm Reschedule' : 'Confirm Appointment')}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  // ── Step 3: Success ───────────────────────────────────────────────────────
  const renderSuccess = () => (
    <>
      <style>{`
        .book-page { font-family: 'Sora', sans-serif; }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(14px); } to { opacity:1;transform:translateY(0); } }
        @keyframes popIn { from { opacity:0;transform:scale(0.85); } to { opacity:1;transform:scale(1); } }
        .pay-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 12px;
          background: linear-gradient(135deg, #054694, #0891b2);
          color: white; border: none; font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s; flex: 1; justify-content: center;
        }
        .pay-btn:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,148,136,0.3); }
        .pay-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      `}</style>

      <div className="book-page" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* Success card */}
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #054694', padding: '40px 32px', textAlign: 'center', boxShadow: '0 4px 24px rgba(13,148,136,0.12)', animation: 'popIn 0.5s ease both' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #054694, #054694)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(13,148,136,0.3)' }}>
            <CheckCircle2 style={{ width: 40, height: 40, color: 'white' }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 8px', fontFamily: 'Sora, sans-serif' }}>{isRescheduleMode ? 'Appointment Rescheduled!' : 'Appointment Slot Reserved!'}</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', fontFamily: 'Sora, sans-serif' }}>
            {isRescheduleMode
              ? `Your appointment with Dr. ${selectedDoctor?.name} has been updated.`
              : `Your appointment with Dr. ${selectedDoctor?.name} is reserved. Choose a payment option to receive the confirmation email.`}
          </p>

          <div style={{ background: '#f0fdfa', borderRadius: 12, padding: '16px', marginBottom: 24, textAlign: 'left' }}>
            {[
              ['Appointment ID', `#${booked?.id}`],
              ['Date', selectedDate],
              ['Time', selectedSlot?.displayTime],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #054694' }}>
                <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'Sora, sans-serif' }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#054694', fontFamily: 'Sora, sans-serif' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
            {!(isRescheduleMode && rescheduleSource?.paymentStatus === 'PAID') && (
              <button className="pay-btn" onClick={handlePayment} disabled={loading}>
                <CreditCard style={{ width: 16, height: 16 }} />
                {loading ? 'Processing...' : `Pay Now  ₹${selectedDoctor?.consultationFee}`}
              </button>
            )}
            {isRescheduleMode && rescheduleSource?.paymentStatus === 'PAID' ? (
              <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                This appointment was already paid. No additional payment is needed.
              </div>
            ) : (
              <button onClick={handlePayAtAppointment} disabled={loading}
                style={{ padding: '12px', borderRadius: 12, border: '1.5px solid #e6f7f5', background: 'white', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                {loading ? 'Saving choice...' : 'Pay at appointment time'}
              </button>
            )}
          </div>
        </div>

        {/* Tips / What's next */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeSlide 0.5s 0.2s ease both' }}>
          <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e6f7f5', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', fontFamily: 'Sora, sans-serif' }}>What Happens Next?</p>
            {[
              { step: '01', title: 'Check Your Email', desc: 'Confirmation details sent to your registered email address.' },
              { step: '02', title: isRescheduleMode && rescheduleSource?.paymentStatus === 'PAID' ? 'No Payment Needed' : 'Pay Now or Later', desc: isRescheduleMode && rescheduleSource?.paymentStatus === 'PAID' ? 'This visit was already paid, so nothing more is required.' : 'You can pay now or at the appointment time at the clinic.' },
              { step: '03', title: 'Prepare for Visit', desc: 'Arrive 10 minutes early with any relevant medical records.' },
              { step: '04', title: 'After Appointment', desc: 'Rate your experience and download your digital prescription.' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #054694, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'white', fontFamily: 'Sora, sans-serif' }}>{item.step}</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 3px', fontFamily: 'Sora, sans-serif' }}>{item.title}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontFamily: 'Sora, sans-serif' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { font-family: 'Sora', sans-serif; }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(14px); } to { opacity:1;transform:translateY(0); } }
        .book-page { font-family: 'Sora', sans-serif; }
        .book-page .search-btn,
        .book-page .select-btn,
        .book-page .continue-btn,
        .book-page .confirm-btn,
        .book-page .pay-btn {
          background: linear-gradient(135deg, #0d9488, #0891b2);
          color: white;
          border: none;
          box-shadow: 0 6px 18px rgba(13,148,136,0.18);
        }
        .book-page .search-btn:hover,
        .book-page .select-btn:hover,
        .book-page .continue-btn:hover,
        .book-page .confirm-btn:hover,
        .book-page .pay-btn:hover {
          opacity: 0.95;
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(13,148,136,0.24);
        }
        .book-page .spec-chip {
          padding: 6px 14px; border-radius: 20px;
          font-size: 12px; font-weight: 600; cursor: pointer;
          border: 1.5px solid #e6f7f5; background: white;
          color: #64748b; font-family: 'Sora', sans-serif;
          transition: all 0.18s; white-space: nowrap;
        }
        .book-page .spec-chip:hover { border-color: #0d9488; color: #0d9488; }
        .book-page .spec-chip-active { background: #0d9488 !important; color: white !important; border-color: #0d9488 !important; }
        .book-page .doc-card {
          background: white; border-radius: 16px;
          border: 1.5px solid #e6f7f5;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: all 0.2s; cursor: pointer;
          animation: fadeSlide 0.4s ease both;
        }
        .book-page .doc-card:hover {
          border-color: #0d9488;
          box-shadow: 0 6px 24px rgba(13,148,136,0.12);
          transform: translateY(-2px);
        }
        .book-page .date-input,
        .book-page .confirm-input {
          width: 100%; padding: 10px 14px; border-radius: 10px;
          border: 1.5px solid #e6f7f5; background: #fafffe;
          color: #0f172a; font-size: 13px; font-family: 'Sora', sans-serif;
          outline: none; transition: all 0.2s; box-sizing: border-box;
        }
        .book-page .date-input:focus,
        .book-page .confirm-input:focus {
          border-color: #0d9488; background: white; box-shadow: 0 0 0 3px rgba(13,148,136,0.08);
        }
        .book-page .date-input::placeholder,
        .book-page .confirm-input::placeholder { color: #94a3b8; }
        .book-page .slot-btn {
          padding: 10px 8px; border-radius: 10px; border: 1.5px solid #e6f7f5;
          background: white; color: #0f172a; font-size: 12px; font-weight: 600;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.18s; text-align: center;
        }
        .book-page .slot-btn:hover { border-color: #0d9488; background: #f0fdfa; color: #0d9488; }
        .book-page .slot-btn-active { background: linear-gradient(135deg, #0d9488, #0891b2) !important; color: white !important; border-color: #0d9488 !important; box-shadow: 0 4px 12px rgba(13,148,136,0.3) !important; }
        .step-pill {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 20px;
          font-size: 12px; font-weight: 700; font-family: 'Sora', sans-serif;
          transition: all 0.2s;
        }
            `}</style>

      <div style={{ maxWidth: '100%', fontFamily: 'Sora, sans-serif' }}>

        {bookingNotice && (
          <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
            {bookingNotice}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 24, animation: 'fadeSlide 0.4s ease both' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#054694', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Patient Portal</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Book Appointment</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Find and schedule with the right specialist</p>
        </div>

        {/* Stepper */}
        {step < 3 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, animation: 'fadeSlide 0.4s 0.05s ease both', flexWrap: 'wrap' }}>
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="step-pill" style={{
                  background: i === step ? 'linear-gradient(135deg, #1045b9, #0f6ad8)' : i < step ? '#f0fdf4' : '#f8fafc',
                  color: i === step ? 'white' : i < step ? '#054694' : '#94a3b8',
                  border: i < step ? '1.5px solid #7577f1' : i === step ? 'none' : '1.5px solid #f0fdf4',
                  boxShadow: i === step ? '0 4px 12px rgba(13,148,136,0.25)' : 'none',
                }}>
                  {i < step ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : <span style={{ width: 20, height: 20, borderRadius: '50%', background: i === step ? 'rgba(255,255,255,0.3)' : '#e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{i + 1}</span>}
                  {label}
                </div>
                {i < STEPS.length - 1 && <ChevronRight style={{ width: 14, height: 14, color: '#cbd5e1', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        )}

        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderSuccess()}
      </div>
    </>
  )
}
