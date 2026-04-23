import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { appointmentApi, notificationApi } from '../../api'
import {
  Calendar, FileText, Brain, Search,
  Plus, ArrowRight, Clock, CheckCircle2,
  Video, Activity, Stethoscope, Bell,
  TrendingUp, ChevronRight, Heart
} from 'lucide-react'

export default function PatientDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      appointmentApi.getMy(),
      notificationApi.getAll(),
    ]).then(([apptRes, notifRes]) => {
      setAppointments(apptRes.data.data || [])
      setNotifications((notifRes.data.data || []).slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  const upcoming = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED')
  const completed = appointments.filter(a => a.status === 'COMPLETED')
  const nextAppointment = [...upcoming].sort((a, b) =>
    new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())[0]
  const unread = notifications.filter(n => !n.isRead).length

  const getTimeUntil = (date: string) => {
    const now = new Date()
    const target = new Date(date)
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    return `In ${Math.ceil(diffDays / 7)} weeks`
  }

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60, fontFamily: "'Sora', sans-serif" }}>
        <div style={{ width: 40, height: 40, border: '3px solid #ccfbf1', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .pat-dash { font-family: 'Sora', sans-serif; }
        .pat-mono { font-family: 'JetBrains Mono', monospace; }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Teal Card — base ── */
        .teal-card {
          background: white; border-radius: 20px;
          border: 1px solid #e6f7f5;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(37,99,235,0.06);
          animation: fadeSlide 0.45s ease both;
        }
        .teal-card:hover {
          border-color: #bfdbfe;
          box-shadow: 0 4px 24px rgba(37,99,235,0.12);
          transition: all 0.2s;
        }

        /* ── Stat cards (same gradient style as doctor portal) ── */
        .stat-card {
          border-radius: 20px; padding: 22px 24px;
          position: relative; overflow: hidden;
          animation: fadeSlide 0.5s ease both;
          cursor: default;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover { transform: translateY(-3px); }
        .stat-card::before {
          content: ''; position: absolute; top: -30px; right: -30px;
          width: 120px; height: 120px; border-radius: 50%;
          background: rgba(255,255,255,0.1);
        }
        .stat-card-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
        .stat-card-label {
          font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.7);
          text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 6px;
        }
        .stat-card-value {
          font-size: 34px; font-weight: 700; color: white;
          margin: 0 0 6px; line-height: 1;
        }
        .stat-card-sub {
          font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 500;
        }

        /* ── Quick action row ── */
        .quick-action {
          display: flex; align-items: center; gap: 12px;
          padding: 13px 16px; border-radius: 14px;
          border: 1px solid #f0fdf4; background: white;
          cursor: pointer; transition: all 0.18s;
          animation: fadeSlide 0.4s ease both; text-decoration: none;
        }
        .quick-action:hover {
          border-color: #93c5fd;
          box-shadow: 0 4px 16px rgba(37,99,235,0.12);
          transform: translateX(4px);
        }
        .quick-action-icon {
          width: 38px; height: 38px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* ── Notification item ── */
        .notif-item {
          display: flex; gap: 10px; padding: 11px 0;
          border-bottom: 1px solid #f0fdf4;
          animation: fadeSlide 0.4s ease both;
        }
        .notif-item:last-child { border-bottom: none; }

        /* ── Appointment timeline card ── */
        .appt-mini {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 16px; border-radius: 14px;
          background: #fafffe; border: 1px solid #e6f7f5;
          transition: all 0.18s; animation: fadeSlide 0.4s ease both;
          cursor: pointer;
        }
        .appt-mini:hover {
          border-color: #5eead4;
          box-shadow: 0 4px 14px rgba(13,148,136,0.1);
          transform: translateX(3px);
        }

        /* ── Primary btn ── */
                .teal-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 12px;
          background: linear-gradient(135deg, #0d6efd, #2563eb);
          color: white; border: none; font-size: 13px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(37,99,235,0.25);
        }
        .teal-btn-primary:hover {
          opacity: 0.9; transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(37,99,235,0.35);
        }

        .teal-btn-secondary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 12px;
          background: white; color: #2563eb;
          border: 1.5px solid #bfdbfe; font-size: 13px; font-weight: 600;
          font-family: 'Sora', sans-serif; cursor: pointer;
          transition: all 0.18s;
        }
        .teal-btn-secondary:hover { background: #eff6ff; border-color: #2563eb; }
        /* ── Status badge ── */
        .appt-status {
          padding: 3px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
          white-space: nowrap;
        }
      `}</style>

      <div className="pat-dash">

        {/* ─────── Header ─────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
              Patient Portal
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
              {getGreeting()}, <span style={{ color: '#2563eb' }}>{user?.name?.split(' ')[0]}</span> 👋            </h1>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="teal-btn-secondary" onClick={() => navigate('/patient/symptom-checker')}>
              <Brain size={15} /> AI Symptom Checker
            </button>
            <button className="teal-btn-primary" onClick={() => navigate('/patient/book')}>
              <Plus size={15} /> Book Appointment
            </button>
          </div>
        </div>

        {/* ─────── Stat cards (gradient, same as doctor portal) ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Upcoming', value: upcoming.length, sub: 'appointments', grad: 'linear-gradient(135deg, #0d9488, #0891b2)', shadow: 'rgba(13,148,136,0.3)', icon: Calendar },
            { label: 'Completed', value: completed.length, sub: 'sessions', grad: 'linear-gradient(135deg, #15803d, #22c55e)', shadow: 'rgba(34,197,94,0.3)', icon: CheckCircle2 },
            { label: 'Total Visits', value: appointments.length, sub: 'all time', grad: 'linear-gradient(135deg, #6d28d9, #a78bfa)', shadow: 'rgba(167,139,250,0.3)', icon: Activity },
            { label: 'Notifications', value: unread, sub: 'unread', grad: 'linear-gradient(135deg, #be185d, #ec4899)', shadow: 'rgba(236,72,153,0.3)', icon: Bell },
          ].map((s, i) => (
            <div key={s.label} className="stat-card" style={{ background: s.grad, boxShadow: `0 4px 20px ${s.shadow}`, animationDelay: `${i * 0.07}s` }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="stat-card-icon"><s.icon size={20} color="white" /></div>
                <p className="stat-card-label">{s.label}</p>
                <p className="stat-card-value">{s.value}</p>
                <p className="stat-card-sub">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─────── Main 3-col grid ─────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: 20 }}>

          {/* ─── Next Appointment ─── */}
          <div className="teal-card" style={{ padding: 24, animationDelay: '0.25s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Next Appointment</h2>
              <button onClick={() => navigate('/patient/appointments')}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                View all <ArrowRight size={13} />
              </button>
            </div>

            {nextAppointment ? (
              <div>
                {/* Time pill */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  <span style={{ padding: '4px 12px', borderRadius: 20, background: '#f0fdfa', border: '1px solid #ccfbf1', fontSize: 11, fontWeight: 700, color: '#0d9488' }}>
                    {getTimeUntil(nextAppointment.appointmentDate)}
                  </span>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: nextAppointment.paymentStatus === 'PAID' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                    color: nextAppointment.paymentStatus === 'PAID' ? '#10b981' : '#f59e0b'
                  }}>
                    {nextAppointment.paymentStatus === 'PAID' ? 'Paid' : 'Payment Pending'}
                  </span>
                </div>

                {/* Doctor info */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18, flexShrink: 0, boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                    {nextAppointment.doctorName?.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 3px' }}>
                      Dr. {nextAppointment.doctorName}
                    </h3>
                    <p style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, margin: 0 }}>
                      {nextAppointment.doctorSpecialization}
                    </p>
                  </div>
                </div>

                {/* Date + Time pills */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                  {[
                    { icon: Calendar, label: 'Date', value: new Date(nextAppointment.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                    { icon: Clock, label: 'Time', value: `${nextAppointment.startTime?.slice(0, 5)} – ${nextAppointment.endTime?.slice(0, 5)}` },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '12px', borderRadius: 12, background: '#fafffe', border: '1px solid #e6f7f5', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <item.icon size={14} color="#0d9488" />
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="teal-btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                    <Video size={14} /> Join Call
                  </button>
                  <button className="teal-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/patient/appointments')}>
                    <Calendar size={14} /> Reschedule
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px', border: '2px dashed #e6f7f5', borderRadius: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Calendar size={24} color="#2563eb" />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No upcoming appointments</h3>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 16px' }}>Book your next consultation</p>
                <button className="teal-btn-primary" onClick={() => navigate('/patient/book')}>
                  <Plus size={14} /> Book Now
                </button>
              </div>
            )}
          </div>

          {/* ─── Health Overview ─── */}
          <div className="teal-card" style={{ padding: 24, animationDelay: '0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Health Overview</h2>
              <TrendingUp size={16} color="#0d9488" />
            </div>

            {/* Last visit summary */}
            <div style={{ padding: '16px', borderRadius: 14, background: 'linear-gradient(135deg, #f0fdfa, #e6f7f5)', border: '1px solid #ccfbf1', marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Last Visit</p>
              {completed[0] ? (
                <>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 3px' }}>
                    Dr. {completed[0].doctorName}
                  </p>
                  <p style={{ fontSize: 12, color: '#0d9488', margin: '0 0 6px', fontWeight: 500 }}>
                    {completed[0].doctorSpecialization}
                  </p>
                  <p className="pat-mono" style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                    {new Date(completed[0].appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No visits yet</p>
              )}
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total Visits', value: appointments.length, color: '#0d9488', bg: '#f0fdfa', border: '#ccfbf1' },
                { label: 'Last Fee', value: completed[0]?.consultationFee ? `₹${completed[0].consultationFee}` : '—', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                { label: 'Completed', value: completed.length, color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
                { label: 'Upcoming', value: upcoming.length, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
              ].map(item => (
                <div key={item.label} style={{ padding: '12px', borderRadius: 12, background: item.bg, border: `1px solid ${item.border}`, textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: item.color, margin: '0 0 3px' }}>{item.value}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
                </div>
              ))}
            </div>

            {/* Recent appointments mini-list */}
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Recent</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {appointments.slice(0, 3).map((a, i) => {
                const statusColor = a.status === 'COMPLETED' ? '#10b981' : a.status === 'CANCELLED' ? '#ef4444' : '#0d9488'
                const statusBg = a.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : a.status === 'CANCELLED' ? 'rgba(239,68,68,0.1)' : 'rgba(13,148,136,0.1)'
                return (
                  <div key={a.id} className="appt-mini" style={{ animationDelay: `${0.35 + i * 0.05}s` }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Dr. {a.doctorName}
                      </p>
                      <p className="pat-mono" style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>
                        {new Date(a.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {a.startTime?.slice(0, 5)}
                      </p>
                    </div>
                    <span className="appt-status" style={{ background: statusBg, color: statusColor }}>
                      {a.status}
                    </span>
                  </div>
                )
              })}
              {appointments.length === 0 && (
                <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>No history yet</p>
              )}
            </div>
          </div>

          {/* ─── Right column: Quick Actions + Notifications ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Quick Actions */}
            <div className="teal-card" style={{ padding: 20, animationDelay: '0.32s' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { icon: Brain, label: 'AI Symptom Checker', sub: 'Analyze symptoms', color: '#7c3aed', bg: '#f5f3ff', path: '/patient/symptom-checker', delay: '0.35s' },
                  { icon: Video, label: 'Video Consultation', sub: 'Start virtual visit', color: '#0891b2', bg: '#e0f2fe', path: '/patient/book', delay: '0.38s' },
                  { icon: FileText, label: 'View Prescriptions', sub: 'Download your Rx', color: '#0d9488', bg: '#f0fdfa', path: '/patient/prescriptions', delay: '0.41s' },
                  { icon: Search, label: 'Find Doctors', sub: 'Browse specialists', color: '#f59e0b', bg: '#fffbeb', path: '/patient/doctors', delay: '0.44s' },
                ].map(action => {
                  const Icon = action.icon
                  return (
                    <div key={action.label} className="quick-action" onClick={() => navigate(action.path)} style={{ animationDelay: action.delay }}>
                      <div className="quick-action-icon" style={{ background: action.bg }}>
                        <Icon size={16} color={action.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>{action.label}</p>
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{action.sub}</p>
                      </div>
                      <ChevronRight size={13} color="#cbd5e1" />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Notifications */}
            <div className="teal-card" style={{ padding: 20, flex: 1, animationDelay: '0.4s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Notifications</h2>
                <span style={{ padding: '2px 8px', borderRadius: 20, background: unread > 0 ? 'rgba(13,148,136,0.1)' : '#f8fafc', color: unread > 0 ? '#0d9488' : '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                  {unread} new
                </span>
              </div>

              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Bell size={28} color="#e2e8f0" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>No notifications yet</p>
                </div>
              ) : (
                <div>
                  {notifications.map((n, i) => (
                    <div key={n.id} className="notif-item" style={{ animationDelay: `${0.42 + i * 0.05}s` }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.isRead ? '#e2e8f0' : '#2563eb', marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: n.isRead ? 500 : 700, color: n.isRead ? '#64748b' : '#0f172a', margin: '0 0 2px' }}>
                          {n.title}
                        </p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.message}
                        </p>
                        <p className="pat-mono" style={{ fontSize: 10, color: '#cbd5e1', margin: '3px 0 0' }}>
                          {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/patient/notifications')}
                    style={{ width: '100%', marginTop: 12, padding: '9px', borderRadius: 10, border: '1.5px solid #e6f7f5', background: 'white', fontSize: 12, fontWeight: 600, color: '#2563eb', cursor: 'pointer', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    View all <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}