import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorApi } from '../../api'
import { PageHeader, DoctorCard, LoadingSpinner, EmptyState } from '../../components/common'
import { Search, SlidersHorizontal, Star, Stethoscope, X } from 'lucide-react'

export default function FindDoctors() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<any[]>([])
  const [specializations, setSpecializations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ specialization: '', name: '', maxFee: '' })
  const [applied, setApplied] = useState({ specialization: '', name: '', maxFee: '' })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    Promise.all([doctorApi.getAll(), doctorApi.getSpecializations()])
      .then(([d, s]) => {
        setDoctors(d.data.data || [])
        setSpecializations(s.data.data || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = async () => {
    setLoading(true)
    setApplied({ ...filters })
    try {
      const { data } = await doctorApi.search({
        specialization: filters.specialization || undefined,
        name: filters.name || undefined,
        maxFee: filters.maxFee || undefined,
      })
      setDoctors(data.data || [])
    } finally { setLoading(false) }
  }

  const clearFilters = async () => {
    const reset = { specialization: '', name: '', maxFee: '' }
    setFilters(reset); setApplied(reset)
    setLoading(true)
    const { data } = await doctorApi.getAll()
    setDoctors(data.data || [])
    setLoading(false)
  }

  const isFiltered = applied.specialization || applied.name || applied.maxFee

  return (
    <div className="space-y-5">
      <PageHeader
        title="Find Doctors"
        subtitle={`${doctors.length} doctor${doctors.length !== 1 ? 's' : ''} available`}
        action={
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
            <SlidersHorizontal className="w-4 h-4" />
            Filters {isFiltered && <span className="w-2 h-2 bg-blue-500 rounded-full ml-1" />}
          </button>
        }
      />

      {/* Filter panel */}
      {showFilters && (
        <div className="card border-blue-100 bg-blue-50/40">
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="label text-xs">Specialization</label>
              <select value={filters.specialization}
                onChange={e => setFilters({ ...filters, specialization: e.target.value })}
                className="input text-sm">
                <option value="">All Specializations</option>
                {specializations.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Doctor Name</label>
              <input value={filters.name}
                onChange={e => setFilters({ ...filters, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name…" className="input text-sm" />
            </div>
            <div>
              <label className="label text-xs">Max Fee (₹)</label>
              <input type="number" value={filters.maxFee}
                onChange={e => setFilters({ ...filters, maxFee: e.target.value })}
                placeholder="e.g. 800" className="input text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSearch} className="btn-primary">
              <Search className="w-4 h-4" />Search
            </button>
            {isFiltered && (
              <button onClick={clearFilters} className="btn-secondary text-slate-500">
                <X className="w-4 h-4" />Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Specialization quick-filter chips */}
      {!showFilters && (
        <div className="flex gap-2 flex-wrap">
          {['All', ...specializations.slice(0, 8)].map(s => (
            <button key={s}
              onClick={async () => {
                const spec = s === 'All' ? '' : s
                setFilters(f => ({ ...f, specialization: spec }))
                setLoading(true)
                const { data } = await doctorApi.search({ specialization: spec || undefined })
                setDoctors(data.data || [])
                setLoading(false)
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                (s === 'All' && !applied.specialization) || applied.specialization === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
              }`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? <LoadingSpinner /> : doctors.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No doctors found"
          subtitle="Try adjusting your filters"
          action={<button onClick={clearFilters} className="btn-secondary">Clear Filters</button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {doctors.map(doc => (
            <DoctorCard key={doc.id} doctor={doc} action={
              <div className="flex gap-2 mt-3">
                <button onClick={() => navigate(`/patient/book?doctorId=${doc.id}`)}
                  className="btn-primary text-sm flex-1">
                  Book Appointment
                </button>
                <button onClick={() => navigate(`/patient/symptom-checker`)}
                  className="btn-secondary text-sm px-3" title="Check symptoms first">
                  <Star className="w-4 h-4 text-yellow-400" />
                </button>
              </div>
            } />
          ))}
        </div>
      )}
    </div>
  )
}
