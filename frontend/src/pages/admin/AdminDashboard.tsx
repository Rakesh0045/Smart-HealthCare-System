import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api'
import {
  Users, Stethoscope, TrendingUp,
  CheckCircle, XCircle, Clock, DollarSign, ArrowRight, Activity,
  Shield, AlertCircle, Zap, TrendingDown, RefreshCw, Flame,
  Heart, Gauge, BarChart3, CheckCheck, AlertTriangle, Target
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'

const PALETTE = ['#f59e0b', '#10b981', '#ef4444', '#6366f1']

const pct    = (value: number) => `${value.toFixed(1)}%`
const safePercent = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0)
const clamp  = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value))
const normalizeStatus = (value: string) => value.replace(/\s+/g, '_').toUpperCase()
const firstName = (fullName: string) => fullName?.trim()?.split(' ')[0] || fullName

const heatColor = (intensity: number) => {
  const alpha = 0.12 + clamp(intensity, 0, 1) * 0.70
  return `rgba(14,165,233,${alpha})`
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  fontFamily: 'Sora, sans-serif',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
}

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 14px', fontFamily: 'Sora, sans-serif', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b', margin: 0 }}>{payload[0]?.value} appts</p>
    </div>
  )
}

const STATUS_FILTERS = ['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

function KpiCard({ label, value, sub, icon: Icon, grad, delay }: any) {
  return (
    <div className="kpi-card" style={{ animationDelay: delay, background: grad }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color="#fff" strokeWidth={1.8} />
        </div>
        <ArrowRight size={14} color="rgba(255,255,255,0.3)" />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontFamily: 'Sora, sans-serif' }}>{label}</span>
      <p className="adm-mono" style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '8px 0 4px', lineHeight: 1, fontFamily: 'Sora, sans-serif' }}>{value}</p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', margin: 0, fontFamily: 'Sora, sans-serif' }}>{sub}</p>
    </div>
  )
}

