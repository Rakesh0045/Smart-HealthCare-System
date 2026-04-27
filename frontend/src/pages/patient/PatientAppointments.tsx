import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { appointmentApi, patientApi } from '../../api'
import {
  Calendar, Plus, Star, X, Clock, Stethoscope, ChevronDown,
  CheckCircle2, XCircle, RefreshCw, CreditCard, FileText,
  AlertCircle, ArrowUpRight, Filter, Search, CalendarCheck,
  CalendarX, CalendarClock, Activity,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ─── helpers ────────────────────────────────────────────── */
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

/* ─── Status config ──────────────────────────────────────── */
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
]

/* ─── Skeleton ───────────────────────────────────────────── */
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

/* ─── Rating Modal ───────────────────────────────────────── */
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
      style={RM.overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={RM.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={RM.head}>
          <div>
            <h3 style={RM.title}>Rate your visit</h3>
            <p style={RM.sub}>with Dr. {doctorName}</p>
          </div>
          <button style={RM.closeBtn} onClick={onClose}><X size={15} /></button>
        </div>

        {/* Stars */}
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
                  style={{
                    fontSize: 36, background: 'none', border: 'none', cursor: 'pointer',
                    color: active ? '#f59e0b' : '#e5e7eb',
                    filter: active ? 'drop-shadow(0 2px 4px rgba(245,158,11,0.3))' : 'none',
                    transition: 'color 0.15s, filter 0.15s',
                    padding: 0, lineHeight: 1,
                  }}>★</motion.button>
              )
            })}
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: 0, minHeight: 20 }}>
            {LABELS[hoveredStar ?? rating]}
          </p>
        </div>

        {/* Review */}
        <div style={{ padding: '12px 24px 0' }}>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Share your experience (optional)…"
            rows={3}
            style={RM.textarea}
          />
        </div>

        {/* Footer */}
        <div style={RM.footer}>
          <button style={RM.cancelBtn} onClick={onClose}>Cancel</button>
          <motion.button style={RM.submitBtn}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => onSubmit(rating, review)}>
            Submit Rating
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Cancel Confirmation Modal ──────────────────────────── */
function CancelModal({ appointment, onConfirm, onClose, loading }: {
  appointment: any; onConfirm: () => void; onClose: () => void; loading: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={RM.overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={{ ...RM.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>

        <div style={RM.head}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={18} style={{ color: '#e11d48' }} />
            </div>
            <div>
              <h3 style={RM.title}>Cancel Appointment</h3>
              <p style={RM.sub}>This action cannot be undone</p>
            </div>
          </div>
          <button style={RM.closeBtn} onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
              Dr. {appointment.doctorName}
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
              {fmtDate(appointment.appointmentDate)} · {fmtTime(appointment.startTime)}
            </p>
          </div>
          {appointment.paymentStatus === 'PAID' && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: '#92400e', margin: 0 }}>
                A refund of <strong>₹{appointment.consultationFee}</strong> will be processed within 3–5 business days.
              </p>
            </div>
          )}
        </div>

        <div style={RM.footer}>
          <button style={RM.cancelBtn} onClick={onClose}>Keep it</button>
          <motion.button
            style={{ ...RM.submitBtn, background: '#e11d48', boxShadow: '0 4px 14px rgba(225,29,72,0.28)' }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onConfirm} disabled={loading}>
            {loading ? <span style={RM.spinner} /> : <XCircle size={13} />}
            {loading ? 'Cancelling…' : 'Yes, Cancel'}
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

  /* Stats */
  const upcoming  = useMemo(() => appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED').length, [appointments])
  const completed = useMemo(() => appointments.filter(a => a.status === 'COMPLETED').length, [appointments])
  const cancelled = useMemo(() => appointments.filter(a => a.status === 'CANCELLED').length, [appointments])
  const pendingRx = useMemo(() => appointments.filter(a => a.status === 'COMPLETED' && !a.hasPrescription).length, [appointments])

  const handleCancel = async () => {
    if (!cancelModal) return
    setCancelLoading(true)
    try {
      await appointmentApi.cancel(cancelModal.id)
      toast.success('Appointment cancelled')
      if (cancelModal.paymentStatus === 'PAID') {
        toast.success(`Refund of ₹${cancelModal.consultationFee} will be processed in 3–5 days`, { duration: 5000 })
      }
      setCancelModal(null)
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

      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div style={S.header}
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22,1,0.36,1] }}>
        <div>
          <p style={S.eyebrow}>Health Records</p>
          <h1 style={S.title}>My Appointments</h1>
          <p style={S.subtitle}>Track, manage and review all your healthcare visits</p>
        </div>
        <motion.button style={S.bookBtn}
          whileHover={{ scale: 1.03, boxShadow: '0 6px 20px rgba(37,99,235,0.35)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/patient/book')}>
          <Plus size={15} /> Book Appointment
        </motion.button>
      </motion.div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      <motion.div style={S.statsRow}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}>
        {[
          { val: appointments.length, lbl: 'Total',     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { val: upcoming,            lbl: 'Upcoming',  color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
          { val: completed,           lbl: 'Completed', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { val: cancelled,           lbl: 'Cancelled', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
        ].map(({ val, lbl, color, bg, border }, i) => (
          <motion.div key={lbl}
            style={{ ...S.statPill, background: bg, borderColor: border }}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.14 + i * 0.05 }}>
            <span style={{ ...S.statVal, color }}>{val}</span>
            <span style={S.statLbl}>{lbl}</span>
          </motion.div>
        ))}

        {/* Pending prescription alert */}
        {pendingRx > 0 && (
          <motion.div
            style={S.pendingRxBanner}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <AlertCircle size={13} style={{ color: '#d97706', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: '#92400e', fontWeight: 600 }}>
              {pendingRx} appointment{pendingRx > 1 ? 's' : ''} awaiting prescription
            </span>
            <button style={S.rxAlertBtn} onClick={() => navigate('/patient/prescriptions')}>
              View <ArrowUpRight size={11} />
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <motion.div style={S.toolbar}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
        {/* Search */}
        <div style={S.searchWrap}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input className="search-in" style={S.searchInput}
            placeholder="Search doctor, specialization, reason…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button style={S.clearBtn} onClick={() => setSearch('')}><X size={11} /></button>
          )}
        </div>

        {/* Status tabs */}
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
            <span style={{ flex: 1.6 }}>Date & Time</span>
            <span style={{ flex: 1 }}>Status</span>
            <span style={{ flex: 0.9 }}>Fee</span>
            <span style={{ flex: 1.8, textAlign: 'right' as const }}>Actions</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((a, idx) => {
              const sm = STATUS_CFG[a.status] || STATUS_CFG.SCHEDULED
              const pm = a.paymentStatus ? PAYMENT_CFG[a.paymentStatus] : null
              const isOpen = expanded === a.id
              const initials = (a.doctorName || 'D').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              const canAct = a.status === 'SCHEDULED' || a.status === 'RESCHEDULED'

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
                    <div style={{ flex: 1.6 }}>
                      <p style={S.dateText}>{fmtDate(a.appointmentDate, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p style={S.timeText}>
                        <Clock size={9} style={{ marginRight: 2 }} />
                        {fmtTime(a.startTime)} – {fmtTime(a.endTime)}
                      </p>
                    </div>

                    {/* Status */}
                    <div style={{ flex: 1 }}>
                      <span style={{ ...S.statusBadge, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sm.dot, flexShrink: 0, display: 'inline-block' }} />
                        {sm.label}
                      </span>
                      {pm && (
                        <p style={{ ...S.payText, color: pm.color, background: pm.bg, marginTop: 4 }}>
                          {pm.label}
                        </p>
                      )}
                    </div>

                    {/* Fee */}
                    <div style={{ flex: 0.9 }}>
                      <p style={S.feeText}>₹{a.consultationFee}</p>
                    </div>

                    {/* Actions */}
                    <div style={{ flex: 1.8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}
                      onClick={e => e.stopPropagation()}>
                      {canAct && (
                        <>
                          <button className="act-btn" style={S.actBtn}
                            onClick={() => navigate(`/patient/book?reschedule=${a.id}&doctorId=${a.doctorId}`)}>
                            <RefreshCw size={11} /> Reschedule
                          </button>
                          <button className="act-red" style={{ ...S.actBtn, color: '#e11d48', borderColor: '#fecdd3', background: '#fff1f2' }}
                            onClick={() => setCancelModal(a)}>
                            <XCircle size={11} /> Cancel
                          </button>
                        </>
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
                      {a.hasPrescription && (
                        <button className="act-btn" style={S.actBtn}
                          onClick={() => navigate('/patient/prescriptions')}>
                          <FileText size={11} /> Rx
                        </button>
                      )}
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.22, ease: [0.22,1,0.36,1] }}
                        style={{ display: 'flex', alignItems: 'center', marginLeft: 2, flexShrink: 0 }}>
                        <ChevronDown size={15} style={{ color: '#94a3b8' }} />
                      </motion.div>
                    </div>
                  </div>

                  {/* Dropdown expand */}
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                {[
                                  { icon: Calendar, label: 'Date', val: fmtDate(a.appointmentDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
                                  { icon: Clock, label: 'Time', val: `${fmtTime(a.startTime)} – ${fmtTime(a.endTime)}` },
                                  { icon: Stethoscope, label: 'Specialization', val: a.doctorSpecialization || '—' },
                                  { icon: CreditCard, label: 'Fee', val: `₹${a.consultationFee} · ${a.paymentStatus || 'PENDING'}` },
                                ].map(({ icon: Icon, label, val }) => (
                                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Icon size={12} style={{ color: sm.accent, flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, minWidth: 90 }}>{label}</span>
                                    <span style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 600 }}>{val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Reason & Notes */}
                            <div style={S.drawerSection}>
                              <p style={S.drawerLabel}>Visit Information</p>
                              {a.reason ? (
                                <div style={S.reasonBox}>
                                  <FileText size={12} style={{ color: sm.accent, flexShrink: 0, marginTop: 1 }} />
                                  <div>
                                    <p style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>Reason for Visit</p>
                                    <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.5 }}>{a.reason}</p>
                                  </div>
                                </div>
                              ) : (
                                <p style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic' }}>No reason specified</p>
                              )}
                              {a.doctorNotes && (
                                <div style={{ ...S.reasonBox, marginTop: 8, background: `${sm.accent}08`, border: `1px solid ${sm.accent}20` }}>
                                  <Activity size={12} style={{ color: sm.accent, flexShrink: 0, marginTop: 1 }} />
                                  <div>
                                    <p style={{ fontSize: 10.5, fontWeight: 700, color: sm.accent, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>Doctor's Notes</p>
                                    <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.5 }}>{a.doctorNotes}</p>
                                  </div>
                                </div>
                              )}
                              {a.isFirstVisit && (
                                <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: 11.5, color: '#7c3aed', fontWeight: 600 }}>
                                  <CheckCircle2 size={10} /> First Visit
                                </div>
                              )}
                            </div>

                            {/* Quick actions */}
                            <div style={S.drawerSection}>
                              <p style={S.drawerLabel}>Quick Actions</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {canAct && (
                                  <>
                                    <motion.button className="act-btn" style={{ ...S.drawerActBtn, justifyContent: 'flex-start' }}
                                      whileHover={{ x: 2 }}
                                      onClick={() => navigate(`/patient/book?reschedule=${a.id}&doctorId=${a.doctorId}`)}>
                                      <RefreshCw size={12} /> Reschedule Appointment <ArrowUpRight size={11} style={{ marginLeft: 'auto' }} />
                                    </motion.button>
                                    <motion.button className="act-red" style={{ ...S.drawerActBtn, justifyContent: 'flex-start', color: '#e11d48', borderColor: '#fecdd3', background: '#fff1f2' }}
                                      whileHover={{ x: 2 }}
                                      onClick={() => setCancelModal(a)}>
                                      <XCircle size={12} /> Cancel Appointment <ArrowUpRight size={11} style={{ marginLeft: 'auto' }} />
                                    </motion.button>
                                  </>
                                )}
                                {a.status === 'COMPLETED' && !a.hasRating && (
                                  <motion.button className="act-amber" style={{ ...S.drawerActBtn, justifyContent: 'flex-start', color: '#d97706', borderColor: '#fde68a', background: '#fefce8' }}
                                    whileHover={{ x: 2 }}
                                    onClick={() => setRateModal({ id: a.id, doctorName: a.doctorName })}>
                                    <Star size={12} /> Rate this Visit <ArrowUpRight size={11} style={{ marginLeft: 'auto' }} />
                                  </motion.button>
                                )}
                                {a.hasPrescription && (
                                  <motion.button className="act-green" style={{ ...S.drawerActBtn, justifyContent: 'flex-start', color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                                    whileHover={{ x: 2 }}
                                    onClick={() => navigate('/patient/prescriptions')}>
                                    <FileText size={12} /> View Prescription <ArrowUpRight size={11} style={{ marginLeft: 'auto' }} />
                                  </motion.button>
                                )}
                                {!canAct && !a.hasPrescription && a.status !== 'COMPLETED' && (
                                  <p style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic' }}>No actions available</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Relative date */}
                          {(a.status === 'SCHEDULED' || a.status === 'RESCHEDULED') && (
                            <div style={S.drawerFooter}>
                              <CalendarClock size={12} style={{ color: sm.accent }} />
                              <span style={{ fontSize: 12, color: '#64748b' }}>
                                Appointment is <strong style={{ color: sm.accent }}>{fmtRelative(a.appointmentDate)}</strong>
                              </span>
                            </div>
                          )}
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

      {/* ── Modals ──────────────────────────────────────────── */}
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
            onClose={() => setCancelModal(null)}
            loading={cancelLoading}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Styles ─────────────────────────────────────────────── */
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

  /* Stats */
  statsRow: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  statPill: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 16px', borderRadius: 999,
    border: '1px solid',
  },
  statVal: { fontSize: 17, fontWeight: 800, fontFamily: 'DM Mono,monospace', lineHeight: 1 },
  statLbl: { fontSize: 11.5, color: '#6b7280', fontWeight: 500 },
  pendingRxBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 12px', borderRadius: 999,
    background: '#fffbeb', border: '1px solid #fde68a',
    marginLeft: 'auto',
  },
  rxAlertBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    fontSize: 12, fontWeight: 700, color: '#d97706',
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    fontFamily: 'DM Sans,sans-serif', textDecoration: 'underline',
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
    display: 'flex', alignItems: 'center', gap: 0,
    padding: '14px 20px', userSelect: 'none',
  },

  /* Row cells */
  avatar: {
    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12.5, fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  docName: { margin: 0, fontWeight: 700, fontSize: 13.5, color: '#0f172a', lineHeight: 1.2 },
  docSpec: { margin: '2px 0 0', fontSize: 11.5, fontWeight: 600, lineHeight: 1 },
  dateText: { margin: 0, fontSize: 12.5, fontWeight: 700, color: '#334155', fontFamily: 'DM Mono,monospace' },
  timeText: { margin: '2px 0 0', fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', fontFamily: 'DM Mono,monospace' },
  statusBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 999,
    fontSize: 11.5, fontWeight: 700, letterSpacing: '0.02em',
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
    padding: '18px 20px 20px',
    background: '#fafbff',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  drawerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
    gap: 16,
  },
  drawerSection: { display: 'flex', flexDirection: 'column', gap: 10 },
  drawerLabel: {
    fontSize: 10, fontWeight: 800, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0,
  },
  reasonBox: {
    display: 'flex', alignItems: 'flex-start', gap: 9,
    padding: '10px 12px', borderRadius: 10,
    background: '#f8fafc', border: '1px solid #f1f5f9',
  },
  drawerActBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', borderRadius: 10,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    fontSize: 12.5, fontWeight: 600, color: '#475569',
    cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
    transition: 'all 0.14s ease',
  },
  drawerFooter: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '10px 12px', borderRadius: 10,
    background: '#fff', border: '1px solid #f1f5f9',
    fontSize: 12.5,
  },

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
  emptySub: { fontSize: 13, color: '#94a3b8', margin: '5px 0 0', maxWidth: 300, lineHeight: 1.6 },
}

/* ─── Modal styles ───────────────────────────────────────── */
const RM: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  },
  modal: {
    background: '#fff', borderRadius: 20,
    width: '100%', maxWidth: 440, overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(15,23,42,0.2)',
    fontFamily: 'DM Sans,sans-serif',
  },
  head: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 24px', borderBottom: '1px solid #f1f5f9',
  },
  title: { margin: 0, fontWeight: 800, fontSize: 15.5, color: '#0f172a', letterSpacing: '-0.02em' },
  sub:   { margin: '3px 0 0', fontSize: 12.5, color: '#94a3b8' },
  closeBtn: {
    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
    background: '#f8fafc', border: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#64748b',
  },
  textarea: {
    width: '100%', padding: '10px 12px',
    borderRadius: 10, border: '1.5px solid #e5e7eb',
    background: '#f8fafc', color: '#0f172a',
    fontSize: 13, fontFamily: 'DM Sans,sans-serif',
    resize: 'none', outline: 'none', lineHeight: 1.5,
    boxSizing: 'border-box',
  },
  footer: {
    display: 'flex', gap: 10, padding: '16px 24px',
    borderTop: '1px solid #f1f5f9',
  },
  cancelBtn: {
    flex: 1, padding: '10px', borderRadius: 10,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    fontSize: 13, fontWeight: 700, color: '#64748b',
    cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
  },
  submitBtn: {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '10px', borderRadius: 10,
    background: '#2563eb', border: 'none', color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
    boxShadow: '0 4px 14px rgba(37,99,235,0.28)',
  },
  spinner: {
    display: 'block', width: 13, height: 13, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
  },
}