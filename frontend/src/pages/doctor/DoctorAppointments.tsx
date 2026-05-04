import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentApi } from '../../api'
import { EmptyState, LoadingSpinner } from '../../components/common'
import { Calendar, CheckCircle, Search, FileText, Filter, ChevronDown, MoreHorizontal, X, UserX } from 'lucide-react'
import toast from 'react-hot-toast'

const generateAvatarUrl = (name?: string, size: number = 40) => 
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0d9488&color=fff&bold=true&size=${size}`

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  SCHEDULED:   { label: 'Scheduled',   color: '#0d9488', bg: 'rgba(13,148,136,0.1)',  dot: '#0d9488' },
  RESCHEDULED: { label: 'Rescheduled', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', dot: '#f59e0b' },
  COMPLETED:   { label: 'Completed',   color: '#10b981', bg: 'rgba(16,185,129,0.1)', dot: '#10b981' },
  CANCELLED:   { label: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  dot: '#ef4444' },
  NO_SHOW:     { label: 'No Show',     color: '#6b7280', bg: 'rgba(107,114,128,0.1)',dot: '#6b7280' },
}

const STATUS_TABS = ['ALL', 'SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']

function formatCancellationReason(reason?: string) {
  if (!reason) return ''
  const key = reason.trim()
  if (!key) return ''
  const mapped: Record<string, string> = {
    PERSONAL: 'Personal/Schedule Conflict',
    MEDICAL: 'Medical Emergency',
    DOCTOR_UNAVAILABLE: 'Doctor Unavailable',
    SCHEDULING_CONFLICT: 'Scheduling Conflict',
  }
  if (mapped[key]) return mapped[key]
  // For enum-style values keep friendly formatting; otherwise preserve doctor-visible free text as entered.
  if (/^[A-Z_]+$/.test(key)) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  return key
}

export default function DoctorAppointments() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [visitFilter, setVisitFilter] = useState('ALL')
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [noShowId, setNoShowId] = useState<number | null>(null)
  const [completeModal, setCompleteModal] = useState<any>(null)
  const [completeNotes, setCompleteNotes] = useState('')

  const load = () => {
    setLoading(true)
    appointmentApi.getMy().then(r => setAppointments(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCompleteModal = (appointment: any) => {
    setCompleteNotes('')
    setCompleteModal(appointment)
  }

  const handleComplete = async (paymentCollected: boolean) => {
    if (!completeModal) return
    setCompletingId(completeModal.id)
    try {
      await appointmentApi.complete(completeModal.id, completeNotes, paymentCollected)
      toast.success('Appointment marked as completed!')
      setCompleteModal(null)
      load()
    } finally { setCompletingId(null) }
  }

  const handleNoShow = async (id: number) => {
    if (!window.confirm('Mark this patient as no-show? The patient will be notified and can reschedule.')) return
    setNoShowId(id)
    try {
      await appointmentApi.markNoShow(id)
      toast.success('Appointment marked as no-show')
      load()
    } finally { setNoShowId(null) }
  }

  const counts: Record<string, number> = { ALL: appointments.length }
  STATUS_TABS.slice(1).forEach(t => { counts[t] = appointments.filter(a => a.status === t).length })

  // FIX: search trims whitespace and is case-insensitive; filter works independently of search
  const filtered = appointments
    .filter(a => filter === 'ALL' || a.status === filter)
    .filter(a => paymentFilter === 'ALL' || (a.paymentStatus || 'PENDING') === paymentFilter)
    .filter(a => visitFilter === 'ALL' || (visitFilter === 'FIRST' ? a.isFirstVisit : !a.isFirstVisit))
    .filter(a => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        a.patientName?.toLowerCase().includes(q) ||
        a.patientEmail?.toLowerCase().includes(q) ||
        a.patientPhone?.includes(q) ||
        a.paymentStatus?.toLowerCase().includes(q) ||
        a.cancellationReason?.toLowerCase().includes(q)
      )
    })

  const pendingRx = appointments.filter(a => a.status === 'COMPLETED' && !a.hasPrescription).length

  if (loading) return <LoadingSpinner />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .appt-page { font-family: 'Sora', sans-serif; }
        .appt-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(16px); } to { opacity:1;transform:translateY(0); } }

        .appt-table-row {
          display: grid;
          grid-template-columns: 44px 2fr 1fr 1fr 1fr 190px;
          gap: 12px;
          padding: 12px 20px;
          align-items: center;
          border-bottom: 1px solid #f0fdf4;
          transition: background 0.15s;
          animation: fadeSlide 0.4s ease both;
        }
        .appt-table-row:hover { background: #fafffe; }
        .appt-table-row:last-child { border-bottom: none; }

        .tab-pill {
          padding: 6px 14px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
          border: 1.5px solid transparent;
          cursor: pointer; transition: all 0.18s;
          font-family: 'Sora', sans-serif;
        }
        .tab-pill-active {
          background: linear-gradient(135deg, #0d9488, #0891b2);
          color: white;
        }
        .tab-pill-inactive {
          background: white; color: #64748b;
          border-color: #e6f7f5;
        }
        .tab-pill-inactive:hover { border-color: #0d9488; color: #0d9488; }

        .action-btn {
          padding: 6px 12px; border-radius: 8px;
          font-size: 11px; font-weight: 700;
          border: none; cursor: pointer;
          font-family: 'Sora', sans-serif;
          transition: all 0.18s;
        }
        .action-btn:hover { opacity: 0.85; transform: scale(1.04); }

        .pv-card {
          background: white; border-radius: 16px;
          border: 1px solid #f0fdf4;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(13,148,136,0.04);
        }

        .search-box {
          width: 100%; padding: 10px 16px 10px 42px;
          border-radius: 10px; border: 1.5px solid #e6f7f5;
          background: #fafffe; font-family: 'Sora', sans-serif;
          font-size: 13px; color: #0f172a; outline: none;
          transition: all 0.2s; box-sizing: border-box;
        }
        .search-box:focus { border-color: #0d9488; background: white; box-shadow: 0 0 0 3px rgba(13,148,136,0.08); }
        .search-box::placeholder { color: #94a3b8; }
        .select-filter {
          padding: 9px 10px;
          border-radius: 10px;
          border: 1.5px solid #e6f7f5;
          background: white;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Sora', sans-serif;
          outline: none;
        }
      `}</style>

      <div className="appt-page" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>

        {/* HEADER */}
        <div style={{ marginBottom: 24, animation: 'fadeSlide 0.4s ease both' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Doctor Portal</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 }}>Appointments</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Manage and track all your patient appointments</p>
        </div>

        {/* STAT PILLS */}
        {(() => {
          const STAT_CONFIG = [
            { key: 'ALL',         label: 'Total',       grad: 'linear-gradient(135deg, #1e40af, #3b82f6)',   shadow: 'rgba(59,130,246,0.3)' },
            { key: 'SCHEDULED',   label: 'Scheduled',   grad: 'linear-gradient(135deg, #0d9488, #0891b2)',   shadow: 'rgba(13,148,136,0.3)' },
            { key: 'RESCHEDULED', label: 'Rescheduled', grad: 'linear-gradient(135deg, #b45309, #f59e0b)',   shadow: 'rgba(245,158,11,0.3)' },
            { key: 'COMPLETED',   label: 'Completed',   grad: 'linear-gradient(135deg, #15803d, #22c55e)',   shadow: 'rgba(34,197,94,0.3)' },
            { key: 'CANCELLED',   label: 'Cancelled',   grad: 'linear-gradient(135deg, #be123c, #f43f5e)',   shadow: 'rgba(244,63,94,0.3)' },
            { key: 'NO_SHOW',     label: 'No Show',     grad: 'linear-gradient(135deg, #374151, #6b7280)',   shadow: 'rgba(107,114,128,0.3)' },
          ]
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
              {STAT_CONFIG.map((s, i) => {
                const isActive = filter === s.key
                return (
                  <div key={s.key}
                    onClick={() => { setFilter(s.key); setSearch('') }}
                    style={{
                      padding: '16px 18px', borderRadius: 16, cursor: 'pointer',
                      background: s.grad,
                      boxShadow: isActive ? `0 8px 24px ${s.shadow}` : '0 2px 8px rgba(0,0,0,0.08)',
                      transform: isActive ? 'translateY(-3px) scale(1.03)' : 'translateY(0) scale(1)',
                      transition: 'all 0.2s ease',
                      animation: `fadeSlide 0.4s ${i * 0.06}s ease both`,
                      position: 'relative', overflow: 'hidden',
                    }}>
                    <div style={{ position: 'absolute', top: -16, right: -16, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                    <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>{s.label}</p>
                    <p className="appt-mono" style={{ fontSize: 28, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1 }}>{counts[s.key] || 0}</p>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* PENDING RX BANNER */}
        {pendingRx > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 14, background: '#fffbeb', border: '1.5px solid #fde68a', marginBottom: 16, animation: 'fadeSlide 0.4s ease both' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText style={{ width: 18, height: 18, color: '#d97706' }} />
            </div>
            <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#92400e', margin: 0 }}>
              {pendingRx} completed appointment{pendingRx > 1 ? 's' : ''} awaiting prescription
            </p>
            <button onClick={() => navigate('/doctor/prescriptions')} style={{ padding: '7px 16px', borderRadius: 8, background: '#d97706', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
              Write Now
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 16, animation: 'fadeSlide 0.4s ease both' }}>
          <UserX size={16} color="#64748b" />
          <p style={{ fontSize: 12.5, color: '#475569', fontWeight: 600, margin: 0 }}>
            Same-day missed visits should be marked as no-show. Patient cancellations are only allowed before the appointment date.
          </p>
        </div>

        {/* TABLE CARD */}
        <div className="pv-card">
          {/* Card Header - tabs + search */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f0fdf4' }}>
            {/* Tab row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {STATUS_TABS.map(t => (
                <button key={t} className={`tab-pill ${filter === t ? 'tab-pill-active' : 'tab-pill-inactive'}`}
                  onClick={() => setFilter(t)}>
                  {t === 'ALL' ? 'All' : t.replace('_', ' ')}
                  <span style={{ opacity: 0.7, marginLeft: 4 }}>({counts[t] || 0})</span>
                </button>
              ))}
            </div>

            {/* FIX: Search row — properly wired value + onChange + clear button */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  className="search-box"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search patient name, email or phone..."
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
              <select className="select-filter" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
                <option value="ALL">All payments</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Unpaid</option>
                <option value="FAILED">Failed</option>
              </select>
              <select className="select-filter" value={visitFilter} onChange={e => setVisitFilter(e.target.value)}>
                <option value="ALL">All visits</option>
                <option value="FIRST">First visit</option>
                <option value="RETURNING">Returning</option>
              </select>
              {(search || filter !== 'ALL' || paymentFilter !== 'ALL' || visitFilter !== 'ALL') && (
                <button
                  onClick={() => { setSearch(''); setFilter('ALL'); setPaymentFilter('ALL'); setVisitFilter('ALL') }}
                  style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', fontSize: 12, fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <X style={{ width: 13, height: 13 }} /> Clear filters
                </button>
              )}
              <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
                {filtered.length} of {appointments.length} appointments
              </span>
            </div>
          </div>

          {/* Column Headers */}
          <div className="appt-table-row" style={{ background: '#fafffe', padding: '10px 20px', borderBottom: '1.5px solid #e6f7f5', animation: 'none' }}>
            {['#', 'Patient Name', 'Date', 'Time', 'Status', 'Action'].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Calendar style={{ width: 48, height: 48, color: '#e2e8f0', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', margin: '0 0 4px' }}>
                {search.trim()
                  ? `No patients found matching "${search}"`
                  : filter !== 'ALL'
                    ? `No ${filter.replace('_', ' ').toLowerCase()} appointments`
                    : 'No appointments found'}
              </p>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: '0 0 12px' }}>Try adjusting your filters</p>
              {(search || filter !== 'ALL') && (
                <button
                  onClick={() => { setSearch(''); setFilter('ALL') }}
                  style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            filtered.map((a, idx) => {
              const st = STATUS_CONFIG[a.status] || STATUS_CONFIG.SCHEDULED
              return (
                <div key={a.id} className="appt-table-row" style={{ animationDelay: `${idx * 0.04}s` }}>
                  <span className="appt-mono" style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <img
                      src={generateAvatarUrl(a.patientName, 36)}
                      alt={a.patientName}
                      style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1.5px solid #f0fdf4' }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patientName}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{a.isFirstVisit ? '✦ New patient' : 'Returning'}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                    {new Date(a.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>
                  <span className="appt-mono" style={{ fontSize: 12, color: '#0d9488', fontWeight: 600 }}>
                    {a.startTime?.slice(0, 5)}
                  </span>
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 20 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
                      {st.label}
                    </span>
                    {a.status === 'CANCELLED' && a.cancellationReason && (
                      <p
                        style={{
                          margin: '5px 0 0',
                          fontSize: 10.5,
                          color: '#9f1239',
                          maxWidth: 260,
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          lineHeight: 1.35,
                        }}
                        title={formatCancellationReason(a.cancellationReason)}>
                        Reason: {formatCancellationReason(a.cancellationReason)}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {(a.status === 'SCHEDULED' || a.status === 'RESCHEDULED') && (
                      <>
                        <button
                          className="action-btn"
                          onClick={() => openCompleteModal(a)}
                          disabled={completingId === a.id}
                          style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: 'white' }}
                        >
                          {completingId === a.id ? '...' : 'Complete'}
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => handleNoShow(a.id)}
                          disabled={noShowId === a.id}
                          style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <UserX size={12} /> {noShowId === a.id ? '...' : 'No-show'}
                        </button>
                      </>
                    )}
                    {a.status === 'COMPLETED' && !a.hasPrescription && (
                      <button
                        className="action-btn"
                        onClick={() => navigate('/doctor/prescriptions')}
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white' }}
                      >
                        + Add Rx
                      </button>
                    )}
                    {a.status === 'COMPLETED' && a.hasPrescription && (
                      <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle style={{ width: 13, height: 13 }} /> Done
                      </span>
                    )}
                    <button style={{ width: 28, height: 28, borderRadius: 8, background: '#f8fafc', border: '1px solid #e6f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <MoreHorizontal style={{ width: 13, height: 13, color: '#94a3b8' }} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
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
                  This appointment is marked payment pending. Collect payment if needed before completing it.
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
