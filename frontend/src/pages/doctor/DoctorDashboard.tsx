import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentApi, notificationApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import {
  Calendar, CheckCircle, Clock, Users, FileText,
  Bell, Video, TrendingUp, ArrowUpRight, Stethoscope,
  ChevronRight, Activity, Heart
} from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; dot: string; pill: string }> = {
  COMPLETED:   { label: 'Done',        dot: 'bg-emerald-400', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED:   { label: 'Cancelled',   dot: 'bg-red-400',     pill: 'bg-red-50 text-red-600 ring-red-200' },
  SCHEDULED:   { label: 'Upcoming',    dot: 'bg-teal-400',    pill: 'bg-teal-50 text-teal-700 ring-teal-200' },
  RESCHEDULED: { label: 'Rescheduled', dot: 'bg-amber-400',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const avatar = (name?: string) =>
  name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

export default function DoctorDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [appointments,      setAppointments]      = useState<any[]>([])
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [notifications,     setNotifications]     = useState<any[]>([])
  const [loading,           setLoading]           = useState(true)

  const load = () => {
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      appointmentApi.getMy(),
      appointmentApi.getByDate(today),
      notificationApi.getAll(),
    ]).then(([all, tod, notif]) => {
      setAppointments(all.data.data || [])
      setTodayAppointments(tod.data.data || [])
      setNotifications((notif.data.data || []).slice(0, 5))
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const scheduled  = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED').length
  const completed  = appointments.filter(a => a.status === 'COMPLETED').length
  const pendingRx  = appointments.filter(a => a.status === 'COMPLETED' && !a.hasPrescription)
  const unreadNotif = notifications.filter(n => !n.isRead).length
  const revenue    = appointments.filter(a => a.paymentStatus === 'PAID').reduce((s, a) => s + (a.consultationFee || 0), 0)

  const handleComplete = async (id: number) => {
    const notes = prompt('Doctor notes (optional):') || ''
    await appointmentApi.complete(id, notes)
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-[3px] border-teal-100" />
        <div className="absolute inset-0 rounded-full border-[3px] border-t-teal-500 animate-spin" />
      </div>
    </div>
  )

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .doc-dash * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .mono-t { font-family: 'DM Mono', monospace !important; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .su { animation: slideUp 0.5s cubic-bezier(.22,.68,0,1.15) both; }
        .d1{animation-delay:.05s}.d2{animation-delay:.10s}.d3{animation-delay:.15s}
        .d4{animation-delay:.20s}.d5{animation-delay:.25s}.d6{animation-delay:.30s}

        .doc-card {
          background: #fff;
          border: 1.5px solid #e6f7f5;
          border-radius: 20px;
          box-shadow: 0 2px 16px rgba(13,148,136,0.06);
        }
        @keyframes heroShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%       { transform: translate(30px, -20px) scale(1.08); }
          66%       { transform: translate(-15px, 15px) scale(0.95); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          40%       { transform: translate(-25px, 20px) scale(1.1); }
          70%       { transform: translate(20px, -10px) scale(0.92); }
        }
        @keyframes shimmer {
          0%   { opacity: 0.3; }
          50%  { opacity: 0.7; }
          100% { opacity: 0.3; }
        }
        .hero-wrap {
          background: linear-gradient(130deg, #0d9488, #0891b2, #1e40af, #0d9488, #06b6d4, #0d9488);
          background-size: 400% 400%;
          animation: heroShift 8s ease infinite;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
        }
        .hero-wrap::before {
          content:''; position:absolute; top:-50px; right:-50px;
          width:220px; height:220px; border-radius:50%;
          background: radial-gradient(circle, rgba(6,182,212,0.35) 0%, transparent 70%);
          animation: orbFloat1 6s ease-in-out infinite;
        }
        .hero-wrap::after {
          content:''; position:absolute; bottom:-70px; left:20px;
          width:200px; height:200px; border-radius:50%;
          background: radial-gradient(circle, rgba(30,64,175,0.3) 0%, transparent 70%);
          animation: orbFloat2 7s ease-in-out infinite;
        }
        .hero-orb3 {
          position:absolute; top:50%; left:50%;
          width:160px; height:160px; border-radius:50%;
          background: radial-gradient(circle, rgba(13,148,136,0.2) 0%, transparent 70%);
          animation: shimmer 4s ease-in-out infinite;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .appt-row {
          border-radius:14px; border:1.5px solid #f0fdfb;
          transition:all 0.2s;
        }
        .appt-row:hover {
          border-color:#5eead4; background:#f0fdfb;
          transform:translateX(3px);
        }
        .action-tile {
          border-radius:18px; border:1.5px solid #e6f7f5;
          background:#fff; transition:all 0.2s; cursor:pointer;
        }
        .action-tile:hover {
          border-color:#5eead4; transform:translateY(-3px);
          box-shadow:0 8px 24px rgba(13,148,136,0.14);
        }
        .do-btn {
          background:linear-gradient(135deg,#0d9488,#0891b2);
          color:white; border:none; border-radius:10px;
          padding:6px 14px; font-size:11px; font-weight:700;
          cursor:pointer; transition:all 0.2s; letter-spacing:0.03em;
          font-family:'Plus Jakarta Sans',sans-serif;
        }
        .do-btn:hover { opacity:0.88; transform:scale(1.04); }
        @keyframes revShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .rev-card {
          background: linear-gradient(145deg, #0d4f4a, #0d9488, #0891b2, #064e3b, #0d9488);
          background-size: 300% 300%;
          animation: revShift 6s ease infinite;
          border-radius:20px; position:relative; overflow:hidden;
        }
        .rev-card::before {
          content:''; position:absolute; top:-30px; right:-30px;
          width:140px; height:140px; border-radius:50%;
          background: radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%);
        }
        .rev-card::after {
          content:''; position:absolute; bottom:-40px; left:10px;
          width:100px; height:100px; border-radius:50%;
          background: radial-gradient(circle, rgba(30,64,175,0.2) 0%, transparent 70%);
        }
      `}</style>

      <div className="doc-dash max-w-6xl mx-auto pb-12">

        {/* HERO */}
        <div className="hero-wrap p-7 mb-6 su d1">
          <div className="hero-orb3" />
          <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <span className="text-teal-100 text-[10px] font-bold uppercase tracking-widest">Doctor Portal</span>
              </div>
              <h1 className="text-2xl md:text-[1.75rem] font-bold text-white mb-1 leading-tight">
                {greeting()},&nbsp;
                <span className="text-teal-100">Dr. {user?.name?.split(' ')[0]}</span> 👋
              </h1>
              <p className="text-teal-200 text-sm">{dateStr}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur rounded-2xl px-5 py-3 text-center">
                <p className="text-teal-100 text-[10px] font-bold uppercase tracking-wider">Today</p>
                <p className="text-white text-3xl font-bold leading-none">{todayAppointments.length}</p>
                <p className="text-teal-200 text-[10px]">patients</p>
              </div>
              <button
                onClick={() => navigate('/doctor/notifications')}
                className="relative w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
              >
                <Bell className="w-5 h-5 text-white" />
                {unreadNotif > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotif}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* STAT STRIP */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Today's Patients", value: todayAppointments.length, icon: Users,       grad: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', accent: '#0d9488', border: '#99f6e4' },
            { label: 'Upcoming',          value: scheduled,                icon: Clock,       grad: 'linear-gradient(135deg,#f0f9ff,#bae6fd)', accent: '#0891b2', border: '#7dd3fc' },
            { label: 'Completed',         value: completed,                icon: CheckCircle, grad: 'linear-gradient(135deg,#f0fdf4,#bbf7d0)', accent: '#16a34a', border: '#86efac' },
            { label: 'Revenue Earned',    value: `₹${revenue.toLocaleString()}`, icon: TrendingUp, grad: 'linear-gradient(135deg,#fffbeb,#fde68a)', accent: '#d97706', border: '#fcd34d' },
          ].map((s, i) => (
            <div key={s.label} className={`rounded-[20px] p-5 su d${i + 1}`}
              style={{ background: s.grad, border: `1.5px solid ${s.border}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: s.accent }}>{s.label}</p>
                  <p className="text-[2.2rem] font-bold leading-none" style={{ color: s.accent }}>{s.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.accent}15` }}>
                  <s.icon className="w-5 h-5" style={{ color: s.accent }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">

          {/* LEFT */}
          <div className="space-y-5">

            {/* Today's Schedule */}
            <div className="doc-card p-6 su d3">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center border border-teal-100">
                    <Calendar className="w-4.5 h-4.5 text-teal-600" style={{width:18,height:18}} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Today's Schedule</h2>
                    <p className="text-xs text-slate-400">{todayAppointments.length} appointments</p>
                  </div>
                </div>
                <button onClick={() => navigate('/doctor/appointments')}
                  className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-lg transition-colors">
                  View all <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              {todayAppointments.length > 0 ? (
                <div className="space-y-2.5">
                  {todayAppointments.slice(0, 6).map(a => {
                    const st = STATUS_MAP[a.status] || STATUS_MAP.SCHEDULED
                    return (
                      <div key={a.id} className="appt-row flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}>
                            {avatar(a.patientName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{a.patientName}</p>
                            <p className="mono-t text-[11px] text-slate-400">{a.startTime?.slice(0,5)} – {a.endTime?.slice(0,5)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 self-end sm:self-auto">
                          <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ${st.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                          {(a.status === 'SCHEDULED' || a.status === 'RESCHEDULED') && (
                            <button onClick={() => handleComplete(a.id)} className="do-btn">
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-4">
                    <Calendar className="w-7 h-7 text-teal-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">No appointments today</p>
                  <p className="text-xs text-slate-400 mt-1">Your schedule is clear.</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 su d4">
              {[
                { icon: Calendar, label: 'Appointments',  sub: 'View all',      path: '/doctor/appointments',  color: '#0d9488', bg: '#f0fdfa' },
                { icon: Clock,    label: 'Availability',  sub: 'Set schedule',  path: '/doctor/availability',  color: '#0891b2', bg: '#f0f9ff' },
                { icon: FileText, label: 'Prescriptions', sub: 'Write Rx',      path: '/doctor/prescriptions', color: '#7c3aed', bg: '#f5f3ff' },
                { icon: Video,    label: 'Video Call',    sub: 'Start session', path: '/doctor/book',          color: '#16a34a', bg: '#f0fdf4' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} className="action-tile p-4 flex flex-col items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: item.bg, color: item.color }}>
                    <item.icon style={{ width: 20, height: 20 }} />
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-bold text-slate-700">{item.label}</p>
                    <p className="text-[10px] text-slate-400">{item.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">

            {/* Revenue */}
            <div className="rev-card p-5 text-white su d3">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-teal-200 text-[10px] font-bold uppercase tracking-widest">This Month</p>
                  <Activity className="w-4 h-4 text-teal-300" />
                </div>
                <p className="text-[2.2rem] font-bold leading-none mb-1">₹{revenue.toLocaleString()}</p>
                <p className="text-teal-200 text-xs">{completed} sessions completed</p>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-teal-200 text-[11px]">Avg per session</span>
                  <span className="text-white font-bold text-sm">
                    {completed > 0 ? `₹${Math.round(revenue / completed).toLocaleString()}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pending Rx */}
            <div className="doc-card p-5 su d4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-800">Pending Rx</h2>
                </div>
                {pendingRx.length > 0 && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                    {pendingRx.length} pending
                  </span>
                )}
              </div>

              {pendingRx.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-700 py-2 bg-emerald-50 rounded-xl px-3 border border-emerald-100">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  All prescriptions are written
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingRx.slice(0, 3).map((a: any) => (
                    <div key={a.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => navigate('/doctor/prescriptions')}>
                      <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {avatar(a.patientName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{a.patientName}</p>
                        <p className="mono-t text-[10px] text-slate-400">
                          {new Date(a.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="doc-card p-5 su d5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-800">Updates</h2>
                </div>
                <button onClick={() => navigate('/doctor/notifications')}
                  className="text-[11px] text-teal-600 font-bold hover:text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-lg transition-colors">
                  See all
                </button>
              </div>

              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No new updates</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map(n => (
                    <div key={n.id} className="flex gap-3 items-start">
                      <div className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${n.isRead ? 'bg-slate-200' : 'bg-teal-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${n.isRead ? 'text-slate-400' : 'text-slate-800'}`}>{n.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}