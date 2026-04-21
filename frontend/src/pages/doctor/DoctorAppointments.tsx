import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentApi } from '../../api'
import { PageHeader, AppointmentCard, EmptyState, LoadingSpinner } from '../../components/common'
import { Calendar, CheckCircle, Search, FileText, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_TABS = ['ALL', 'SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']

export default function DoctorAppointments() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [completingId, setCompletingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    appointmentApi.getMy().then(r => setAppointments(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleComplete = async (id: number) => {
    const notes = window.prompt('Add consultation notes (optional):') ?? ''
    setCompletingId(id)
    try {
      await appointmentApi.complete(id, notes)
      toast.success('Appointment marked as completed!')
      load()
    } catch { }
    finally { setCompletingId(null) }
  }

  const counts: Record<string, number> = { ALL: appointments.length }
  STATUS_TABS.slice(1).forEach(t => {
    counts[t] = appointments.filter(a => a.status === t).length
  })

  const filtered = appointments
    .filter(a => filter === 'ALL' || a.status === filter)
    .filter(a => !search || a.patientName?.toLowerCase().includes(search.toLowerCase()))

  const pendingRx = appointments.filter(a => a.status === 'COMPLETED' && !a.hasPrescription).length

  if (loading) return <LoadingSpinner />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .doc-appt * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .tab-active-teal {
          background: linear-gradient(135deg, #0d9488, #0891b2) !important;
          color: white !important;
          border-color: transparent !important;
        }
        @keyframes heroShiftAppt {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes orbA1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50%       { transform: translate(20px, -15px) scale(1.12); opacity: 0.9; }
        }
        @keyframes orbA2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          50%       { transform: translate(-18px, 14px) scale(1.08); opacity: 0.8; }
        }
        .hero-appt-banner {
          background: linear-gradient(130deg, #0d9488, #0891b2, #1e40af, #06b6d4, #0d9488, #0d4f4a);
          background-size: 400% 400%;
          animation: heroShiftAppt 8s ease infinite;
          border-radius: 1rem;
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
          color: white;
        }
        .hero-appt-banner::before {
          content: ''; position: absolute; top: -40px; right: -40px;
          width: 180px; height: 180px; border-radius: 50%;
          background: radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%);
          animation: orbA1 6s ease-in-out infinite;
        }
        .hero-appt-banner::after {
          content: ''; position: absolute; bottom: -50px; left: 30px;
          width: 150px; height: 150px; border-radius: 50%;
          background: radial-gradient(circle, rgba(30,64,175,0.25) 0%, transparent 70%);
          animation: orbA2 7s ease-in-out infinite;
        }
          color: white; border: none; border-radius: 8px;
          padding: 5px 12px; font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .cmp-btn:hover { opacity: 0.88; transform: scale(1.03); }
        .cmp-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .rx-btn {
          background: #f5f3ff; color: #7c3aed;
          border: 1.5px solid #ddd6fe; border-radius: 8px;
          padding: 5px 12px; font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .rx-btn:hover { background: #ede9fe; }
      `}</style>

      <div className="doc-appt space-y-5">
        {/* Header */}
        <div className="hero-appt-banner">
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-1">Doctor Portal</p>
              <h1 className="text-xl font-bold text-white">All Appointments</h1>
              <p className="text-teal-200 text-sm mt-0.5">{appointments.length} total appointments</p>
            </div>
            <div className="bg-white/15 rounded-2xl px-5 py-3 text-center">
              <p className="text-teal-100 text-[10px] font-bold uppercase tracking-wider">Upcoming</p>
              <p className="text-white text-2xl font-bold">{counts['SCHEDULED'] || 0}</p>
            </div>
          </div>
        </div>

        {/* Pending prescriptions banner */}
        {pendingRx > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border"
            style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#d97706' }} />
            <p className="text-sm font-semibold flex-1" style={{ color: '#92400e' }}>
              {pendingRx} completed appointment{pendingRx > 1 ? 's' : ''} awaiting prescription
            </p>
            <button onClick={() => navigate('/doctor/prescriptions')}
              className="text-sm font-bold underline" style={{ color: '#d97706' }}>
              Write Now
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by patient name…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-teal-100 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${filter === t ? 'tab-active-teal' : 'bg-white text-slate-600 border-teal-100 hover:border-teal-300 hover:text-teal-700'}`}>
              {t} <span className="opacity-70">({counts[t] ?? 0})</span>
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState icon={Calendar} title="No appointments"
            subtitle={search ? `No results for "${search}"` : 'Your appointment list is empty'} />
        ) : (
          <div className="space-y-3">
            {filtered.map(a => (
              <div key={a.id} className="bg-white rounded-2xl border p-4 hover:shadow-md transition-shadow"
                style={{ borderColor: '#e6f7f5' }}>
                <AppointmentCard appointment={a} role="DOCTOR" actions={
                  <div className="flex gap-2 flex-wrap">
                    {(a.status === 'SCHEDULED' || a.status === 'RESCHEDULED') && (
                      <button onClick={() => handleComplete(a.id)} disabled={completingId === a.id} className="cmp-btn">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        {completingId === a.id ? 'Saving…' : 'Complete'}
                      </button>
                    )}
                    {a.status === 'COMPLETED' && !a.hasPrescription && (
                      <button onClick={() => navigate('/doctor/prescriptions')} className="rx-btn">
                        <FileText className="w-3 h-3 inline mr-1" />Add Rx
                      </button>
                    )}
                    {a.hasPrescription && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 px-2">
                        <CheckCircle className="w-3 h-3" /> Rx Added
                      </span>
                    )}
                  </div>
                } />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}