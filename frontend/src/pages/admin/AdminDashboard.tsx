import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api'
import {
  Users, Stethoscope, Calendar, TrendingUp,
  CheckCircle, XCircle, Clock, DollarSign, ArrowRight, Activity,
  Shield, BarChart2, AlertCircle, Zap
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const PALETTE = ['#f59e0b', '#10b981', '#ef4444', '#6366f1']

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b', margin: 0 }}>{payload[0]?.value} appts</p>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getDashboard().then(r => setStats(r.data.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid #334155', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ color: '#64748b', fontSize: 13 }}>Loading system data...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const primaryStats = [
    { label: 'Total Users',   value: stats?.totalUsers ?? 0,    icon: Users,      grad: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', glow: 'rgba(29,78,216,0.35)' },
    { label: 'Doctors',       value: stats?.totalDoctors ?? 0,  icon: Stethoscope,grad: 'linear-gradient(135deg,#14532d,#16a34a)', glow: 'rgba(22,163,74,0.35)'  },
    { label: 'Patients',      value: stats?.totalPatients ?? 0, icon: Users,      grad: 'linear-gradient(135deg,#312e81,#7c3aed)', glow: 'rgba(124,58,237,0.35)' },
    { label: 'Revenue',       value: `₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`, icon: DollarSign, grad: 'linear-gradient(135deg,#78350f,#d97706)', glow: 'rgba(217,119,6,0.4)' },
  ]

  const apptStats = [
    { label: 'Total',     value: stats?.totalAppointments ?? 0,    color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)'  },
    { label: 'Scheduled', value: stats?.scheduledAppointments ?? 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)'  },
    { label: 'Completed', value: stats?.completedAppointments ?? 0, color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)'  },
    { label: 'Cancelled', value: stats?.cancelledAppointments ?? 0, color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'   },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .adm-page { font-family: 'DM Sans', sans-serif; }
        .adm-mono { font-family: 'DM Mono', monospace; }
        @keyframes fadeUp { from { opacity:0;transform:translateY(20px); } to { opacity:1;transform:translateY(0); } }
        @keyframes spin   { to { transform: rotate(360deg); } }

        .adm-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.04);
          animation: fadeUp 0.45s ease both;
        }
        .stat-pill {
          border-radius: 16px; padding: 20px 22px;
          position: relative; overflow: hidden;
          animation: fadeUp 0.45s ease both;
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: default;
        }
        .stat-pill:hover { transform: translateY(-4px); }
        .stat-pill::after {
          content: ''; position: absolute;
          bottom: -28px; right: -28px;
          width: 100px; height: 100px; border-radius: 50%;
          background: rgba(255,255,255,0.07);
        }

        .appt-pill {
          border-radius: 14px; padding: 18px 20px;
          border: 1.5px solid; transition: transform 0.18s, box-shadow 0.18s;
          animation: fadeUp 0.45s ease both; cursor: default;
        }
        .appt-pill:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

        .quick-btn {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 20px; border-radius: 14px;
          border: 1.5px solid #e2e8f0; background: white;
          cursor: pointer; transition: all 0.2s;
          animation: fadeUp 0.5s ease both;
          font-family: 'DM Sans', sans-serif; text-align: left;
        }
        .quick-btn:hover {
          border-color: #f59e0b;
          box-shadow: 0 4px 20px rgba(245,158,11,0.15);
          transform: translateX(4px);
        }
      `}</style>

      <div className="adm-page" style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 40 }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 28, animation: 'fadeUp 0.4s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>System Administration</span>
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
                Control Center
              </h1>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>{today}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: "Today's Appointments", value: stats?.todayAppointments ?? 0, icon: Zap, color: '#f59e0b' },
                { label: 'Active Doctors', value: stats?.totalDoctors ?? 0, icon: Shield, color: '#10b981' },
              ].map(item => (
                <div key={item.label} style={{ padding: '14px 18px', borderRadius: 14, background: '#f8fafc', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <item.icon size={17} color={item.color} />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{item.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1 }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── PRIMARY STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {primaryStats.map((s, i) => (
            <div key={s.label} className="stat-pill" style={{ background: s.grad, boxShadow: `0 6px 24px ${s.glow}`, animationDelay: `${i * 0.07}s` }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <s.icon size={19} color="white" />
                  </div>
                  <ArrowRight size={14} color="rgba(255,255,255,0.4)" />
                </div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>{s.label}</p>
                <p className="adm-mono" style={{ fontSize: 32, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── APPOINTMENT STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {apptStats.map((s, i) => (
            <div key={s.label} className="appt-pill" style={{ background: s.bg, borderColor: s.border, animationDelay: `${0.28 + i * 0.06}s` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 8px' }}>{s.label}</p>
              <p className="adm-mono" style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>appointments</p>
            </div>
          ))}
        </div>

        {/* ── CHARTS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, marginBottom: 20 }}>

          {/* Area Chart */}
          <div className="adm-card" style={{ padding: 26, animationDelay: '0.35s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Appointments — Last 7 Days</h2>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Daily booking volume trend</p>
              </div>
              <div style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>7D</span>
              </div>
            </div>
            {(stats?.appointmentsByDate?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.appointmentsByDate} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'DM Sans' }}
                    tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'DM Sans' }} allowDecimals={false} />
                  <Tooltip content={<AreaTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2.5}
                    fill="url(#amberGrad)" dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>
                No appointment data yet
              </div>
            )}
          </div>

          {/* Pie / Status */}
          <div className="adm-card" style={{ padding: 26, animationDelay: '0.4s' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Status Split</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 18px' }}>Appointment distribution</p>
            {(stats?.appointmentsByStatus?.length ?? 0) > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={stats.appointmentsByStatus} dataKey="count" nameKey="status"
                      cx="50%" cy="50%" outerRadius={72} innerRadius={42} paddingAngle={4}>
                      {stats.appointmentsByStatus.map((_: any, i: number) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontFamily: 'DM Sans', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {stats.appointmentsByStatus.map((item: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: '#64748b' }}>{item.status}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>No data yet</div>
            )}
          </div>
        </div>

        {/* ── TOP DOCTORS BAR CHART ── */}
        {(stats?.topDoctors?.length ?? 0) > 0 && (
          <div className="adm-card" style={{ padding: 26, marginBottom: 20, animationDelay: '0.45s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Top Performing Doctors</h2>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Ranked by completed appointments</p>
              </div>
              <button onClick={() => navigate('/admin/doctors')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 12, fontWeight: 600, color: '#0f172a', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.18s' }}>
                View all <ArrowRight size={13} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={stats.topDoctors} margin={{ top: 5, right: 10, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="doctorName" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'DM Sans' }}
                  tickFormatter={n => n.split(' ').slice(-1)[0]} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'DM Sans' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v: any) => [v, 'Completed']}
                  labelFormatter={(l: any) => `Dr. ${l}`}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontFamily: 'DM Sans', fontSize: 12 }} />
                <Bar dataKey="completedAppointments" fill="#f59e0b" radius={[7, 7, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── QUICK ACTIONS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { label: 'Manage Doctors',  sub: 'View & control doctor accounts', to: '/admin/doctors',    icon: Stethoscope, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  delay: '0.5s'  },
            { label: 'Manage Patients', sub: 'Patient records & accounts',     to: '/admin/patients',   icon: Users,       color: '#10b981', bg: 'rgba(16,185,129,0.08)', delay: '0.55s' },
            { label: 'Audit Logs',      sub: 'Full system activity trail',     to: '/admin/audit-logs', icon: TrendingUp,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', delay: '0.6s'  },
          ].map(({ label, sub, to, icon: Icon, color, bg, delay }) => (
            <button key={to} className="quick-btn" onClick={() => navigate(to)} style={{ animationDelay: delay }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${color}30` }}>
                <Icon size={20} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
              </div>
              <ArrowRight size={16} color="#cbd5e1" />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}