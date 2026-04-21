import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentApi, patientApi } from '../../api'
import { PageHeader, AppointmentCard, EmptyState, LoadingSpinner } from '../../components/common'
import { Calendar, Plus, Star, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PatientAppointments() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [rateModal, setRateModal] = useState<{id: number, doctorName: string} | null>(null)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')

  const load = () => appointmentApi.getMy().then(r => setAppointments(r.data.data || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const filtered = filter === 'ALL' ? appointments : appointments.filter(a => a.status === filter)

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this appointment?')) return
    await appointmentApi.cancel(id)
    toast.success('Appointment cancelled')
    load()
  }

  const submitRating = async () => {
    if (!rateModal) return
    await patientApi.rate({ appointmentId: rateModal.id, rating, review })
    toast.success('Rating submitted!')
    setRateModal(null); setRating(5); setReview('')
    load()
  }

  if (loading) return <LoadingSpinner />

  const tabs = ['ALL','SCHEDULED','COMPLETED','CANCELLED','RESCHEDULED']
  const counts: Record<string, number> = { ALL: appointments.length }
  tabs.slice(1).forEach(t => counts[t] = appointments.filter(a => a.status === t).length)

  return (
    <div className="space-y-6">
      <PageHeader title="My Appointments" subtitle={`${appointments.length} total appointments`}
        action={<button onClick={() => navigate('/patient/book')} className="btn-primary"><Plus className="w-4 h-4"/>Book New</button>} />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              filter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200'
            }`}>
            {t} <span className="ml-1 opacity-70">({counts[t] || 0})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Calendar} title="No appointments found"
          subtitle="Book an appointment to get started"
          action={<button onClick={() => navigate('/patient/book')} className="btn-primary"><Plus className="w-4 h-4"/>Book Appointment</button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <AppointmentCard key={a.id} appointment={a} role="PATIENT" actions={
              <div className="flex gap-2 flex-wrap">
                {(a.status === 'SCHEDULED' || a.status === 'RESCHEDULED') && (
                  <>
                    <button onClick={() => navigate(`/patient/book?reschedule=${a.id}&doctorId=${a.doctorId}`)}
                      className="btn-secondary text-xs py-1.5 px-3">Reschedule</button>
                    <button onClick={() => handleCancel(a.id)} className="btn-danger text-xs py-1.5 px-3">Cancel</button>
                  </>
                )}
                {a.status === 'COMPLETED' && !a.hasRating && (
                  <button onClick={() => setRateModal({id: a.id, doctorName: a.doctorName})}
                    className="btn-secondary text-xs py-1.5 px-3"><Star className="w-3 h-3"/>Rate</button>
                )}
                {a.hasPrescription && (
                  <button onClick={() => navigate(`/patient/prescriptions?appointmentId=${a.id}`)}
                    className="btn-secondary text-xs py-1.5 px-3">View Rx</button>
                )}
              </div>
            } />
          ))}
        </div>
      )}

      {/* Rating modal */}
      {rateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Rate Dr. {rateModal.doctorName}</h3>
              <button onClick={() => setRateModal(null)}><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)} className={`text-3xl transition-transform hover:scale-110 ${n <= rating ? 'text-yellow-400' : 'text-slate-200'}`}>★</button>
              ))}
            </div>
            <textarea value={review} onChange={e => setReview(e.target.value)}
              placeholder="Write a review (optional)..." rows={3} className="input resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setRateModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={submitRating} className="btn-primary flex-1">Submit Rating</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
