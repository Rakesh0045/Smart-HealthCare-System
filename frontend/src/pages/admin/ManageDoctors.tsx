import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Stethoscope, Search, UserX, UserCheck, X, Star, Building2, Award } from 'lucide-react'
import toast from 'react-hot-toast'

const generateAvatar = (name?: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Doctor')}&background=1e3a5f&color=60a5fa&bold=true&size=80`

export default function ManageDoctors() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [specFilter, setSpecFilter] = useState('ALL')

  const load = () => adminApi.getAllDoctors().then(r => setDoctors(r.data.data || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleDeactivate = async (userId: number, name: string) => {
    if (!confirm(`Deactivate Dr. ${name}?`)) return
    await adminApi.deactivateUser(userId)
    toast.success('Doctor deactivated')
    load()
  }
  const handleActivate = async (userId: number) => {
    await adminApi.activateUser(userId)
    toast.success('Doctor activated')
    load()
  }

  const specializations = ['ALL', ...Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean)))]

  const filtered = doctors.filter(d => {
    const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.specialization?.toLowerCase().includes(search.toLowerCase())
    const matchSpec = specFilter === 'ALL' || d.specialization === specFilter
    return matchSearch && matchSpec
  })

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
        .doc-card {
          background: white; border-radius: 16px;
          border: 1.5px solid #e2e8f0;
          padding: 20px; transition: all 0.2s;
          animation: fadeUp 0.4s ease both;
        }
        .doc-card:hover { border-color: #f59e0b; box-shadow: 0 8px 28px rgba(245,158,11,0.1); transform: translateY(-2px); }
        .adm-search {
          width: 100%; padding: 10px 16px 10px 42px;
          border-radius: 12px; border: 1.5px solid #e2e8f0;
          background: white; font-family: 'DM Sans', sans-serif;
          font-size: 13px; color: #0f172a; outline: none;
          transition: all 0.2s; box-sizing: border-box;
        }
        .adm-search:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }
        .adm-search::placeholder { color: #94a3b8; }

        .spec-chip {
          padding: 6px 14px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
          border: 1.5px solid #e2e8f0;
          cursor: pointer; transition: all 0.18s;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
          background: white; color: #64748b;
        }
        .spec-chip:hover { border-color: #f59e0b; color: #f59e0b; }
        .spec-chip-active { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.4); color: #d97706; }

        .action-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 9px;
          font-size: 12px; font-weight: 700;
          border: 1.5px solid; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all 0.18s;
          flex: 1; justify-content: center;
        }
        .action-btn:hover { transform: scale(1.03); }
      `}</style>

      <div className="adm-page" style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 40 }}>

        {/* Header */}
        <div style={{ marginBottom: 24, animation: 'fadeUp 0.38s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 0 3px rgba(245,158,11,0.2)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>System Administration</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Manage Doctors</h1>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{doctors.length} doctors registered in the system</p>
            </div>
            <div style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.25)' }}>
              <span className="adm-mono" style={{ fontSize: 22, fontWeight: 700, color: '#d97706' }}>{doctors.length}</span>
              <span style={{ fontSize: 11, color: '#92400e', marginLeft: 6, fontWeight: 600 }}>total</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', animation: 'fadeUp 0.42s ease both' }}>
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input className="adm-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or specialization…" />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flexWrap: 'wrap' }}>
            {specializations.slice(0, 8).map(s => (
              <button key={s} className={`spec-chip${specFilter === s ? ' spec-chip-active' : ''}`} onClick={() => setSpecFilter(s)}>{s}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #f1f5f9', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <Stethoscope size={44} style={{ margin: '0 auto 14px', opacity: 0.3 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#64748b', margin: '0 0 6px' }}>No doctors found</p>
            <p style={{ fontSize: 13, margin: 0 }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {filtered.map((d, idx) => (
              <div key={d.id} className="doc-card" style={{ animationDelay: `${idx * 0.04}s` }}>
                <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                  <img src={generateAvatar(d.name)} alt={d.name} style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', flexShrink: 0, border: '2px solid #dbeafe' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Dr. {d.name}</h3>
                        <p style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, margin: 0 }}>{d.specialization}</p>
                      </div>
                      {d.rating > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', flexShrink: 0 }}>
                          <Star size={11} color="#f59e0b" fill="#f59e0b" />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>{d.rating?.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      {d.hospital && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                          <Building2 size={11} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{d.hospital}</span>
                        </div>
                      )}
                      {d.experience != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                          <Award size={11} />
                          <span>{d.experience} yrs</span>
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#64748b' }}>₹{d.consultationFee}</div>
                    </div>
                  </div>
                </div>

                {d.bio && (
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 14px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{d.bio}</p>
                )}

                <div style={{ display: 'flex', gap: 8, paddingTop: 14, borderTop: '1px solid #f8fafc' }}>
                  <button className="action-btn" onClick={() => handleDeactivate(d.userId, d.name)}
                    style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                    <UserX size={13} /> Deactivate
                  </button>
                  <button className="action-btn" onClick={() => handleActivate(d.userId)}
                    style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                    <UserCheck size={13} /> Activate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}