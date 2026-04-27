import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { appointmentApi, patientApi } from '../../api'
import {
  Calendar, Plus, Star, X, Clock, Stethoscope, ChevronDown,
  CheckCircle2, XCircle, RefreshCw, CreditCard, FileText,
  AlertCircle, ArrowUpRight, Search, CalendarCheck,
  CalendarX, CalendarClock, Activity, Video, AlarmClock,
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

/* ─── Status config ───────────────────────────────────────── */
const STATUS_CFG: Record<string, { bg: string; border: string; color: string; dot: string; label: string; accent: string }> = {
  SCHEDULED:   { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', dot: '#60a5fa', label: 'Scheduled',   accent: '#2563eb' },
  RESCHEDULED: { bg: '#fefce8', border: '#fde68a', color: '#a16207', dot: '#facc15', label: 'Rescheduled', accent: '#d97706' },
  COMPLETED:   { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', dot: '#4ade80', label: 'Completed',   accent: '#16a34a' },
  CANCELLED:   { bg: '#fff1f2', border: '#fecdd3', color: '#be123c', dot: '#fb7185', label: 'Cancelled',   accent: '#e11d48' },
  NO_SHOW:     { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', dot: '#94a3b8', label: 'No Show',     accent: '#64748b' },
}
const PAYMENT_CFG: Record<string, { bg: string; color: string; label: string }> = {
  PAID:    { bg: '#f0fdf4', color: '#15803d', label: '✓ Paid' },
  PENDING: { bg: '#fefce8', color: '#a16207', label: 'Unpaid' },
  FAILED:  { bg: '#fff1f2', color: '#be123c', label: 'Failed' },
}

const TABS = [
  { key: 'ALL',         label: 'All',         icon: Activity },
  { key: 'SCHEDULED',   label: 'Upcoming',    icon: CalendarClock },
  { key: 'COMPLETED',   label: 'Completed',   icon: CalendarCheck },
  { key: 'CANCELLED',   label: 'Cancelled',   icon: CalendarX },
  { key: 'RESCHEDULED', label: 'Rescheduled', icon: RefreshCw },
  { key: 'NO_SHOW',     label: 'No Show',     icon: AlarmClock },
]

const ACCENTS = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#e11d48']

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: '#f1f5f9', animation: 'sk 1.4s ease infinite', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 13, background: '#f1f5f9', borderRadius: 5, marginBottom: 8, width: '35%', animation: 'sk 1.4s ease infinite' }} />
            <div style={{ height: 10, background: '#f8fafc', borderRadius: 5, width: '55%', animation: 'sk 1.4s ease infinite' }} />
          </div>
          <div style={{ width: 90, height: 26, background: '#f1f5f9', borderRadius: 8, animation: 'sk 1.4s ease infinite' }} />
        </div>
      ))}
      <style>{`@keyframes sk{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
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

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={M.overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={M.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ ...M.mHead, borderTop: `3px solid ${accent}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...M.mAvatar, background: `linear-gradient(135deg,${accent},${accent}bb)` }}>
              {(appt.doctorName || 'D').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <p style={M.mDoc}>Dr. {appt.doctorName}</p>
              <p style={{ ...M.mSpec, color: accent }}>{appt.doctorSpecialization}</p>
            </div>
          </div>
          <button style={M.closeBtn} onClick={onClose}><X size={15} /></button>
        </div>

        {/* Scrollable body */}
        <div style={M.body}>

          {/* Status banner */}
          <div style={{ ...M.statusBanner, background: `${accent}0d`, border: `1px solid ${accent}30` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
              <span style={{ ...M.statusPill, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot, display: 'inline-block' }} />
                {sm.label}
              </span>
              {pm && (
                <span style={{ fontSize: 12, fontWeight: 700, color: pm.color, background: pm.bg, padding: '3px 10px', borderRadius: 6 }}>
                  {pm.label}
                </span>
              )}
              {canCancel && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                  · {fmtRelative(appt.appointmentDate)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 10 }}>
              <span style={M.metaChip}><Calendar size={10} />{fmtDate(appt.appointmentDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span style={M.metaChip}><Clock size={10} />{fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}</span>
            </div>
          </div>

          {/* Details grid */}
          <div>
            <div style={M.sectionHead}>
              <Stethoscope size={13} style={{ color: accent }} />
              <span style={M.sectionTitle}>Appointment Details</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: Stethoscope, label: 'Specialization', val: appt.doctorSpecialization || '—' },
                { icon: CreditCard,  label: 'Consultation Fee', val: `₹${appt.consultationFee}` },
                { icon: CreditCard,  label: 'Payment',  val: appt.paymentStatus || 'PENDING' },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} style={M.detailRow}>
                  <div style={{ ...M.detailIcon, color: accent }}>
                    <Icon size={13} />
                  </div>
                  <span style={M.detailLabel}>{label}</span>
                  <span style={M.detailVal}>{val}</span>
                </div>
              ))}
              {appt.isFirstVisit && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: 11.5, color: '#7c3aed', fontWeight: 600, width: 'fit-content' }}>
                  <CheckCircle2 size={10} /> First Visit
                </div>
              )}
            </div>
          </div>

          {/* Reason & Notes */}
          {(appt.reason || appt.doctorNotes) && (
            <div>
              <div style={M.sectionHead}>
                <FileText size={13} style={{ color: accent }} />
                <span style={M.sectionTitle}>Visit Information</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {appt.reason && (
                  <div style={M.noteBox}>
                    <FileText size={12} style={{ color: accent, flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={M.noteLabel}>Reason for Visit</p>
                      <p style={M.noteText}>{appt.reason}</p>
                    </div>
                  </div>
                )}
                {appt.doctorNotes && (
                  <div style={{ ...M.noteBox, background: `${accent}08`, border: `1px solid ${accent}20` }}>
                    <Activity size={12} style={{ color: accent, flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ ...M.noteLabel, color: accent }}>Doctor's Notes</p>
                      <p style={M.noteText}>{appt.doctorNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={M.footer}>
          <button style={M.cancelBtn} onClick={onClose}>Close</button>
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            {canReschedule && (
              <>
                <motion.button
                  style={{ ...M.actionBtn, flex: 1, background: '#f8fafc', color: '#475569', border: '1.5px solid #e5e7eb' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={onReschedule}>
                  <RefreshCw size={13} /> Reschedule
                </motion.button>
                {canCancel && (
                <motion.button
                  style={{ ...M.actionBtn, flex: 1, background: '#fff1f2', color: '#e11d48', border: '1.5px solid #fecdd3' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={onCancel}>
                  <XCircle size={13} /> Cancel
                </motion.button>
                )}
              </>
            )}
            {appt.status === 'COMPLETED' && !appt.hasRating && (
              <motion.button
                style={{ ...M.actionBtn, flex: 1, background: '#fefce8', color: '#d97706', border: '1.5px solid #fde68a' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={onRate}>
                <Star size={13} /> Rate Visit
              </motion.button>
            )}
            {appt.status === 'COMPLETED' && appt.hasRating && (
              <span style={{ ...M.actionBtn, flex: 1, background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', cursor: 'default', justifyContent: 'center' }}>
                <CheckCircle2 size={13} /> Rated
              </span>
            )}
            {appt.hasPrescription && (
              <motion.button
                style={{ ...M.actionBtn, flex: 1, background: accent, color: '#fff', border: 'none', boxShadow: `0 4px 14px ${accent}45` }}
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
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={M.overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={{ ...M.modal, maxWidth: 400 }} onClick={e => e.stopPropagation()}>

        <div style={{ ...M.mHead, borderTop: '3px solid #f59e0b' }}>
          <div>
            <h3 style={{ ...M.mDoc, margin: 0 }}>Rate your visit</h3>
            <p style={M.mSpec}>with Dr. {doctorName}</p>
          </div>
          <button style={M.closeBtn} onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ padding: '24px 24px 8px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
            {[1,2,3,4,5].map(n => {
              const active = n <= (hoveredStar ?? rating)
              return (
                <motion.button key={n}
                  onMouseEnter={() => setHoveredStar(n)}
                  onMouseLeave={() => setHoveredStar(null)}
                  onClick={() => setRating(n)}
                  whileTap={{ scale: 0.85 }}
                  style={{ fontSize: 36, background: 'none', border: 'none', cursor: 'pointer', color: active ? '#f59e0b' : '#e5e7eb', filter: active ? 'drop-shadow(0 2px 4px rgba(245,158,11,0.3))' : 'none', transition: 'color 0.15s', padding: 0, lineHeight: 1 }}>★</motion.button>
              )
            })}
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: 0, minHeight: 20 }}>
            {LABELS[hoveredStar ?? rating]}
          </p>
        </div>

        <div style={{ padding: '12px 24px 0' }}>
          <textarea
            value={review} onChange={e => setReview(e.target.value)}
            placeholder="Share your experience (optional)…" rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#f8fafc', color: '#0f172a', fontSize: 13, fontFamily: 'DM Sans,sans-serif', resize: 'none', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
          />
        </div>

        <div style={M.footer}>
          <button style={M.cancelBtn} onClick={onClose}>Cancel</button>
          <motion.button style={{ ...M.actionBtn, flex: 1, justifyContent: 'center', background: '#f59e0b', color: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => onSubmit(rating, review)}>
            Submit Rating
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Cancel Confirmation Modal ───────────────────────────── */
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
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={M.overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={{ ...M.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ ...M.mHead, borderTop: '3px solid #e11d48' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={18} style={{ color: '#e11d48' }} />
            </div>
            <div>
              <p style={{ ...M.mDoc, margin: 0 }}>Cancel Appointment</p>
              <p style={M.mSpec}>Please tell us why you're cancelling</p>
            </div>
          </div>
          <button style={M.closeBtn} onClick={onClose}><X size={15} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: 'calc(90vh - 160px)' }}>

          {/* Appointment summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#e11d48,#fb7185)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              {(appointment.doctorName || 'D').charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>Dr. {appointment.doctorName}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontFamily: 'DM Mono,monospace' }}>
                {fmtDate(appointment.appointmentDate)} · {fmtTime(appointment.startTime)}
              </p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}>
              Cancelling
            </span>
          </div>

          {/* Reason selection */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
              Reason for cancellation
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CANCELLATION_REASONS.map(opt => {
                const isSelected = selected === opt.value
                return (
                  <motion.div key={opt.value}
                    whileHover={{ x: 2 }}
                    onClick={() => { setSelected(opt.value); setError('') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 14px', borderRadius: 11, cursor: 'pointer',
                      border: isSelected ? '1.5px solid #fecdd3' : '1.5px solid #f1f5f9',
                      background: isSelected ? '#fff1f2' : '#fafafa',
                      transition: 'all 0.15s ease',
                    }}>
                    {/* Custom radio */}
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: isSelected ? '5px solid #e11d48' : '2px solid #cbd5e1',
                      background: 'white',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box',
                    }} />
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{opt.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#be123c' : '#374155', lineHeight: 1.3 }}>
                      {opt.label}
                    </span>
                    {opt.value === 'SCHEDULING_CONFLICT' && isSelected && (
                      <button
                        onClick={e => { e.stopPropagation(); onReschedule() }}
                        style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', whiteSpace: 'nowrap' }}>
                        <RefreshCw size={11} /> Reschedule instead
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Other text */}
          <AnimatePresence>
            {selected === 'OTHER' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                <textarea
                  value={otherText}
                  onChange={e => { setOtherText(e.target.value); setError('') }}
                  placeholder="Tell us a bit more about why you're cancelling…"
                  maxLength={200} rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: 13, fontFamily: 'DM Sans,sans-serif', resize: 'none', outline: 'none', lineHeight: 1.5, transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = '#fca5a5'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>{otherText.length}/200</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Refund notice */}
          {appointment.paymentStatus === 'PAID' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 13px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
              <AlertCircle size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                A refund of <strong>₹{appointment.consultationFee}</strong> will be processed within 3–5 business days.
              </p>
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 9 }}>
                <AlertCircle size={13} style={{ color: '#e11d48', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12.5, color: '#be123c', fontWeight: 600 }}>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ ...M.footer, borderTop: '1px solid #f1f5f9' }}>
          <button style={M.cancelBtn} onClick={onClose}>Keep it</button>
          <motion.button
            style={{ ...M.actionBtn, flex: 1, justifyContent: 'center', background: selected ? '#e11d48' : '#f1f5f9', color: selected ? '#fff' : '#94a3b8', border: 'none', boxShadow: selected ? '0 4px 14px rgba(225,29,72,0.28)' : 'none', transition: 'all 0.2s' }}
            whileHover={selected ? { scale: 1.03 } : {}} whileTap={selected ? { scale: 0.97 } : {}}
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

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: appointments.length }
    TABS.slice(1).forEach(t => { c[t.key] = appointments.filter(a => a.status === t.key).length })
    return c
  }, [appointments])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return appointments.filter(a => {
      if (filter !== 'ALL' && a.status !== filter) return false
      if (!q) return true
      return (a.doctorName || '').toLowerCase().includes(q) ||
        (a.doctorSpecialization || '').toLowerCase().includes(q) ||
        (a.reason || '').toLowerCase().includes(q)
    })
  }, [appointments, filter, search])

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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes sk     { 0%,100%{opacity:.5} 50%{opacity:1} }
        .appt-row:hover   { background:#f8faff !important; }
        .appt-row         { transition: background 0.14s ease; cursor: pointer; }
        .tab-btn:hover    { border-color:#bfdbfe !important; color:#2563eb !important; }
        .act-btn:hover    { background:#2563eb !important; color:#fff !important; border-color:#2563eb !important; }
        .act-red:hover    { background:#e11d48 !important; color:#fff !important; border-color:#e11d48 !important; }
        .act-green:hover  { background:#16a34a !important; color:#fff !important; border-color:#16a34a !important; }
        .act-amber:hover  { background:#d97706 !important; color:#fff !important; border-color:#d97706 !important; }
        .search-in:focus  { border-color:#bfdbfe !important; box-shadow:0 0 0 3px rgba(37,99,235,0.08) !important; background:#fff !important; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div style={S.header}
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22,1,0.36,1] }}>
        <div>
          <p style={S.eyebrow}>Health Records</p>
          <h1 style={S.title}>My Appointments</h1>
          <p style={S.subtitle}>Track, manage and review all your healthcare visits</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={S.countBadge}>
            <Calendar size={13} style={{ color: '#2563eb' }} />
            {appointments.length} appointments
          </span>
          <motion.button style={S.bookBtn}
            whileHover={{ scale: 1.03, boxShadow: '0 6px 20px rgba(37,99,235,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/patient/book')}>
            <Plus size={15} /> Book Appointment
          </motion.button>
        </div>
      </motion.div>

      {/* ── Stats strip — matching prescriptions ───────────── */}
      {appointments.length > 0 && (
        <motion.div style={S.statsRow}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}>
          {[
            { icon: Calendar,     val: appointments.length, lbl: 'Total',     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { icon: CalendarClock,val: upcoming,            lbl: 'Upcoming',  color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
            { icon: CalendarCheck,val: completed,           lbl: 'Completed', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { icon: CalendarX,    val: cancelled,           lbl: 'Cancelled', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
          ].map(({ icon: Icon, val, lbl, color, bg, border }, i) => (
            <motion.div key={lbl}
              style={{ ...S.statPill, background: bg, borderColor: border }}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.14 + i * 0.05 }}>
              <div style={{ ...S.statIcon, color }}>
                <Icon size={14} />
              </div>
              <span style={{ ...S.statVal, color }}>{val}</span>
              <span style={S.statLbl}>{lbl}</span>
            </motion.div>
          ))}

          {pendingRx > 0 && (
            <motion.div style={S.pendingBanner}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <AlertCircle size={13} style={{ color: '#d97706', flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: '#92400e', fontWeight: 600 }}>
                {pendingRx} completed without prescription
              </span>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <motion.div style={S.toolbar}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
        <div style={S.searchWrap}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input className="search-in" style={S.searchInput}
            placeholder="Search doctor, specialization, reason…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button style={S.clearBtn} onClick={() => setSearch('')}><X size={11} /></button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} className="tab-btn"
              onClick={() => setFilter(t.key)}
              style={{
                ...S.filterBtn,
                background: filter === t.key ? '#2563eb' : '#fff',
                color:      filter === t.key ? '#fff' : '#64748b',
                borderColor:filter === t.key ? '#2563eb' : '#e5e7eb',
                boxShadow:  filter === t.key ? '0 2px 8px rgba(37,99,235,0.22)' : 'none',
              }}>
              {t.label}
              <span style={{ opacity: 0.75, fontSize: 11, marginLeft: 4, fontFamily: 'DM Mono,monospace' }}>
                {counts[t.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <span style={S.resultHint}>
          {(search || filter !== 'ALL') ? `${filtered.length} of ${appointments.length}` : `${appointments.length} total`}
        </span>
      </motion.div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && <Skeleton />}

      {/* ── Empty ───────────────────────────────────────────── */}
      {!loading && appointments.length === 0 && (
        <motion.div style={S.empty}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div style={S.emptyIcon}><Calendar size={26} style={{ color: '#bfdbfe' }} /></div>
          <p style={S.emptyTitle}>No appointments yet</p>
          <p style={S.emptySub}>Book your first appointment to get started on your health journey.</p>
          <motion.button style={{ ...S.bookBtn, marginTop: 16 }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/patient/book')}>
            <Plus size={14} /> Book Appointment
          </motion.button>
        </motion.div>
      )}

      {/* ── No results ──────────────────────────────────────── */}
      {!loading && appointments.length > 0 && filtered.length === 0 && (
        <motion.div style={S.empty} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={S.emptyIcon}><Search size={22} style={{ color: '#bfdbfe' }} /></div>
          <p style={S.emptyTitle}>No matches found</p>
          <p style={S.emptySub}>Try a different search term or filter.</p>
        </motion.div>
      )}

      {/* ── Appointments List ────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <motion.div style={S.listWrap}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}>

          {/* Table header */}
          <div style={S.listHead}>
            <span style={{ flex: 2.2 }}>Doctor</span>
            <span style={{ flex: 1.8 }}>Date & Time</span>
            <span style={{ flex: 1.1 }}>Status</span>
            <span style={{ flex: 0.8 }}>Fee</span>
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
                  borderBottom: '1px solid #f8fafc',
                  borderLeft: `3px solid ${isOpen ? sm.accent : 'transparent'}`,
                  background: isOpen ? `${sm.accent}06` : '#fff',
                  animation: 'fadeUp 0.38s ease both',
                  animationDelay: `${idx * 0.045}s`,
                  transition: 'background 0.18s ease, border-color 0.18s ease',
                }}>
                  {/* Main row */}
                  <div className="appt-row" style={S.row} onClick={() => toggle(a.id)}>

                    {/* Doctor */}
                    <div style={{ flex: 2.2, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ ...S.avatar, background: `linear-gradient(135deg,${sm.accent},${sm.accent}99)` }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={S.docName}>Dr. {a.doctorName}</p>
                        {a.doctorSpecialization && (
                          <p style={{ ...S.docSpec, color: sm.accent }}>{a.doctorSpecialization}</p>
                        )}
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div style={{ flex: 1.8 }}>
                      <p style={S.dateText}>{fmtDate(a.appointmentDate, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p style={S.timeText}>
                        <Clock size={9} style={{ marginRight: 3 }} />
                        {fmtTime(a.startTime)} – {fmtTime(a.endTime)}
                      </p>
                    </div>

                    {/* Status */}
                    <div style={{ flex: 1.1 }}>
                      <span style={{ ...S.statusBadge, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sm.dot, flexShrink: 0, display: 'inline-block' }} />
                        {sm.label}
                      </span>
                      {pm && (
                        <p style={{ ...S.payText, color: pm.color, background: pm.bg, marginTop: 4 }}>{pm.label}</p>
                      )}
                    </div>

                    {/* Fee */}
                    <div style={{ flex: 0.8 }}>
                      <p style={S.feeText}>₹{a.consultationFee}</p>
                    </div>

                    {/* Actions */}
                    <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}
                      onClick={e => e.stopPropagation()}>
                      <button className="act-btn" style={S.actBtn}
                        onClick={() => setDetailModal(a)}>
                        <ArrowUpRight size={12} /> Details
                      </button>
                      {canCancel && (
                        <button className="act-red" style={{ ...S.actBtn, color: '#e11d48', borderColor: '#fecdd3', background: '#fff1f2' }}
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
                        <button className="act-amber" style={{ ...S.actBtn, color: '#d97706', borderColor: '#fde68a', background: '#fefce8' }}
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
                        transition={{ duration: 0.22, ease: [0.22,1,0.36,1] }}
                        style={{ display: 'flex', alignItems: 'center', marginLeft: 2, flexShrink: 0 }}>
                        <ChevronDown size={15} style={{ color: '#94a3b8' }} />
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
                        transition={{ duration: 0.28, ease: [0.22,1,0.36,1] }}
                        style={{ overflow: 'hidden' }}>
                        <div style={{ ...S.drawer, borderTop: `1px dashed ${sm.accent}30` }}>
                          <div style={S.drawerGrid}>

                            {/* Appointment details */}
                            <div style={S.drawerSection}>
                              <p style={S.drawerLabel}>Appointment Details</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                  { icon: Calendar,    label: 'Date',           val: fmtDate(a.appointmentDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
                                  { icon: Clock,       label: 'Time',           val: `${fmtTime(a.startTime)} – ${fmtTime(a.endTime)}` },
                                  { icon: Stethoscope, label: 'Specialization', val: a.doctorSpecialization || '—' },
                                  { icon: CreditCard,  label: 'Fee',            val: `₹${a.consultationFee} · ${a.paymentStatus || 'PENDING'}` },
                                ].map(({ icon: Icon, label, val }) => (
                                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${sm.accent}0f`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Icon size={13} style={{ color: sm.accent }} />
                                    </div>
                                    <div>
                                      <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px' }}>{label}</p>
                                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>{val}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Visit info */}
                            <div style={S.drawerSection}>
                              <p style={S.drawerLabel}>Visit Information</p>
                              {a.reason ? (
                                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                                  <FileText size={13} style={{ color: sm.accent, flexShrink: 0, marginTop: 2 }} />
                                  <div>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>Reason for Visit</p>
                                    <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.6 }}>{a.reason}</p>
                                  </div>
                                </div>
                              ) : (
                                <p style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic' }}>No reason specified</p>
                              )}
                              {a.doctorNotes && (
                                <div style={{ padding: '12px 14px', borderRadius: 10, background: `${sm.accent}08`, border: `1px solid ${sm.accent}20`, display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 8 }}>
                                  <Activity size={13} style={{ color: sm.accent, flexShrink: 0, marginTop: 2 }} />
                                  <div>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: sm.accent, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>Doctor's Notes</p>
                                    <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.6 }}>{a.doctorNotes}</p>
                                  </div>
                                </div>
                              )}
                              {!a.reason && !a.doctorNotes && (
                                <p style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic' }}>No visit information available</p>
                              )}
                              {a.isFirstVisit && (
                                <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: 11.5, color: '#7c3aed', fontWeight: 600 }}>
                                  <CheckCircle2 size={10} /> First Visit
                                </div>
                              )}
                            </div>

                            {/* Quick actions */}
                            <div style={S.drawerSection}>
                              <p style={S.drawerLabel}>Quick Actions</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                <motion.button className="act-btn" style={{ ...S.drawerActBtn }}
                                  whileHover={{ x: 2 }}
                                  onClick={() => setDetailModal(a)}>
                                  <ArrowUpRight size={12} /> Full Details <ArrowUpRight size={11} style={{ marginLeft: 'auto' }} />
                                </motion.button>
                                {canReschedule && (
                                  <>
                                    <motion.button className="act-btn" style={{ ...S.drawerActBtn }}
                                      whileHover={{ x: 2 }}
                                      onClick={() => navigate(`/patient/book?reschedule=${a.id}&doctorId=${a.doctorId}`)}>
                                      <RefreshCw size={12} /> Reschedule <ArrowUpRight size={11} style={{ marginLeft: 'auto' }} />
                                    </motion.button>
                                    {canCancel && (
                                    <motion.button className="act-red" style={{ ...S.drawerActBtn, color: '#e11d48', borderColor: '#fecdd3', background: '#fff1f2' }}
                                      whileHover={{ x: 2 }}
                                      onClick={() => setCancelModal(a)}>
                                      <XCircle size={12} /> Cancel Appointment <ArrowUpRight size={11} style={{ marginLeft: 'auto' }} />
                                    </motion.button>
                                    )}
                                  </>
                                )}
                                {a.status === 'COMPLETED' && !a.hasRating && (
                                  <motion.button className="act-amber" style={{ ...S.drawerActBtn, color: '#d97706', borderColor: '#fde68a', background: '#fefce8' }}
                                    whileHover={{ x: 2 }}
                                    onClick={() => setRateModal({ id: a.id, doctorName: a.doctorName })}>
                                    <Star size={12} /> Rate this Visit <ArrowUpRight size={11} style={{ marginLeft: 'auto' }} />
                                  </motion.button>
                                )}
                                {a.hasPrescription && (
                                  <motion.button className="act-green" style={{ ...S.drawerActBtn, color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                                    whileHover={{ x: 2 }}
                                    onClick={() => navigate('/patient/prescriptions')}>
                                    <FileText size={12} /> View Prescription <ArrowUpRight size={11} style={{ marginLeft: 'auto' }} />
                                  </motion.button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Footer hint */}
                          <div style={S.drawerFooter}>
                            <span style={S.drawerHint}>Click "Full Details" to open the appointment detail modal</span>
                            {canCancel && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CalendarClock size={12} style={{ color: sm.accent }} />
                                <span style={{ fontSize: 12, color: '#64748b' }}>
                                  Appointment is <strong style={{ color: sm.accent }}>{fmtRelative(a.appointmentDate)}</strong>
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
          <DetailModal
            appt={detailModal}
            onClose={() => setDetailModal(null)}
            onReschedule={() => { setDetailModal(null); navigate(`/patient/book?reschedule=${detailModal.id}&doctorId=${detailModal.doctorId}`) }}
            onCancel={() => { setCancelModal(detailModal); setDetailModal(null) }}
            onRate={() => { setRateModal({ id: detailModal.id, doctorName: detailModal.doctorName }); setDetailModal(null) }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rateModal && (
          <RatingModal
            doctorName={rateModal.doctorName}
            onClose={() => setRateModal(null)}
            onSubmit={submitRating}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {cancelModal && (
          <CancelModal
            appointment={cancelModal}
            onConfirm={handleCancel}
            onReschedule={() => {
              const appt = cancelModal
              setCancelModal(null)
              navigate(`/patient/book?reschedule=${appt.id}&doctorId=${appt.doctorId}`)
            }}
            onClose={() => setCancelModal(null)}
            loading={cancelLoading}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Page Styles ─────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  page: {
    padding: '1.75rem', fontFamily: "'DM Sans',system-ui,sans-serif",
    maxWidth: 1200, margin: '0 auto',
    display: 'flex', flexDirection: 'column', gap: 16, minHeight: '100%',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', flexWrap: 'wrap', gap: 12,
  },
  eyebrow: { fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' },
  title:   { fontSize: 'clamp(1.25rem,2.5vw,1.75rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', margin: 0 },
  subtitle:{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' },
  bookBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 18px', borderRadius: 11,
    background: '#2563eb', color: '#fff', border: 'none',
    fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
    boxShadow: '0 4px 14px rgba(37,99,235,0.28)',
  },
  countBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 14px', borderRadius: 999,
    background: '#fff', border: '1.5px solid #bfdbfe',
    fontSize: 12.5, fontWeight: 700, color: '#1e40af',
    boxShadow: '0 1px 4px rgba(37,99,235,0.08)',
  },

  /* Stats — identical to prescriptions */
  statsRow: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  statPill: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 16px', borderRadius: 999,
    border: '1px solid', flex: 1, minWidth: 120,
  },
  statIcon: {
    width: 28, height: 28, borderRadius: 8, background: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0,
  },
  statVal: { fontSize: 17, fontWeight: 800, fontFamily: 'DM Mono,monospace', lineHeight: 1 },
  statLbl: { fontSize: 11.5, color: '#6b7280', fontWeight: 500 },
  pendingBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 12px', borderRadius: 999,
    background: '#fffbeb', border: '1px solid #fde68a',
    marginLeft: 'auto',
  },

  /* Toolbar */
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    background: '#fff', border: '1px solid #f1f5f9',
    borderRadius: 12, padding: '10px 14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  searchWrap: { position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 },
  searchInput: {
    width: '100%', padding: '8px 30px 8px 34px',
    borderRadius: 9, border: '1.5px solid #e5e7eb',
    background: '#f8fafc', color: '#0f172a',
    fontSize: 13, fontFamily: 'DM Sans,sans-serif', outline: 'none',
    transition: 'all 0.15s ease',
  },
  clearBtn: {
    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2,
    display: 'flex', alignItems: 'center',
  },
  filterBtn: {
    padding: '6px 13px', borderRadius: 999,
    fontSize: 12, fontWeight: 700, border: '1.5px solid',
    cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', transition: 'all 0.14s ease',
    display: 'inline-flex', alignItems: 'center',
  },
  resultHint: { fontSize: 12, color: '#94a3b8', fontWeight: 500, marginLeft: 'auto', whiteSpace: 'nowrap' },

  /* List */
  listWrap: {
    background: '#fff', borderRadius: 16,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 5px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  listHead: {
    display: 'flex', alignItems: 'center',
    padding: '10px 20px',
    background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
    fontSize: 10.5, fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.07em',
  },
  row: {
    display: 'flex', alignItems: 'center',
    padding: '14px 20px', userSelect: 'none',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12.5, fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  docName:     { margin: 0, fontWeight: 700, fontSize: 13.5, color: '#0f172a', lineHeight: 1.2 },
  docSpec:     { margin: '2px 0 0', fontSize: 11.5, fontWeight: 600, lineHeight: 1 },
  dateText:    { margin: 0, fontSize: 12.5, fontWeight: 700, color: '#334155', fontFamily: 'DM Mono,monospace' },
  timeText:    { margin: '2px 0 0', fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', fontFamily: 'DM Mono,monospace' },
  statusBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 999,
    fontSize: 11.5, fontWeight: 700,
  },
  payText: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
    fontSize: 10.5, fontWeight: 700, fontFamily: 'DM Mono,monospace',
  },
  feeText: { margin: 0, fontSize: 13.5, fontWeight: 800, color: '#0f172a', fontFamily: 'DM Mono,monospace' },
  actBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 8,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    fontSize: 11.5, fontWeight: 700, color: '#475569',
    cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
    transition: 'all 0.14s ease', whiteSpace: 'nowrap',
  },

  /* Drawer */
  drawer: {
    padding: '20px 24px 22px',
    background: '#fafbff',
    display: 'flex', flexDirection: 'column', gap: 18,
  },
  drawerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
    gap: 20,
  },
  drawerSection: { display: 'flex', flexDirection: 'column', gap: 10 },
  drawerLabel: {
    fontSize: 10, fontWeight: 800, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px',
  },
  drawerActBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 13px', borderRadius: 10,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    fontSize: 12.5, fontWeight: 600, color: '#475569',
    cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
    transition: 'all 0.14s ease',
  },
  drawerFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 8,
    paddingTop: 12, borderTop: '1px solid #f1f5f9',
  },
  drawerHint: { fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' },

  /* Empty */
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '4rem 1rem', textAlign: 'center',
    background: '#fff', borderRadius: 16, border: '1.5px dashed #e0e7ff',
  },
  emptyIcon: {
    width: 58, height: 58, borderRadius: 16,
    background: '#eff6ff', border: '1px solid #bfdbfe',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontWeight: 700, fontSize: 14.5, color: '#475569', margin: 0 },
  emptySub:   { fontSize: 13, color: '#94a3b8', margin: '5px 0 0', maxWidth: 300, lineHeight: 1.6 },
}

/* ─── Modal Styles ────────────────────────────────────────── */
const M: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  },
  modal: {
    background: '#fff', borderRadius: 20, padding: 0,
    width: '100%', maxWidth: 520, maxHeight: '90vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(15,23,42,0.2)',
    fontFamily: 'DM Sans,sans-serif',
  },
  mHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0,
  },
  mAvatar: {
    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800,
  },
  mDoc:  { margin: 0, fontWeight: 700, fontSize: 14.5, color: '#0f172a' },
  mSpec: { margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: '#64748b' },
  closeBtn: {
    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
    background: '#f8fafc', border: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#64748b',
  },
  body: { flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 },

  /* Status banner */
  statusBanner: { padding: '12px 14px', borderRadius: 12, flexShrink: 0 },
  statusPill: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
  },
  metaChip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11.5, color: '#64748b', fontWeight: 500,
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 7, padding: '3px 9px',
  },

  /* Section */
  sectionHead: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 },
  sectionTitle: { fontSize: 10.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em', flex: 1 },

  /* Detail row */
  detailRow: { display: 'flex', alignItems: 'center', gap: 10 },
  detailIcon: {
    width: 30, height: 30, borderRadius: 8, background: '#f8fafc',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  detailLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 500, minWidth: 110 },
  detailVal:   { fontSize: 13, color: '#0f172a', fontWeight: 700 },

  /* Note */
  noteBox: {
    display: 'flex', alignItems: 'flex-start', gap: 9,
    padding: '11px 13px', borderRadius: 10,
    background: '#f8fafc', border: '1px solid #f1f5f9',
  },
  noteLabel: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' },
  noteText:  { fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 },

  /* Footer */
  footer: {
    display: 'flex', gap: 10, padding: '14px 20px',
    borderTop: '1px solid #f1f5f9', flexShrink: 0,
  },
  cancelBtn: {
    padding: '10px 18px', borderRadius: 10,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    fontSize: 13, fontWeight: 700, color: '#64748b',
    cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
  },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 14px', borderRadius: 10, border: 'none',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
    transition: 'all 0.14s ease',
  },
  spinner: {
    display: 'block', width: 13, height: 13, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
  },
}
