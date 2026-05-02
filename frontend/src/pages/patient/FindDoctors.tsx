import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { doctorApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import {
  Search, SlidersHorizontal, Star, Stethoscope, X,
  ChevronDown, Calendar, Clock, CreditCard, CheckCircle2,
  ArrowUpRight, Users, Filter, Zap,
} from 'lucide-react'

/* ─── helpers ─────────────────────────────────────────────── */
const ACCENTS = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#dc2626']

function fmtFee(fee: number) {
  return `₹${fee?.toLocaleString('en-IN') ?? '—'}`
}

/* ─── Skeleton ────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f1f5f9', animation: 'sk 1.4s ease infinite', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 13, background: '#f1f5f9', borderRadius: 5, marginBottom: 8, width: '60%', animation: 'sk 1.4s ease infinite' }} />
              <div style={{ height: 10, background: '#f8fafc', borderRadius: 5, width: '40%', animation: 'sk 1.4s ease infinite' }} />
            </div>
          </div>
          <div style={{ height: 36, background: '#f1f5f9', borderRadius: 9, animation: 'sk 1.4s ease infinite' }} />
        </div>
      ))}
    </div>
  )
}

/* ─── Doctor Card ─────────────────────────────────────────── */
function DoctorCard({ doctor, idx }: { doctor: any; idx: number }) {
  const navigate = useNavigate()
  const accent = ACCENTS[idx % ACCENTS.length]
  const initials = (doctor.name || 'D').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const rating = doctor.averageRating ?? doctor.rating ?? null
  const reviewCount = doctor.totalRatings ?? doctor.reviewCount ?? 0
  const experience = doctor.experience ?? doctor.yearsOfExperience ?? null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.28 }}
      style={{
        background: '#fff', borderRadius: 14,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
      }}
      whileHover={{ boxShadow: '0 6px 24px rgba(0,0,0,0.09)', y: -2 }}>

      {/* Top accent line */}
      <div style={{ height: 3, background: accent, flexShrink: 0 }} />

      <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

        {/* Doctor info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 50, height: 50, borderRadius: 13, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Dr. {doctor.name}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: accent, fontWeight: 600 }}>
              {doctor.specialization}
            </p>
            {doctor.qualification && (
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#94a3b8', fontWeight: 400 }}>
                {doctor.qualification}
              </p>
            )}
          </div>
          {rating !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 8, background: '#fefce8', border: '1px solid #fde68a', flexShrink: 0 }}>
              <Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#92400e' }}>{Number(rating).toFixed(1)}</span>
              {reviewCount > 0 && <span style={{ fontSize: 11, color: '#a16207' }}>({reviewCount})</span>}
            </div>
          )}
        </div>

        {/* Meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {doctor.consultationFee != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, fontWeight: 600, color: '#15803d' }}>
              <CreditCard size={10} />{fmtFee(doctor.consultationFee)}
            </span>
          )}
          {experience != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>
              <Clock size={10} />{experience} yrs exp.
            </span>
          )}
          {doctor.isAvailable !== false && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: '#f0fdf4', border: '1px solid #86efac', fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Available
            </span>
          )}
        </div>

        {/* Hospital / location */}
        {(doctor.hospitalName || doctor.hospital) && (
          <p style={{ margin: 0, fontSize: 12.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Stethoscope size={11} style={{ color: '#94a3b8', flexShrink: 0 }} />
            {doctor.hospitalName || doctor.hospital}
          </p>
        )}

        {/* CTA */}
        <div style={{ display: 'flex', gap: 7, marginTop: 'auto' }}>
          <motion.button
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, background: accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: `0 3px 10px ${accent}35` }}
            whileHover={{ scale: 1.02, boxShadow: `0 6px 18px ${accent}45` }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/patient/book?doctorId=${doctor.id}`)}>
            <Calendar size={13} /> Book Appointment
          </motion.button>
          <motion.button
            style={{ width: 38, height: 38, borderRadius: 9, background: '#f8fafc', border: '1.5px solid #e5e7eb', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            whileHover={{ background: '#fefce8', borderColor: '#fde68a', color: '#d97706', scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Check symptoms first"
            onClick={() => navigate('/patient/symptom-checker')}>
            <Zap size={14} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
export default function FindDoctors() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<any[]>([])
  const [specializations, setSpecializations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ specialization: '', name: '', maxFee: '' })
  const [applied, setApplied] = useState({ specialization: '', name: '', maxFee: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [activeSpec, setActiveSpec] = useState('All')

  useEffect(() => {
    Promise.all([doctorApi.getAll(), doctorApi.getSpecializations()])
      .then(([d, s]) => {
        setDoctors(d.data.data || [])
        const specsRaw = s?.data?.data || []
        const specs = specsRaw.map((sp: any) =>
          typeof sp === 'string' ? sp : (sp.name || sp.specialization || sp.value || JSON.stringify(sp))
        )
        setSpecializations(specs)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = async () => {
    setLoading(true)
    setApplied({ ...filters })
    try {
      const { data } = await doctorApi.search({
        specialization: filters.specialization || undefined,
        name: filters.name || undefined,
        maxFee: filters.maxFee || undefined,
      })
      setDoctors(data.data || [])
    } finally { setLoading(false) }
  }

  const clearFilters = async () => {
    const reset = { specialization: '', name: '', maxFee: '' }
    setFilters(reset); setApplied(reset); setActiveSpec('All')
    setLoading(true)
    const { data } = await doctorApi.getAll()
    setDoctors(data.data || [])
    setLoading(false)
  }

  const handleSpecChip = async (s: string) => {
    const spec = s === 'All' ? '' : s
    setActiveSpec(s)
    setFilters(f => ({ ...f, specialization: spec }))
    setApplied(f => ({ ...f, specialization: spec }))
    setLoading(true)
    const { data } = await doctorApi.search({ specialization: spec || undefined })
    setDoctors(data.data || [])
    setLoading(false)
  }

  const isFiltered = applied.specialization || applied.name || applied.maxFee
  const activeFilterCount = [applied.specialization, applied.name, applied.maxFee].filter(Boolean).length

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { font-family: 'Geist', system-ui, sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes sk     { 0%,100%{opacity:.45} 50%{opacity:.9} }
        .search-in:focus  { border-color:#93c5fd !important; box-shadow:0 0 0 3px rgba(37,99,235,0.07) !important; background:#fff !important; }
        .filter-in:focus  { border-color:#93c5fd !important; box-shadow:0 0 0 3px rgba(37,99,235,0.07) !important; background:#fff !important; outline:none; }
        .spec-chip:hover  { border-color:#93c5fd !important; color:#2563eb !important; }
        .filter-toggle:hover { border-color:#cbd5e1 !important; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div style={S.header}
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <div>
          <p style={S.eyebrow}>Directory</p>
          <h1 style={S.title}>Find Doctors</h1>
          <p style={S.subtitle}>Browse and book from our network of verified specialists</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={S.countBadge}>
            <Users size={12} style={{ color: '#2563eb' }} />
            {doctors.length} available
          </span>
          <motion.button
            className="filter-toggle"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 9,
              background: showFilters ? '#2563eb' : '#fff',
              color: showFilters ? '#fff' : '#475569',
              border: `1.5px solid ${showFilters ? '#2563eb' : '#e5e7eb'}`,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: showFilters ? '0 3px 12px rgba(37,99,235,0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowFilters(v => !v)}>
            <SlidersHorizontal size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span style={{ width: 17, height: 17, borderRadius: '50%', background: showFilters ? 'rgba(255,255,255,0.3)' : '#2563eb', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Search bar (always visible) ─────────────────────── */}
      <motion.div style={S.searchBar}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
        <Search size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
        <input
          className="search-in"
          style={{ flex: 1, border: 'none', background: 'transparent', color: '#0f172a', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
          placeholder="Search by doctor name…"
          value={filters.name}
          onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        {filters.name && (
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex' }}
            onClick={() => setFilters(f => ({ ...f, name: '' }))}>
            <X size={13} />
          </button>
        )}
        <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
        <motion.button
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, background: '#2563eb', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleSearch}>
          <Search size={12} /> Search
        </motion.button>
      </motion.div>

      {/* ── Filter panel ────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 14 }}>

                {/* Specialization */}
                <div>
                  <label style={S.filterLabel}><Stethoscope size={10} /> Specialization</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="filter-in"
                      value={filters.specialization}
                      onChange={e => setFilters(f => ({ ...f, specialization: e.target.value }))}
                      style={{ ...S.filterInput, paddingRight: 28, appearance: 'none' }}>
                      <option value="">All Specializations</option>
                      {specializations.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Max fee */}
                <div>
                  <label style={S.filterLabel}><CreditCard size={10} /> Max Consultation Fee (₹)</label>
                  <input
                    className="filter-in"
                    type="number"
                    value={filters.maxFee}
                    onChange={e => setFilters(f => ({ ...f, maxFee: e.target.value }))}
                    placeholder="e.g. 800"
                    style={S.filterInput}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleSearch}>
                  <Search size={12} /> Apply Filters
                </motion.button>
                {isFiltered && (
                  <motion.button
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={clearFilters}>
                    <X size={12} /> Clear All
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Specialization chips ─────────────────────────────── */}
      {!showFilters && (
        <motion.div
          style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <Filter size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
          {['All', ...specializations.slice(0, 9)].map((s, i) => {
            const isActive = activeSpec === s
            return (
              <motion.button key={s} className={isActive ? '' : 'spec-chip'}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.14 + i * 0.03 }}
                onClick={() => handleSpecChip(s)}
                style={{
                  padding: '5px 13px', borderRadius: 999,
                  border: `1.5px solid ${isActive ? '#2563eb' : '#e5e7eb'}`,
                  background: isActive ? '#2563eb' : '#fff',
                  color: isActive ? '#fff' : '#475569',
                  fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.12s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.22)' : 'none',
                  whiteSpace: 'nowrap' as const,
                }}>
                {s}
              </motion.button>
            )
          })}
          {isFiltered && (
            <button style={{ padding: '5px 11px', borderRadius: 999, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={clearFilters}>
              <X size={10} /> Clear
            </button>
          )}
        </motion.div>
      )}

      {/* ── Results summary ──────────────────────────────────── */}
      {!loading && isFiltered && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#64748b' }}>
          <CheckCircle2 size={12} style={{ color: '#16a34a' }} />
          Showing <strong style={{ color: '#0f172a' }}>{doctors.length}</strong> result{doctors.length !== 1 ? 's' : ''}
          {applied.specialization && <> for <span style={{ color: '#2563eb', fontWeight: 600 }}>{applied.specialization}</span></>}
          {applied.maxFee && <> under <span style={{ color: '#16a34a', fontWeight: 600 }}>₹{applied.maxFee}</span></>}
        </motion.div>
      )}

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && <Skeleton />}

      {/* ── Empty state ─────────────────────────────────────── */}
      {!loading && doctors.length === 0 && (
        <motion.div style={S.empty} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Stethoscope size={24} style={{ color: '#93c5fd' }} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#475569', margin: 0 }}>No doctors found</p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '5px 0 16px', textAlign: 'center' as const, maxWidth: 280, lineHeight: 1.6 }}>
            Try adjusting your filters or search with a different term.
          </p>
          <motion.button
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: '#2563eb', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={clearFilters}>
            <X size={13} /> Clear Filters
          </motion.button>
        </motion.div>
      )}

      {/* ── Doctor grid ─────────────────────────────────────── */}
      {!loading && doctors.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
          {doctors.map((doc, idx) => (
            <DoctorCard key={doc.id} doctor={doc} idx={idx} />
          ))}
        </div>
      )}
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
  countBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 7,
    background: '#fff', border: '1px solid #bfdbfe',
    fontSize: 12.5, fontWeight: 600, color: '#1e40af',
  },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#fff', border: '1.5px solid #e5e7eb',
    borderRadius: 11, padding: '10px 14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    transition: 'border-color 0.14s ease',
  },
  filterLabel: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    marginBottom: 6,
  },
  filterInput: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid #e5e7eb', background: '#f8fafc',
    color: '#0f172a', fontSize: 13, fontFamily: 'inherit',
    transition: 'all 0.14s ease', boxSizing: 'border-box' as const,
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '4rem 1rem', textAlign: 'center',
    background: '#fff', borderRadius: 12, border: '1.5px dashed #e0e7ff',
  },
}