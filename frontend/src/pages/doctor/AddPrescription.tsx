import { useState, useEffect } from 'react'
import { prescriptionApi, appointmentApi } from '../../api'
import { PageHeader, LoadingSpinner, AppointmentCard, EmptyState } from '../../components/common'
import { Plus, Trash2, Save, FileText, CheckCircle, Stethoscope } from 'lucide-react'
import toast from 'react-hot-toast'

const blankMed = () => ({ medicineName:'',dosage:'',frequency:'',duration:'',instructions:'',type:'Tablet' })
const MED_TYPES = ['Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler','Powder']
const FREQS = ['Once a day','Twice a day','Thrice a day','Before meals','After meals','At bedtime','As needed']

export default function AddPrescription() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<any>(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [medicines, setMedicines] = useState([blankMed()])
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    appointmentApi.getMy().then(r => {
      const completed = (r.data.data || []).filter((a: any) => a.status === 'COMPLETED' && !a.hasPrescription)
      setAppointments(completed)
    }).finally(() => setLoading(false))
  }, [])

  const updateMed = (i: number, k: string, v: string) =>
    setMedicines(m => m.map((med, idx) => idx === i ? { ...med, [k]: v } : med))

  const handleSubmit = async () => {
    if (!selectedAppt) { toast.error('Select an appointment'); return }
    if (!diagnosis.trim()) { toast.error('Diagnosis required'); return }
    setSaving(true)
    try {
      await prescriptionApi.add({
        appointmentId: selectedAppt.id,
        diagnosis, medicines: medicines.filter(m => m.medicineName.trim()),
        additionalNotes, followUpDate: followUpDate || null
      })
      toast.success('Prescription added successfully!')
      setSelectedAppt(null); setDiagnosis(''); setMedicines([blankMed()]); setAdditionalNotes(''); setFollowUpDate('')
      appointmentApi.getMy().then(r => setAppointments((r.data.data||[]).filter((a:any)=>a.status==='COMPLETED'&&!a.hasPrescription)))
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .rx-panel * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .rx-input {
          display: block; width: 100%; box-sizing: border-box;
          padding:9px 13px; border-radius:11px;
          border:1.5px solid #ccfbf1; background:#fff;
          color:#0f172a; font-size:13px; outline:none; transition:all 0.15s;
          font-family:'Plus Jakarta Sans',sans-serif;
        }
        .rx-input:focus { border-color:#0d9488; box-shadow:0 0 0 3px rgba(13,148,136,0.1); }
        .rx-input::placeholder { color:#94a3b8; }
        .rx-label { display:block; font-size:11px; font-weight:700; color:#0d9488; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.04em; }
        .rx-save-btn {
          background:linear-gradient(135deg,#0d9488,#0891b2);
          color:white; border:none; border-radius:12px;
          padding:11px 24px; font-size:13px; font-weight:700;
          cursor:pointer; display:flex; align-items:center; gap:8px;
          transition:all 0.2s; flex:1; justify-content:center;
          font-family:'Plus Jakarta Sans',sans-serif;
        }
        .rx-save-btn:hover { opacity:0.9; transform:translateY(-1px); box-shadow:0 6px 20px rgba(13,148,136,0.25); }
        .rx-save-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .add-med-btn {
          background:#f0fdfa; color:#0d9488; border:1.5px solid #5eead4;
          border-radius:10px; padding:7px 14px; font-size:12px; font-weight:700;
          cursor:pointer; display:flex; align-items:center; gap:6px;
          transition:all 0.15s; font-family:'Plus Jakarta Sans',sans-serif;
        }
        .add-med-btn:hover { background:#ccfbf1; }
        .select-card {
          border:1.5px solid #e6f7f5; border-radius:18px;
          background:#fff; cursor:pointer; transition:all 0.2s;
          overflow:hidden;
        }
        .select-card:hover { border-color:#0d9488; box-shadow:0 4px 16px rgba(13,148,136,0.12); transform:translateY(-1px); }
        .med-card { background:#f0fdfa; border:1.5px solid #ccfbf1; border-radius:16px; padding:16px; }
      `}</style>

      <div className="rx-panel space-y-6">
        {/* Header */}
        <div className="rounded-2xl p-6 text-white"
          style={{ background: 'linear-gradient(130deg,#0d9488 0%,#0891b2 60%,#1e40af 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-0.5">Doctor Portal</p>
              <h1 className="text-xl font-bold text-white">Write Prescription</h1>
              <p className="text-teal-200 text-sm">Add prescriptions for completed appointments</p>
            </div>
          </div>
        </div>

        {!selectedAppt ? (
          <div>
            <p className="text-sm font-bold text-teal-700 mb-3 uppercase tracking-wide">Select a completed appointment:</p>
            {appointments.length === 0
              ? <EmptyState icon={CheckCircle} title="No pending prescriptions"
                  subtitle="All completed appointments have prescriptions." />
              : <div className="space-y-3">
                  {appointments.map(a => (
                    <div key={a.id} className="select-card" onClick={() => setSelectedAppt(a)}>
                      <AppointmentCard appointment={a} role="DOCTOR" actions={
                        <button className="rx-save-btn" style={{ flex: 'none', padding: '7px 16px' }}>
                          <FileText className="w-3 h-3" />Write Rx
                        </button>
                      } />
                    </div>
                  ))}
                </div>
            }
          </div>
        ) : (
          <div className="space-y-5">
            {/* Selected patient banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl"
              style={{ background: '#f0fdfa', border: '1.5px solid #5eead4' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}>
                  {selectedAppt.patientName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-teal-800">
                    Writing for: <strong>{selectedAppt.patientName}</strong>
                  </p>
                  <p className="text-xs text-teal-600">{selectedAppt.appointmentDate}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAppt(null)}
                className="text-xs text-teal-600 font-bold underline hover:text-teal-800">
                Change
              </button>
            </div>

            {/* Form */}
            <div className="bg-white rounded-2xl p-6 space-y-5" style={{ border: '1.5px solid #e6f7f5' }}>
              <div>
                <label className="rx-label">Diagnosis *</label>
                <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                  rows={2} className="rx-input resize-none" placeholder="Enter primary diagnosis…" />
              </div>

              {/* Medicines */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="rx-label mb-0">Medicines</label>
                  <button onClick={() => setMedicines(m => [...m, blankMed()])} className="add-med-btn">
                    <Plus className="w-3.5 h-3.5" />Add Medicine
                  </button>
                </div>
                <div className="space-y-4">
                  {medicines.map((med, i) => (
                    <div key={i} className="med-card">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full">
                          Medicine {i + 1}
                        </span>
                        {medicines.length > 1 && (
                          <button onClick={() => setMedicines(m => m.filter((_, idx) => idx !== i))}
                            className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div><label className="rx-label">Name *</label><input value={med.medicineName} onChange={e => updateMed(i,'medicineName',e.target.value)} className="rx-input" placeholder="e.g. Paracetamol" /></div>
                        <div><label className="rx-label">Type</label><select value={med.type} onChange={e => updateMed(i,'type',e.target.value)} className="rx-input">{MED_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                        <div><label className="rx-label">Dosage</label><input value={med.dosage} onChange={e => updateMed(i,'dosage',e.target.value)} className="rx-input" placeholder="500mg" /></div>
                        <div><label className="rx-label">Frequency</label><select value={med.frequency} onChange={e => updateMed(i,'frequency',e.target.value)} className="rx-input"><option value="">Select…</option>{FREQS.map(f => <option key={f}>{f}</option>)}</select></div>
                        <div><label className="rx-label">Duration</label><input value={med.duration} onChange={e => updateMed(i,'duration',e.target.value)} className="rx-input" placeholder="5 days" /></div>
                        <div><label className="rx-label">Instructions</label><input value={med.instructions} onChange={e => updateMed(i,'instructions',e.target.value)} className="rx-input" placeholder="After meals" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="rx-label">Additional Notes</label>
                <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
                  rows={2} className="rx-input resize-none" placeholder="Rest advice, diet instructions…" />
              </div>

              <div>
                <label className="rx-label">Follow-up Date</label>
                <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} className="rx-input sm:max-w-xs" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setSelectedAppt(null)}
                  className="px-5 py-2.5 rounded-xl border-2 font-bold text-sm text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100 transition-all"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Back
                </button>
                <button onClick={handleSubmit} disabled={saving} className="rx-save-btn">
                  <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Prescription'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}