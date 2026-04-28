import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { prescriptionApi } from '../../api'
import {
  FileText, Download, Pill, Calendar, ChevronDown,
  Stethoscope, Clock, AlertCircle, CheckCircle2,
  Search, Activity, Users, CalendarClock,
  ArrowUpRight, X, BookOpen, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ─── types ─────────────────────────────────────────────── */
type Medicine = {
  id?: number; medicineName?: string; dosage?: string
  frequency?: string; duration?: string; instructions?: string; type?: string
}
type Prescription = {
  id: number; doctorName?: string; doctorSpecialization?: string
  doctorQualification?: string; hospitalName?: string
  patientName?: string; diagnosis?: string; additionalNotes?: string
  followUpDate?: string; createdAt: string; medicines?: Medicine[]
}

/* ─── helpers ────────────────────────────────────────────── */
function fmtDate(d: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleDateString('en-IN', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtRelative(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'Overdue'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return `In ${diff}d`
  return `In ${Math.ceil(diff / 7)}w`
}
function isOverdue(d: string) {
  return new Date(d).getTime() < Date.now()
}
function buildFollowUpBookingPath(doctorName?: string, specialization?: string, date?: string) {
  const params = new URLSearchParams()
  if (doctorName) params.set('doctorName', doctorName)
  if (specialization) params.set('specialization', specialization)
  if (date) params.set('date', date)
  return `/patient/book${params.toString() ? `?${params.toString()}` : ''}`
}

/* ─── Accent palette ─────────────────────────────────────── */
const ACCENTS = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#dc2626']

const CHIP_FREQ = { background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8', border: '1px solid #bfdbfe' }
const CHIP_DUR  = { background: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d', border: '1px solid #bbf7d0' }
const CHIP_NOTE = { background: '#fefce8', borderColor: '#fde68a', color: '#a16207', border: '1px solid #fde68a' }

/* ─── Skeleton ───────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
      {[1, 2, 3, 4].map(i => (
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

/* ─── Detail Modal ───────────────────────────────────────── */
function DetailModal({ rx, onClose, onDownload, downloading }: {
  rx: Prescription; onClose: () => void
  onDownload: (id: number) => void; downloading: boolean
}) {
  const navigate = useNavigate()
  const accent = ACCENTS[rx.id % ACCENTS.length]

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
              {(rx.doctorName || 'D').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p style={M.mDoc}>Dr. {rx.doctorName}</p>
              <p style={{ ...M.mSpec, color: accent }}>{rx.doctorSpecialization}</p>
              {rx.doctorQualification && <p style={M.mQual}>{rx.doctorQualification}</p>}
            </div>
          </div>
          <button style={M.closeBtn} onClick={onClose}><X size={14} /></button>
        </div>

        {/* Body */}
        <div style={M.body}>

          {/* Diagnosis banner */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: `${accent}08`, border: `1px solid ${accent}20` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Activity size={13} style={{ color: accent, marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Diagnosis</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.35 }}>
                  {rx.diagnosis || 'General consultation'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginTop: 10 }}>
              <span style={M.metaChip}><Calendar size={10} />{fmtDate(rx.createdAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              {rx.hospitalName && <span style={M.metaChip}><Stethoscope size={10} />{rx.hospitalName}</span>}
            </div>
          </div>

          {/* Medicines */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Pill size={13} style={{ color: accent }} />
              <p style={M.sectionTitle}>Prescribed Medicines</p>
              <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: `${accent}12`, border: `1px solid ${accent}30`, padding: '1px 8px', borderRadius: 6 }}>
                {rx.medicines?.length || 0}
              </span>
            </div>

            {rx.medicines && rx.medicines.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rx.medicines.map((m, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{ padding: '10px 12px', borderRadius: 10, background: '#fafafa', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: `${accent}12`, border: `1px solid ${accent}25`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' as const, marginBottom: 6 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{m.medicineName}</span>
                          {m.dosage && (
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: accent, background: `${accent}10`, border: `1px solid ${accent}25`, borderRadius: 5, padding: '1px 6px' }}>
                              {m.dosage}
                            </span>
                          )}
                          {m.type && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 5, padding: '1px 7px' }}>
                              {m.type}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                          {m.frequency && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, ...CHIP_FREQ }}>
                              <Clock size={9} />{m.frequency}
                            </span>
                          )}
                          {m.duration && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, ...CHIP_DUR }}>
                              <Calendar size={9} />{m.duration}
                            </span>
                          )}
                          {m.instructions && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, ...CHIP_NOTE }}>
                              <AlertCircle size={9} />{m.instructions}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0', margin: 0 }}>No medicines listed.</p>
            )}
          </div>

          {/* Notes & Follow-up */}
          {(rx.additionalNotes || rx.followUpDate) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rx.additionalNotes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#faf5ff', border: '1px solid #ede9fe', borderRadius: 9 }}>
                  <BookOpen size={12} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Doctor's Notes</p>
                    <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{rx.additionalNotes}</p>
                  </div>
                </div>
              )}
              {rx.followUpDate && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9 }}>
                  <CalendarClock size={12} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Follow-up Appointment</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: 0 }}>
                        {fmtDate(rx.followUpDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: isOverdue(rx.followUpDate) ? '#e11d48' : '#d97706',
                        background: isOverdue(rx.followUpDate) ? '#fff1f2' : '#fefce8',
                        border: `1px solid ${isOverdue(rx.followUpDate) ? '#fecdd3' : '#fde68a'}`,
                        borderRadius: 6, padding: '1px 8px',
                      }}>
                        {fmtRelative(rx.followUpDate)}
                      </span>
                    </div>
                    {isOverdue(rx.followUpDate) && (
                      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#b45309', fontWeight: 600, lineHeight: 1.45 }}>
                        The follow-up date has already passed. We'll show the earliest available slot.
                      </p>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(buildFollowUpBookingPath(rx.doctorName, rx.doctorSpecialization, rx.followUpDate))}
                      style={{ padding: '7px 13px', borderRadius: 8, border: 'none', background: '#d97706', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: '0 3px 10px rgba(217,119,6,0.3)' }}>
                      <Calendar size={11} /> {isOverdue(rx.followUpDate) ? 'Find earliest slot' : 'Book follow-up'}
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={M.footer}>
          <button style={M.cancelBtn} onClick={onClose}>Close</button>
          <motion.button
            style={{ ...M.actionBtn, flex: 1, justifyContent: 'center', background: accent, color: '#fff', border: 'none', boxShadow: `0 3px 10px ${accent}40` }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => onDownload(rx.id)} disabled={downloading}>
            {downloading
              ? <><span style={M.spinner} />Downloading…</>
              : <><Download size={13} />Download PDF</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
export default function PatientPrescriptions() {
  const navigate = useNavigate()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [openRx, setOpenRx] = useState<Prescription | null>(null)
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<'ALL' | 'FOLLOW_UP' | 'RECENT'>('ALL')

  useEffect(() => {
    prescriptionApi.getMy()
      .then(r => setPrescriptions(r.data.data || []))
      .finally(() => setLoading(false))
  }, [])

  const handleDownload = async (id: number) => {
    setDownloading(id)
    try {
      const res = await prescriptionApi.downloadPdf(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url; a.download = `prescription-${id}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Downloaded!')
    } finally { setDownloading(null) }
  }

  const toggle = (id: number) => setExpanded(e => e === id ? null : id)

  /* Stats */
  const totalMeds   = useMemo(() => prescriptions.reduce((s, p) => s + (p.medicines?.length || 0), 0), [prescriptions])
  const uniqueDocs  = useMemo(() => new Set(prescriptions.map(p => p.doctorName)).size, [prescriptions])
  const withFollowUp = useMemo(() => prescriptions.filter(p => p.followUpDate).length, [prescriptions])

  /* Filtered list */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = Date.now()
    return prescriptions.filter(p => {
      if (filterMode === 'FOLLOW_UP' && !p.followUpDate) return false
      if (filterMode === 'RECENT' && (now - new Date(p.createdAt).getTime()) > 30 * 86400000) return false
      if (!q) return true
      return (p.doctorName || '').toLowerCase().includes(q) ||
        (p.diagnosis || '').toLowerCase().includes(q) ||
        (p.medicines || []).some(m => (m.medicineName || '').toLowerCase().includes(q))
    })
  }, [prescriptions, search, filterMode])

  const activeFilters = [filterMode !== 'ALL', !!search.trim()].filter(Boolean).length

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { font-family: 'Geist', system-ui, sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes sk     { 0%,100%{opacity:.45} 50%{opacity:.9} }
        .rx-row:hover     { background:#f8faff !important; }
        .rx-row           { transition: background 0.12s ease; cursor: pointer; }
        .act-btn:hover    { background:#2563eb !important; color:#fff !important; border-color:#2563eb !important; }
        .act-dl:hover     { background:#2563eb !important; color:#fff !important; border-color:#2563eb !important; }
        .act-amber:hover  { background:#d97706 !important; color:#fff !important; border-color:#d97706 !important; }
        .act-red:hover    { background:#dc2626 !important; color:#fff !important; border-color:#dc2626 !important; }
        .search-in:focus  { border-color:#93c5fd !important; box-shadow:0 0 0 3px rgba(37,99,235,0.07) !important; background:#fff !important; }
        .filter-pill      { transition: all 0.12s ease; }
        .filter-pill:hover { border-color:#bfdbfe !important; }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div style={S.header}
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <div>
          <p style={S.eyebrow}>Health Records</p>
          <h1 style={S.title}>My Prescriptions</h1>
          <p style={S.subtitle}>All your consultation prescriptions, searchable and downloadable</p>
        </div>
        <span style={S.countBadge}>
          <FileText size={12} style={{ color: '#2563eb' }} />
          {prescriptions.length} records
        </span>
      </motion.div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      {prescriptions.length > 0 && (
        <motion.div style={S.statsRow}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}>
          {[
            { icon: FileText,      val: prescriptions.length, lbl: 'Total',      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { icon: Users,         val: uniqueDocs,            lbl: 'Doctors',    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
            { icon: Pill,          val: totalMeds,             lbl: 'Medicines',  color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
            { icon: CalendarClock, val: withFollowUp,          lbl: 'Follow-ups', color: '#d97706', bg: '#fefce8', border: '#fde68a' },
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
        </motion.div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <motion.div style={S.toolbar}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 300 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input className="search-in" style={S.searchInput}
            placeholder="Search doctor, diagnosis, medicine…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center' }}
              onClick={() => setSearch('')}><X size={11} /></button>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: '#e5e7eb', flexShrink: 0 }} />

        {/* Filter pills */}
        {([
          { key: 'ALL' as const,       label: 'All Prescriptions' },
          { key: 'FOLLOW_UP' as const, label: 'Follow-up Due' },
          { key: 'RECENT' as const,    label: 'Last 30 Days' },
        ]).map(t => (
          <button key={t.key} className="filter-pill"
            onClick={() => setFilterMode(t.key)}
            style={{
              padding: '6px 12px', borderRadius: 7,
              border: '1.5px solid',
              fontSize: 12.5, fontWeight: filterMode === t.key ? 600 : 500,
              cursor: 'pointer',
              background: filterMode === t.key ? '#2563eb' : '#fff',
              color: filterMode === t.key ? '#fff' : '#475569',
              borderColor: filterMode === t.key ? '#2563eb' : '#e5e7eb',
              boxShadow: filterMode === t.key ? '0 2px 8px rgba(37,99,235,0.22)' : 'none',
              transition: 'all 0.12s ease',
              whiteSpace: 'nowrap' as const,
            }}>
            {t.label}
          </button>
        ))}

        {/* Clear */}
        {activeFilters > 0 && (
          <button className="act-red" style={{ ...S.actBtn, color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2', whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => { setFilterMode('ALL'); setSearch('') }}>
            <X size={11} /> Clear {activeFilters > 1 ? `${activeFilters} filters` : 'filter'}
          </button>
        )}

        {/* Count */}
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {activeFilters > 0 ? `${filtered.length} of ${prescriptions.length}` : `${prescriptions.length} total`}
        </span>
      </motion.div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && <Skeleton />}

      {/* ── Empty state ─────────────────────────────────────── */}
      {!loading && prescriptions.length === 0 && (
        <motion.div style={S.empty} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <FileText size={22} style={{ color: '#93c5fd' }} />
          </div>
          <p style={{ fontWeight: 600, fontSize: 14, color: '#475569', margin: 0 }}>No prescriptions yet</p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '5px 0 0', maxWidth: 280, lineHeight: 1.6, textAlign: 'center' }}>
            Prescriptions from your consultations will appear here.
          </p>
        </motion.div>
      )}

      {/* ── No results ──────────────────────────────────────── */}
      {!loading && prescriptions.length > 0 && filtered.length === 0 && (
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
            <span style={{ flex: 2 }}>Diagnosis</span>
            <span style={{ flex: 1 }}>Date</span>
            <span style={{ flex: 0.7 }}>Meds</span>
            <span style={{ flex: 1.4 }}>Follow-up</span>
            <span style={{ flex: 1.5, textAlign: 'right' as const }}>Actions</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((rx, idx) => {
              const accent = ACCENTS[idx % ACCENTS.length]
              const isOpen = expanded === rx.id
              const medCount = rx.medicines?.length || 0
              const initials = (rx.doctorName || 'D').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              const isDl = downloading === rx.id
              const overdue = rx.followUpDate && isOverdue(rx.followUpDate)

              return (
                <div key={rx.id} style={{
                  borderBottom: '1px solid #f1f5f9',
                  borderLeft: `3px solid ${isOpen ? accent : 'transparent'}`,
                  background: isOpen ? `${accent}05` : '#fff',
                  animation: `fadeUp 0.3s ease both`,
                  animationDelay: `${idx * 0.04}s`,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}>

                  {/* ── Main row ── */}
                  <div className="rx-row" style={S.row} onClick={() => toggle(rx.id)}>

                    {/* Doctor */}
                    <div style={{ flex: 2.2, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: '#0f172a', lineHeight: 1.2 }}>Dr. {rx.doctorName}</p>
                        {rx.doctorSpecialization && (
                          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: accent, fontWeight: 500 }}>{rx.doctorSpecialization}</p>
                        )}
                      </div>
                    </div>

                    {/* Diagnosis */}
                    <div style={{ flex: 2, minWidth: 0, paddingRight: 12 }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rx.diagnosis || 'General consultation'}
                      </p>
                    </div>

                    {/* Date */}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{fmtDate(rx.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>

                    {/* Med count badge */}
                    <div style={{ flex: 0.7 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: `${accent}10`, color: accent, border: `1px solid ${accent}25` }}>
                        <Pill size={9} /> {medCount}
                      </span>
                    </div>

                    {/* Follow-up */}
                    <div style={{ flex: 1.4 }}>
                      {rx.followUpDate ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                          background: overdue ? '#fff1f2' : '#fefce8',
                          border: `1px solid ${overdue ? '#fecdd3' : '#fde68a'}`,
                          color: overdue ? '#e11d48' : '#92400e',
                        }}>
                          <CalendarClock size={10} />
                          {fmtRelative(rx.followUpDate)}
                        </span>
                      ) : (
                        <span style={{ fontSize: 13, color: '#cbd5e1' }}>—</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}
                      onClick={e => e.stopPropagation()}>
                      <button className="act-btn" style={S.actBtn}
                        onClick={() => setOpenRx(rx)}>
                        <ArrowUpRight size={11} /> Details
                      </button>
                      <button className="act-dl" style={{ ...S.actBtn, width: 30, height: 30, padding: 0, justifyContent: 'center', flexShrink: 0 }}
                        onClick={() => handleDownload(rx.id)} disabled={isDl}
                        title="Download PDF">
                        {isDl ? <span style={S.spinner} /> : <Download size={13} />}
                      </button>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', alignItems: 'center', marginLeft: 1, flexShrink: 0 }}>
                        <ChevronDown size={14} style={{ color: '#94a3b8' }} />
                      </motion.div>
                    </div>
                  </div>

                  {/* ── Expand drawer ── */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div key="drawer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px 18px', background: '#fafbfe', borderTop: `1px dashed ${accent}25` }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>

                            {/* Prescription details */}
                            <div>
                              <p style={S.drawerLabel}>Prescription Details</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                                {[
                                  { icon: Calendar,    label: 'Date',          val: fmtDate(rx.createdAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
                                  { icon: Stethoscope, label: 'Specialization', val: rx.doctorSpecialization || '—' },
                                  ...(rx.hospitalName ? [{ icon: Activity, label: 'Hospital', val: rx.hospitalName }] : []),
                                  ...(rx.doctorQualification ? [{ icon: CheckCircle2, label: 'Qualification', val: rx.doctorQualification }] : []),
                                ].map(({ icon: Icon, label, val }) => (
                                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                                    <div style={{ width: 26, height: 26, borderRadius: 7, background: `${accent}0f`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Icon size={12} style={{ color: accent }} />
                                    </div>
                                    <div>
                                      <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 1px' }}>{label}</p>
                                      <p style={{ fontSize: 12.5, fontWeight: 500, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>{val}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Medicines preview */}
                            <div>
                              <p style={S.drawerLabel}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                  <Pill size={12} style={{ color: accent }} /> Medicines ({medCount})
                                </span>
                              </p>
                              {medCount > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {rx.medicines!.slice(0, 4).map((m, i) => (
                                    <motion.div key={i}
                                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.04 }}
                                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: '#fff', border: '1px solid #f1f5f9' }}>
                                      <div style={{ width: 18, height: 18, borderRadius: 5, background: `${accent}10`, border: `1px solid ${accent}20`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                        {i + 1}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.medicineName}</p>
                                        {m.dosage && <p style={{ margin: '1px 0 0', fontSize: 10.5, color: accent, fontWeight: 600 }}>{m.dosage}</p>}
                                      </div>
                                      {m.frequency && (
                                        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500, background: '#f8fafc', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' as const }}>
                                          {m.frequency}
                                        </span>
                                      )}
                                    </motion.div>
                                  ))}
                                  {medCount > 4 && (
                                    <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>+{medCount - 4} more in full details</p>
                                  )}
                                </div>
                              ) : (
                                <p style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No medicines listed</p>
                              )}
                            </div>

                            {/* Quick actions */}
                            <div>
                              <p style={S.drawerLabel}>Quick Actions</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {[
                                  { cls: 'act-btn', label: 'Full Details', icon: ArrowUpRight, fn: () => setOpenRx(rx) },
                                  { cls: 'act-dl', label: 'Download PDF', icon: Download, fn: () => handleDownload(rx.id) },
                                  ...(rx.followUpDate ? [{ cls: 'act-amber', label: overdue ? 'Find earliest slot' : 'Book Follow-up', icon: CalendarClock, fn: () => navigate(buildFollowUpBookingPath(rx.doctorName, rx.doctorSpecialization, rx.followUpDate)), style: { color: '#d97706', borderColor: '#fde68a', background: '#fffbeb' } }] : []),
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

                          {/* Drawer footer */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 6 }}>
                            <span style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>Click "Full Details" for the complete prescription view</span>
                            {rx.followUpDate && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <CalendarClock size={11} style={{ color: overdue ? '#e11d48' : accent }} />
                                <span style={{ fontSize: 11.5, color: '#64748b' }}>
                                  Follow-up <strong style={{ color: overdue ? '#e11d48' : accent }}>{fmtRelative(rx.followUpDate)}</strong>
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

      {/* ── Detail Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {openRx && (
          <DetailModal
            rx={openRx}
            onClose={() => setOpenRx(null)}
            onDownload={handleDownload}
            downloading={downloading === openRx.id}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Page styles ────────────────────────────────────────── */
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
  spinner: {
    display: 'block', width: 11, height: 11, borderRadius: '50%',
    border: '2px solid #e2e8f0', borderTopColor: '#2563eb',
    animation: 'spin 0.7s linear infinite',
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

/* ─── Modal styles ─────────────────────────────────────────── */
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
  mQual: { margin: '1px 0 0', fontSize: 11, color: '#94a3b8' },
  closeBtn: {
    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
    background: '#f8fafc', border: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#64748b',
  },
  body: { flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 },
  sectionTitle: { fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0, flex: 1 },
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