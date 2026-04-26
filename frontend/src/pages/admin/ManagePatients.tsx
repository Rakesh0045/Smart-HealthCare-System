import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Users, Search, X, UserX, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const BLOOD_COLORS: Record<string, { color: string; bg: string }> = {
  'A+':  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)'   },
  'A-':  { color: '#f97316', bg: 'rgba(249,115,22,0.08)'  },
  'B+':  { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)'  },
  'B-':  { color: '#6366f1', bg: 'rgba(99,102,241,0.08)'  },
  'AB+': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)'  },
  'AB-': { color: '#ec4899', bg: 'rgba(236,72,153,0.08)'  },
  'O+':  { color: '#10b981', bg: 'rgba(16,185,129,0.08)'  },
  'O-':  { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },
}

const generateAvatar = (name?: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Patient')}&background=14532d&color=4ade80&bold=true&size=80`

export default function ManagePatients() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('ALL')

  const load = () => adminApi.getAllPatients().then(r => setPatients(r.data.data || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const filtered = patients.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search)
    const matchGender = genderFilter === 'ALL' || p.gender?.toUpperCase() === genderFilter
    return matchSearch && matchGender
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
        .adm-search {
          width: 100%; padding: 10px 16px 10px 42px;
          border-radius: 12px; border: 1.5px solid #e2e8f0;
          background: white; font-family: 'DM Sans', sans-serif;
          font-size: 13px; color: #0f172a; outline: none;
          transition: all 0.2s; box-sizing: border-box;
        }
        .adm-search:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }
        .adm-search::placeholder { color: #94a3b8; }
        .pat-row {
          display: grid;
          grid-template-columns: 52px 1.8fr 1.5fr 100px 80px 80px 110px;
          gap: 12px; padding: 13px 22px; align-items: center;
          border-bottom: 1px solid #f8fafc; transition: background 0.15s;
          animation: fadeUp 0.4s ease both;
        }
        .pat-row:hover { background: #fafbfc; }
        .pat-row:last-child { border-bottom: none; }
        .gen-chip {
          padding: 6px 14px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
          border: 1.5px solid #e2e8f0; background: white; color: #64748b;
          cursor: pointer; transition: all 0.18s;
          font-family: 'DM Sans', sans-serif;
        }
        .gen-chip:hover { border-color: #f59e0b; color: #d97706; }
        .gen-chip-active { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.4); color: #d97706; }
        .act-link {
          font-size: 11px; font-weight: 700; cursor: pointer;
          background: none; border: none; transition: color 0.15s; font-family: 'DM Sans', sans-serif;
        }
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
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Manage Patients</h1>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{patients.length} patients registered in the system</p>
            </div>
            <div style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.25)' }}>
              <span className="adm-mono" style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{patients.length}</span>
              <span style={{ fontSize: 11, color: '#166534', marginLeft: 6, fontWeight: 600 }}>total</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center', animation: 'fadeUp 0.42s ease both' }}>
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input className="adm-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, or phone…" />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['ALL', 'MALE', 'FEMALE', 'OTHER'].map(g => (
              <button key={g} className={`gen-chip${genderFilter === g ? ' gen-chip-active' : ''}`} onClick={() => setGenderFilter(g)}>{g}</button>
            ))}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginLeft: 'auto' }}>{filtered.length} results</span>
        </div>

        {/* Table */}
        <div className="adm-card" style={{ overflow: 'hidden' }}>
          {/* Header row */}
          <div className="pat-row" style={{ background: '#fafbfc', borderBottom: '2px solid #f1f5f9', animation: 'none', paddingTop: 10, paddingBottom: 10 }}>
            {['', 'Patient', 'Contact', 'Blood', 'Gender', 'Age', 'Actions'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{ width: 36, height: 36, border: '3px solid #f1f5f9', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: '0 0 4px', fontWeight: 700, color: '#64748b' }}>No patients found</p>
            </div>
          ) : filtered.map((p, idx) => {
            const blood = p.bloodGroup ? BLOOD_COLORS[p.bloodGroup] : null
            const age = p.dateOfBirth ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)) : null
            return (
              <div key={p.id} className="pat-row" style={{ animationDelay: `${idx * 0.03}s` }}>
                <img src={generateAvatar(p.name)} alt={p.name} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: '1.5px solid #dcfce7', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</p>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="adm-mono" style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>{p.phone || '—'}</p>
                  {p.emergencyContact && <p className="adm-mono" style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>Emg: {p.emergencyContact}</p>}
                </div>
                <div>
                  {blood ? (
                    <span style={{ fontSize: 12, fontWeight: 800, color: blood.color, background: blood.bg, padding: '4px 10px', borderRadius: 20, border: `1px solid ${blood.color}30` }}>
                      {p.bloodGroup}
                    </span>
                  ) : <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>}
                </div>
                <span style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{p.gender?.toLowerCase() || '—'}</span>
                <span className="adm-mono" style={{ fontSize: 12, color: '#64748b' }}>{age ? `${age}y` : '—'}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="act-link" onClick={async () => { await adminApi.deactivateUser(p.userId); toast.success('Deactivated'); load() }}
                    style={{ color: '#ef4444', padding: '5px 8px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    Deactivate
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}