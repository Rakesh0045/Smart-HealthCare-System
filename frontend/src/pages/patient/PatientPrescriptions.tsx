import { useEffect, useState } from 'react'
import { prescriptionApi } from '../../api'
import { PageHeader, EmptyState, LoadingSpinner } from '../../components/common'
import { FileText, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<number|null>(null)

  useEffect(() => {
    prescriptionApi.getMy().then(r => setPrescriptions(r.data.data || [])).finally(() => setLoading(false))
  }, [])

  const handleDownload = async (id: number) => {
    setDownloading(id)
    try {
      const res = await prescriptionApi.downloadPdf(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type:'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = `prescription-${id}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Prescription downloaded!')
    } finally { setDownloading(null) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader title="My Prescriptions" subtitle={`${prescriptions.length} prescriptions`} />
      {prescriptions.length === 0 ? (
        <EmptyState icon={FileText} title="No prescriptions yet" subtitle="Your prescriptions will appear here after consultations" />
      ) : (
        <div className="grid gap-4">
          {prescriptions.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Dr. {p.doctorName}</p>
                      <p className="text-xs text-blue-600">{p.doctorSpecialization}</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs font-medium text-amber-800">Diagnosis:</p>
                    <p className="text-sm text-amber-900">{p.diagnosis}</p>
                  </div>
                  {p.medicines?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-500">Medicines ({p.medicines.length})</p>
                      {p.medicines.map((m: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 bg-slate-50 rounded-lg p-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">{i+1}</div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{m.medicineName} {m.dosage && `(${m.dosage})`}</p>
                            <p className="text-[10px] text-slate-500">{m.frequency} • {m.duration}</p>
                            {m.instructions && <p className="text-[10px] text-slate-400 italic">{m.instructions}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {p.followUpDate && (
                    <p className="text-xs text-emerald-600 font-medium mt-2">📅 Follow-up: {new Date(p.followUpDate).toLocaleDateString('en-IN')}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{new Date(p.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</p>
                </div>
                <button onClick={() => handleDownload(p.id)} disabled={downloading === p.id}
                  className="btn-secondary text-sm flex-shrink-0">
                  <Download className="w-4 h-4" />
                  {downloading === p.id ? 'Downloading...' : 'Download PDF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
