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
        <div className="dp-header-actions">
          <button className="dp-refresh-btn" onClick={load} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* ══ STATS STRIP ══ */}
        <div className="dp-stats-strip">
          {[
            { icon: <Users size={16} />,    label: 'Total Patients', val: rows.length,    color: 'green'   },
            { icon: <Activity size={16} />, label: 'Total Visits',   val: totalVisits,    color: 'teal'    },
            { icon: <Star size={16} />,     label: 'New (30 days)',  val: newPatients,    color: 'emerald' },
            { icon: <TrendingUp size={16}/>,label: 'Repeat Patients',val: repeatPatients, color: 'cyan'    },
          ].map((s, i) => (
            <div key={s.label} className={`dp-stat-card dp-stat-${s.color}`} style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="dp-stat-ic">{s.icon}</div>
              <div>
                <p className="dp-stat-val">{s.val}</p>
                <p className="dp-stat-lbl">{s.label}</p>
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
                      <span className="dp-row-id">
                        <Hash size={9} />#{r.patientId}
                        {r.isNew && <span className="dp-new-tag">New</span>}
                        {r.visitCount > 1 && <span className="dp-repeat-tag">Returning</span>}
                      </span>
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

        .dp-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem;animation:slideDown .5s cubic-bezier(.16,1,.3,1) both}
        .dp-eyebrow{display:flex;align-items:center;gap:.45rem;font-size:.6875rem;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.3rem}
        .dp-live{width:7px;height:7px;border-radius:50%;background:var(--green-lt);flex-shrink:0;animation:livePulse 2.5s ease-in-out infinite}
        .dp-title{font-size:1.875rem;font-weight:800;letter-spacing:-.04em;color:var(--tx1);line-height:1;margin-bottom:.25rem}
        .dp-sub{font-size:.8125rem;color:var(--tx3)}
  .dp-header-actions{display:flex;align-items:center;gap:.625rem;margin-top:.25rem}

  .dp-refresh-btn{width:38px;height:38px;border-radius:10px;background:var(--white);border:1.5px solid var(--rim-md);color:var(--tx3);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--sh-sm);transition:all .18s}
  .dp-refresh-btn:hover{color:var(--green);border-color:var(--rim-hi);transform:rotate(180deg)}

        .dp-stats-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem;margin-bottom:1.25rem;animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .08s both}
        @media(max-width:700px){.dp-stats-strip{grid-template-columns:repeat(2,1fr)}}
        .dp-stat-card{display:flex;align-items:center;gap:.875rem;padding:.9rem 1.1rem;border-radius:16px;background:var(--white);border:1.5px solid var(--rim);box-shadow:var(--sh-sm);animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both;transition:transform .2s,box-shadow .2s}
        .dp-stat-card:hover{transform:translateY(-2px);box-shadow:var(--sh-md)}
        .dp-stat-ic{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .dp-stat-green   .dp-stat-ic{background:var(--green-dim);border:1px solid rgba(5,150,105,.18);color:var(--green)}
        .dp-stat-teal    .dp-stat-ic{background:var(--teal-dim);border:1px solid rgba(13,148,136,.18);color:var(--teal)}
        .dp-stat-emerald .dp-stat-ic{background:rgba(4,120,87,.07);border:1px solid rgba(4,120,87,.18);color:var(--emerald)}
        .dp-stat-cyan    .dp-stat-ic{background:var(--cyan-dim);border:1px solid rgba(8,145,178,.18);color:var(--cyan)}
        .dp-stat-val{font-size:1.625rem;font-weight:800;letter-spacing:-.04em;color:var(--tx1);line-height:1;margin-bottom:2px;font-family:'DM Mono',monospace}
        .dp-stat-lbl{font-size:.6875rem;font-weight:500;color:var(--tx3);white-space:nowrap}

        .dp-toolbar{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem;animation:fadeUp .45s cubic-bezier(.16,1,.3,1) .1s both}
        .dp-search-wrap{position:relative;flex:1;min-width:200px;max-width:360px}
        .dp-search-ic{position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:var(--tx3);pointer-events:none}
        .dp-search{width:100%;padding:.575rem 2.25rem .575rem 2.25rem;border-radius:11px;background:var(--white);border:1.5px solid var(--rim-md);font-family:'Plus Jakarta Sans',sans-serif;font-size:.8125rem;color:var(--tx1);outline:none;box-shadow:var(--sh-sm);transition:border-color .18s,box-shadow .18s}
        .dp-search::placeholder{color:var(--tx3)}
        .dp-search:focus{border-color:var(--green-lt);box-shadow:0 0 0 3px rgba(16,185,129,.12);background:var(--white)}
        .dp-search-clear{position:absolute;right:.7rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--tx3);display:flex;transition:color .12s}
        .dp-search-clear:hover{color:var(--tx2)}

        .dp-sort-wrap{display:flex;align-items:center;gap:.3rem;background:var(--white);border:1.5px solid var(--rim-md);border-radius:11px;padding:.3rem;box-shadow:var(--sh-sm)}
        .dp-sort-label{font-size:.6875rem;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.08em;padding:.1rem .5rem}
        .dp-sort-btn{padding:.35rem .75rem;border-radius:7px;font-size:.75rem;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;color:var(--tx3);background:none;border:none;cursor:pointer;transition:all .15s;white-space:nowrap}
        .dp-sort-btn:hover{color:var(--tx2);background:var(--bg2)}
        .dp-sort-active{background:var(--white)!important;color:var(--green)!important;box-shadow:var(--sh-sm)}
        .dp-count-hint{font-size:.75rem;font-weight:600;color:var(--tx3);margin-left:auto;white-space:nowrap}

        .dp-empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:5rem 1rem;animation:fadeUp .6s cubic-bezier(.16,1,.3,1) both}
        .dp-empty-ic{width:68px;height:68px;border-radius:20px;background:var(--white);border:1.5px solid var(--rim-md);color:var(--tx3);display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;box-shadow:var(--sh-md)}
        .dp-empty-title{font-size:1.0625rem;font-weight:700;color:var(--tx1);margin-bottom:.4rem}
        .dp-empty-sub{font-size:.875rem;color:var(--tx3);margin-bottom:1rem;max-width:26rem;line-height:1.6}
        .dp-clear-btn{display:inline-flex;align-items:center;gap:.3rem;padding:.5rem 1rem;border-radius:9px;background:rgba(5,150,105,.07);border:1px solid rgba(5,150,105,.2);color:var(--green);font-family:'Plus Jakarta Sans',sans-serif;font-size:.8125rem;font-weight:700;cursor:pointer;transition:all .15s}
        .dp-clear-btn:hover{background:rgba(5,150,105,.13)}

        .dp-table-card{background:var(--white);border:1.5px solid var(--rim);border-radius:20px;overflow:hidden;box-shadow:var(--sh-sm);animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .18s both}
        .dp-table-head{display:grid;grid-template-columns:2fr 2.2fr 120px 120px 80px;gap:10px;padding:.625rem 1.375rem;background:var(--bg2);border-bottom:1px solid var(--rim-md)}
        .dp-table-head span{font-size:.575rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--tx3)}
        @media(max-width:800px){.dp-table-head{display:none}}

        .dp-table-body{display:flex;flex-direction:column}
        .dp-row{display:grid;grid-template-columns:2fr 2.2fr 120px 120px 80px;gap:10px;align-items:center;padding:.875rem 1.375rem;border-bottom:1px solid var(--rim);transition:background .14s;animation:rowIn .4s cubic-bezier(.16,1,.3,1) both}
        .dp-row:last-child{border-bottom:none}
        .dp-row:hover{background:rgba(16,185,129,.025)}
        @media(max-width:800px){.dp-row{grid-template-columns:1fr;gap:.5rem;padding:1rem 1.25rem}}

        .dp-row-patient{display:flex;align-items:center;gap:.7rem;min-width:0}
        .dp-row-av-wrap{position:relative;width:40px;height:40px;flex-shrink:0}
        .dp-row-av{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;font-size:.875rem;font-weight:800;display:flex;align-items:center;justify-content:center;letter-spacing:-.02em}
        .dp-new-pip{position:absolute;top:-2px;right:-2px;width:9px;height:9px;border-radius:50%;background:var(--green);border:2px solid var(--white)}
        .dp-row-patient-info{min-width:0;display:flex;flex-direction:column;gap:2px}
        .dp-row-name{font-size:.9375rem;font-weight:700;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .dp-row-id{display:flex;align-items:center;gap:.35rem;font-size:.6rem;color:var(--tx3);font-weight:600;font-family:'DM Mono',monospace}
        .dp-new-tag{background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.22);color:var(--green);font-size:.55rem;font-weight:800;padding:.08rem .35rem;border-radius:4px;text-transform:uppercase;letter-spacing:.06em}
        .dp-repeat-tag{background:rgba(13,148,136,.1);border:1px solid rgba(13,148,136,.22);color:var(--teal);font-size:.55rem;font-weight:800;padding:.08rem .35rem;border-radius:4px;text-transform:uppercase;letter-spacing:.06em}

        .dp-row-contact{display:flex;flex-direction:column;gap:.3rem;min-width:0}
        .dp-contact-link{display:flex;align-items:center;gap:.35rem;font-size:.8125rem;font-weight:500;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .14s}
        .dp-contact-email{color:var(--teal)}.dp-contact-email:hover{color:var(--green)}
        .dp-contact-phone{color:var(--tx2)}.dp-contact-phone:hover{color:var(--green)}
        .dp-no-contact{font-size:.8125rem;color:var(--tx3)}

        .dp-row-date{display:flex;align-items:center;gap:.375rem;font-size:.8125rem;font-weight:500;color:var(--tx2);font-family:'DM Mono',monospace;white-space:nowrap}
        .dp-date-ic{color:var(--tx3);flex-shrink:0}

        .dp-row-visits{display:flex;align-items:center;gap:.4rem}
        .dp-visit-badge{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;border-radius:8px;background:var(--green-dim);border:1px solid rgba(5,150,105,.22);color:var(--green);font-size:.875rem;font-weight:800;font-family:'DM Mono',monospace}
        .dp-visit-label{font-size:.6875rem;color:var(--tx3);font-weight:500}
      `}</style>
    </div>
  )
}