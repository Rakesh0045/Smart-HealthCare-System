import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentApi, notificationApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import {
  Calendar, CheckCircle, Clock, Users, FileText,
  ArrowUpRight,
  DollarSign, UserX
} from 'lucide-react'
import toast from 'react-hot-toast'

type StatsPeriod = '30d' | '90d' | 'all'

function apptDayStartMs(a: { appointmentDate: string }): number {
  const d = new Date(a.appointmentDate)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function inStatsPeriod(a: { appointmentDate: string }, period: StatsPeriod): boolean {
  if (period === 'all') return true
  const start = apptDayStartMs(a)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - (period === '30d' ? 30 : 90))
  return start >= cutoff.getTime()
}

const generateAvatarUrl = (name?: string, size: number = 40) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0d9488&color=fff&bold=true&size=${size}`

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED:   { label: 'Completed',   color: '#059669', bg: '#ecfdf5' },
  CANCELLED:   { label: 'Cancelled',   color: '#dc2626', bg: '#fef2f2' },
  SCHEDULED:   { label: 'Scheduled',   color: '#0d9488', bg: '#f0fdfa' },
  RESCHEDULED: { label: 'Rescheduled', color: '#d97706', bg: '#fffbeb' },
  NO_SHOW:     { label: 'No Show',     color: '#6b7280', bg: '#f9fafb' },
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DoctorDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<any[]>([])
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('30d')
  const [tableStatusFilter, setTableStatusFilter] = useState<string>('ALL')
  const [completeModal, setCompleteModal] = useState<any>(null)
  const [completeNotes, setCompleteNotes] = useState('')
  const [completingId, setCompletingId] = useState<number | null>(null)

  const load = () => {
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      appointmentApi.getMy(),
      appointmentApi.getByDate(today),
      notificationApi.getAll(),
    ]).then(([all, tod, notif]) => {
      setAppointments(all.data.data || [])
      setTodayAppointments((tod.data.data || []).filter((a: any) => a.status !== 'CANCELLED'))
      setNotifications((notif.data.data || []).slice(0, 4))
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const monthlyChartData = useMemo(() => {
    const now = new Date()
    const months: { label: string; year: number; count: number; key: string }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth()
      const count = appointments.filter(a => {
        if (a.status !== 'COMPLETED') return false
        const apptDate = new Date(a.appointmentDate)
        return apptDate.getFullYear() === year && apptDate.getMonth() === month
      }).length
      months.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), year, count, key: `${year}-${month}` })
    }
    return months
  }, [appointments])

  const maxMonthCount = Math.max(...monthlyChartData.map(m => m.count), 1)

  const scopedAppointments = useMemo(
    () => appointments.filter(a => inStatsPeriod(a, statsPeriod)),
    [appointments, statsPeriod]
  )

  const uniquePatientCount = useMemo(() => {
    const ids = new Set<number>()
    for (const a of appointments) { if (a.patientId != null) ids.add(Number(a.patientId)) }
    return ids.size
  }, [appointments])

  const pendingRx = useMemo(
    () => appointments.filter(a => a.status === 'COMPLETED' && !a.hasPrescription).length,
    [appointments]
  )

  const revenueLifetime = useMemo(
    () => appointments.filter(a => a.paymentStatus === 'PAID').reduce((s, a) => s + (Number(a.consultationFee) || 0), 0),
    [appointments]
  )

  const revenueScoped = useMemo(
    () => scopedAppointments.filter(a => a.paymentStatus === 'PAID').reduce((s, a) => s + (Number(a.consultationFee) || 0), 0),
    [scopedAppointments]
  )

  const scheduledScoped = useMemo(
    () => scopedAppointments.filter(a => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED').length,
    [scopedAppointments]
  )

  const completedScoped = useMemo(
    () => scopedAppointments.filter(a => a.status === 'COMPLETED').length,
    [scopedAppointments]
  )

  const statusSlices = useMemo(() => {
    const src = scopedAppointments
    const n = src.length
    return {
      n,
      completed: src.filter(a => a.status === 'COMPLETED').length,
      scheduled: src.filter(a => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED').length,
      cancelled: src.filter(a => a.status === 'CANCELLED').length,
      noShow: src.filter(a => a.status === 'NO_SHOW').length,
    }
  }, [scopedAppointments])

  const pieGradient = useMemo(() => {
    const { n, completed, scheduled, cancelled, noShow } = statusSlices
    if (n === 0) return 'conic-gradient(#e2e8f0 0deg 360deg)'
    let cur = 0
    const parts: string[] = []
    const seg = (count: number, color: string) => {
      if (count <= 0) return
      const deg = (count / n) * 360
      const start = cur
      cur += deg
      parts.push(`${color} ${start}deg ${cur}deg`)
    }
    seg(completed, '#059669')
    seg(scheduled, '#0d9488')
    seg(cancelled, '#dc2626')
    seg(noShow, '#9ca3af')
    return `conic-gradient(${parts.join(', ')})`
  }, [statusSlices])

  const paidInScopeCount = useMemo(
    () => scopedAppointments.filter(a => a.paymentStatus === 'PAID').length,
    [scopedAppointments]
  )

  const avgPaidInScope = paidInScopeCount > 0 ? Math.round(revenueScoped / paidInScopeCount) : 0
  const periodLabel = statsPeriod === 'all' ? 'All time' : statsPeriod === '30d' ? 'Last 30 days' : 'Last 90 days'

  const todayScheduled = todayAppointments.filter(a => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED').length
  const todayPendingPayment = todayAppointments.filter(a => (a.paymentStatus || 'PENDING') !== 'PAID' && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW').length
  const todayPendingRx = todayAppointments.filter(a => a.status === 'COMPLETED' && !a.hasPrescription).length
  const todayNoShow = todayAppointments.filter(a => a.status === 'NO_SHOW').length

  const openCompleteModal = (appointment: any) => {
    setCompleteNotes('')
    setCompleteModal(appointment)
  }

  const handleComplete = async (paymentCollected: boolean) => {
    if (!completeModal) return
    setCompletingId(completeModal.id)
    try {
      await appointmentApi.complete(completeModal.id, completeNotes, paymentCollected)
      toast.success('Visit marked completed')
      setCompleteModal(null)
      load()
    } catch { /* error toast from API interceptor */ }
    finally { setCompletingId(null) }
  }

  const handleNoShow = async (id: number) => {
    if (!confirm('Mark this patient as no-show? The patient will be notified and can reschedule.')) return
    try {
      await appointmentApi.markNoShow(id)
      toast.success('Marked as no-show')
      load()
    } catch { /* error toast from API interceptor */ }
  }

  const filteredToday = todayAppointments.filter(a => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch = !q || a.patientName?.toLowerCase().includes(q)
    const matchesStatus =
      tableStatusFilter === 'ALL' ||
      (tableStatusFilter === 'SCHEDULED' && (a.status === 'SCHEDULED' || a.status === 'RESCHEDULED')) ||
      (tableStatusFilter !== 'ALL' && tableStatusFilter !== 'SCHEDULED' && a.status === tableStatusFilter)
    return matchesSearch && matchesStatus
  })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: "'Sora', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2.5px solid #f0fdfa', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>Loading dashboard…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  )

  /* ─── shared tokens ─── */
  const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #f1f5f9',
    borderRadius: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  }
  const label11: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: '#94a3b8',
  }
  const sectionTitle: React.CSSProperties = {
    fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0,
  }
  const sectionSub: React.CSSProperties = {
    fontSize: 12, color: '#94a3b8', marginTop: 2,
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .pv { font-family: 'Sora', sans-serif; color: #0f172a; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes up { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
        @keyframes pdot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.75)} }

        .fade-up { animation: up .45s ease both; }

        .stat-pill {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: 12px;
          transition: transform .15s;
        }
        .stat-pill:hover { transform: translateX(3px); }

        .appt-row {
          display: grid;
          grid-template-columns: 32px 1fr 90px 68px 110px 180px;
          gap: 10px; align-items: center;
          padding: 11px 16px; border-radius: 12px;
          border: 1px solid transparent;
          transition: background .15s, border-color .15s;
        }
        .appt-row:hover { background: #f8fffe; border-color: #ccfbf1; }

        .action-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 12px; border-radius: 7px;
          border: none; font-size: 11px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer;
          transition: opacity .15s, transform .15s;
          white-space: nowrap;
        }
        .action-btn:hover { opacity: .85; transform: scale(1.03); }

        .period-btn {
          padding: 6px 12px; border-radius: 8px;
          font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: 'Sora', sans-serif;
          transition: all .15s;
        }

        .search-input {
          padding: 8px 12px; border-radius: 9px;
          border: 1.5px solid #e2e8f0; background: #fafeff;
          font-family: 'Sora', sans-serif; font-size: 12.5px;
          color: #0f172a; outline: none; width: 180px;
          transition: border-color .15s, box-shadow .15s;
        }
        .search-input:focus {
          border-color: #0d9488;
          box-shadow: 0 0 0 3px rgba(13,148,136,.08);
        }
        .search-input::placeholder { color: #cbd5e1; }

        .status-select {
          padding: 8px 12px; border-radius: 9px;
          border: 1.5px solid #e2e8f0; background: #fff;
          font-family: 'Sora', sans-serif; font-size: 12.5px;
          font-weight: 600; color: #475569; cursor: pointer;
          outline: none;
        }

        .notif-row {
          display: flex; gap: 10px; padding: 11px 0;
          border-bottom: 1px solid #f8fafc;
        }
        .notif-row:last-child { border-bottom: none; }

        .online-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #10b981; animation: pdot 2s infinite;
          display: inline-block;
        }
      `}</style>

      <div className="pv" style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 48 }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ ...label11, color: '#0d9488', marginBottom: 6 }}>Doctor Portal</p>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
              {greeting()}, <span style={{ color: '#0d9488' }}>Dr. {user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span className="online-dot" />
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── TOP STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 20 }}>
          {[
            {
              label: 'Unique Patients',
              value: uniquePatientCount,
              sub: `${appointments.length} total visits`,
              icon: Users,
              accent: '#2563eb',
              bg: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
            },
            {
              label: "Today's Appointments",
              value: todayAppointments.length,
              sub: new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
              icon: Calendar,
              accent: '#db2777',
              bg: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)',
            },
            {
              label: 'Pending Prescriptions',
              value: pendingRx,
              sub: 'Completed without Rx',
              icon: FileText,
              accent: '#ea580c',
              bg: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)',
            },
            {
              label: statsPeriod === 'all' ? 'Revenue (All time)' : `Revenue (${periodLabel})`,
              value: `₹${(statsPeriod === 'all' ? revenueLifetime : revenueScoped).toLocaleString('en-IN')}`,
              sub: statsPeriod !== 'all' ? `All-time: ₹${revenueLifetime.toLocaleString('en-IN')}` : 'Paid consultations',
              icon: DollarSign,
              accent: '#16a34a',
              bg: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
            },
          ].map((s, i) => (
            <div key={s.label} className="fade-up" style={{ background: s.bg, borderRadius: 16, padding: '20px 22px', position: 'relative', overflow: 'hidden', animationDelay: `${i * 0.07}s` }}>
              {/* decorative circle */}
              <div style={{ position: 'absolute', top: -24, right: -24, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <s.icon size={17} color="white" />
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 5px' }}>{s.label}</p>
                <p style={{ fontSize: 30, fontWeight: 700, color: 'white', margin: '0 0 8px', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', margin: 0 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TODAY'S MINI STATS ── */}
        <div className="fade-up" style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginBottom: 24, animationDelay: '.15s', overflow: 'hidden' }}>
          {[
            { label: 'Scheduled today',      value: todayScheduled,      color: '#0d9488', bg: '#f0fdfa', icon: Calendar },
            { label: 'Pending payment',       value: todayPendingPayment, color: '#d97706', bg: '#fffbeb', icon: DollarSign },
            { label: 'Pending prescription',  value: todayPendingRx,      color: '#7c3aed', bg: '#f5f3ff', icon: FileText },
            { label: 'No-show today',         value: todayNoShow,         color: '#64748b', bg: '#f8fafc', icon: UserX },
          ].map((item, i) => (
            <div key={item.label} style={{ padding: '18px 20px', background: item.bg, borderRight: i < 3 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'white', border: `1px solid ${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                <item.icon size={16} />
              </div>
              <div>
                <p className="mono" style={{ fontSize: 22, fontWeight: 700, color: item.color, margin: 0, lineHeight: 1 }}>{item.value}</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', margin: '4px 0 0' }}>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* APPOINTMENT OVERVIEW */}
            <div className="fade-up" style={{ ...card, padding: 24, animationDelay: '.2s' }}>

              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <p style={sectionTitle}>Appointment Overview</p>
                  <p style={sectionSub}>Track performance across time ranges</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['30d', '90d', 'all'] as StatsPeriod[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setStatsPeriod(p)}
                      className="period-btn"
                      style={{
                        border: statsPeriod === p ? '1.5px solid #0d9488' : '1.5px solid #e2e8f0',
                        background: statsPeriod === p ? '#f0fdfa' : 'white',
                        color: statsPeriod === p ? '#0f766e' : '#64748b',
                      }}
                    >
                      {p === '30d' ? '30 days' : p === '90d' ? '90 days' : 'All time'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduled / Completed pair */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
                <div style={{ padding: '18px 20px', borderRadius: 12, background: '#f0fdfa', border: '1px solid #ccfbf1' }}>
                  <p style={{ ...label11, color: '#0d9488', marginBottom: 8 }}>Scheduled / Upcoming</p>
                  <p style={{ fontSize: 34, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', lineHeight: 1 }}>{scheduledScoped}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{periodLabel} · scheduled or rescheduled</p>
                </div>
                <div style={{ padding: '18px 20px', borderRadius: 12, background: '#f5f3ff', border: '1px solid #ede9fe' }}>
                  <p style={{ ...label11, color: '#7c3aed', marginBottom: 8 }}>Completed Visits</p>
                  <p style={{ fontSize: 34, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', lineHeight: 1 }}>{completedScoped}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{periodLabel}</p>
                </div>
              </div>

              {/* Status donut */}
              <div style={{ padding: '18px 20px', borderRadius: 12, background: '#fafffe', border: '1px solid #f1f5f9', marginBottom: 22 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
                  Status breakdown · <span style={{ color: '#94a3b8', fontWeight: 500 }}>{periodLabel.toLowerCase()}</span>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
                  <div style={{ width: 110, height: 110, borderRadius: '50%', background: pieGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#fafffe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>{statusSlices.n}</p>
                        <p style={{ fontSize: 9, color: '#94a3b8', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>total</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 28px', flex: 1, minWidth: 180 }}>
                    {[
                      { label: 'Completed', value: statusSlices.completed, color: '#059669' },
                      { label: 'Scheduled', value: statusSlices.scheduled, color: '#0d9488' },
                      { label: 'Cancelled', value: statusSlices.cancelled, color: '#dc2626' },
                      { label: 'No-show',   value: statusSlices.noShow,   color: '#9ca3af' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#64748b', flex: 1 }}>{item.label}</span>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Monthly bar chart */}
              <div style={{ paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>Monthly Completed</p>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                    {monthlyChartData[0]?.year}–{monthlyChartData[11]?.year}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 100 }}>
                  {monthlyChartData.map((m, i) => {
                    const pct = maxMonthCount > 0 ? Math.max((m.count / maxMonthCount) * 100, m.count > 0 ? 8 : 0) : 0
                    const isCurrent = i === 11
                    return (
                      <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                        {m.count > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: isCurrent ? '#2563eb' : '#0d9488' }}>{m.count}</span>
                        )}
                        <div style={{
                          height: `${pct}%`, width: '100%', minHeight: pct > 0 ? 6 : 3,
                          borderRadius: '3px 3px 0 0',
                          background: isCurrent
                            ? 'linear-gradient(to top, #1d4ed8, #60a5fa)'
                            : m.count > 0
                              ? 'linear-gradient(to top, #0d9488, #5eead4)'
                              : '#f1f5f9',
                          transition: 'height .5s ease',
                        }} />
                        <span style={{ fontSize: 9, color: isCurrent ? '#2563eb' : '#94a3b8', fontWeight: isCurrent ? 700 : 500 }}>
                          {m.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* TODAY'S APPOINTMENTS TABLE */}
            <div className="fade-up" style={{ ...card, padding: 24, animationDelay: '.27s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <p style={sectionTitle}>Today's Appointments</p>
                  <p style={sectionSub}>Manage and act on today's patient schedule</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="search"
                    placeholder="Search patient…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  <select
                    value={tableStatusFilter}
                    onChange={e => setTableStatusFilter(e.target.value)}
                    className="status-select"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="SCHEDULED">Scheduled + rescheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="NO_SHOW">No-show</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <button
                    onClick={() => navigate('/doctor/appointments')}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: '#0d9488', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
                  >
                    View all <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>

              {/* Column headers */}
              <div className="appt-row" style={{ padding: '6px 16px', marginBottom: 4, background: 'transparent', border: 'none' }}>
                {['#', 'Patient', 'Date', 'Time', 'Status', 'Actions'].map(h => (
                  <span key={h} style={label11}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filteredToday.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    <Calendar size={36} style={{ margin: '0 auto 10px', opacity: .3 }} />
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No appointments today</p>
                  </div>
                ) : filteredToday.slice(0, 6).map((a, idx) => {
                  const st = STATUS_MAP[a.status] || STATUS_MAP.SCHEDULED
                  return (
                    <div key={a.id} className="appt-row">
                      <span className="mono" style={{ fontSize: 11, color: '#cbd5e1' }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                        <img
                          src={generateAvatarUrl(a.patientName, 32)}
                          alt={a.patientName}
                          style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.patientName}</p>
                          <p style={{ fontSize: 10.5, color: '#94a3b8', margin: 0 }}>{a.isFirstVisit ? 'New' : 'Returning'}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(a.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="mono" style={{ fontSize: 12, color: '#64748b' }}>
                        {a.startTime?.slice(0, 5)}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 20, display: 'inline-block', whiteSpace: 'nowrap' }}>
                        {st.label}
                      </span>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {(a.status === 'SCHEDULED' || a.status === 'RESCHEDULED') && (
                          <>
                            <button onClick={() => openCompleteModal(a)} className="action-btn" style={{ background: '#0d9488', color: 'white' }}>
                              Complete
                            </button>
                            <button onClick={() => handleNoShow(a.id)} className="action-btn" style={{ background: '#64748b', color: 'white' }}>
                              <UserX size={11} /> No-show
                            </button>
                          </>
                        )}
                        {a.status === 'COMPLETED' && !a.hasPrescription && (
                          <button onClick={() => navigate('/doctor/prescriptions/new')} className="action-btn" style={{ background: '#7c3aed', color: 'white' }}>
                            Add Rx
                          </button>
                        )}
                        {a.status === 'COMPLETED' && a.hasPrescription && (
                          <span style={{ fontSize: 11, color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={13} /> Done
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* QUICK STATS */}
            <div className="fade-up" style={{ ...card, padding: 22, animationDelay: '.22s' }}>
              <p style={{ ...sectionTitle, marginBottom: 16 }}>Quick Stats</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Avg paid (in range)', value: paidInScopeCount > 0 ? `₹${avgPaidInScope.toLocaleString('en-IN')}` : '—', color: '#0d9488', bg: '#f0fdfa', icon: DollarSign },
                  { label: 'Pending prescriptions', value: pendingRx,        color: '#d97706', bg: '#fffbeb', icon: FileText },
                  { label: 'Completed (in range)',  value: completedScoped,  color: '#059669', bg: '#f0fdf4', icon: CheckCircle },
                  { label: 'Scheduled (in range)',  value: scheduledScoped,  color: '#7c3aed', bg: '#f5f3ff', icon: Clock },
                ].map(item => (
                  <div key={item.label} className="stat-pill" style={{ background: item.bg, border: `1px solid ${item.color}18` }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'white', border: `1px solid ${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: item.color }}>
                      <item.icon size={15} />
                    </div>
                    <span style={{ flex: 1, fontSize: 12, color: '#64748b', fontWeight: 500 }}>{item.label}</span>
                    <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="fade-up" style={{ ...card, padding: 22, animationDelay: '.28s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={sectionTitle}>Recent Activity</p>
                <button
                  onClick={() => navigate('/doctor/notifications')}
                  style={{ fontSize: 12, fontWeight: 600, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Sora, sans-serif', padding: 0 }}
                >
                  See all
                </button>
              </div>
              {notifications.length === 0 ? (
                <p style={{ fontSize: 12.5, color: '#94a3b8', textAlign: 'center', padding: '20px 0', margin: 0 }}>No recent activity</p>
              ) : (
                <div>
                  {notifications.map((n) => (
                    <div key={n.id} className="notif-row">
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.isRead ? '#e2e8f0' : '#0d9488', marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: n.isRead ? '#94a3b8' : '#0f172a', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>
                        <p className="mono" style={{ fontSize: 10, color: '#cbd5e1', margin: 0 }}>
                          {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── COMPLETE MODAL ── */}
      {completeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(2px)' }}>
          <div style={{ width: 'min(460px, 100%)', background: 'white', borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,.2)', overflow: 'hidden', animation: 'up .25s ease' }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 3px' }}>Complete Appointment</p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Consultation with {completeModal.patientName}</p>
            </div>

            <div style={{ padding: '20px 22px' }}>
              {completeModal.paymentStatus !== 'PAID' && (
                <div style={{ padding: '11px 14px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: 12, fontWeight: 500, marginBottom: 16 }}>
                  ⚠️ This appointment has a pending payment. Collect fees before completing if applicable.
                </div>
              )}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                Consultation Notes
              </label>
              <textarea
                value={completeNotes}
                onChange={e => setCompleteNotes(e.target.value)}
                rows={4}
                placeholder="Add consultation notes…"
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', fontFamily: 'Sora, sans-serif', fontSize: 13, outline: 'none', color: '#0f172a', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCompleteModal(null)}
                style={{ padding: '8px 16px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontSize: 13 }}
              >
                Cancel
              </button>
              {completeModal.paymentStatus !== 'PAID' ? (
                <>
                  <button
                    disabled={completingId === completeModal.id}
                    onClick={() => handleComplete(false)}
                    style={{ padding: '8px 16px', borderRadius: 9, border: '1.5px solid #fde68a', background: '#fffbeb', color: '#92400e', fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontSize: 13 }}
                  >
                    Complete unpaid
                  </button>
                  <button
                    disabled={completingId === completeModal.id}
                    onClick={() => handleComplete(true)}
                    style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: '#0d9488', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontSize: 13 }}
                  >
                    {completingId === completeModal.id ? 'Saving…' : 'Payment collected ✓'}
                  </button>
                </>
              ) : (
                <button
                  disabled={completingId === completeModal.id}
                  onClick={() => handleComplete(false)}
                  style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: '#0d9488', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontSize: 13 }}
                >
                  {completingId === completeModal.id ? 'Saving…' : 'Complete visit ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}