function MetricTile({ label, value, icon: Icon, color, note }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontFamily: 'Sora, sans-serif' }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={color} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 3px', fontFamily: 'Sora, sans-serif' }}>{label}</p>
        <p className="adm-mono" style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1, fontFamily: 'Sora, sans-serif' }}>{value}</p>
      </div>
      {note && <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' as const, fontFamily: 'Sora, sans-serif' }}>{note}</span>}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats,        setStats]        = useState<any>(null)
  const [loading,      setLoading]      = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [trendMode,    setTrendMode]    = useState<'DAILY' | 'CUMULATIVE'>('DAILY')

  useEffect(() => {
    adminApi.getDashboard().then(r => setStats(r.data.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'Sora, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Loading system data…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const today         = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const dateSeries    = (stats?.appointmentsByDate   ?? []) as Array<{ date: string; count: number }>
  const statusSeries  = (stats?.appointmentsByStatus ?? []) as Array<{ status: string; count: number }>
  const topDoctors    = (stats?.topDoctors           ?? []) as Array<{ doctorName: string; completedAppointments: number; specialization?: string; rating?: number }>

  const totalAppointments     = stats?.totalAppointments     ?? 0
  const scheduledAppointments = stats?.scheduledAppointments ?? 0
  const completedAppointments = stats?.completedAppointments ?? 0
  const cancelledAppointments = stats?.cancelledAppointments ?? 0
  const totalRevenue          = stats?.totalRevenue          ?? 0
  const totalDoctors          = stats?.totalDoctors          ?? 0
  const totalPatients         = stats?.totalPatients         ?? 0

  const completionRate   = safePercent(completedAppointments, totalAppointments)
  const cancellationRate = safePercent(cancelledAppointments, totalAppointments)
  const onScheduleRate   = safePercent(scheduledAppointments, totalAppointments)
  const avgRevenue       = totalAppointments > 0 ? totalRevenue / totalAppointments : 0
  const patientsPerDoc   = totalDoctors > 0 ? totalPatients / totalDoctors : 0

  const firstPoint   = dateSeries[0]?.count ?? 0
  const lastPoint    = dateSeries[dateSeries.length - 1]?.count ?? 0
  const weeklyGrowth = firstPoint > 0 ? ((lastPoint - firstPoint) / firstPoint) * 100 : 0

  const trendSeries = dateSeries.map((item, index, arr) => {
    const cumulative = arr.slice(0, index + 1).reduce((s, r) => s + r.count, 0)
    const start      = Math.max(0, index - 2)
    const win        = arr.slice(start, index + 1)
    const movingAvg  = win.reduce((s, r) => s + r.count, 0) / Math.max(win.length, 1)
    return { ...item, cumulative, movingAvg: Number(movingAvg.toFixed(2)) }
  })

  const normalizedStatus = statusSeries.map(item => ({
    ...item,
    key:   normalizeStatus(item.status),
    share: safePercent(item.count, totalAppointments),
  }))
  const filteredStatus = statusFilter === 'ALL'
    ? normalizedStatus
    : normalizedStatus.filter(item => item.key === statusFilter)

  const doctorSeries = topDoctors.map(doctor => ({
    ...doctor,
    rating:         Number(doctor.rating ?? 0),
    specialization: doctor.specialization || 'General',
    efficiency:     safePercent(doctor.completedAppointments ?? 0, Math.max(totalAppointments, 1)),
    doctorShort:    firstName(doctor.doctorName),
  }))

  const specializationMap = doctorSeries.reduce((acc, d) => {
    acc[d.specialization] = (acc[d.specialization] ?? 0) + d.completedAppointments
    return acc
  }, {} as Record<string, number>)
  const specializationSeries = Object.entries(specializationMap).map(([name, value]) => ({ name, value }))

  const maxCompleted  = Math.max(...doctorSeries.map(d => d.completedAppointments), 1)
  const maxRating     = Math.max(...doctorSeries.map(d => d.rating), 1)
  const maxEfficiency = Math.max(...doctorSeries.map(d => d.efficiency), 1)

  const heatmapRows = doctorSeries.slice(0, 5).map(doctor => ({
    doctorName:  doctor.doctorName,
    doctorShort: doctor.doctorShort,
    cells: [
      { key: 'completed',  label: 'Done',      value: String(doctor.completedAppointments), intensity: doctor.completedAppointments / maxCompleted  },
      { key: 'rating',     label: 'Rating',    value: doctor.rating.toFixed(1),             intensity: doctor.rating     / maxRating     },
      { key: 'efficiency', label: 'Efficiency',value: pct(doctor.efficiency),               intensity: doctor.efficiency / maxEfficiency },
    ],
  }))

  const SEC_LABEL: React.CSSProperties = { 
    fontSize: 11, 
    fontWeight: 700, 
    color: '#94a3b8', 
    textTransform: 'uppercase', 
    letterSpacing: '0.08em',
    fontFamily: 'Sora, sans-serif'
  }

  return (
    <>
      <style>{`
        .adm-page { font-family: 'Sora', sans-serif; }
        .adm-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to   { transform: rotate(360deg); } }

        .adm-bg {
          background:
            radial-gradient(1000px 340px at 5% -5%,  rgba(251,191,36,0.09),  transparent 55%),
            radial-gradient(700px  360px at 95% -15%, rgba(79,70,229,0.09),   transparent 55%),
            linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 24px;
          padding: 28px;
        }

        .adm-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
          animation: fadeUp 0.4s ease both;
        }

        .kpi-card {
          border-radius: 18px;
          padding: 22px 22px 20px;
          position: relative;
          overflow: hidden;
          animation: fadeUp 0.4s ease both;
          transition: transform 0.22s ease;
          cursor: default;
        }
        .kpi-card:hover { transform: translateY(-4px); }
        .kpi-card::after {
          content:''; position:absolute; bottom:-30px; right:-30px;
          width:110px; height:110px; border-radius:50%;
          background:rgba(255,255,255,0.07);
        }

        .chip {
          border: 1.5px solid #e2e8f0;
          background: #fff;
          color: #64748b;
          border-radius: 999px;
          padding: 5px 13px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.18s;
          font-family: 'Sora', sans-serif;
        }
        .chip:hover:not(.active) { border-color: #cbd5e1; color: #334155; background: #f8fafc; }
        .chip.active { background: #0f172a; border-color: #0f172a; color: #fff; box-shadow: 0 3px 10px rgba(15,23,42,0.2); }

        .heat-cell {
          border-radius: 10px;
          border: 1px solid rgba(14,165,233,0.14);
          padding: 10px 12px;
          height: 62px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.18s;
        }
        .heat-cell:hover { transform: translateY(-2px); }

        .quick-btn {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 18px; border-radius: 16px;
          border: 1.5px solid #e2e8f0; background: #fff;
          cursor: pointer; transition: all 0.2s;
          font-family: 'Sora', sans-serif; text-align: left; width: 100%;
          animation: fadeUp 0.45s ease both;
        }
        .quick-btn:hover { border-color: #f59e0b; box-shadow: 0 4px 18px rgba(245,158,11,0.12); transform: translateX(3px); }

        .prog-bar  { height: 7px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
        .prog-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }

        .adm-divider { height:1px; background: linear-gradient(90deg,transparent,#e2e8f0 20%,#e2e8f0 80%,transparent); margin: 26px 0; }

        .g4 { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }
        .g3 { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; }
        .g2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; }

        @media(max-width:1100px){
          .g4 { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .g3 { grid-template-columns:1fr 1fr; }
          .g2 { grid-template-columns:1fr; }
        }
        @media(max-width:680px){
          .adm-bg { border-radius:16px; padding:16px; }
          .g4,.g3,.g2 { grid-template-columns:1fr; gap:12px; }
        }
      `}</style>

      <div className="adm-page" style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 48 }}>
        <div className="adm-bg">

          {/* ══════════ HEADER ══════════ */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28, animation: 'fadeUp 0.35s ease both' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.18)' }} />
                <span style={{ ...SEC_LABEL, color: '#f59e0b', fontSize: 10 }}>System Administration</span>
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.6px', lineHeight: 1.1, fontFamily: 'Sora, sans-serif' }}>Control Center</h1>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontFamily: 'Sora, sans-serif' }}>{today}</p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: "Today's Appointments", value: stats?.todayAppointments ?? 0, icon: Zap,    color: '#f59e0b' },
                { label: 'Active Doctors',        value: totalDoctors,                  icon: Shield, color: '#10b981' },
              ].map(item => (
                <div key={item.label} style={{ padding: '12px 16px', borderRadius: 14, background: '#fff', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', fontFamily: 'Sora, sans-serif' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}16`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon size={16} color={item.color} />
                  </div>
                  <div>
                    <p style={{ ...SEC_LABEL, margin: '0 0 2px', fontSize: 10 }}>{item.label}</p>
                    <p className="adm-mono" style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1, fontFamily: 'Sora, sans-serif' }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════ KPI CARDS ══════════ */}
          <div className="g4" style={{ marginBottom: 14 }}>
            {[
              { label: 'Total Users',   value: stats?.totalUsers ?? 0,                   sub: 'registered accounts',  icon: Users,       grad: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', delay: '0s'    },
              { label: 'Doctors',       value: totalDoctors,                             sub: 'active practitioners', icon: Stethoscope, grad: 'linear-gradient(135deg,#14532d,#16a34a)', delay: '0.06s' },
              { label: 'Patients',      value: totalPatients,                            sub: 'enrolled patients',    icon: Users,       grad: 'linear-gradient(135deg,#312e81,#7c3aed)', delay: '0.12s' },
              { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, sub: 'lifetime revenue',   icon: DollarSign,  grad: 'linear-gradient(135deg,#78350f,#d97706)', delay: '0.18s' },
            ].map(s => <KpiCard key={s.label} {...s} />)}
          </div>

          {/* Appointment strip */}
          <div className="g4" style={{ marginBottom: 26 }}>
            {[
              { label: 'Total Appointments', value: totalAppointments,     color: '#6366f1', icon: Activity    },
              { label: 'Scheduled',          value: scheduledAppointments, color: '#f59e0b', icon: Clock       },
              { label: 'Completed',          value: completedAppointments, color: '#10b981', icon: CheckCheck },
              { label: 'Cancelled',          value: cancelledAppointments, color: '#ef4444', icon: XCircle     },
            ].map((s, i) => (
              <div key={s.label}
                style={{ padding: '16px 18px', borderRadius: 16, background: `${s.color}08`, border: `1.5px solid ${s.color}20`, animationDelay: `${0.24 + i * 0.06}s`, animation: 'fadeUp 0.4s ease both', transition: 'transform 0.18s', cursor: 'default', fontFamily: 'Sora, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
                  <span style={{ ...SEC_LABEL, color: s.color, fontSize: 10 }}>{s.label}</span>
                  <s.icon size={16} color={s.color} strokeWidth={1.8} />
                </div>
                <p className="adm-mono" style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1, fontFamily: 'Sora, sans-serif' }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="adm-divider" />

          {/* ══════════ TREND + KEY METRICS ══════════ */}
          <div className="g2" style={{ marginBottom: 24 }}>

            <div className="adm-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <TrendingUp size={15} color="#f59e0b" strokeWidth={2} />
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: 'Sora, sans-serif' }}>Appointment Trend</h2>
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontFamily: 'Sora, sans-serif' }}>Daily volume & cumulative momentum</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['DAILY', 'CUMULATIVE'] as const).map(m => (
                    <button key={m} onClick={() => setTrendMode(m)} className={`chip${trendMode === m ? ' active' : ''}`}>{m}</button>
                  ))}
                </div>
              </div>

              {trendSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={trendSeries} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                    <defs>
                      <linearGradient id="gAmber" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Sora' }}
                      tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Sora' }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip content={<AreaTooltip />} />
                    {trendMode === 'DAILY' ? (
                      <>
                        <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2.5}
                          fill="url(#gAmber)" dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="movingAvg" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      </>
                    ) : (
                      <Area type="monotone" dataKey="cumulative" stroke="#0ea5e9" strokeWidth={2.5}
                        fill="url(#gCyan)" dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>No appointment data yet</div>
              )}
            </div>

            <div className="adm-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Gauge size={15} color="#f59e0b" strokeWidth={2} />
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: 'Sora, sans-serif' }}>Key Metrics</h2>
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontFamily: 'Sora, sans-serif' }}>Performance & operational KPIs</p>
              </div>

              <MetricTile label="Completion Rate"      value={pct(completionRate)}   icon={CheckCircle} color="#10b981" note={`${completedAppointments} done`} />
              <MetricTile label="Cancellation Rate"    value={pct(cancellationRate)} icon={XCircle}     color="#ef4444" note={`${cancelledAppointments} cancelled`} />
              <MetricTile label="Avg Revenue / Visit"  value={`₹${Math.round(avgRevenue).toLocaleString('en-IN')}`} icon={DollarSign} color="#d97706" />
              <MetricTile label="Patient–Doctor Ratio" value={`${patientsPerDoc.toFixed(1)}:1`} icon={Users} color="#4f46e5" note="per doctor" />

              <div style={{ marginTop: 'auto', padding: '12px 14px', borderRadius: 13, background: weeklyGrowth >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${weeklyGrowth >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                {weeklyGrowth >= 0
                  ? <TrendingUp   size={15} color="#10b981" />
                  : <TrendingDown size={15} color="#ef4444" />
                }
                <div>
                  <p style={{ ...SEC_LABEL, margin: '0 0 2px', color: weeklyGrowth >= 0 ? '#10b981' : '#ef4444' }}>Weekly Volume</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>
                    {weeklyGrowth >= 0 ? '+' : ''}{pct(Math.abs(weeklyGrowth))} vs start of week
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════ STATUS + SPECIALIZATION / OPS ══════════ */}
          <div className="g2" style={{ marginBottom: 24 }}>

            <div className="adm-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <BarChart3 size={15} color="#f59e0b" strokeWidth={2} />
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: 'Sora, sans-serif' }}>Status Breakdown</h2>
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontFamily: 'Sora, sans-serif' }}>Appointment distribution by status</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STATUS_FILTERS.map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)} className={`chip${statusFilter === f ? ' active' : ''}`}>{f}</button>
                  ))}
                </div>
              </div>

              {statusSeries.length > 0 ? (
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div style={{ flexShrink: 0 }}>
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie data={statusSeries} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={65} innerRadius={40} paddingAngle={4}>
                          {statusSeries.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {filteredStatus.map((item: any, i: number) => (
                      <div key={item.status}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: '#334155', fontWeight: 600, fontFamily: 'Sora, sans-serif' }}>{item.status}</span>
                          </div>
                          <span className="adm-mono" style={{ fontSize: 12, color: '#0f172a', fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>
                            {item.count} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({pct(item.share)})</span>
                          </span>
                        </div>
                        <div className="prog-bar">
                          <div className="prog-fill" style={{ width: `${clamp(item.share)}%`, background: `linear-gradient(90deg,${PALETTE[i % PALETTE.length]},${PALETTE[i % PALETTE.length]}99)` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>No status data yet</div>
              )}

              <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 10, background: cancellationRate > 25 ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)', border: `1px dashed ${cancellationRate > 25 ? 'rgba(239,68,68,0.28)' : 'rgba(16,185,129,0.28)'}`, fontFamily: 'Sora, sans-serif' }}>
                {cancellationRate > 25
                  ? <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <CheckCircle      size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.6, fontFamily: 'Sora, sans-serif' }}>
                  {cancellationRate > 25
                    ? 'High cancellation rate detected. Consider schedule optimization and reminder campaigns.'
                    : 'Cancellation pressure within normal range. System stability looks good.'}
                </p>
              </div>
            </div>

            <div className="adm-card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Flame size={15} color="#f59e0b" strokeWidth={2} />
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: 'Sora, sans-serif' }}>Specialization & Health</h2>
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontFamily: 'Sora, sans-serif' }}>Volume by specialty and service signals</p>
              </div>

              {specializationSeries.length > 0 && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ flexShrink: 0 }}>
                    <ResponsiveContainer width={110} height={110}>
                      <PieChart>
                        <Pie data={specializationSeries} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={52} innerRadius={30} paddingAngle={4}>
                          {specializationSeries.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {specializationSeries.map((item, i) => (
                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, color: '#475569', fontFamily: 'Sora, sans-serif' }}>{item.name}</span>
                        <span className="adm-mono" style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="adm-divider" style={{ margin: '0 0 16px' }} />

              {[
                { label: 'On-Schedule Rate', value: onScheduleRate,         tone: '#f59e0b', note: 'current scheduled workload', icon: Clock  },
                { label: 'Completion Rate',  value: completionRate,         tone: '#10b981', note: 'appointments finished',       icon: CheckCircle },
                { label: 'System Stability', value: clamp(100 - cancellationRate), tone: '#0ea5e9', note: 'inverse of cancellation rate', icon: Shield },
              ].map(({ label, value, tone, note, icon: Icon }) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={13} color={tone} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', fontFamily: 'Sora, sans-serif' }}>{label}</span>
                    </div>
                    <span className="adm-mono" style={{ fontSize: 13, fontWeight: 700, color: tone, fontFamily: 'Sora, sans-serif' }}>{pct(clamp(value))}</span>
                  </div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${clamp(value)}%`, background: `linear-gradient(90deg,${tone},${tone}aa)` }} />
                  </div>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '5px 0 0', fontFamily: 'Sora, sans-serif' }}>{note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════ TOP DOCTORS — ratings bar + heatmap ══════════ */}
          {topDoctors.length > 0 && (
            <div className="adm-card" style={{ padding: 26, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Target size={15} color="#f59e0b" strokeWidth={2} />
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: 'Sora, sans-serif' }}>Top Performing Doctors</h2>
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontFamily: 'Sora, sans-serif' }}>Ranked by completed appointments — ratings and efficiency at a glance</p>
                </div>
                <button onClick={() => navigate('/admin/doctors')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 11, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer', fontFamily: 'Sora,sans-serif', transition: 'all 0.18s' }}>
                  View all <ArrowRight size={13} />
                </button>
              </div>

              <div className="g2" style={{ gap: 28, alignItems: 'start' }}>

                {/* Ratings bar chart */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
                    <Flame size={13} color="#f59e0b" strokeWidth={2} />
                    <p style={{ ...SEC_LABEL, display: 'block', margin: 0, fontSize: 11 }}>Doctor Ratings (out of 5)</p>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(doctorSeries.length * 46, 160)}>
                    <BarChart data={doctorSeries} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Sora' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="doctorShort" type="category" tick={{ fontSize: 12, fill: '#334155', fontFamily: 'Sora', fontWeight: 600 }} width={80} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: any) => [`${Number(v).toFixed(1)} / 5`, 'Rating']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="rating" fill="#f59e0b" radius={[0, 8, 8, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Heatmap */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
                    <Heart size={13} color="#f59e0b" strokeWidth={2} />
                    <p style={{ ...SEC_LABEL, display: 'block', margin: 0, fontSize: 11 }}>Performance Heatmap</p>
                  </div>

                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                    {[
                      { h: 'Doctor',     pl: 12, icon: Stethoscope },
                      { h: 'Done',       pl: 12, icon: CheckCheck },
                      { h: 'Rating',     pl: 12, icon: Heart },
                      { h: 'Efficiency', pl: 12, icon: Gauge },
                    ].map(({ h, pl, icon: Icon }) => (
                      <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: pl }}>
                        <Icon size={12} color="#f59e0b" strokeWidth={2} />
                        <span style={{ ...SEC_LABEL, fontSize: 9 }}>{h}</span>
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {heatmapRows.map((row, ri) => (
                      <div key={`${row.doctorName}-${ri}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, alignItems: 'stretch' }}>
                        <div style={{ borderRadius: 11, border: '1.5px solid #e2e8f0', background: '#f8fafc', padding: '11px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, height: 64 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Sora, sans-serif' }}>{row.doctorShort}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Sora, sans-serif' }}>{row.doctorName}</span>
                        </div>
                        {row.cells.map(cell => (
                          <div key={`${row.doctorName}-${cell.key}`} className="heat-cell" style={{ background: heatColor(cell.intensity) }}>
                            <span style={{ ...SEC_LABEL, fontSize: 9, fontFamily: 'Sora, sans-serif' }}>{cell.label}</span>
                            <span className="adm-mono" style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>{cell.value}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ QUICK ACTIONS ══════════ */}
          <div className="g3" style={{ gap: 12 }}>
            {[
              { label: 'Manage Doctors',  sub: 'View & control doctor accounts', to: '/admin/doctors',    icon: Stethoscope, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  delay: '0.44s' },
              { label: 'Manage Patients', sub: 'Patient records & accounts',     to: '/admin/patients',   icon: Users,       color: '#10b981', bg: 'rgba(16,185,129,0.08)',  delay: '0.49s' },
              { label: 'Audit Logs',      sub: 'Full system activity trail',     to: '/admin/audit-logs', icon: BarChart3,   color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', delay: '0.54s' },
            ].map(({ label, sub, to, icon: Icon, color, bg, delay }) => (
              <button key={to} className="quick-btn" onClick={() => navigate(to)} style={{ animationDelay: delay }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${color}20` }}>
                  <Icon size={19} color={color} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 3px', fontFamily: 'Sora, sans-serif' }}>{label}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontFamily: 'Sora, sans-serif' }}>{sub}</p>
                </div>
                <ArrowRight size={15} color="#cbd5e1" />
              </button>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}