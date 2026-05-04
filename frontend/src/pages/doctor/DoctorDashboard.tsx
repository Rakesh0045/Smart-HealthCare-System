import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentApi, notificationApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import {
  Calendar, CheckCircle, Clock, Users, FileText,
  Bell, TrendingUp, ArrowUpRight, ChevronRight,
  Activity, MoreVertical, Search, Filter, Star,
  UserCheck, Stethoscope, DollarSign, BarChart2,
  Heart, Video, Phone, ChevronDown, UserX
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const generateAvatarUrl = (name?: string, size: number = 40) => 
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0d9488&color=fff&bold=true&size=${size}`



const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED:   { label: 'Completed',   color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  CANCELLED:   { label: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  SCHEDULED:   { label: 'Scheduled',   color: '#0d9488', bg: 'rgba(13,148,136,0.1)' },
  RESCHEDULED: { label: 'Rescheduled', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  NO_SHOW:     { label: 'No Show',     color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
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
  const [monthlyData, setMonthlyData] = useState<any[]>([])
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

      // Calculate monthly completed appointments
      const completedAppointments = (all.data.data || []).filter((a: any) => a.status === 'COMPLETED')
      const grouped: Record<string, { month: string; count: number }> = {}

      completedAppointments.forEach((a: any) => {
        const date = new Date(a.appointmentDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' })

        if (!grouped[monthKey]) {
          grouped[monthKey] = { month: monthLabel, count: 0 }
        }
        grouped[monthKey].count += 1
      })

      const result = Object.keys(grouped)
        .sort()
        .map(monthKey => grouped[monthKey])

      setMonthlyData(result)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const getMonthlyChartData = () => {
    const now = new Date()
    const months = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth()
      const count = appointments.filter(a => {
        if (a.status !== 'COMPLETED') return false
        const apptDate = new Date(a.appointmentDate)
        return apptDate.getFullYear() === year && apptDate.getMonth() === month
      }).length
      months.push({
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        year,
        count,
        key: `${year}-${month}`,
      })
    }
    return months
  }

  const monthlyChartData = getMonthlyChartData()
  const maxMonthCount = Math.max(...monthlyChartData.map(m => m.count), 1)

  const getMonthCompleted = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return appointments.filter(a => 
      a.status === 'COMPLETED' && new Date(a.appointmentDate) >= startOfMonth
    ).length
  }

  const scheduled = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED').length
  const completed = appointments.filter(a => a.status === 'COMPLETED').length
  const monthlyCompleted = getMonthCompleted()
  const pendingRx = appointments.filter(a => a.status === 'COMPLETED' && !a.hasPrescription).length
  const revenue = appointments.filter(a => a.paymentStatus === 'PAID').reduce((s, a) => s + (a.consultationFee || 0), 0)
  const unreadNotif = notifications.filter(n => !n.isRead).length
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
      setCompleteModal(null)
      load()
    } finally {
      setCompletingId(null)
    }
  }

  const handleNoShow = async (id: number) => {
    if (!confirm('Mark this patient as no-show? The patient will be notified and can reschedule.')) return
    await appointmentApi.markNoShow(id)
    load()
  }

  const filteredToday = todayAppointments.filter(a =>
    !searchQuery || a.patientName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: "'Sora', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #e6f7f5', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Loading dashboard...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .pv-dash { font-family: 'Sora', sans-serif; }
        .pv-mono { font-family: 'JetBrains Mono', monospace; }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.8)} }

        .pv-card {
          background: #ffffff;
          border: 1px solid #f0fdf4;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(13,148,136,0.04);
          animation: fadeSlide 0.5s ease both;
        }
        .pv-stat-card {
          border-radius: 20px;
          padding: 22px 24px;
          position: relative;
          overflow: hidden;
          animation: fadeSlide 0.5s ease both;
          cursor: default;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .pv-stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); }
        .pv-stat-card::before {
          content: ''; position: absolute; top: -30px; right: -30px;
          width: 120px; height: 120px; border-radius: 50%;
          background: rgba(255,255,255,0.08);
        }

        .appt-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-radius: 14px;
          border: 1px solid #f0fdf4; background: #fafffe;
          transition: all 0.18s; cursor: default;
          animation: fadeSlide 0.4s ease both;
        }
        .appt-row:hover { border-color: #5eead4; background: #f0fdfa; transform: translateX(4px); }

        .complete-btn {
          padding: 6px 14px; border-radius: 8px;
          background: linear-gradient(135deg, #0d9488, #0891b2);
          color: white; border: none; font-size: 11px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          cursor: pointer; letter-spacing: 0.02em;
          transition: all 0.18s;
        }
        .complete-btn:hover { opacity: 0.85; transform: scale(1.04); }

        .doc-card {
          background: white; border-radius: 14px;
          border: 1px solid #f0fdf4; padding: 14px;
          display: flex; align-items: center; gap: 12px;
          transition: all 0.2s; cursor: pointer;
          animation: fadeSlide 0.5s ease both;
        }
        .doc-card:hover { border-color: #5eead4; box-shadow: 0 4px 20px rgba(13,148,136,0.12); transform: translateY(-2px); }

        .search-input {
          width: 100%; padding: 10px 16px 10px 42px;
          border-radius: 12px; border: 1.5px solid #e6f7f5;
          background: #fafffe; font-family: 'Sora', sans-serif;
          font-size: 13px; color: #0f172a; outline: none;
          transition: all 0.2s;
        }
        .search-input:focus { border-color: #0d9488; background: #fff; box-shadow: 0 0 0 3px rgba(13,148,136,0.08); }
        .search-input::placeholder { color: #94a3b8; }

        .notif-item {
          display: flex; gap: 10px; padding: 10px 0;
          border-bottom: 1px solid #f0fdf4; animation: fadeSlide 0.4s ease both;
        }
        .notif-item:last-child { border-bottom: none; }

        .bar-segment {
          background: linear-gradient(to top, #0d9488, #5eead4);
          border-radius: 4px 4px 0 0; width: 18px;
          transition: height 0.6s ease;
        }
        .online-pulse {
          width: 8px; height: 8px; border-radius: 50%; background: #10b981;
          animation: pulse-dot 2s infinite;
        }
      `}</style>

      <div className="pv-dash" style={{ maxWidth: 1300, margin: '0 auto', paddingBottom: 40 }}>

        {/* TOP HEADER */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Doctor Portal
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
              {greeting()}, <span style={{ color: '#0d9488' }}>Dr. {user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="online-pulse" />
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Patients', value: appointments.length, icon: Users, grad: 'linear-gradient(135deg, #1e40af, #3b82f6)', change: '+12%', changeLabel: 'From last month' },
            { label: "Today's Appointments", value: todayAppointments.length, icon: Calendar, grad: 'linear-gradient(135deg, #be185d, #ec4899)', change: '+3', changeLabel: 'From yesterday' },
            { label: 'Pending Reports', value: pendingRx, icon: FileText, grad: 'linear-gradient(135deg, #c2410c, #f97316)', change: `${pendingRx} pending`, changeLabel: 'Prescriptions' },
            { label: 'Revenue Earned', value: `₹${revenue.toLocaleString()}`, icon: DollarSign, grad: 'linear-gradient(135deg, #15803d, #22c55e)', change: '+18%', changeLabel: 'From last month' },
          ].map((s, i) => (
            <div key={s.label} className="pv-stat-card" style={{ background: s.grad, animationDelay: `${i * 0.08}s` }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <s.icon style={{ width: 20, height: 20, color: 'white' }} />
                  </div>
                  <MoreVertical style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }} />
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{s.label}</p>
                <p style={{ fontSize: 32, fontWeight: 700, color: 'white', margin: '0 0 10px', lineHeight: 1 }}>{s.value}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{s.change}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{s.changeLabel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pv-card" style={{ padding: 18, marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, animationDelay: '0.16s' }}>
          {[
            { label: 'Today scheduled', value: todayScheduled, color: '#0d9488', bg: '#f0fdfa', icon: Calendar },
            { label: 'Pending payment', value: todayPendingPayment, color: '#d97706', bg: '#fffbeb', icon: DollarSign },
            { label: 'Pending prescription', value: todayPendingRx, color: '#7c3aed', bg: '#f5f3ff', icon: FileText },
            { label: 'No-show today', value: todayNoShow, color: '#475569', bg: '#f8fafc', icon: UserX },
          ].map(item => (
            <div key={item.label} style={{ padding: '12px 14px', borderRadius: 12, background: item.bg, border: `1px solid ${item.color}22`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
                <item.icon size={16} />
              </div>
              <div>
                <p className="pv-mono" style={{ fontSize: 20, fontWeight: 800, color: item.color, margin: 0, lineHeight: 1 }}>{item.value}</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '3px 0 0' }}>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* APPOINTMENT OVERVIEW WITH GRAPHS */}
            <div className="pv-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Appointment Overview</h2>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Track and manage your patient appointments</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e6f7f5', background: 'white', fontSize: 12, fontWeight: 600, color: '#0d9488', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                    Last 30 days <ChevronDown style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>

              {/* Main Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: '16px 20px', borderRadius: 14, background: 'linear-gradient(135deg, #f0fdfa, #e6f7f5)', border: '1px solid #ccfbf1' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Total Scheduled</p>
                  <p style={{ fontSize: 36, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', lineHeight: 1 }}>{scheduled}</p>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>↑ 47% From last month</span>
                </div>
                <div style={{ padding: '16px 20px', borderRadius: 14, background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #ddd6fe' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Total Completed</p>
                  <p style={{ fontSize: 36, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', lineHeight: 1 }}>{completed}</p>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>↑ 23% From last month</span>
                </div>
              </div>

              {/* Status Breakdown Pie Chart */}
              <div style={{ marginBottom: 24, padding: '16px', borderRadius: 12, background: '#fafffe', border: '1px solid #f0fdf4' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 12, margin: '0 0 12px' }}>Appointment Status Distribution</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  {/* Simple Pie Chart Representation */}
                  <div style={{ position: 'relative', width: 120, height: 120, borderRadius: '50%', background: `conic-gradient(#10b981 0deg ${(completed / appointments.length * 360) || 0}deg, #0d9488 ${(completed / appointments.length * 360) || 0}deg ${((completed + scheduled) / appointments.length * 360) || 180}deg, #f59e0b ${((completed + scheduled) / appointments.length * 360) || 180}deg 360deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{appointments.length}</p>
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>Total</p>
                      </div>
                    </div>
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {[
                      { label: 'Completed', value: completed, color: '#10b981' },
                      { label: 'Scheduled', value: scheduled, color: '#0d9488' },
                      { label: 'Other', value: appointments.length - completed - scheduled, color: '#f59e0b' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#64748b', flex: 1 }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Monthly Completed Chart */}
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f0fdf4' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>Monthly Completed Appointments</p>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', background: '#f8fafc', padding: '3px 10px', borderRadius: 20, border: '1px solid #f0fdf4' }}>
                    {monthlyChartData[0]?.year} – {monthlyChartData[11]?.year}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110, justifyContent: 'space-between' }}>
                  {monthlyChartData.map((m, i) => {
                    const pct = maxMonthCount > 0 ? Math.max((m.count / maxMonthCount) * 100, m.count > 0 ? 8 : 0) : 0
                    const isCurrent = i === 11
                    return (
                      <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          {m.count > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: isCurrent ? '#1e40af' : '#0d9488', marginBottom: 3 }}>{m.count}</span>}
                          <div style={{
                            height: `${pct}%`, width: '100%', minHeight: pct > 0 ? 10 : 4,
                            borderRadius: '4px 4px 0 0',
                            background: isCurrent
                              ? 'linear-gradient(to top, #1e40af, #60a5fa)'
                              : m.count > 0
                                ? 'linear-gradient(to top, #0d9488, #5eead4)'
                                : '#f0fdf4',
                            border: m.count === 0 ? '1px solid #e6f7f5' : 'none',
                            transition: 'height 0.6s ease',
                          }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 9, color: isCurrent ? '#1e40af' : '#94a3b8', fontWeight: isCurrent ? 700 : 600, display: 'block' }}>{m.label}</span>
                          {(i === 0 || m.year !== monthlyChartData[i-1]?.year) && (
                            <span style={{ fontSize: 8, color: '#cbd5e1', fontWeight: 500 }}>{m.year}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* TODAY'S APPOINTMENTS TABLE */}
            <div className="pv-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Recent Patient Appointment</h2>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Keep track of your patient data and appointments</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e6f7f5', background: 'white', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                    <Filter style={{ width: 13, height: 13 }} /> Filters
                  </button>
                  <button onClick={() => navigate('/doctor/appointments')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                    View all <ArrowUpRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              </div>

              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 1fr 180px', gap: 12, padding: '8px 16px', marginBottom: 8 }}>
                {['#', 'Patient Name', 'Date', 'Time', 'Status', 'Action'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredToday.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    <Calendar style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ fontSize: 14, fontWeight: 600 }}>No appointments today</p>
                  </div>
                ) : filteredToday.slice(0, 6).map((a, idx) => {
                  const st = STATUS_MAP[a.status] || STATUS_MAP.SCHEDULED
                  return (
                    <div key={a.id} className="appt-row" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 1fr 180px', gap: 12, animationDelay: `${idx * 0.05}s` }}>
                      <span className="pv-mono" style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={generateAvatarUrl(a.patientName, 34)}
                          alt={a.patientName}
                          style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>{a.patientName}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{a.isFirstVisit ? 'New Patient' : 'Returning'}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>
                        {new Date(a.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="pv-mono" style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>
                        {a.startTime?.slice(0, 5)}
                      </span>
                      <div style={{ alignSelf: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 20 }}>
                          {st.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignSelf: 'center' }}>
                        {(a.status === 'SCHEDULED' || a.status === 'RESCHEDULED') && (
                          <>
                            <button onClick={() => openCompleteModal(a)} className="complete-btn">
                              Complete
                            </button>
                            <button onClick={() => handleNoShow(a.id)} className="complete-btn" style={{ background: '#475569', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <UserX size={12} /> No-show
                            </button>
                          </>
                        )}
                        {a.status === 'COMPLETED' && !a.hasPrescription && (
                          <button onClick={() => navigate('/doctor/prescriptions')} className="complete-btn" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                            Add Rx
                          </button>
                        )}
                        {a.status === 'COMPLETED' && a.hasPrescription && (
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle style={{ width: 13, height: 13 }} /> Done
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



            {/* QUICK STATS PILLS */}
            <div className="pv-card" style={{ padding: 22 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>Quick Stats</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Avg per session', value: completed > 0 ? `₹${Math.round(revenue / completed).toLocaleString()}` : '₹0', color: '#0d9488', bg: '#f0fdfa', icon: DollarSign },
                  { label: 'Pending prescriptions', value: pendingRx, color: '#f59e0b', bg: '#fffbeb', icon: FileText },
                  { label: 'Total completed', value: completed, color: '#10b981', bg: '#f0fdf4', icon: CheckCircle },
                  { label: 'Upcoming scheduled', value: scheduled, color: '#7c3aed', bg: '#f5f3ff', icon: Clock },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: item.bg, border: `1px solid ${item.color}20` }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <item.icon style={{ width: 16, height: 16, color: item.color }} />
                    </div>
                    <span style={{ flex: 1, fontSize: 12, color: '#64748b', fontWeight: 500 }}>{item.label}</span>
                    <span className="pv-mono" style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* NOTIFICATIONS */}
            <div className="pv-card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Recent Activity</h2>
                <button onClick={() => navigate('/doctor/notifications')} style={{ fontSize: 12, fontWeight: 600, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                  See all
                </button>
              </div>
              {notifications.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No recent activity</p>
              ) : (
                <div>
                  {notifications.map((n, i) => (
                    <div key={n.id} className="notif-item" style={{ animationDelay: `${i * 0.06}s` }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.isRead ? '#e2e8f0' : '#0d9488', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: n.isRead ? '#94a3b8' : '#0f172a', margin: '0 0 2px' }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>
                        <p style={{ fontSize: 10, color: '#cbd5e1', margin: '3px 0 0', fontFamily: 'JetBrains Mono, monospace' }}>
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
      {completeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: 'min(480px, 100%)', background: 'white', borderRadius: 16, boxShadow: '0 24px 70px rgba(15,23,42,0.24)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>Complete appointment</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Dr. consultation with {completeModal.patientName}</p>
            </div>
            <div style={{ padding: 20 }}>
              {completeModal.paymentStatus !== 'PAID' && (
                <div style={{ padding: 12, borderRadius: 12, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
                  This appointment is payment pending. Collect payment if needed before completing it.
                </div>
              )}
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Consultation notes</label>
              <textarea
                value={completeNotes}
                onChange={e => setCompleteNotes(e.target.value)}
                rows={4}
                placeholder="Add consultation notes..."
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 12, fontFamily: 'Sora, sans-serif', fontSize: 13, outline: 'none' }}
              />
            </div>
            <div style={{ padding: 16, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setCompleteModal(null)} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              {completeModal.paymentStatus !== 'PAID' ? (
                <>
                  <button disabled={completingId === completeModal.id} onClick={() => handleComplete(false)} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', fontWeight: 700, cursor: 'pointer' }}>Complete unpaid</button>
                  <button disabled={completingId === completeModal.id} onClick={() => handleComplete(true)} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                    {completingId === completeModal.id ? 'Saving...' : 'Payment collected'}
                  </button>
                </>
              ) : (
                <button disabled={completingId === completeModal.id} onClick={() => handleComplete(false)} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                  {completingId === completeModal.id ? 'Saving...' : 'Complete visit'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
