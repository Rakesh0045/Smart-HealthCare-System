import { useEffect, useMemo, useState } from 'react'
import { appointmentApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import {
  Users, Mail, Phone, Calendar, Search, X,
  TrendingUp, Star, Clock, ChevronRight,
  UserCheck, Activity, Hash, RefreshCw
} from 'lucide-react'

type Row = {
  patientId: number
  patientName: string
  patientEmail?: string
  patientPhone?: string
  visitCount: number
  lastVisit: string
  firstVisit: string
  isNew: boolean
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const isRecentVisit = (dateStr: string) => {
  if (!dateStr) return false
  const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000
  return diff <= 30
}

export default function DoctorPatients() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'visits' | 'recent'>('name')

  const load = () => {
    setLoading(true)
    appointmentApi.getMy()
      .then(r => setAppointments(r.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const rows = useMemo<Row[]>(() => {
    const map = new Map<number, { name: string; email?: string; phone?: string; dates: string[] }>()
    for (const a of appointments) {
      if (a.patientId == null) continue
      let cur = map.get(a.patientId)
      if (!cur) {
        cur = { name: a.patientName || 'Patient', email: undefined, phone: undefined, dates: [] }
        map.set(a.patientId, cur)
      }
      if (a.patientEmail) cur.email = a.patientEmail
      if (a.patientPhone) cur.phone = a.patientPhone
      if (a.appointmentDate) cur.dates.push(String(a.appointmentDate))
    }
    const out: Row[] = []
    map.forEach((v, patientId) => {
      const sorted = [...v.dates].sort()
      out.push({
        patientId,
        patientName: v.name,
        patientEmail: v.email,
        patientPhone: v.phone,
        visitCount: v.dates.length,
        lastVisit: sorted[sorted.length - 1] || '',
        firstVisit: sorted[0] || '',
        isNew: sorted[0] ? (Date.now() - new Date(sorted[0]).getTime()) / 86400000 <= 30 : false,
      })
    })
    return out
  }, [appointments])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q
      ? rows.filter(r =>
          r.patientName.toLowerCase().includes(q) ||
          r.patientEmail?.toLowerCase().includes(q) ||
          r.patientPhone?.includes(q)
        )
      : rows
    return [...base].sort((a, b) => {
      if (sortBy === 'visits') return b.visitCount - a.visitCount
      if (sortBy === 'recent') return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
      return a.patientName.localeCompare(b.patientName)
    })
  }, [rows, search, sortBy])

  const totalVisits  = rows.reduce((s, r) => s + r.visitCount, 0)
  const newPatients  = rows.filter(r => r.isNew).length
  const repeatPatients = rows.filter(r => r.visitCount > 1).length

  if (loading) return <LoadingSpinner />

  return (
    <div className="dp-root">
      <div className="dp-bg" aria-hidden>
        <div className="dp-orb dp-orb-1" /><div className="dp-orb dp-orb-2" />
        <div className="dp-grid" />
      </div>

      <div className="dp-page">

        {/* ══ HEADER ══ */}
        <header className="dp-header">
          <div>
            <p className="dp-eyebrow"><span className="dp-live" />Doctor Portal</p>
            <h1 className="dp-title">My Patients</h1>
            <p className="dp-sub">
              {rows.length} unique patient{rows.length !== 1 ? 's' : ''} from your appointment history
            </p>
          </div>
        </header>


        {/* ══ STATS STRIP ══ */}
        <div className="dp-stats-strip">
          {[
            { label: 'Total Patients', val: rows.length, icon: Users, bg: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' },
            { label: 'Total Visits', val: totalVisits, icon: Activity, bg: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' },
            { label: 'Unique Patients', val: rows.length, icon: Star, bg: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)' },
            { label: 'Recent Activity', val: newPatients, icon: TrendingUp, bg: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)' },
          ].map((s, i) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '14px 16px', position: 'relative', overflow: 'hidden', animation: `fadeUp .5s cubic-bezier(.16,1,.3,1) ${i * 0.08}s both` }}>
              <div style={{ position: 'absolute', top: -18, right: -18, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <s.icon size={13} color="white" strokeWidth={2.5} />
                </div>
                <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 3px' }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1 }}>{s.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ══ SEARCH + SORT ══ */}
        <div className="dp-toolbar">
          <div className="dp-search-wrap">
            <Search size={14} className="dp-search-ic" />
            <input
              className="dp-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, phone…"
            />
            {search && (
              <button className="dp-search-clear" onClick={() => setSearch('')}><X size={12} /></button>
            )}
          </div>
          <div className="dp-sort-wrap">
            <span className="dp-sort-label">Sort by</span>
            {([['name','Name'],['visits','Most visits'],['recent','Recent']] as const).map(([k,l]) => (
              <button
                key={k}
                className={`dp-sort-btn ${sortBy === k ? 'dp-sort-active' : ''}`}
                onClick={() => setSortBy(k)}
              >{l}</button>
            ))}
          </div>
          <span className="dp-count-hint">{filtered.length} / {rows.length} patients</span>
        </div>

        {/* ══ PATIENT LIST ══ */}
        {filtered.length === 0 ? (
          <div className="dp-empty">
            <div className="dp-empty-ic"><Users size={28} strokeWidth={1.5} /></div>
            <h3 className="dp-empty-title">{search ? `No results for "${search}"` : 'No patients yet'}</h3>
            <p className="dp-empty-sub">Patients will appear here once you have appointment history</p>
            {search && <button className="dp-clear-btn" onClick={() => setSearch('')}><X size={12} /> Clear search</button>}
          </div>
        ) : (
          <div className="dp-table-card">
            {/* Table head */}
            <div className="dp-table-head">
              <span>Patient</span>
              <span>Contact</span>
              <span>First visit</span>
              <span>Last visit</span>
              <span>Visits</span>
            </div>
            <div className="dp-table-body">
              {filtered.map((r, idx) => (
                <div key={r.patientId} className="dp-row" style={{ animationDelay: `${Math.min(idx, 15) * 0.04}s` }}>

                  {/* Patient */}
                  <div className="dp-row-patient">
                    <div className="dp-row-av-wrap">
                      <div className="dp-row-av">
                        {initials(r.patientName)}
                      </div>
                      {isRecentVisit(r.lastVisit) && <div className="dp-new-pip" title="Recent visit" />}
                    </div>
                    <div className="dp-row-patient-info">
                      <span className="dp-row-name">{r.patientName}</span>
                      <span className="dp-row-id"><Hash size={9} />#{r.patientId}</span>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="dp-row-contact">
                    {r.patientEmail && (
                      <a href={`mailto:${r.patientEmail}`} className="dp-contact-link dp-contact-email">
                        <Mail size={11} />{r.patientEmail}
                      </a>
                    )}
                    {r.patientPhone && (
                      <a href={`tel:${r.patientPhone}`} className="dp-contact-link dp-contact-phone">
                        <Phone size={11} />{r.patientPhone}
                      </a>
                    )}
                    {!r.patientEmail && !r.patientPhone && <span className="dp-no-contact">—</span>}
                  </div>

                  {/* First visit */}
                  <div className="dp-row-date">
                    <Calendar size={11} className="dp-date-ic" />
                    {fmtDate(r.firstVisit)}
                  </div>

                  {/* Last visit */}
                  <div className="dp-row-date">
                    <Clock size={11} className="dp-date-ic" />
                    <span style={{ color: isRecentVisit(r.lastVisit) ? 'var(--green)' : undefined }}>
                      {fmtDate(r.lastVisit)}
                    </span>
                  </div>

                  {/* Visit count */}
                  <div className="dp-row-visits">
                    <span className="dp-visit-badge">{r.visitCount}</span>
                    <span className="dp-visit-label">visit{r.visitCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        :root{
          --white:#ffffff; --bg:#f0fdf9; --bg2:#e6faf4;
          --rim:rgba(16,185,129,0.10); --rim-md:rgba(16,185,129,0.18); --rim-hi:rgba(16,185,129,0.30);
          --green:#059669; --green-lt:#10b981; --green-dim:rgba(5,150,105,0.07);
          --teal:#0d9488; --teal-dim:rgba(13,148,136,0.07);
          --emerald:#047857; --cyan:#0891b2; --cyan-dim:rgba(8,145,178,0.07);
          --tx1:#0f172a; --tx2:#374151; --tx3:#9ca3af;
          --sh-sm:0 1px 2px rgba(5,150,105,0.05),0 2px 8px rgba(5,150,105,0.07);
          --sh-md:0 4px 16px rgba(5,150,105,0.10),0 1px 3px rgba(5,150,105,0.05);
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .dp-root{position:relative;min-height:100vh;background:var(--bg);font-family:'Plus Jakarta Sans',sans-serif;color:var(--tx1);-webkit-font-smoothing:antialiased}
        .dp-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
        .dp-orb{position:absolute;border-radius:50%;filter:blur(80px)}
        .dp-orb-1{width:580px;height:580px;top:-160px;right:-80px;background:radial-gradient(circle,rgba(16,185,129,0.09) 0%,transparent 70%);animation:orbDrift 22s ease-in-out infinite alternate}
        .dp-orb-2{width:420px;height:420px;bottom:-100px;left:-60px;background:radial-gradient(circle,rgba(13,148,136,0.07) 0%,transparent 70%);animation:orbDrift 16s ease-in-out infinite alternate-reverse}
        .dp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(16,185,129,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.022) 1px,transparent 1px);background-size:52px 52px;mask-image:radial-gradient(ellipse 75% 65% at 65% 20%,rgba(0,0,0,0.3) 0%,transparent 80%)}
        @keyframes orbDrift{from{transform:translate(0,0)}to{transform:translate(22px,-30px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes rowIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes livePulse{0%,100%{box-shadow:0 0 0 2px rgba(16,185,129,0.1)}50%{box-shadow:0 0 0 5px rgba(16,185,129,0.05)}}

        .dp-page{position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:2rem 2rem 4rem}
        @media(max-width:768px){.dp-page{padding:1.25rem 1rem 3rem}}

        .dp-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:2rem;animation:slideDown .5s cubic-bezier(.16,1,.3,1) both}
        .dp-eyebrow{display:flex;align-items:center;gap:.35rem;font-size:.65rem;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.4rem}
        .dp-live{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0;animation:livePulse 2.5s ease-in-out infinite}
        .dp-title{font-size:2rem;font-weight:700;letter-spacing:-.01em;color:var(--tx1);line-height:1.2;margin-bottom:.3rem}
        .dp-sub{font-size:.875rem;color:var(--tx2);line-height:1.4}


        .dp-stats-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .08s both}
        @media(max-width:700px){.dp-stats-strip{grid-template-columns:repeat(2,1fr);gap:12px}}

        .dp-toolbar{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem;animation:fadeUp .45s cubic-bezier(.16,1,.3,1) .1s both}
        .dp-search-wrap{position:relative;flex:1;min-width:200px;max-width:360px}
        .dp-search-ic{position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:var(--tx3);pointer-events:none}
        .dp-search{width:100%;padding:.575rem 2.25rem .575rem 2.25rem;border-radius:11px;background:var(--white);border:1.5px solid var(--rim-md);font-family:'Plus Jakarta Sans',sans-serif;font-size:.8125rem;color:var(--tx1);outline:none;box-shadow:var(--sh-sm);transition:border-color .18s,box-shadow .18s}
        .dp-search::placeholder{color:var(--tx3)}
        .dp-search:focus{border-color:var(--green-lt);box-shadow:0 0 0 3px rgba(16,185,129,.12);background:var(--white)}
        .dp-search-clear{position:absolute;right:.7rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--tx3);display:flex;transition:color .12s}
        .dp-search-clear:hover{color:var(--tx2)}

        .dp-sort-wrap{display:flex;align-items:center;gap:.2rem;background:var(--white);border:1px solid #e5e7eb;border-radius:10px;padding:.25rem;box-shadow:0 1px 2px rgba(0,0,0,.04)}
        .dp-sort-label{font-size:.65rem;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.1em;padding:.1rem .4rem}
        .dp-sort-btn{padding:.3rem .7rem;border-radius:7px;font-size:.75rem;font-weight:500;font-family:'Plus Jakarta Sans',sans-serif;color:var(--tx2);background:none;border:none;cursor:pointer;transition:all .15s;white-space:nowrap}
        .dp-sort-btn:hover{color:var(--green);background:#f9fafb}
        .dp-sort-active{background:var(--white)!important;color:var(--green)!important;border:1px solid var(--green)!important;box-shadow:0 1px 2px rgba(5,150,105,.1)}
        .dp-count-hint{font-size:.75rem;font-weight:600;color:var(--tx3);margin-left:auto;white-space:nowrap}

        .dp-empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:5rem 1rem;animation:fadeUp .6s cubic-bezier(.16,1,.3,1) both}
        .dp-empty-ic{width:68px;height:68px;border-radius:20px;background:var(--white);border:1.5px solid var(--rim-md);color:var(--tx3);display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;box-shadow:var(--sh-md)}
        .dp-empty-title{font-size:1.0625rem;font-weight:700;color:var(--tx1);margin-bottom:.4rem}
        .dp-empty-sub{font-size:.875rem;color:var(--tx3);margin-bottom:1rem;max-width:26rem;line-height:1.6}
        .dp-clear-btn{display:inline-flex;align-items:center;gap:.3rem;padding:.5rem 1rem;border-radius:9px;background:rgba(5,150,105,.07);border:1px solid rgba(5,150,105,.2);color:var(--green);font-family:'Plus Jakarta Sans',sans-serif;font-size:.8125rem;font-weight:700;cursor:pointer;transition:all .15s}
        .dp-clear-btn:hover{background:rgba(5,150,105,.13)}

        .dp-table-card{background:var(--white);border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05);animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .18s both}
        .dp-table-head{display:grid;grid-template-columns:2fr 2.2fr 120px 120px 80px;gap:10px;padding:1rem 1.375rem;background:#fafbfc;border-bottom:1px solid #e5e7eb}
        .dp-table-head span{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:var(--tx3)}
        @media(max-width:800px){.dp-table-head{display:none}}

        .dp-table-body{display:flex;flex-direction:column}
        .dp-row{display:grid;grid-template-columns:2fr 2.2fr 120px 120px 80px;gap:10px;align-items:center;padding:1rem 1.375rem;border-bottom:1px solid #f0f1f3;transition:background .15s;animation:rowIn .4s cubic-bezier(.16,1,.3,1) both}
        .dp-row:last-child{border-bottom:none}
        .dp-row:hover{background:#f9fafb}
        @media(max-width:800px){.dp-row{grid-template-columns:1fr;gap:.5rem;padding:1rem 1.25rem}}

        .dp-row-patient{display:flex;align-items:center;gap:.7rem;min-width:0}
        .dp-row-av-wrap{position:relative;width:40px;height:40px;flex-shrink:0}
        .dp-row-av{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;font-size:.875rem;font-weight:800;display:flex;align-items:center;justify-content:center;letter-spacing:-.02em}
        .dp-new-pip{position:absolute;top:-2px;right:-2px;width:9px;height:9px;border-radius:50%;background:var(--green);border:2px solid var(--white)}
        .dp-row-patient-info{min-width:0;display:flex;flex-direction:column;gap:2px}
        .dp-row-name{font-size:.9375rem;font-weight:700;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .dp-row-id{display:flex;align-items:center;gap:.35rem;font-size:.6rem;color:var(--tx3);font-weight:600;font-family:'DM Mono',monospace}

        .dp-row-contact{display:flex;flex-direction:column;gap:.3rem;min-width:0}
        .dp-contact-link{display:flex;align-items:center;gap:.35rem;font-size:.8125rem;font-weight:500;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .14s}
        .dp-contact-email{color:var(--teal)}.dp-contact-email:hover{color:var(--green)}
        .dp-contact-phone{color:var(--tx2)}.dp-contact-phone:hover{color:var(--green)}
        .dp-no-contact{font-size:.8125rem;color:var(--tx3)}

        .dp-row-date{display:flex;align-items:center;gap:.375rem;font-size:.8125rem;font-weight:500;color:var(--tx2);font-family:'DM Mono',monospace;white-space:nowrap}
        .dp-date-ic{color:var(--tx3);flex-shrink:0}

        .dp-row-visits{display:flex;align-items:center;gap:.35rem}
        .dp-visit-badge{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;border-radius:6px;background:var(--green-dim);border:1px solid rgba(5,150,105,.22);color:var(--green);font-size:.75rem;font-weight:700;font-family:'DM Mono',monospace}
        .dp-visit-label{font-size:.65rem;color:var(--tx3);font-weight:500}
      `}</style>
    </div>
  )
}