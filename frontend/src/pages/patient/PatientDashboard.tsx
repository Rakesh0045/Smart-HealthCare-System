import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { appointmentApi, prescriptionApi, paymentApi } from '../../api'
import toast from 'react-hot-toast'
import {
  Calendar, FileText, Brain, Search,
  Plus, ArrowRight, Clock, CheckCircle2,
  Activity, TrendingUp,
  ChevronRight, AlarmClock, Pill, Check
} from 'lucide-react'

type ReminderSlot = {
  slotKey: string
  prescriptionMedicineId: number
  medicineName: string
  dosage?: string
  frequency?: string
  duration?: string
  prescribedDays?: number
  dayNumber?: number
  timeLabel: string
  slotIndex: number
  taken: boolean
}

type ReminderData = {
  totalSlots: number
  completedSlots: number
  slots: ReminderSlot[]
}

export default function PatientDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [reminderData, setReminderData] = useState<ReminderData | null>(null)
  const [savingDoseKey, setSavingDoseKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadReminderData = async (date?: string) => {
    const reminderRes = await prescriptionApi.getReminderToday(date)
    setReminderData(reminderRes.data?.data || { totalSlots: 0, completedSlots: 0, slots: [] })
  }

  useEffect(() => {
    Promise.all([
      appointmentApi.getMy(),
      prescriptionApi.getMy(),
      prescriptionApi.getReminderToday(),
    ]).then(([apptRes, prescriptionRes, reminderRes]) => {
      setAppointments(apptRes.data.data || [])
      setPrescriptions(prescriptionRes.data.data || [])
      setReminderData(reminderRes.data?.data || { totalSlots: 0, completedSlots: 0, slots: [] })
    }).finally(() => setLoading(false))
  }, [])

  const upcoming = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED')
  const completed = appointments.filter(a => a.status === 'COMPLETED')
  const noShowAppointments = appointments.filter(a => a.status === 'NO_SHOW')
  const latestNoShow = noShowAppointments[0]
  const pendingPaymentAppointment = [...upcoming]
    .filter(a => (a.paymentStatus || 'PENDING') !== 'PAID')
    .filter(a => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED') 
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())[0]
  const nextAppointment = [...upcoming].sort((a, b) =>
    new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())[0]
  const followUpReminder = [...prescriptions]
    .filter((rx: any) => rx.followUpDate)
    .map((rx: any) => ({
      ...rx,
      daysUntilFollowUp: Math.ceil((new Date(rx.followUpDate).getTime() - Date.now()) / 86400000),
    }))
    .filter((rx: any) => rx.daysUntilFollowUp <= 7)
    .sort((a: any, b: any) => a.daysUntilFollowUp - b.daysUntilFollowUp || new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime())[0]
  const medicines = [...prescriptions]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .flatMap(rx => (rx.medicines || []).map((m: any) => ({
      key: `${rx.id}-${m.id ?? m.medicineName}`,
      medicineName: m.medicineName,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      prescribedBy: rx.doctorName ? `Dr. ${rx.doctorName}` : 'Care team',
    })))

  const reminderSlots = reminderData?.slots || []
  const totalDoseSlots = reminderData?.totalSlots ?? reminderSlots.length
  const dosesDone = reminderData?.completedSlots ?? reminderSlots.filter(slot => slot.taken).length
  const adherence = totalDoseSlots > 0
    ? Math.round((dosesDone / totalDoseSlots) * 100)
    : 0

  const handleDoseToggle = async (slot: ReminderSlot) => {
    const nextTaken = !slot.taken

    setSavingDoseKey(slot.slotKey)
    setReminderData(prev => {
      if (!prev) return prev
      const completedDelta = nextTaken ? 1 : -1
      return {
        ...prev,
        completedSlots: Math.max(0, prev.completedSlots + completedDelta),
        slots: prev.slots.map(s => s.slotKey === slot.slotKey ? { ...s, taken: nextTaken } : s),
      }
    })

    try {
      const res = await prescriptionApi.updateDoseCompletion({
        prescriptionMedicineId: slot.prescriptionMedicineId,
        slotIndex: slot.slotIndex,
        taken: nextTaken,
      })
      setReminderData(res.data?.data || null)
    } catch {
      await loadReminderData()
    } finally {
      setSavingDoseKey(null)
    }
  }

  const getTimeUntil = (date: string) => {
    const now = new Date()
    const target = new Date(date)
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    return `In ${Math.ceil(diffDays / 7)} weeks`
  }

  const getFollowUpLabel = (date: string) => {
    const diffDays = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    return `In ${Math.ceil(diffDays / 7)} weeks`
  }

  const buildBookingPath = (doctorName?: string, specialization?: string, date?: string) => {
    const params = new URLSearchParams()
    if (doctorName) params.set('doctorName', doctorName)
    if (specialization) params.set('specialization', specialization)
    if (date) params.set('date', date)
    return `/patient/book${params.toString() ? `?${params.toString()}` : ''}`
  }

  const buildReschedulePath = (appt: any) =>
    `/patient/book?reschedule=${appt.id}&doctorId=${appt.doctorId}`

  const handlePayNow = async (appointmentId?: number) => {
    if (!appointmentId) return
    setLoading(true)
    try {
      const { data } = await paymentApi.createOrder(appointmentId)
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
        name: 'Smart Healthcare', description: `Appointment payment`,
        order_id: order.orderId,
        handler: async (response: any) => {
          await paymentApi.verify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            appointmentId,
          })
          toast.success('Payment successful! 🎉')
          navigate('/patient/appointments')
        },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#2563eb' },
      })
      rzp.open()
    } catch (err) {
      console.error(err)
      toast.error('Failed to initiate payment')
    } finally { setLoading(false) }
  }

  const isFollowUpOverdue = followUpReminder
    ? new Date(followUpReminder.followUpDate).getTime() < Date.now()
    : false

  const followUpReminderCard = followUpReminder ? (
    <div style={{
      marginTop: 14, borderRadius: 14,
      border: '1px solid #e2e8f0',
      background: 'white',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid #f1f5f9',
        background: '#f8fafc',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <AlarmClock size={13} color="#64748b" />
          <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: 0 }}>
            Follow-up Reminder
          </p>
        </div>
        <span style={{
          padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: isFollowUpOverdue ? '#fef2f2' : '#f0fdf4',
          color: isFollowUpOverdue ? '#ef4444' : '#16a34a',
          border: `1px solid ${isFollowUpOverdue ? '#fecaca' : '#bbf7d0'}`,
        }}>
          {getFollowUpLabel(followUpReminder.followUpDate)}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {/* Doctor row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 14,
            boxShadow: '0 2px 8px rgba(37,99,235,0.2)',
          }}>
            {followUpReminder.doctorName?.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Dr. {followUpReminder.doctorName}
            </p>
            {followUpReminder.doctorSpecialization && (
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 500, margin: '1px 0 0' }}>
                {followUpReminder.doctorSpecialization}
              </p>
            )}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
            padding: '5px 9px', borderRadius: 9,
            background: '#f1f5f9', border: '1px solid #e2e8f0',
          }}>
            <Calendar size={11} color="#64748b" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
              {new Date(followUpReminder.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Overdue notice */}
        {isFollowUpOverdue && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '8px 10px', borderRadius: 9, marginBottom: 10,
            background: '#fef2f2', border: '1px solid #fecaca',
            textAlign: 'left',
          }}>
            <span style={{ fontSize: 12, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>⚠️</span>
            <p style={{ fontSize: 11, color: '#b91c1c', fontWeight: 500, margin: 0, lineHeight: 1.5, textAlign: 'left' }}>
              Follow-up date has passed. We'll find the earliest available slot.
            </p>
          </div>
        )}

        {/* CTA */}
        <button
          className="teal-btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => navigate(buildBookingPath(followUpReminder.doctorName, followUpReminder.doctorSpecialization, followUpReminder.followUpDate))}
        >
          <Calendar size={14} />
          {isFollowUpOverdue ? 'Find Earliest Slot' : 'Book Follow-up'}
        </button>
      </div>
    </div>
  ) : null

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

        /* ── Stat cards ── */
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

        /* ── Medicine reminder ── */
        .reminder-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; padding: 10px 12px;
          border-radius: 12px; border: 1px solid #e6f7f5;
          background: #fbfffe; animation: fadeSlide 0.4s ease both;
          transition: all 0.18s;
        }
        .reminder-row:hover {
          border-color: #99f6e4;
          transform: translateX(2px);
        }
        .reminder-row.done {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .dose-check {
          width: 28px; height: 28px; border-radius: 8px;
          border: 1.5px solid #cbd5e1; background: white;
          color: #94a3b8; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .dose-check:hover { border-color: #0d9488; color: #0d9488; }
        .dose-check.done {
          border-color: #16a34a; background: #16a34a; color: white;
          box-shadow: 0 4px 10px rgba(22,163,74,0.2);
        }
        .adherence-track {
          height: 8px; border-radius: 999px;
          background: #ecfeff; overflow: hidden;
          border: 1px solid #ccfbf1;
        }
        .adherence-fill {
          height: 100%; border-radius: 999px;
          transition: width 0.35s ease;
        }

        @media (max-width: 1280px) {
          .pat-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pat-main-grid { grid-template-columns: minmax(0, 1fr) minmax(280px, 360px); }
          .pat-health-card { grid-column: 1 / -1; }
        }

        @media (max-width: 980px) {
          .pat-main-grid { grid-template-columns: 1fr; }
          .pat-right-col { flex-direction: row; align-items: stretch; }
          .pat-right-col > .teal-card { flex: 1; }
        }

        @media (max-width: 720px) {
          .pat-stat-grid { grid-template-columns: 1fr; }
          .pat-right-col { flex-direction: column; }
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
              {getGreeting()}, <span style={{ color: '#2563eb' }}>{user?.name?.split(' ')[0]}</span> 👋
            </h1>
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

        {/* ─────── Stat cards ─────── */}
        <div className="pat-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Upcoming', value: upcoming.length, sub: 'appointments', grad: 'linear-gradient(135deg, #0d9488, #0891b2)', shadow: 'rgba(13,148,136,0.3)', icon: Calendar },
            { label: 'Completed', value: completed.length, sub: 'sessions', grad: 'linear-gradient(135deg, #15803d, #22c55e)', shadow: 'rgba(34,197,94,0.3)', icon: CheckCircle2 },
            { label: 'Total Visits', value: appointments.length, sub: 'all time', grad: 'linear-gradient(135deg, #6d28d9, #a78bfa)', shadow: 'rgba(167,139,250,0.3)', icon: Activity },
            { label: 'Medications', value: medicines.length, sub: 'active plan', grad: 'linear-gradient(135deg, #0284c7, #2563eb)', shadow: 'rgba(37,99,235,0.3)', icon: Pill },
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

        {/* ─────── Main responsive grid ─────── */}
        {latestNoShow && (
          <div className="teal-card" style={{ marginBottom: 24, padding: 18, borderColor: '#fed7aa', background: '#fff7ed', display: 'flex', alignItems: 'center', gap: 14, animationDelay: '0.18s' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlarmClock size={20} color="#c2410c" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#9a3412', margin: '0 0 3px' }}>
                Missed appointment with Dr. {latestNoShow.doctorName}
              </p>
              <p style={{ fontSize: 12, color: '#9a3412', margin: 0 }}>
                {new Date(latestNoShow.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {latestNoShow.startTime?.slice(0, 5)}. Pick a new slot to continue your care.
              </p>
            </div>
            <button className="teal-btn-primary" style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)', boxShadow: '0 4px 14px rgba(249,115,22,0.25)' }}
              onClick={() => navigate(buildReschedulePath(latestNoShow))}>
              <Calendar size={14} /> Reschedule
            </button>
          </div>
        )}

        {pendingPaymentAppointment && (pendingPaymentAppointment.status === 'SCHEDULED' || pendingPaymentAppointment.status === 'RESCHEDULED') && (
          <div className="teal-card" style={{ marginBottom: 24, padding: 18, borderColor: '#fde68a', background: '#fffbeb', display: 'flex', alignItems: 'center', gap: 14, animationDelay: '0.2s' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={20} color="#d97706" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#92400e', margin: '0 0 3px' }}>
                Payment pending for Dr. {pendingPaymentAppointment.doctorName}
              </p>
              <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
                You can pay online now or pay at the clinic during your appointment.
              </p>
            </div>
                <button className="teal-btn-primary" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 4px 14px rgba(245,158,11,0.25)' }}
                  onClick={() => handlePayNow(pendingPaymentAppointment.id)}>
                  <Calendar size={14} /> Pay Now
                </button>
          </div>
        )}

        <div className="pat-main-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr) minmax(290px, 340px)', gap: 20 }}>

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
                    background: (nextAppointment.status === 'CANCELLED' || nextAppointment.status === 'NO_SHOW') ? 'rgba(239,68,68,0.06)' : (nextAppointment.paymentStatus === 'PAID' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'),
                    color: (nextAppointment.status === 'CANCELLED' || nextAppointment.status === 'NO_SHOW') ? '#ef4444' : (nextAppointment.paymentStatus === 'PAID' ? '#10b981' : '#f59e0b')
                  }}>
                    {nextAppointment.status === 'CANCELLED' ? 'Cancelled' : nextAppointment.status === 'NO_SHOW' ? 'No Show' : (nextAppointment.paymentStatus === 'PAID' ? 'Paid' : 'Payment Pending')}
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
                <div style={{ display: 'flex', gap: 8, marginTop: 2, marginBottom: 14 }}>
                  <button className="teal-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/patient/appointments')}>
                    <Calendar size={14} /> Reschedule
                  </button>
                </div>

                {followUpReminderCard}

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* No appointments — teal dashed card */}
                <div style={{ textAlign: 'center', padding: '36px 20px', border: '2px dashed #ccfbf1', borderRadius: 16, background: 'linear-gradient(135deg, rgba(240,253,250,0.5), rgba(230,247,245,0.3))' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, rgba(13,148,136,0.1), rgba(8,145,178,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '1.5px solid #e6f7f5' }}>
                    <Calendar size={24} color="#0d9488" />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No upcoming appointments</h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 18px' }}>Schedule a consultation with your doctor</p>
                  <button className="teal-btn-primary" onClick={() => navigate('/patient/book')}>
                    <Plus size={14} /> Book Appointment
                  </button>
                </div>

                {/* Follow-up reminder — separate blue dashed card */}
                {followUpReminder && (
                  <div style={{ border: '2px dashed #ccfbf1', borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(240,253,250,0.5), rgba(230,247,245,0.3))' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(204,251,241,0.7)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <AlarmClock size={13} color="#64748b" />
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: 0 }}>Follow-up Reminder</p>
                      </div>
                      <span style={{
                        padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: isFollowUpOverdue ? '#fef2f2' : '#f0fdf4',
                        color: isFollowUpOverdue ? '#ef4444' : '#16a34a',
                        border: `1px solid ${isFollowUpOverdue ? '#fecaca' : '#bbf7d0'}`,
                      }}>
                        {getFollowUpLabel(followUpReminder.followUpDate)}
                      </span>
                    </div>
                    {/* Body */}
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, boxShadow: '0 2px 8px rgba(37,99,235,0.2)' }}>
                          {followUpReminder.doctorName?.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Dr. {followUpReminder.doctorName}
                          </p>
                          {followUpReminder.doctorSpecialization && (
                            <p style={{ fontSize: 11, color: '#64748b', fontWeight: 500, margin: '1px 0 0' }}>{followUpReminder.doctorSpecialization}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '5px 9px', borderRadius: 9, background: 'rgba(255,255,255,0.7)', border: '1px solid #e2e8f0' }}>
                          <Calendar size={11} color="#64748b" />
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                            {new Date(followUpReminder.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      {isFollowUpOverdue && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 9, marginBottom: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
                          <span style={{ fontSize: 12, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>⚠️</span>
                          <p style={{ fontSize: 11, color: '#b91c1c', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                            Follow-up date has passed. We'll find the earliest available slot.
                          </p>
                        </div>
                      )}
                      <button className="teal-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => navigate(buildBookingPath(followUpReminder.doctorName, followUpReminder.doctorSpecialization, followUpReminder.followUpDate))}>
                        <Calendar size={14} />
                        {isFollowUpOverdue ? 'Find Earliest Slot' : 'Book Follow-up'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Health Overview ─── */}
          <div className="teal-card pat-health-card" style={{ padding: 24, animationDelay: '0.3s' }}>
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
                { label: noShowAppointments.length ? 'Missed' : 'Upcoming', value: noShowAppointments.length || upcoming.length, color: noShowAppointments.length ? '#ea580c' : '#f59e0b', bg: noShowAppointments.length ? '#fff7ed' : '#fffbeb', border: noShowAppointments.length ? '#fed7aa' : '#fde68a' },
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
              {appointments.slice(0, 2).map((a, i) => {
                const statusColor = a.status === 'COMPLETED' ? '#10b981' : a.status === 'CANCELLED' ? '#ef4444' : a.status === 'NO_SHOW' ? '#ea580c' : '#0d9488'
                const statusBg = a.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : a.status === 'CANCELLED' ? 'rgba(239,68,68,0.1)' : a.status === 'NO_SHOW' ? '#fff7ed' : 'rgba(13,148,136,0.1)'
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

          {/* ─── Right column: Quick Actions + Medicine ─── */}
          <div className="pat-right-col" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Quick Actions */}
            <div className="teal-card" style={{ padding: 20, animationDelay: '0.32s' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { icon: Brain, label: 'AI Symptom Checker', sub: 'Analyze symptoms', color: '#7c3aed', bg: '#f5f3ff', path: '/patient/symptom-checker', delay: '0.35s' },
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

            {/* Medicine Reminder */}
            <div className="teal-card" style={{ padding: 20, animationDelay: '0.36s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Medicine Reminder</h2>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
                    {dosesDone}/{totalDoseSlots} doses done today
                  </p>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: adherence >= 80 ? 'rgba(16,185,129,0.12)' : adherence >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                  color: adherence >= 80 ? '#059669' : adherence >= 50 ? '#d97706' : '#dc2626',
                }}>
                  <AlarmClock size={12} /> {adherence}%
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {reminderSlots.slice(0, 4).map((slot, i) => {
                  const done = !!slot.taken
                  return (
                    <div key={slot.slotKey} className={`reminder-row ${done ? 'done' : ''}`} style={{ animationDelay: `${0.4 + i * 0.05}s` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Pill size={13} color="#0d9488" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {slot.medicineName}
                          </p>
                          <p className="pat-mono" style={{ fontSize: 10, color: '#64748b', margin: 0 }}>
                            {slot.dosage || 'As advised'} · {slot.timeLabel}
                            {slot.prescribedDays ? ` · Day ${slot.dayNumber}/${slot.prescribedDays}` : (slot.duration ? ` · ${slot.duration}` : '')}
                          </p>
                        </div>
                      </div>
                      <button
                        className={`dose-check ${done ? 'done' : ''}`}
                        disabled={savingDoseKey === slot.slotKey}
                        onClick={() => handleDoseToggle(slot)}
                        aria-label={`Mark ${slot.medicineName} as ${done ? 'not taken' : 'taken'}`}
                        title={done ? 'Mark as not taken' : 'Mark as taken'}>
                        <Check size={12} />
                      </button>
                    </div>
                  )
                })}

                {reminderSlots.length === 0 && (
                  <div style={{ textAlign: 'center', borderRadius: 12, border: '1px dashed #ccfbf1', padding: '16px 12px', background: '#f8fffe' }}>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>No active medication doses for today</p>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: 0 }}>Daily adherence</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: adherence >= 80 ? '#059669' : adherence >= 50 ? '#d97706' : '#dc2626', margin: 0 }}>
                    {adherence >= 80 ? 'Excellent' : adherence >= 50 ? 'On track' : 'Needs attention'}
                  </p>
                </div>
                <div className="adherence-track">
                  <div
                    className="adherence-fill"
                    style={{
                      width: `${adherence}%`,
                      background: adherence >= 80 ? '#10b981' : adherence >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => navigate('/patient/prescriptions')}
                style={{ width: '100%', padding: '9px', borderRadius: 10, border: '1.5px solid #e6f7f5', background: 'white', fontSize: 12, fontWeight: 600, color: '#2563eb', cursor: 'pointer', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                View prescriptions <ArrowRight size={12} />
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
