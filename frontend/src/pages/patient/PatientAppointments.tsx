import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { appointmentApi, patientApi } from '../../api'
import {
  Calendar, Plus, Star, X, Clock, Stethoscope, ChevronDown,
  CheckCircle2, XCircle, RefreshCw, CreditCard, FileText,
  AlertCircle, ArrowUpRight, Search, CalendarCheck,
  CalendarX, CalendarClock, Activity, AlarmClock, Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ─── helpers ─────────────────────────────────────────────── */
function fmtDate(d: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleDateString('en-IN', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(t: string) {
  if (!t) return '--:--'
  const [h, m] = t.split(':'); const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}
function fmtRelative(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return `In ${diff}d`
  return `In ${Math.ceil(diff / 7)}w`
}
function isAfterToday(date: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  return d.getTime() > today.getTime()
}
function isToday(date: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  return d.getTime() === today.getTime()
}
function getTimelineSteps(appt: any) {
  return [
    { label: 'Booked', done: true },
    { label: appt.paymentStatus === 'PAID' ? 'Paid' : 'Payment pending', done: appt.paymentStatus === 'PAID' },
    {
      label: appt.status === 'CANCELLED' ? 'Cancelled' : appt.status === 'NO_SHOW' ? 'No-show' : appt.status === 'COMPLETED' ? 'Completed' : 'Visit pending',
      done: ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appt.status),
    },
    { label: appt.hasPrescription ? 'Prescription ready' : 'Prescription pending', done: !!appt.hasPrescription },
  ]
}

/* ─── Status config ───────────────────────────────────────── */
const STATUS_CFG: Record<string, { bg: string; border: string; color: string; dot: string; label: string; accent: string }> = {
  SCHEDULED:   { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', dot: '#3b82f6', label: 'Scheduled',   accent: '#2563eb' },
  RESCHEDULED: { bg: '#fefce8', border: '#fde68a', color: '#92400e', dot: '#f59e0b', label: 'Rescheduled', accent: '#d97706' },
  COMPLETED:   { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', dot: '#22c55e', label: 'Completed',   accent: '#16a34a' },
  CANCELLED:   { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', dot: '#f87171', label: 'Cancelled',   accent: '#dc2626' },
  NO_SHOW:     { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', dot: '#94a3b8', label: 'No Show',     accent: '#64748b' },
}
const PAYMENT_CFG: Record<string, { bg: string; color: string; label: string }> = {
  PAID:    { bg: '#f0fdf4', color: '#15803d', label: 'Paid' },
  PENDING: { bg: '#fffbeb', color: '#92400e', label: 'Unpaid' },
  FAILED:  { bg: '#fef2f2', color: '#b91c1c', label: 'Failed' },
}

const STATUS_OPTIONS = [
  { key: 'ALL',         label: 'All Statuses' },
  { key: 'SCHEDULED',   label: 'Scheduled' },
  { key: 'COMPLETED',   label: 'Completed' },
  { key: 'CANCELLED',   label: 'Cancelled' },
  { key: 'RESCHEDULED', label: 'Rescheduled' },
  { key: 'NO_SHOW',     label: 'No Show' },
]

const ACCENTS = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#dc2626']

const CANCELLATION_REASONS = [
  { value: 'PERSONAL',            label: 'Personal / Schedule Conflict', icon: '📅' },
  { value: 'MEDICAL',             label: 'Medical Emergency',            icon: '🏥' },
  { value: 'DOCTOR_UNAVAILABLE',  label: 'Doctor Unavailable',           icon: '👨‍⚕️' },
  { value: 'SCHEDULING_CONFLICT', label: 'Scheduling Conflict',          icon: '🔄' },
  { value: 'OTHER',               label: 'Other (please specify)',        icon: '✏️' },
]

/* ─── Skeleton ────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid #f8fafc' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f1f5f9', animation: 'sk 1.4s ease infinite', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 12, background: '#f1f5f9', borderRadius: 4, marginBottom: 7, width: '30%', animation: 'sk 1.4s ease infinite' }} />
            <div style={{ height: 10, background: '#f8fafc', borderRadius: 4, width: '50%', animation: 'sk 1.4s ease infinite' }} />
          </div>
          <div style={{ width: 80, height: 24, background: '#f1f5f9', borderRadius: 6, animation: 'sk 1.4s ease infinite' }} />
        </div>
      ))}
    </div>
  )
}

/* ─── Detail Modal ────────────────────────────────────────── */
function DetailModal({ appt, onClose, onReschedule, onCancel, onRate }: {
  appt: any; onClose: () => void
  onReschedule: () => void; onCancel: () => void; onRate: () => void
}) {
  const navigate = useNavigate()
  const sm = STATUS_CFG[appt.status] || STATUS_CFG.SCHEDULED
  const pm = appt.paymentStatus ? PAYMENT_CFG[appt.paymentStatus] : null
  const canScheduledAction = appt.status === 'SCHEDULED' || appt.status === 'RESCHEDULED'
  const canCancel = canScheduledAction && isAfterToday(appt.appointmentDate)
  const canReschedule = canScheduledAction || appt.status === 'NO_SHOW'
  const accent = sm.accent
  const timeline = getTimelineSteps(appt)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={M.overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        style={M.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ ...M.mHead, borderTop: `3px solid ${accent}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...M.mAvatar, background: accent }}>
              {(appt.doctorName || 'D').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <p style={M.mDoc}>Dr. {appt.doctorName}</p>
              <p style={{ ...M.mSpec, color: accent }}>{appt.doctorSpecialization}</p>
            </div>
          </div>
          <button style={M.closeBtn} onClick={onClose}><X size={14} /></button>
        </div>

        {/* Scrollable body */}
        <div style={M.body}>

          {/* Status banner */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: `${accent}08`, border: `1px solid ${accent}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
              <span style={{ ...M.statusPill, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot, display: 'inline-block', flexShrink: 0 }} />
                {sm.label}
              </span>
              {pm && (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: pm.color, background: pm.bg, padding: '3px 9px', borderRadius: 5, border: `1px solid ${pm.color}30` }}>
                  {pm.label}
                </span>
              )}
              {canCancel && (
                <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 500, marginLeft: 'auto' }}>
                  {fmtRelative(appt.appointmentDate)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginTop: 10 }}>
              <span style={M.metaChip}><Calendar size={10} />{fmtDate(appt.appointmentDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span style={M.metaChip}><Clock size={10} />{fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}</span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <p style={M.sectionTitle}>Timeline</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {timeline.map((step, i) => (
                <div key={step.label} style={{
                  padding: '10px 8px', borderRadius: 8, textAlign: 'center',
                  border: `1px solid ${step.done ? accent + '35' : '#e5e7eb'}`,
                  background: step.done ? `${accent}08` : '#fafafa',
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', margin: '0 auto 6px', background: step.done ? accent : '#e2e8f0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.3, fontWeight: 600, color: step.done ? accent : '#94a3b8' }}>{step.label}</p>
                </div>
              ))}
            </div>
          </div>

          {appt.status === 'COMPLETED' && !appt.hasPrescription && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9 }}>
              <AlertCircle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: '#92400e', margin: 0, lineHeight: 1.5 }}>Your doctor has completed the visit. The prescription has not been added yet.</p>
            </div>
          )}
          {canScheduledAction && !canCancel && isToday(appt.appointmentDate) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9 }}>
              <AlertCircle size={13} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: '#475569', margin: 0, lineHeight: 1.5 }}>Same-day cancellation is closed. If you miss the visit, the doctor can mark it as no-show.</p>
            </div>
          )}

          {/* Details */}
          <div>
            <p style={M.sectionTitle}>Details</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: Stethoscope, label: 'Specialization', val: appt.doctorSpecialization || '—' },
                { icon: CreditCard,  label: 'Consultation Fee', val: `₹${appt.consultationFee}` },
                { icon: CreditCard,  label: 'Payment', val: appt.paymentStatus || 'PENDING' },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: '#fafafa', border: '1px solid #f1f5f9' }}>
                  <Icon size={13} style={{ color: accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 500, flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{val}</span>
                </div>
              ))}
              {appt.isFirstVisit && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: 11.5, color: '#7c3aed', fontWeight: 600, width: 'fit-content' }}>
                  <CheckCircle2 size={10} /> First Visit
                </div>
              )}
            </div>
          </div>

          {/* Visit Info */}
          {(appt.reason || appt.doctorNotes) && (
            <div>
              <p style={M.sectionTitle}>Visit Information</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {appt.reason && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fafafa', border: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 4px' }}>Reason for Visit</p>
                    <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{appt.reason}</p>
                  </div>
                )}
                {appt.doctorNotes && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: `${accent}06`, border: `1px solid ${accent}18` }}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: accent, textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 4px' }}>Doctor's Notes</p>
                    <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{appt.doctorNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={M.footer}>
          <button style={M.cancelBtn} onClick={onClose}>Close</button>
          <div style={{ display: 'flex', gap: 7, flex: 1 }}>
            {canReschedule && (
              <>
                <motion.button style={{ ...M.actionBtn, flex: 1, background: '#f8fafc', color: '#475569', border: '1.5px solid #e5e7eb' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onReschedule}>
                  <RefreshCw size={13} /> Reschedule
                </motion.button>
                {canCancel && (
                  <motion.button style={{ ...M.actionBtn, flex: 1, background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onCancel}>
                    <XCircle size={13} /> Cancel
                  </motion.button>
                )}
              </>
            )}
            {/* Pay Now CTA for unpaid scheduled appointments */}
            {canScheduledAction && appt.paymentStatus !== 'PAID' && (
              <motion.button style={{ ...M.actionBtn, flex: 1, background: '#054694', color: '#fff', border: 'none', boxShadow: '0 3px 8px rgba(5,70,148,0.18)' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => { onClose(); navigate(`/patient/book?payAppointment=${appt.id}`) }}>
                <CreditCard size={13} /> Pay Now
              </motion.button>
            )}
            {appt.status === 'COMPLETED' && !appt.hasRating && (
              <motion.button style={{ ...M.actionBtn, flex: 1, background: '#fffbeb', color: '#d97706', border: '1.5px solid #fde68a' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onRate}>
                <Star size={13} /> Rate Visit
              </motion.button>
            )}
            {appt.status === 'COMPLETED' && appt.hasRating && (
              <span style={{ ...M.actionBtn, flex: 1, background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', cursor: 'default', justifyContent: 'center' }}>
                <CheckCircle2 size={13} /> Rated
              </span>
            )}
            {appt.hasPrescription && (
              <motion.button style={{ ...M.actionBtn, flex: 1, background: accent, color: '#fff', border: 'none', boxShadow: `0 3px 10px ${accent}40` }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => { onClose(); window.location.href = '/patient/prescriptions' }}>
                <FileText size={13} /> View Rx
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Rating Modal ────────────────────────────────────────── */
function RatingModal({ doctorName, onClose, onSubmit }: {
  doctorName: string; onClose: () => void
  onSubmit: (rating: number, review: string) => void
}) {
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)
  const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={M.overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        style={{ ...M.modal, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...M.mHead, borderTop: '3px solid #f59e0b' }}>
          <div>
            <h3 style={{ ...M.mDoc, margin: 0 }}>Rate your visit</h3>
            <p style={M.mSpec}>with Dr. {doctorName}</p>
          </div>
          <button style={M.closeBtn} onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: '24px 24px 8px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            {[1,2,3,4,5].map(n => {
              const active = n <= (hoveredStar ?? rating)
              return (
                <motion.button key={n}
                  onMouseEnter={() => setHoveredStar(n)}
                  onMouseLeave={() => setHoveredStar(null)}
                  onClick={() => setRating(n)}
                  whileTap={{ scale: 0.85 }}
                  style={{ fontSize: 34, background: 'none', border: 'none', cursor: 'pointer', color: active ? '#f59e0b' : '#e5e7eb', transition: 'color 0.12s', padding: 0, lineHeight: 1 }}>★</motion.button>
              )
            })}
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', margin: 0, minHeight: 18 }}>
            {LABELS[hoveredStar ?? rating]}
          </p>
        </div>
        <div style={{ padding: '12px 24px 0' }}>
          <textarea value={review} onChange={e => setReview(e.target.value)}
            placeholder="Share your experience (optional)…" rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#f8fafc', color: '#0f172a', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' as const }} />
        </div>
        <div style={M.footer}>
          <button style={M.cancelBtn} onClick={onClose}>Cancel</button>
          <motion.button style={{ ...M.actionBtn, flex: 1, justifyContent: 'center', background: '#f59e0b', color: '#fff', border: 'none', boxShadow: '0 3px 10px rgba(245,158,11,0.3)' }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => onSubmit(rating, review)}>
            Submit Rating
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Cancel Modal ────────────────────────────────────────── */
function CancelModal({ appointment, onConfirm, onReschedule, onClose, loading }: {
  appointment: any
  onConfirm: (reason: { reason?: string; reasonText?: string }) => void
  onReschedule: () => void
  onClose: () => void
  loading: boolean
}) {
  const [selected, setSelected] = useState('')
  const [otherText, setOtherText] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!selected) { setError('Please select a reason to continue'); return }
    if (selected === 'OTHER' && !otherText.trim()) { setError('Please describe your reason'); return }
    onConfirm({
      reason: selected === 'OTHER' ? otherText.trim() : selected,
      reasonText: selected === 'OTHER' ? otherText.trim() : undefined,
    })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={M.overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        style={{ ...M.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>

        <div style={{ ...M.mHead, borderTop: '3px solid #dc2626' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={16} style={{ color: '#dc2626' }} />
            </div>
            <div>
              <p style={{ ...M.mDoc, margin: 0 }}>Cancel Appointment</p>
              <p style={M.mSpec}>Please tell us why you're cancelling</p>
            </div>
          </div>
          <button style={M.closeBtn} onClick={onClose}><X size={14} /></button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' as const, maxHeight: 'calc(90vh - 160px)' }}>

          {/* Summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {(appointment.doctorName || 'D').charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>Dr. {appointment.doctorName}</p>
              <p style={{ margin: '1px 0 0', fontSize: 12, color: '#64748b' }}>
                {fmtDate(appointment.appointmentDate)} · {fmtTime(appointment.startTime)}
              </p>
            </div>
          </div>

          {/* Reasons */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
              Reason for cancellation
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {CANCELLATION_REASONS.map(opt => {
                const isSelected = selected === opt.value
                return (
                  <motion.div key={opt.value} whileHover={{ x: 1 }}
                    onClick={() => { setSelected(opt.value); setError('') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                      border: isSelected ? '1.5px solid #fecaca' : '1.5px solid #f1f5f9',
                      background: isSelected ? '#fef2f2' : '#fafafa',
                      transition: 'all 0.12s ease',
                    }}>
                    <div style={{
                      width: 17, height: 17, borderRadius: '50%', flexShrink: 0,
                      border: isSelected ? '5px solid #dc2626' : '2px solid #cbd5e1',
                      background: 'white', transition: 'all 0.12s ease', boxSizing: 'border-box' as const,
                    }} />
                    <span style={{ fontSize: 14 }}>{opt.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#b91c1c' : '#374155', lineHeight: 1.3 }}>
                      {opt.label}
                    </span>
                    {opt.value === 'SCHEDULING_CONFLICT' && isSelected && (
                      <button onClick={e => { e.stopPropagation(); onReschedule() }}
                        style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                        <RefreshCw size={10} /> Reschedule instead
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>

          <AnimatePresence>
            {selected === 'OTHER' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}>
                <textarea value={otherText} onChange={e => { setOtherText(e.target.value); setError('') }}
                  placeholder="Tell us a bit more…" maxLength={200} rows={3}
                  style={{ width: '100%', boxSizing: 'border-box' as const, padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'right' as const }}>{otherText.length}/200</p>
              </motion.div>
            )}
          </AnimatePresence>

          {appointment.paymentStatus === 'PAID' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9 }}>
              <AlertCircle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                A refund of <strong>₹{appointment.consultationFee}</strong> will be processed within 3–5 business days.
              </p>
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
                <AlertCircle size={12} style={{ color: '#dc2626', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12.5, color: '#b91c1c', fontWeight: 500 }}>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ ...M.footer, borderTop: '1px solid #f1f5f9' }}>
          <button style={M.cancelBtn} onClick={onClose}>Keep it</button>
          <motion.button
            style={{ ...M.actionBtn, flex: 1, justifyContent: 'center', background: selected ? '#dc2626' : '#f1f5f9', color: selected ? '#fff' : '#94a3b8', border: 'none', boxShadow: selected ? '0 3px 10px rgba(220,38,38,0.25)' : 'none', transition: 'all 0.18s' }}
            whileHover={selected ? { scale: 1.02 } : {}} whileTap={selected ? { scale: 0.97 } : {}}
            onClick={submit} disabled={loading}>
            {loading ? <span style={M.spinner} /> : <XCircle size={13} />}
            {loading ? 'Cancelling…' : 'Confirm Cancellation'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
export default function PatientAppointments() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [visitFilter, setVisitFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('ALL')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [detailModal, setDetailModal] = useState<any>(null)
  const [rateModal, setRateModal] = useState<{ id: number; doctorName: string } | null>(null)
  const [cancelModal, setCancelModal] = useState<any>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const load = () => {
    setLoading(true)
    appointmentApi.getMy()
      .then(r => setAppointments(r.data.data || []))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const toggle = (id: number) => setExpanded(e => e === id ? null : id)

  const activeFilters = [filter !== 'ALL', paymentFilter !== 'ALL', visitFilter !== 'ALL', dateFilter !== 'ALL', !!search.trim()].filter(Boolean).length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return appointments.filter(a => {
      if (filter !== 'ALL' && a.status !== filter) return false
      if (paymentFilter !== 'ALL' && (a.paymentStatus || 'PENDING') !== paymentFilter) return false
      if (visitFilter === 'FIRST' && !a.isFirstVisit) return false
      if (visitFilter === 'RETURNING' && a.isFirstVisit) return false
      if (dateFilter === 'TODAY' && !isToday(a.appointmentDate)) return false
      if (dateFilter === 'UPCOMING' && !isAfterToday(a.appointmentDate) && !isToday(a.appointmentDate)) return false
      if (dateFilter === 'PAST' && (isAfterToday(a.appointmentDate) || isToday(a.appointmentDate))) return false
      if (!q) return true
      return (a.doctorName || '').toLowerCase().includes(q) ||
        (a.doctorSpecialization || '').toLowerCase().includes(q) ||
        (a.reason || '').toLowerCase().includes(q)
    })
  }, [appointments, filter, search, paymentFilter, visitFilter, dateFilter])

  const upcoming  = useMemo(() => appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED').length, [appointments])
  const completed = useMemo(() => appointments.filter(a => a.status === 'COMPLETED').length, [appointments])
  const cancelled = useMemo(() => appointments.filter(a => a.status === 'CANCELLED').length, [appointments])
  const pendingRx = useMemo(() => appointments.filter(a => a.status === 'COMPLETED' && !a.hasPrescription).length, [appointments])

  const handleCancel = async (reason: { reason?: string; reasonText?: string }) => {
    if (!cancelModal) return
    setCancelLoading(true)
    try {
      await appointmentApi.cancel(cancelModal.id, reason)
      toast.success('Appointment cancelled')
      if (cancelModal.paymentStatus === 'PAID') {
        toast.success(`Refund of ₹${cancelModal.consultationFee} will be processed in 3–5 days`, { duration: 5000 })
      }
      setCancelModal(null)
      setDetailModal(null)
      load()
    } finally { setCancelLoading(false) }
  }

  const submitRating = async (rating: number, review: string) => {
    if (!rateModal) return
    await patientApi.rate({ appointmentId: rateModal.id, rating, review })
    toast.success('Rating submitted!')
    setRateModal(null)
    load()
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { font-family: 'Geist', system-ui, sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes sk     { 0%,100%{opacity:.45} 50%{opacity:.9} }
        .appt-row:hover   { background:#f8faff !important; }
        .appt-row         { transition: background 0.12s ease; cursor: pointer; }
        .act-btn:hover    { background:#2563eb !important; color:#fff !important; border-color:#2563eb !important; }
        .act-red:hover    { background:#dc2626 !important; color:#fff !important; border-color:#dc2626 !important; }
        .act-green:hover  { background:#16a34a !important; color:#fff !important; border-color:#16a34a !important; }
        .act-amber:hover  { background:#d97706 !important; color:#fff !important; border-color:#d97706 !important; }
        .search-in:focus  { border-color:#93c5fd !important; box-shadow:0 0 0 3px rgba(37,99,235,0.07) !important; background:#fff !important; }
        .select-clean     { transition: border-color 0.12s ease; }
        .select-clean:hover { border-color:#cbd5e1 !important; }
        .select-clean:focus { border-color:#93c5fd !important; outline: none !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.07) !important; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div style={S.header}
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22,1,0.36,1] }}>
        <div>
          <p style={S.eyebrow}>Health Records</p>
          <h1 style={S.title}>My Appointments</h1>
          <p style={S.subtitle}>Track, manage and review all your healthcare visits</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={S.countBadge}>
            <Calendar size={12} style={{ color: '#2563eb' }} />
            {appointments.length} appointments
          </span>
          <motion.button style={S.bookBtn}
            whileHover={{ scale: 1.02, boxShadow: '0 6px 18px rgba(37,99,235,0.32)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/patient/book')}>
            <Plus size={14} /> Book Appointment
          </motion.button>
        </div>
      </motion.div>

      {/* ── Stats strip ────────────────────────────────────── */}
      {appointments.length > 0 && (
        <motion.div style={S.statsRow}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}>
          {[
            { icon: Calendar,     val: appointments.length, lbl: 'Total',     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { icon: CalendarClock,val: upcoming,            lbl: 'Upcoming',  color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
            { icon: CalendarCheck,val: completed,           lbl: 'Completed', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { icon: CalendarX,    val: cancelled,           lbl: 'Cancelled', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          ].map(({ icon: Icon, val, lbl, color, bg, border }, i) => (
            <motion.div key={lbl}
              style={{ ...S.statPill, background: bg, border: `1px solid ${border}` }}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + i * 0.04 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flexShrink: 0 }}>
                <Icon size={13} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
              <span style={{ fontSize: 11.5, color: '#6b7280', fontWeight: 500 }}>{lbl}</span>
            </motion.div>
          ))}
          {pendingRx > 0 && (
            <motion.div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: '#fffbeb', border: '1px solid #fde68a', marginLeft: 'auto' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}>
              <AlertCircle size={12} style={{ color: '#d97706', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>
                {pendingRx} completed without prescription
              </span>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <motion.div style={S.toolbar}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input className="search-in" style={S.searchInput}
            placeholder="Search doctor, specialization…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center' }}
              onClick={() => setSearch('')}><X size={11} /></button>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: '#e5e7eb', flexShrink: 0 }} />

        {/* All 4 dropdowns in one row */}
        {[
          { val: filter,        set: setFilter,        opts: STATUS_OPTIONS.map(o => [o.key, o.label]) },
          { val: paymentFilter, set: setPaymentFilter, opts: [['ALL','All payments'],['PAID','Paid'],['PENDING','Unpaid'],['FAILED','Failed']] },
          { val: visitFilter,   set: setVisitFilter,   opts: [['ALL','All visits'],['FIRST','First visit'],['RETURNING','Returning']] },
          { val: dateFilter,    set: setDateFilter,    opts: [['ALL','All dates'],['TODAY','Today'],['UPCOMING','Upcoming'],['PAST','Past']] },
        ].map(({ val, set, opts }, i) => (
          <select key={i} className="select-clean" value={val}
            onChange={e => set(e.target.value)}
            style={{
              ...S.selectFilter,
              ...(val !== 'ALL' ? { borderColor: '#2563eb', color: '#1d4ed8', background: '#eff6ff', fontWeight: 600 } : {}),
            }}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}

        {/* Active filter reset */}
        {activeFilters > 0 && (
          <button className="act-red" style={{ ...S.actBtn, color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2', whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => { setFilter('ALL'); setPaymentFilter('ALL'); setVisitFilter('ALL'); setDateFilter('ALL'); setSearch('') }}>
            <X size={11} /> Clear {activeFilters > 1 ? `${activeFilters} filters` : 'filter'}
          </button>
        )}

        {/* Count */}
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {activeFilters > 0 ? `${filtered.length} of ${appointments.length}` : `${appointments.length} total`}
        </span>
      </motion.div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && <Skeleton />}

      {/* ── Empty ───────────────────────────────────────────── */}
      {!loading && appointments.length === 0 && (
        <motion.div style={S.empty} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Calendar size={22} style={{ color: '#93c5fd' }} />
          </div>
          <p style={{ fontWeight: 600, fontSize: 14, color: '#475569', margin: 0 }}>No appointments yet</p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '5px 0 0', maxWidth: 280, lineHeight: 1.6, textAlign: 'center' }}>
            Book your first appointment to get started.
          </p>
          <motion.button style={{ ...S.bookBtn, marginTop: 16 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/patient/book')}>
            <Plus size={14} /> Book Appointment
          </motion.button>
        </motion.div>
      )}

      {/* ── No results ──────────────────────────────────────── */}
      {!loading && appointments.length > 0 && filtered.length === 0 && (
        <motion.div style={S.empty} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Search size={20} style={{ color: '#94a3b8' }} />
          </div>
          <p style={{ fontWeight: 600, fontSize: 14, color: '#475569', margin: 0 }}>No matches found</p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '5px 0 0' }}>Try a different search term or filter.</p>
        </motion.div>
      )}

      {/* ── List ────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <motion.div style={S.listWrap}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}>

          {/* Table header */}
          <div style={S.listHead}>
            <span style={{ flex: 2.2 }}>Doctor</span>
            <span style={{ flex: 1.8 }}>Date & Time</span>
            <span style={{ flex: 1.2 }}>Status</span>
            <span style={{ flex: 0.7 }}>Fee</span>
            <span style={{ flex: 1.5, textAlign: 'right' as const }}>Actions</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((a, idx) => {
              const sm = STATUS_CFG[a.status] || STATUS_CFG.SCHEDULED
              const pm = a.paymentStatus ? PAYMENT_CFG[a.paymentStatus] : null
              const isOpen = expanded === a.id
              const accent = ACCENTS[idx % ACCENTS.length]
              const initials = (a.doctorName || 'D').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              const canScheduledAction = a.status === 'SCHEDULED' || a.status === 'RESCHEDULED'
              const canCancel = canScheduledAction && isAfterToday(a.appointmentDate)
              const canReschedule = canScheduledAction || a.status === 'NO_SHOW'

              return (
                <div key={a.id} style={{
                  borderBottom: '1px solid #f1f5f9',
                  borderLeft: `3px solid ${isOpen ? sm.accent : 'transparent'}`,
                  background: isOpen ? `${sm.accent}05` : '#fff',
                  animation: `fadeUp 0.3s ease both`,
                  animationDelay: `${idx * 0.04}s`,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}>
                  <div className="appt-row" style={S.row} onClick={() => toggle(a.id)}>

                    {/* Doctor */}
                    <div style={{ flex: 2.2, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: sm.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: '#0f172a', lineHeight: 1.2 }}>Dr. {a.doctorName}</p>
                        {a.doctorSpecialization && (
                          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: sm.accent, fontWeight: 500 }}>{a.doctorSpecialization}</p>
                        )}
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div style={{ flex: 1.8 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{fmtDate(a.appointmentDate, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={9} />{fmtTime(a.startTime)} – {fmtTime(a.endTime)}
                      </p>
                    </div>

                    {/* Status */}
                    <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 5, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, fontSize: 11.5, fontWeight: 600, width: 'fit-content' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sm.dot, flexShrink: 0 }} />
                        {sm.label}
                      </span>
                      {pm && (
                        <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, background: pm.bg, color: pm.color, fontSize: 10.5, fontWeight: 600, width: 'fit-content' }}>
                          {pm.label}
                        </span>
                      )}
                    </div>

                    {/* Fee */}
                    <div style={{ flex: 0.7 }}>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>₹{a.consultationFee}</p>
                    </div>

                    {/* Actions */}
                    <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}
                      onClick={e => e.stopPropagation()}>
                      <button className="act-btn" style={S.actBtn}
                        onClick={() => setDetailModal(a)}>
                        <ArrowUpRight size={11} /> Details
                      </button>
                      {canCancel && (
                        <button className="act-red" style={{ ...S.actBtn, color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                          onClick={() => setCancelModal(a)}>
                          <XCircle size={11} /> Cancel
                        </button>
                      )}
                      {a.status === 'NO_SHOW' && (
                        <button className="act-btn" style={S.actBtn}
                          onClick={() => navigate(`/patient/book?reschedule=${a.id}&doctorId=${a.doctorId}`)}>
                          <RefreshCw size={11} /> Reschedule
                        </button>
                      )}
                      {a.status === 'COMPLETED' && !a.hasRating && (
                        <button className="act-amber" style={{ ...S.actBtn, color: '#d97706', borderColor: '#fde68a', background: '#fffbeb' }}
                          onClick={() => setRateModal({ id: a.id, doctorName: a.doctorName })}>
                          <Star size={11} /> Rate
                        </button>
                      )}
                      {a.status === 'COMPLETED' && a.hasRating && (
                        <span style={{ ...S.actBtn, color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4', cursor: 'default' }}>
                          <CheckCircle2 size={11} /> Rated
                        </span>
                      )}
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', alignItems: 'center', marginLeft: 1, flexShrink: 0 }}>
                        <ChevronDown size={14} style={{ color: '#94a3b8' }} />
                      </motion.div>
                    </div>
                  </div>

                  {/* Expand drawer */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div key="drawer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: [0.22,1,0.36,1] }}
                        style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px 18px', background: '#fafbfe', borderTop: `1px dashed ${sm.accent}25` }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>

                            {/* Details */}
                            <div>
                              <p style={S.drawerLabel}>Appointment Details</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                                {[
                                  { icon: Calendar,    label: 'Date',           val: fmtDate(a.appointmentDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
                                  { icon: Clock,       label: 'Time',           val: `${fmtTime(a.startTime)} – ${fmtTime(a.endTime)}` },
                                  { icon: Stethoscope, label: 'Specialization', val: a.doctorSpecialization || '—' },
                                  { icon: CreditCard,  label: 'Fee',            val: `₹${a.consultationFee} · ${a.paymentStatus || 'PENDING'}` },
                                ].map(({ icon: Icon, label, val }) => (
                                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                                    <div style={{ width: 26, height: 26, borderRadius: 7, background: `${sm.accent}0f`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Icon size={12} style={{ color: sm.accent }} />
                                    </div>
                                    <div>
                                      <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 1px' }}>{label}</p>
                                      <p style={{ fontSize: 12.5, fontWeight: 500, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>{val}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Visit info */}
                            <div>
                              <p style={S.drawerLabel}>Visit Information</p>
                              {a.reason ? (
                                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                  <FileText size={12} style={{ color: sm.accent, flexShrink: 0, marginTop: 1 }} />
                                  <div>
                                    <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 3px' }}>Reason</p>
                                    <p style={{ fontSize: 12.5, color: '#334155', margin: 0, lineHeight: 1.55 }}>{a.reason}</p>
                                  </div>
                                </div>
                              ) : <p style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No reason specified</p>}
                              {a.doctorNotes && (
                                <div style={{ padding: '10px 12px', borderRadius: 8, background: `${sm.accent}06`, border: `1px solid ${sm.accent}18`, display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 7 }}>
                                  <Activity size={12} style={{ color: sm.accent, flexShrink: 0, marginTop: 1 }} />
                                  <div>
                                    <p style={{ fontSize: 10, fontWeight: 600, color: sm.accent, textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 3px' }}>Doctor's Notes</p>
                                    <p style={{ fontSize: 12.5, color: '#334155', margin: 0, lineHeight: 1.55 }}>{a.doctorNotes}</p>
                                  </div>
                                </div>
                              )}
                              {a.isFirstVisit && (
                                <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 5, background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>
                                  <CheckCircle2 size={10} /> First Visit
                                </div>
                              )}
                            </div>

                            {/* Quick actions */}
                            <div>
                              <p style={S.drawerLabel}>Quick Actions</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {[
                                  { cls: 'act-btn', label: 'Full Details', icon: ArrowUpRight, fn: () => setDetailModal(a) },
                                  ...(canReschedule ? [{ cls: 'act-btn', label: 'Reschedule', icon: RefreshCw, fn: () => navigate(`/patient/book?reschedule=${a.id}&doctorId=${a.doctorId}`) }] : []),
                                  ...(canCancel ? [{ cls: 'act-red', label: 'Cancel Appointment', icon: XCircle, fn: () => setCancelModal(a), style: { color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' } }] : []),
                                  ...(a.status === 'COMPLETED' && !a.hasRating ? [{ cls: 'act-amber', label: 'Rate this Visit', icon: Star, fn: () => setRateModal({ id: a.id, doctorName: a.doctorName }), style: { color: '#d97706', borderColor: '#fde68a', background: '#fffbeb' } }] : []),
                                  ...(a.hasPrescription ? [{ cls: 'act-green', label: 'View Prescription', icon: FileText, fn: () => navigate('/patient/prescriptions'), style: { color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' } }] : []),
                                ].map(({ cls, label, icon: Icon, fn, style: btnStyle }: any) => (
                                  <motion.button key={label} className={cls}
                                    style={{ ...S.drawerActBtn, ...(btnStyle || {}) }}
                                    whileHover={{ x: 2 }} onClick={fn}>
                                    <Icon size={12} /> {label} <ArrowUpRight size={10} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                  </motion.button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 6 }}>
                            <span style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>Click "Full Details" for the complete appointment view</span>
                            {canCancel && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <CalendarClock size={11} style={{ color: sm.accent }} />
                                <span style={{ fontSize: 11.5, color: '#64748b' }}>
                                  Appointment <strong style={{ color: sm.accent }}>{fmtRelative(a.appointmentDate)}</strong>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── Modals ─────────────────────────────────────────── */}
      <AnimatePresence>
        {detailModal && (
          <DetailModal appt={detailModal} onClose={() => setDetailModal(null)}
            onReschedule={() => { setDetailModal(null); navigate(`/patient/book?reschedule=${detailModal.id}&doctorId=${detailModal.doctorId}`) }}
            onCancel={() => { setCancelModal(detailModal); setDetailModal(null) }}
            onRate={() => { setRateModal({ id: detailModal.id, doctorName: detailModal.doctorName }); setDetailModal(null) }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rateModal && <RatingModal doctorName={rateModal.doctorName} onClose={() => setRateModal(null)} onSubmit={submitRating} />}
      </AnimatePresence>
      <AnimatePresence>
        {cancelModal && (
          <CancelModal appointment={cancelModal} onConfirm={handleCancel}
            onReschedule={() => { const appt = cancelModal; setCancelModal(null); navigate(`/patient/book?reschedule=${appt.id}&doctorId=${appt.doctorId}`) }}
            onClose={() => setCancelModal(null)} loading={cancelLoading} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Styles ──────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  page: {
    padding: '1.75rem',
    maxWidth: 1200, margin: '0 auto',
    display: 'flex', flexDirection: 'column', gap: 14, minHeight: '100%',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', flexWrap: 'wrap', gap: 12,
  },
  eyebrow: { fontSize: 10.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 3px' },
  title:   { fontSize: 'clamp(1.25rem,2.5vw,1.65rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.1 },
  subtitle:{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0', fontWeight: 400 },
  bookBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 16px', borderRadius: 9,
    background: '#2563eb', color: '#fff', border: 'none',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 3px 12px rgba(37,99,235,0.25)',
  },
  countBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 7,
    background: '#fff', border: '1px solid #bfdbfe',
    fontSize: 12.5, fontWeight: 600, color: '#1e40af',
  },
  statsRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  statPill: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 14px', borderRadius: 8,
    flex: 1, minWidth: 110,
  },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    background: '#fff', border: '1px solid #f1f5f9',
    borderRadius: 10, padding: '10px 12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  searchInput: {
    width: '100%', padding: '7px 28px 7px 32px',
    borderRadius: 7, border: '1.5px solid #e5e7eb',
    background: '#f8fafc', color: '#0f172a',
    fontSize: 13, outline: 'none',
    transition: 'all 0.14s ease',
  },
  selectFilter: {
    padding: '6px 9px', borderRadius: 7,
    border: '1.5px solid #e5e7eb', background: '#fff',
    color: '#475569', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  listWrap: {
    background: '#fff', borderRadius: 12,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  listHead: {
    display: 'flex', alignItems: 'center',
    padding: '9px 20px',
    background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
    fontSize: 10.5, fontWeight: 600, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.07em',
  },
  row: {
    display: 'flex', alignItems: 'center',
    padding: '13px 20px', userSelect: 'none',
  },
  actBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 9px', borderRadius: 6,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    fontSize: 11.5, fontWeight: 600, color: '#475569',
    cursor: 'pointer', transition: 'all 0.12s ease', whiteSpace: 'nowrap',
  },
  drawerLabel: {
    fontSize: 10, fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 10px',
  },
  drawerActBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 11px', borderRadius: 8,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    fontSize: 12.5, fontWeight: 500, color: '#475569',
    cursor: 'pointer', transition: 'all 0.12s ease', width: '100%',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '3.5rem 1rem', textAlign: 'center',
    background: '#fff', borderRadius: 12, border: '1.5px dashed #e0e7ff',
  },
}

const M: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(5px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  },
  modal: {
    background: '#fff', borderRadius: 16, padding: 0,
    width: '100%', maxWidth: 500, maxHeight: '90vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(15,23,42,0.18)',
  },
  mHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px', borderBottom: '1px solid #f1f5f9', flexShrink: 0,
  },
  mAvatar: {
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700,
  },
  mDoc:  { margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' },
  mSpec: { margin: '2px 0 0', fontSize: 12, fontWeight: 500, color: '#64748b' },
  closeBtn: {
    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
    background: '#f8fafc', border: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#64748b',
  },
  body: { flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 },
  sectionTitle: { fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' },
  statusPill: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600,
  },
  metaChip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11.5, color: '#64748b', fontWeight: 400,
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 8px',
  },
  footer: {
    display: 'flex', gap: 8, padding: '12px 18px',
    borderTop: '1px solid #f1f5f9', flexShrink: 0,
  },
  cancelBtn: {
    padding: '9px 16px', borderRadius: 8,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    fontSize: 13, fontWeight: 500, color: '#64748b',
    cursor: 'pointer',
  },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '9px 13px', borderRadius: 8, border: 'none',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  spinner: {
    display: 'block', width: 12, height: 12, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
  },
}