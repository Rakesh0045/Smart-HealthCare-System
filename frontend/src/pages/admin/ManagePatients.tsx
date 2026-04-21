import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/common'
import { Users, Search, UserX, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ManagePatients() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const load = () => adminApi.getAllPatients().then(r => setPatients(r.data.data || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <LoadingSpinner />
  return (
    <div className="space-y-5">
      <PageHeader title="Manage Patients" subtitle={`${patients.length} patients registered`}/>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patients…" className="input pl-9"/>
      </div>
      {filtered.length === 0
        ? <EmptyState icon={Users} title="No patients found"/>
        : <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100">
                {['Patient','Email','Phone','Blood Group','Gender','Actions'].map(h=>(
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {p.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{p.email}</td>
                    <td className="px-3 py-3 text-slate-600">{p.phone || '—'}</td>
                    <td className="px-3 py-3"><span className="badge bg-red-50 text-red-700 border-red-200">{p.bloodGroup || '—'}</span></td>
                    <td className="px-3 py-3 text-slate-600 capitalize">{p.gender || '—'}</td>
                    <td className="px-3 py-3">
                      <button onClick={async()=>{await adminApi.deactivateUser(p.userId);toast.success('Deactivated');load()}}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  )
}