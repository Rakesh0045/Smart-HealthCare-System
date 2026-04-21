import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { PageHeader, LoadingSpinner, StatusBadge } from '../../components/common'
import { Search, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_COLORS: Record<string,string> = {
  ADMIN:'bg-purple-100 text-purple-700 border-purple-200',
  DOCTOR:'bg-blue-100 text-blue-700 border-blue-200',
  PATIENT:'bg-green-100 text-green-700 border-green-200',
}

export default function ManageUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const load = () => adminApi.getAllUsers().then(r=>setUsers(r.data.data||[])).finally(()=>setLoading(false))
  useEffect(()=>{load()},[])

  const filtered = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (loading) return <LoadingSpinner />
  return (
    <div className="space-y-5">
      <PageHeader title="All Users" subtitle={`${users.length} total accounts`}/>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users…" className="input pl-9"/>
        </div>
        <div className="flex gap-2">
          {['ALL','PATIENT','DOCTOR','ADMIN'].map(r => (
            <button key={r} onClick={()=>setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${roleFilter===r?'bg-slate-800 text-white border-slate-800':'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100">
            {['User','Email','Role','Phone','Status','Created','Actions'].map(h=>(
              <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(u => (
              <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.active?'opacity-50':''}`}>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {u.name?.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-800 truncate max-w-[120px]">{u.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-500 text-xs">{u.email}</td>
                <td className="px-3 py-3">
                  <span className={`badge text-xs border ${ROLE_COLORS[u.role]||''}`}><ShieldCheck className="w-3 h-3"/>{u.role}</span>
                </td>
                <td className="px-3 py-3 text-slate-500 text-xs">{u.phone||'—'}</td>
                <td className="px-3 py-3">
                  <span className={`badge text-xs ${u.active?'bg-green-50 text-green-700 border-green-200':'bg-red-50 text-red-700 border-red-200'}`}>
                    {u.active?'Active':'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                <td className="px-3 py-3">
                  {u.active
                    ? <button onClick={async()=>{await adminApi.deactivateUser(u.id);toast.success('Deactivated');load()}} className="text-xs text-red-500 hover:text-red-700 font-medium">Deactivate</button>
                    : <button onClick={async()=>{await adminApi.activateUser(u.id);toast.success('Activated');load()}} className="text-xs text-green-600 hover:text-green-800 font-medium">Activate</button>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-slate-400 py-8">No users found</p>}
      </div>
    </div>
  )
}