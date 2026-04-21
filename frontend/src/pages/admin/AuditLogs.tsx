import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { PageHeader, LoadingSpinner } from '../../components/common'
import { ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'

const ACTION_COLORS: Record<string,string> = {
  USER_REGISTERED:'bg-green-100 text-green-700',
  USER_LOGIN:'bg-blue-100 text-blue-700',
  USER_LOGOUT:'bg-slate-100 text-slate-600',
  APPOINTMENT_BOOKED:'bg-indigo-100 text-indigo-700',
  APPOINTMENT_CANCELLED:'bg-red-100 text-red-700',
  APPOINTMENT_COMPLETED:'bg-emerald-100 text-emerald-700',
  PRESCRIPTION_ADDED:'bg-purple-100 text-purple-700',
  DOCTOR_PROFILE_UPDATED:'bg-yellow-100 text-yellow-700',
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const load = (p: number) => {
    setLoading(true)
    adminApi.getAuditLogs(p).then(r => {
      const d = r.data.data
      setLogs(d.content || [])
      setTotalPages(d.totalPages || 0)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load(page) }, [page])

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" subtitle="Track all system activities" />
      {loading ? <LoadingSpinner /> : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100">
                {['#','Action','Entity','Details','User ID','Time'].map(h=>(
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-400 text-xs">{log.id}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action]||'bg-slate-100 text-slate-600'}`}>
                        {log.action.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 text-xs">{log.entityType} #{log.entityId}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs max-w-xs truncate">{log.details}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs">{log.userId}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-IN', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <p className="text-center text-slate-400 py-8">No audit logs yet</p>}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} className="btn-secondary py-1.5 px-3">
                <ChevronLeft className="w-4 h-4"/>
              </button>
              <span className="text-sm text-slate-600">Page {page+1} of {totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} className="btn-secondary py-1.5 px-3">
                <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}