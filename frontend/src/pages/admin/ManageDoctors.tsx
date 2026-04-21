import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { PageHeader, DoctorCard, LoadingSpinner, EmptyState } from '../../components/common'
import { Stethoscope, UserX, UserCheck, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ManageDoctors() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const load = () => adminApi.getAllDoctors().then(r => setDoctors(r.data.data || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleDeactivate = async (userId: number, name: string) => {
    if (!confirm(`Deactivate Dr. ${name}?`)) return
    await adminApi.deactivateUser(userId); toast.success('Doctor deactivated'); load()
  }
  const handleActivate = async (userId: number) => {
    await adminApi.activateUser(userId); toast.success('Doctor activated'); load()
  }

  const filtered = doctors.filter(d => d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialization?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <LoadingSpinner />
  return (
    <div className="space-y-5">
      <PageHeader title="Manage Doctors" subtitle={`${doctors.length} doctors registered`}/>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or specialization…"
          className="input pl-9"/>
      </div>
      {filtered.length === 0
        ? <EmptyState icon={Stethoscope} title="No doctors found"/>
        : <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(d => (
              <DoctorCard key={d.id} doctor={d} action={
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleDeactivate(d.userId, d.name)} className="btn-danger text-xs py-1.5 px-3 flex-1">
                    <UserX className="w-3 h-3"/>Deactivate
                  </button>
                  <button onClick={() => handleActivate(d.userId)} className="btn-secondary text-xs py-1.5 px-3 flex-1">
                    <UserCheck className="w-3 h-3"/>Activate
                  </button>
                </div>
              }/>
            ))}
          </div>
      }
    </div>
  )
}