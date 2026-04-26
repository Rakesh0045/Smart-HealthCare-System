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
  if (diff < 0) return 'Overdue'; if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'; if (diff < 7) return `In ${diff}d`
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

const CHIP = {
  frequency: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  duration:  { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
  note:      { bg: '#fefce8', border: '#fde68a', color: '#a16207' },
}

/* ─── Accent palette (cycles per row index) ─────────────── */
const ACCENTS = [
  '#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#e11d48',
]

/* ─── Skeleton ───────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', animation: 'sk 1.4s ease infinite', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 13, background: '#f1f5f9', borderRadius: 5, marginBottom: 7, animation: 'sk 1.4s ease infinite', width: '40%' }} />
            <div style={{ height: 10, background: '#f8fafc', borderRadius: 5, animation: 'sk 1.4s ease infinite', width: '60%' }} />
          </div>
          <div style={{ width: 80, height: 28, background: '#f1f5f9', borderRadius: 8, animation: 'sk 1.4s ease infinite' }} />
        </div>
      ))}
      <style>{`@keyframes sk{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  )
}

/* ─── Full-detail Modal ──────────────────────────────────── */
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
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        style={M.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ ...M.mHead, borderTop: `3px solid ${accent}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...M.mAvatar, background: `linear-gradient(135deg,${accent},${accent}bb)` }}>
              {(rx.doctorName || 'D').charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={M.mDoc}>Dr. {rx.doctorName}</p>
              <p style={{ ...M.mSpec, color: accent }}>{rx.doctorSpecialization}</p>
              {rx.doctorQualification && <p style={M.mQual}>{rx.doctorQualification}</p>}
            </div>
          </div>
          <button style={M.closeBtn} onClick={onClose}><X size={15} /></button>
        </div>

        {/* Scrollable body */}
        <div style={M.body}>

          {/* Diagnosis */}
          <div style={{ ...M.diagBanner, background: `${accent}0d`, border: `1px solid ${accent}30` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <Activity size={14} style={{ color: accent, marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={M.diagLabel}>Diagnosis</p>
                <p style={{ ...M.diagText, color: accent === '#2563eb' ? '#1e3a8a' : '#0f172a' }}>
                  {rx.diagnosis || 'General consultation'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 10 }}>
              <span style={M.metaChip}><Calendar size={10} />{fmtDate(rx.createdAt)}</span>
              {rx.hospitalName && <span style={M.metaChip}><Stethoscope size={10} />{rx.hospitalName}</span>}
            </div>
          </div>

          {/* Medicines */}
          <div>
            <div style={M.sectionHead}>
              <Pill size={13} style={{ color: accent }} />
              <span style={M.sectionTitle}>Prescribed Medicines</span>
              <span style={{ ...M.countBadge, background: `${accent}12`, color: accent, border: `1px solid ${accent}30` }}>
                {rx.medicines?.length || 0}
              </span>
            </div>

            {rx.medicines && rx.medicines.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rx.medicines.map((m, i) => (
                  <motion.div key={i} style={M.medRow}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}>
                    <div style={{ ...M.medIdx, background: `${accent}12`, border: `1px solid ${accent}25`, color: accent }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' as const, marginBottom: 7 }}>
                        <span style={M.medName}>{m.medicineName}</span>
                        {m.dosage && (
                          <span style={{ ...M.dosageBadge, background: `${accent}10`, border: `1px solid ${accent}25`, color: accent }}>
                            {m.dosage}
                          </span>
                        )}
                        {m.type && <span style={M.typeBadge}>{m.type}</span>}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                        {m.frequency && (
                          <span style={{ ...M.chip, ...CHIP.frequency }}><Clock size={9} />{m.frequency}</span>
                        )}
                        {m.duration && (
                          <span style={{ ...M.chip, ...CHIP.duration }}><Calendar size={9} />{m.duration}</span>
                        )}
                        {m.instructions && (
                          <span style={{ ...M.chip, ...CHIP.note }}><AlertCircle size={9} />{m.instructions}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>No medicines listed.</p>
            )}
          </div>

          {/* Notes & Follow-up */}
          {(rx.additionalNotes || rx.followUpDate) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rx.additionalNotes && (
                <div style={M.noteBox}>
                  <BookOpen size={12} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={M.noteLabel}>Doctor's Notes</p>
                    <p style={M.noteText}>{rx.additionalNotes}</p>
                  </div>
                </div>
              )}
              {rx.followUpDate && (
                <div style={{ ...M.noteBox, background: '#fefce8', border: '1px solid #fde68a' }}>
                  <CalendarClock size={12} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={M.noteLabel}>Follow-up Appointment</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                      <p style={{ ...M.noteText, fontWeight: 700, color: '#92400e', margin: 0 }}>
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
                      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#b45309', fontWeight: 600, lineHeight: 1.45 }}>
                        The follow-up date has already passed. We’ll show the earliest available slot.
                      </p>
                    )}
                    <button
                      onClick={() => navigate(buildFollowUpBookingPath(rx.doctorName, rx.doctorSpecialization, rx.followUpDate))}
                      style={{ marginTop: 10, padding: '8px 12px', borderRadius: 9, border: '1px solid #f59e0b', background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Calendar size={12} /> {isOverdue(rx.followUpDate) ? 'Find earliest slot' : 'Book follow-up'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={M.footer}>
          <button style={M.cancelBtn} onClick={onClose}>Close</button>
          <motion.button style={{ ...M.dlBtn, background: accent, boxShadow: `0 4px 14px ${accent}45` }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
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
  const totalMeds = useMemo(() => prescriptions.reduce((s, p) => s + (p.medicines?.length || 0), 0), [prescriptions])
  const uniqueDocs = useMemo(() => new Set(prescriptions.map(p => p.doctorName)).size, [prescriptions])
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

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes sk     { 0%,100%{opacity:.5} 50%{opacity:1} }
        .rx-row:hover { background:#f8faff!important; }
        .rx-row { transition:background 0.14s ease; cursor:pointer; }
        .rx-dl:hover { background:#2563eb!important; color:#fff!important; border-color:#2563eb!important; }
        .rx-open:hover { background:#2563eb!important; color:#fff!important; border-color:#2563eb!important; }
        .rx-filter:hover { border-color:#bfdbfe!important; color:#2563eb!important; }
        .rx-search-input:focus { border-color:#bfdbfe!important; box-shadow:0 0 0 3px rgba(37,99,235,0.08)!important; background:#fff!important; }
        .rx-card-nav:hover { background:#eff6ff!important; }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div style={S.header}
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22,1,0.36,1] }}>
        <div>
          <p style={S.eyebrow}>Health Records</p>
          <h1 style={S.title}>My Prescriptions</h1>
          <p style={S.subtitle}>All your consultation prescriptions, searchable and downloadable</p>
        </div>
        <span style={S.countBadge}>
          <FileText size={13} style={{ color: '#2563eb' }} />
          {prescriptions.length} records
        </span>
      </motion.div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      {prescriptions.length > 0 && (
        <motion.div style={S.statsRow}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}>
          {[
            { icon: FileText,      val: prescriptions.length, lbl: 'Total',        color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { icon: Users,         val: uniqueDocs,            lbl: 'Doctors',      color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
            { icon: Pill,          val: totalMeds,             lbl: 'Medicines',    color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
            { icon: CalendarClock, val: withFollowUp,          lbl: 'Follow-ups',   color: '#d97706', bg: '#fefce8', border: '#fde68a' },
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
        </motion.div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────── */}
      {prescriptions.length > 0 && (
        <motion.div style={S.toolbar}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
          {/* Search */}
          <div style={S.searchWrap}>
            <Search size={13} style={{ color: '#94a3b8', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              className="rx-search-input"
              style={S.searchInput}
              placeholder="Search doctor, diagnosis, medicine…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button style={S.clearBtn} onClick={() => setSearch('')}><X size={11} /></button>
            )}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 5 }}>
            {([
              { key: 'ALL' as const,       label: 'All' },
              { key: 'FOLLOW_UP' as const, label: 'Follow-up Due' },
              { key: 'RECENT' as const,    label: 'Last 30 Days' },
            ]).map(t => (
              <button key={t.key} className="rx-filter"
                onClick={() => setFilterMode(t.key)}
                style={{
                  ...S.filterBtn,
                  background: filterMode === t.key ? '#2563eb' : '#fff',
                  color: filterMode === t.key ? '#fff' : '#64748b',
                  borderColor: filterMode === t.key ? '#2563eb' : '#e5e7eb',
                  boxShadow: filterMode === t.key ? '0 2px 8px rgba(37,99,235,0.22)' : 'none',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <span style={S.resultHint}>
            {(search || filterMode !== 'ALL') ? `${filtered.length} of ${prescriptions.length}` : `${prescriptions.length} total`}
          </span>
        </motion.div>
      )}

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && <Skeleton />}

      {/* ── Empty ───────────────────────────────────────────── */}
      {!loading && prescriptions.length === 0 && (
        <motion.div style={S.empty}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div style={S.emptyIcon}><FileText size={26} style={{ color: '#bfdbfe' }} /></div>
          <p style={S.emptyTitle}>No prescriptions yet</p>
          <p style={S.emptySub}>Prescriptions from your consultations will appear here.</p>
        </motion.div>
      )}

      {/* ── No results ──────────────────────────────────────── */}
      {!loading && prescriptions.length > 0 && filtered.length === 0 && (
        <motion.div style={S.empty} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={S.emptyIcon}><Search size={22} style={{ color: '#bfdbfe' }} /></div>
          <p style={S.emptyTitle}>No matches</p>
          <p style={S.emptySub}>Try a different search term or filter.</p>
        </motion.div>
      )}

      {/* ── Prescription list ────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <motion.div style={S.listWrap}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}>

          {/* Table column headers */}
          <div style={S.listHead}>
            <span style={{ flex: 2.2 }}>Doctor</span>
            <span style={{ flex: 2 }}>Diagnosis</span>
            <span style={{ flex: 1 }}>Date</span>
            <span style={{ flex: 0.7 }}>Meds</span>
            <span style={{ flex: 1.5 }}>Follow-up</span>
            <span style={{ flex: 1.2, textAlign: 'right' as const }}>Actions</span>
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((rx, idx) => {
              const accent = ACCENTS[idx % ACCENTS.length]
              const isOpen = expanded === rx.id
              const medCount = rx.medicines?.length || 0
              const initials = (rx.doctorName || 'D').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()
              const isDl = downloading === rx.id
              const overdue = rx.followUpDate && isOverdue(rx.followUpDate)

              return (
                <div key={rx.id} style={{
                  ...S.rowWrap,
                  borderLeft: `3px solid ${isOpen ? accent : 'transparent'}`,
                  background: isOpen ? `${accent}06` : '#fff',
                  animation: `fadeUp 0.38s ease both`,
                  animationDelay: `${idx * 0.05}s`,
                }}>
                  {/* ── Main row ── */}
                  <div className="rx-row" style={S.row} onClick={() => toggle(rx.id)}>

                    {/* Doctor */}
                    <div style={{ flex: 2.2, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ ...S.avatar, background: `linear-gradient(135deg,${accent},${accent}bb)` }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={S.docName}>Dr. {rx.doctorName}</p>
                        {rx.doctorSpecialization && (
                          <p style={{ ...S.docSpec, color: accent }}>{rx.doctorSpecialization}</p>
                        )}
                      </div>
                    </div>

                    {/* Diagnosis */}
                    <div style={{ flex: 2, minWidth: 0, paddingRight: 12 }}>
                      <p style={S.diagText}>{rx.diagnosis || 'General consultation'}</p>
                    </div>

                    {/* Date */}
                    <div style={{ flex: 1 }}>
                      <p style={S.dateText}>{fmtDate(rx.createdAt, { day: 'numeric', month: 'short' })}</p>
                      <p style={S.yearText}>{fmtDate(rx.createdAt, { year: 'numeric' })}</p>
                    </div>

                    {/* Med count */}
                    <div style={{ flex: 0.7 }}>
                      <span style={{ ...S.medBadge, background: `${accent}10`, color: accent, border: `1px solid ${accent}25` }}>
                        <Pill size={9} /> {medCount}
                      </span>
                    </div>

                    {/* Follow-up */}
                    <div style={{ flex: 1.5 }}>
                      {rx.followUpDate ? (
                        <span style={{
                          ...S.followChip,
                          background: overdue ? '#fff1f2' : '#fefce8',
                          border: `1px solid ${overdue ? '#fecdd3' : '#fde68a'}`,
                          color: overdue ? '#e11d48' : '#92400e',
                        }}>
                          <CalendarClock size={10} />
                          {fmtRelative(rx.followUpDate)}
                        </span>
                      ) : (
                        <span style={S.noFollow}>—</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}
                      onClick={e => e.stopPropagation()}>
                      <button className="rx-open" style={S.actionBtn}
                        onClick={() => setOpenRx(rx)}>
                        <ArrowUpRight size={12} /> Details
                      </button>
                      <button className="rx-dl" style={S.dlBtn}
                        onClick={() => handleDownload(rx.id)} disabled={isDl}
                        title="Download PDF">
                        {isDl
                          ? <span style={S.spinner} />
                          : <Download size={13} />}
                      </button>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.22, ease: [0.22,1,0.36,1] }}
                        style={{ display: 'flex', alignItems: 'center' }}>
                        <ChevronDown size={15} style={{ color: '#94a3b8' }} />
                      </motion.div>
                    </div>
                  </div>

                  {/* ── Dropdown expand ── */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="drawer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22,1,0.36,1] }}
                        style={{ overflow: 'hidden' }}>
                        <div style={{ ...S.drawer, borderTop: `1px dashed ${accent}35` }}>

                          {/* Medicine pills */}
                          {medCount > 0 ? (
                            <div>
                              <p style={S.drawerLabel}>
                                <Pill size={12} style={{ color: accent }} /> Prescribed Medicines
                              </p>
                              <div style={S.medGrid}>
                                {rx.medicines!.map((m, i) => (
                                  <motion.div key={i} style={S.medCard}
                                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                                      <div style={{ ...S.medNum, background: `${accent}10`, border: `1px solid ${accent}20`, color: accent }}>
                                        {i + 1}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' as const, marginBottom: 5 }}>
                                          <span style={S.medName}>{m.medicineName}</span>
                                          {m.dosage && (
                                            <span style={{ ...S.doseBadge, background: `${accent}10`, border: `1px solid ${accent}20`, color: accent }}>
                                              {m.dosage}
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                                          {m.frequency && <span style={{ ...S.chip, ...CHIP.frequency }}><Clock size={8} />{m.frequency}</span>}
                                          {m.duration && <span style={{ ...S.chip, ...CHIP.duration }}><Calendar size={8} />{m.duration}</span>}
                                          {m.instructions && <span style={{ ...S.chip, ...CHIP.note }}><AlertCircle size={8} />{m.instructions}</span>}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic' }}>No medicines listed.</p>
                          )}

                          {/* Notes */}
                          {rx.additionalNotes && (
                            <div style={S.noteStrip}>
                              <BookOpen size={12} style={{ color: '#7c3aed', flexShrink: 0 }} />
                              <span style={S.noteText}>{rx.additionalNotes}</span>
                            </div>
                          )}

                          {/* Footer CTA */}
                          <div style={S.drawerFooter}>
                            <span style={S.drawerHint}>Click "Details" for the full prescription view</span>
                            <div style={{ display: 'flex', gap: 7 }}>
                              {rx.followUpDate && (
                                <button className="rx-open" style={{ ...S.actionBtn, padding: '7px 14px', background: '#fff7ed', borderColor: '#fdba74', color: '#c2410c' }}
                                  onClick={() => navigate(buildFollowUpBookingPath(rx.doctorName, rx.doctorSpecialization, rx.followUpDate))}>
                                  <CalendarClock size={12} /> {overdue ? 'Find earliest slot' : 'Book follow-up'}
                                </button>
                              )}
                              <button className="rx-open" style={{ ...S.actionBtn, padding: '7px 14px' }}
                                onClick={() => setOpenRx(rx)}>
                                <ArrowUpRight size={12} /> Full Details
                              </button>
                              <button className="rx-dl" style={{ ...S.dlBtn, padding: '0 14px', width: 'auto', gap: 5 }}
                                onClick={() => handleDownload(rx.id)} disabled={isDl}>
                                {isDl ? <span style={S.spinner} /> : <><Download size={12} />PDF</>}
                              </button>
                            </div>
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
  countBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 14px', borderRadius: 999,
    background: '#fff', border: '1.5px solid #bfdbfe',
    fontSize: 12.5, fontWeight: 700, color: '#1e40af',
    boxShadow: '0 1px 4px rgba(37,99,235,0.08)',
  },

  /* Stats */
  statsRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
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

  /* Toolbar */
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    background: '#fff', border: '1px solid #f1f5f9',
    borderRadius: 12, padding: '10px 14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  searchWrap: { position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 },
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
  rowWrap: {
    borderBottom: '1px solid #f8fafc',
    borderLeft: '3px solid transparent',
    transition: 'all 0.18s ease',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 0,
    padding: '14px 20px',
    userSelect: 'none' as const,
  },

  /* Row content */
  avatar: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  docName: { margin: 0, fontWeight: 700, fontSize: 13.5, color: '#0f172a', lineHeight: 1.2 },
  docSpec: { margin: '2px 0 0', fontSize: 11.5, fontWeight: 600, lineHeight: 1 },
  diagText: { margin: 0, fontSize: 13, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dateText: { margin: 0, fontSize: 12.5, fontWeight: 700, color: '#334155', fontFamily: 'DM Mono,monospace' },
  yearText: { margin: '1px 0 0', fontSize: 11, color: '#94a3b8', fontFamily: 'DM Mono,monospace' },
  medBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 9px', borderRadius: 999,
    fontSize: 11.5, fontWeight: 700, fontFamily: 'DM Mono,monospace',
  },
  followChip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 9px', borderRadius: 999,
    fontSize: 11.5, fontWeight: 700,
  },
  noFollow: { fontSize: 13, color: '#cbd5e1', fontWeight: 500 },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 8,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    fontSize: 12, fontWeight: 700, color: '#475569',
    cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
    transition: 'all 0.14s ease', whiteSpace: 'nowrap',
  },
  dlBtn: {
    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 0.14s ease', fontFamily: 'DM Sans,sans-serif',
  },
  spinner: {
    display: 'block', width: 12, height: 12, borderRadius: '50%',
    border: '2px solid #e2e8f0', borderTopColor: '#2563eb',
    animation: 'spin 0.7s linear infinite',
  },

  /* Drawer */
  drawer: {
    padding: '16px 20px 18px',
    background: '#fafbff',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  drawerLabel: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 10.5, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    margin: '0 0 10px',
  },
  medGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
    gap: 8,
  },
  medCard: {
    background: '#fff', borderRadius: 10,
    border: '1px solid #f1f5f9',
    padding: '10px 12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  medNum: {
    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
    fontSize: 10.5, fontWeight: 800, fontFamily: 'DM Mono,monospace',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  medName: { fontSize: 13, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' },
  doseBadge: {
    fontSize: 11, fontWeight: 700,
    fontFamily: 'DM Mono,monospace',
    borderRadius: 5, padding: '1px 6px',
  },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    padding: '2px 8px', borderRadius: 999,
    fontSize: 10.5, fontWeight: 600, border: '1px solid',
  },
  noteStrip: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '9px 12px', borderRadius: 9,
    background: '#faf5ff', border: '1px solid #ede9fe',
  },
  noteText: { fontSize: 12.5, color: '#4c1d95', lineHeight: 1.5 },
  drawerFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 8,
    paddingTop: 10, borderTop: '1px solid #f1f5f9',
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
  emptySub: { fontSize: 13, color: '#94a3b8', margin: '5px 0 0', maxWidth: 300, lineHeight: 1.6 },
}

/* ─── Modal styles ─────────────────────────────────────────── */
const M: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  },
  modal: {
    background: '#fff', borderRadius: 20, padding: 0,
    width: '100%', maxWidth: 540, maxHeight: '90vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(15,23,42,0.2)',
    fontFamily: 'DM Sans,sans-serif',
  },
  mHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0,
  },
  mAvatar: {
    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800,
  },
  mDoc:  { margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' },
  mSpec: { margin: '2px 0 0', fontSize: 12, fontWeight: 600 },
  mQual: { margin: '1px 0 0', fontSize: 11, color: '#94a3b8' },
  closeBtn: {
    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
    background: '#f8fafc', border: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#64748b',
  },
  body: { flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 },
  diagBanner: { padding: '12px 14px', borderRadius: 12, flexShrink: 0 },
  diagLabel: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' },
  diagText:  { fontSize: 14, fontWeight: 700, margin: 0 },
  metaChip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11.5, color: '#64748b', fontWeight: 500,
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 7, padding: '3px 9px',
  },
  sectionHead: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 },
  sectionTitle: { fontSize: 10.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em', flex: 1 },
  countBadge: {
    width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10.5, fontWeight: 800, fontFamily: 'DM Mono,monospace',
  },
  medRow: {
    padding: '11px 13px', borderRadius: 11,
    background: '#fafafa', border: '1px solid #f1f5f9',
  },
  medIdx: {
    width: 24, height: 24, borderRadius: 7, flexShrink: 0,
    fontSize: 10.5, fontWeight: 800, fontFamily: 'DM Mono,monospace',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  medName: { fontSize: 13.5, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' },
  dosageBadge: { fontSize: 11.5, fontWeight: 700, fontFamily: 'DM Mono,monospace', borderRadius: 5, padding: '1px 7px' },
  typeBadge: { fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 5, padding: '1px 7px' },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, border: '1px solid',
  },
  noteBox: {
    display: 'flex', alignItems: 'flex-start', gap: 9,
    padding: '10px 13px', borderRadius: 10,
    background: '#faf5ff', border: '1px solid #ede9fe',
  },
  noteLabel: { fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' },
  noteText:  { fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5 },
  footer: {
    display: 'flex', gap: 10, padding: '14px 20px',
    borderTop: '1px solid #f1f5f9', flexShrink: 0,
  },
  cancelBtn: {
    flex: 1, padding: '10px', borderRadius: 10,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    fontSize: 13, fontWeight: 700, color: '#64748b',
    cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
  },
  dlBtn: {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '10px', borderRadius: 10,
    color: '#fff', border: 'none',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
  },
  spinner: {
    display: 'block', width: 13, height: 13, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
  },
}