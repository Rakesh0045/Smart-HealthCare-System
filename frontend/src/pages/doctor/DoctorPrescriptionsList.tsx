import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { prescriptionApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import {
  FileDown, FileText, Plus, Search, X, Download,
  Calendar, User, Hash, Stethoscope, ChevronRight, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function DoctorPrescriptionsList() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    prescriptionApi.getMy()
      .then(r => setList(r.data.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleDownload = async (id: number) => {
    setDownloading(id)
    try {
      const res = await prescriptionApi.downloadPdf(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url; a.download = `prescription-${id}.pdf`
      a.click(); URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch {} finally { setDownloading(null) }
  }

  const filtered = list.filter(p => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      p.patientName?.toLowerCase().includes(q) ||
      p.diagnosis?.toLowerCase().includes(q) ||
      String(p.id).includes(q)
    )
  })

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
            <h1 className="dp-title">Prescriptions</h1>
            <p className="dp-sub">
              {list.length} prescription{list.length !== 1 ? 's' : ''} issued · PDF downloads available
            </p>
          </div>
          <div className="dp-header-actions">
            <button className="dp-refresh-btn" onClick={load} title="Refresh">
              <RefreshCw size={14} />
            </button>
            <Link to="/doctor/prescriptions/new" className="dp-new-btn">
              <Plus size={15} /> New Prescription
            </Link>
          </div>
        </header>

        {/* ══ SEARCH ══ */}
        {list.length > 0 && (
          <div className="dp-toolbar">
            <div className="dp-search-wrap">
              <Search size={14} className="dp-search-ic" />
              <input
                className="dp-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by patient, diagnosis, or Rx number…"
              />
              {search && (
                <button className="dp-search-clear" onClick={() => setSearch('')}><X size={12} /></button>
              )}
            </div>
            <span className="dp-count-hint">{filtered.length} / {list.length}</span>
          </div>
        )}

        {/* ══ EMPTY ══ */}
        {list.length === 0 ? (
          <div className="dp-empty">
            <div className="dp-empty-ic"><FileText size={30} strokeWidth={1.5} /></div>
            <h3 className="dp-empty-title">No prescriptions yet</h3>
            <p className="dp-empty-sub">Complete a patient visit and issue a prescription — they'll appear here with PDF download</p>
            <Link to="/doctor/prescriptions/new" className="dp-new-btn dp-new-btn-lg">
              <Plus size={14} /> Write First Prescription
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="dp-empty">
            <div className="dp-empty-ic"><Search size={26} strokeWidth={1.5} /></div>
            <h3 className="dp-empty-title">No results for "{search}"</h3>
            <p className="dp-empty-sub">Try a different patient name or diagnosis</p>
            <button className="dp-clear-btn" onClick={() => setSearch('')}><X size={12} /> Clear</button>
          </div>
        ) : (
          <div className="dp-table-card">
            {/* Table header */}
            <div className="dp-table-head">
              <span>Rx No.</span>
              <span>Patient</span>
              <span>Diagnosis</span>
              <span>Medicines</span>
              <span>Issued on</span>
              <span>PDF</span>
            </div>

            <div className="dp-table-body">
              {filtered.map((p, idx) => (
                <div key={p.id} className="dp-row" style={{ animationDelay: `${Math.min(idx, 15) * 0.04}s` }}>

                  {/* Rx number */}
                  <div className="dp-row-rx">
                    <div className="dp-rx-ic"><FileText size={13} /></div>
                    <div>
                      <span className="dp-rx-num">RX-{String(p.id).padStart(5, '0')}</span>
                      <span className="dp-rx-sub">
                        <Hash size={9} />{p.id}
                      </span>
                    </div>
                  </div>

                  {/* Patient */}
                  <div className="dp-row-patient">
                    <div className="dp-row-av">
                      {p.patientName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'P'}
                    </div>
                    <div>
                      <span className="dp-patient-name">{p.patientName || '—'}</span>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="dp-row-diag">
                    <span className="dp-diag-text" title={p.diagnosis}>{p.diagnosis || '—'}</span>
                  </div>

                  {/* Medicines count */}
                  <div>
                    {p.medicines?.length > 0 ? (
                      <span className="dp-med-chip">
                        {p.medicines.length} med{p.medicines.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="dp-med-none">—</span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="dp-row-date">
                    <Calendar size={11} className="dp-date-ic" />
                    {fmtDate(p.createdAt)}
                  </div>

                  {/* Download */}
                  <div>
                    <button
                      className={`dp-dl-btn ${downloading === p.id ? 'dp-dl-loading' : ''}`}
                      onClick={() => handleDownload(p.id)}
                      disabled={downloading === p.id}
                    >
                      {downloading === p.id
                        ? <><span className="dp-spin" /> Downloading…</>
                        : <><FileDown size={13} /> Download PDF</>}
                    </button>
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
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes livePulse{0%,100%{box-shadow:0 0 0 2px rgba(16,185,129,0.1)}50%{box-shadow:0 0 0 5px rgba(16,185,129,0.05)}}

        .dp-page{position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:2rem 2rem 4rem}
        @media(max-width:768px){.dp-page{padding:1.25rem 1rem 3rem}}

        .dp-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:2rem;animation:slideDown .5s cubic-bezier(.16,1,.3,1) both}
        .dp-eyebrow{display:flex;align-items:center;gap:.35rem;font-size:.65rem;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.4rem}
        .dp-live{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0;animation:livePulse 2.5s ease-in-out infinite}
        .dp-title{font-size:2rem;font-weight:700;letter-spacing:-.01em;color:var(--tx1);line-height:1.2;margin-bottom:.3rem}
        .dp-sub{font-size:.875rem;color:var(--tx2);line-height:1.4}
        .dp-header-actions{display:flex;align-items:center;gap:.625rem;margin-top:.25rem}

        .dp-refresh-btn{width:38px;height:38px;border-radius:10px;background:var(--white);border:1px solid #e5e7eb;color:var(--tx2);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:all .18s}
        .dp-refresh-btn:hover{color:var(--green);border-color:var(--green);background:#f0fdfa;transform:rotate(180deg)}

        .dp-new-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.65rem 1.25rem;border-radius:10px;background:var(--green);color:#fff;font-family:'Plus Jakarta Sans',sans-serif;font-size:.8125rem;font-weight:600;border:none;cursor:pointer;text-decoration:none;box-shadow:0 2px 6px rgba(5,150,105,.2);transition:all .2s;white-space:nowrap}
        .dp-new-btn:hover{background:#047857;transform:translateY(-1px);box-shadow:0 4px 12px rgba(5,150,105,.25)}
        .dp-new-btn-lg{padding:.7rem 1.5rem;font-size:.875rem;margin-top:.5rem}

        .dp-toolbar{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:1.5rem;animation:fadeUp .45s cubic-bezier(.16,1,.3,1) .1s both}
        .dp-search-wrap{position:relative;flex:1;min-width:240px;max-width:420px}
        .dp-search-ic{position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:var(--tx3);pointer-events:none;font-size:.875rem}
        .dp-search{width:100%;padding:.65rem 2.25rem .65rem 2.25rem;border-radius:10px;background:var(--white);border:1px solid #e5e7eb;font-family:'Plus Jakarta Sans',sans-serif;font-size:.8125rem;color:var(--tx1);outline:none;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:border-color .18s,box-shadow .18s}
        .dp-search::placeholder{color:var(--tx3)}
        .dp-search:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(5,150,105,.1);background:var(--white)}
        .dp-search-clear{position:absolute;right:.7rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--tx3);display:flex;transition:color .12s}
        .dp-search-clear:hover{color:var(--tx1)}
        .dp-count-hint{font-size:.75rem;font-weight:500;color:var(--tx3);white-space:nowrap;margin-left:auto}

        .dp-clear-btn{display:inline-flex;align-items:center;gap:.3rem;padding:.5rem 1rem;border-radius:9px;background:rgba(5,150,105,.07);border:1px solid rgba(5,150,105,.15);color:var(--green);font-family:'Plus Jakarta Sans',sans-serif;font-size:.8125rem;font-weight:600;cursor:pointer;transition:all .15s}
        .dp-clear-btn:hover{background:rgba(5,150,105,.12)}

        .dp-empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:4rem 1rem;animation:fadeUp .6s cubic-bezier(.16,1,.3,1) both}
        .dp-empty-ic{width:72px;height:72px;border-radius:16px;background:var(--white);border:1px solid #e5e7eb;color:var(--tx3);display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.05)}
        .dp-empty-title{font-size:1.125rem;font-weight:700;color:var(--tx1);margin-bottom:.5rem}
        .dp-empty-sub{font-size:.875rem;color:var(--tx2);max-width:28rem;line-height:1.6;margin-bottom:1.5rem}

        .dp-table-card{background:var(--white);border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05);animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .18s both}
        .dp-table-head{display:grid;grid-template-columns:130px 1.6fr 2fr 90px 130px 140px;gap:10px;padding:1rem 1.375rem;background:#fafbfc;border-bottom:1px solid #e5e7eb}
        .dp-table-head span{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:var(--tx3)}
        @media(max-width:900px){.dp-table-head{display:none}}

        .dp-table-body{display:flex;flex-direction:column}
        .dp-row{display:grid;grid-template-columns:130px 1.6fr 2fr 90px 130px 140px;gap:10px;align-items:center;padding:1rem 1.375rem;border-bottom:1px solid #f0f1f3;transition:background .15s;animation:rowIn .4s cubic-bezier(.16,1,.3,1) both}
        .dp-row:last-child{border-bottom:none}
        .dp-row:hover{background:#f9fafb}
        @media(max-width:900px){.dp-row{grid-template-columns:1fr;gap:.625rem;padding:1rem 1.25rem}}

        .dp-row-rx{display:flex;align-items:center;gap:.5rem}
        .dp-rx-ic{width:32px;height:32px;border-radius:8px;background:#ecfdf5;border:1px solid #d1fae5;color:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .dp-rx-num{display:block;font-size:.8125rem;font-weight:700;color:var(--tx1)}
        .dp-rx-sub{display:flex;align-items:center;gap:2px;font-size:.65rem;color:var(--tx3);font-family:'DM Mono',monospace}

        .dp-row-patient{display:flex;align-items:center;gap:.625rem;min-width:0}
        .dp-row-av{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;font-size:.75rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .dp-patient-name{font-size:.875rem;font-weight:600;color:var(--tx1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}

        .dp-row-diag{min-width:0}
        .dp-diag-text{font-size:.8125rem;color:var(--tx2);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

        .dp-med-chip{display:inline-flex;align-items:center;padding:.25rem .65rem;border-radius:999px;background:#f0fdfa;border:1px solid #ccfbf1;font-size:.7rem;font-weight:600;color:var(--teal)}
        .dp-med-none{font-size:.8125rem;color:var(--tx3)}

        .dp-row-date{display:flex;align-items:center;gap:.375rem;font-size:.8125rem;font-weight:500;color:var(--tx2);white-space:nowrap}
        .dp-date-ic{color:var(--tx3);flex-shrink:0}

        .dp-dl-btn{display:inline-flex;align-items:center;gap:.375rem;padding:.5rem .9rem;border-radius:9px;background:var(--white);border:1px solid #e5e7eb;color:var(--tx2);font-family:'Plus Jakarta Sans',sans-serif;font-size:.75rem;font-weight:600;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:all .18s;white-space:nowrap}
        .dp-dl-btn:hover{background:var(--green);color:#fff;border-color:var(--green);box-shadow:0 2px 8px rgba(5,150,105,.15);transform:translateY(-1px)}
        .dp-dl-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .dp-dl-loading{background:#f9fafb!important;color:var(--tx3)!important;border-color:#e5e7eb!important}
        .dp-spin{width:11px;height:11px;border-radius:50%;border:2px solid #e5e7eb;border-top-color:var(--green);animation:spin .8s linear infinite;display:inline-block}
      `}</style>
    </div>
  )
}