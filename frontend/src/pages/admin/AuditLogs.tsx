import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { ChevronLeft, ChevronRight, Shield, Search, X } from 'lucide-react'

const ACTION_META: Record<string, { color: string; bg: string; border: string }> = {
  USER_REGISTERED:      { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  USER_LOGIN:           { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)' },
  USER_LOGOUT:          { color: '#64748b', bg: 'rgba(100,116,139,0.08)',border: 'rgba(100,116,139,0.2)' },
  APPOINTMENT_BOOKED:   { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)' },
  APPOINTMENT_CANCELLED:{ color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  },
  APPOINTMENT_COMPLETED:{ color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  PRESCRIPTION_ADDED:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
  DOCTOR_PROFILE_UPDATED:{ color:'#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [search, setSearch] = useState('')

  const load = (p: number) => {
    setLoading(true)
    adminApi.getAuditLogs(p).then(r => {
      const d = r.data.data
      setLogs(d.content || [])
      setTotalPages(d.totalPages || 0)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load(page) }, [page])

  const filtered = logs.filter(l =>
    !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.details?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .adm-page { font-family: 'DM Sans', sans-serif; }
        .adm-mono { font-family: 'DM Mono', monospace; }
        @keyframes fadeUp { from { opacity:0;transform:translateY(16px); } to { opacity:1;transform:translateY(0); } }
        @keyframes spin   { to { transform: rotate(360deg); } }

        .adm-card {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 18px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.04);
          animation: fadeUp 0.4s ease both;
        }
        .log-row {
          display: grid;
          grid-template-columns: 48px 1fr 180px 120px 80px 160px;
          gap: 10px; padding: 12px 20px; align-items: center;
          border-bottom: 1px solid #f8fafc; transition: background 0.15s;
          animation: fadeUp 0.4s ease both;
        }
        .log-row:hover { background: #fafbfc; }
        .log-row:last-child { border-bottom: none; }
        .adm-search {
          width: 100%; padding: 10px 16px 10px 42px;
          border-radius: 12px; border: 1.5px solid #e2e8f0;
          background: white; font-family: 'DM Sans', sans-serif;
          font-size: 13px; color: #0f172a; outline: none;
          transition: all 0.2s; box-sizing: border-box;
        }
        .adm-search:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }
        .adm-search::placeholder { color: #94a3b8; }
        .page-btn {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1.5px solid #e2e8f0; background: white;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.18s; font-family: 'DM Sans', sans-serif;
        }
        .page-btn:hover:not(:disabled) { border-color: #f59e0b; background: rgba(245,158,11,0.06); }
        .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>

      <div className="adm-page" style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 40 }}>

        {/* Header */}
        <div style={{ marginBottom: 24, animation: 'fadeUp 0.38s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 0 3px rgba(245,158,11,0.2)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Security & Compliance</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Audit Logs</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Track all system activities and changes</p>
        </div>

        {/* Search + stats bar */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18, animation: 'fadeUp 0.42s ease both' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input className="adm-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions or details…" />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ padding: '9px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            {filtered.length} of {logs.length} records
          </div>
        </div>

        {/* Table */}
        <div className="adm-card" style={{ overflow: 'hidden' }}>

          {/* Column headers */}
          <div className="log-row" style={{ background: '#fafbfc', borderBottom: '2px solid #f1f5f9', animation: 'none', paddingTop: 10, paddingBottom: 10 }}>
            {['#', 'Action', 'Details', 'Entity', 'User', 'Time'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{ width: 36, height: 36, border: '3px solid #f1f5f9', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              <Shield size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: '0 0 4px', fontWeight: 600 }}>No logs found</p>
            </div>
          ) : filtered.map((log, idx) => {
            const meta = ACTION_META[log.action] || { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' }
            return (
              <div key={log.id} className="log-row" style={{ animationDelay: `${idx * 0.03}s` }}>
                <span className="adm-mono" style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600 }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, padding: '3px 10px', borderRadius: 20, display: 'inline-block' }}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.details || '—'}
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {log.entityType ? `${log.entityType} #${log.entityId}` : '—'}
                </span>
                <span className="adm-mono" style={{ fontSize: 11, color: '#94a3b8' }}>
                  {log.userId ?? '—'}
                </span>
                <span className="adm-mono" style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as any)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20, animation: 'fadeUp 0.5s ease both' }}>
            <button className="page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft size={16} color="#64748b" />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', minWidth: 100, textAlign: 'center' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
              <ChevronRight size={16} color="#64748b" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}