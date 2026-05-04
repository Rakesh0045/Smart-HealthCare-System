// AddPrescription.tsx - ProvoHeal redesign
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { prescriptionApi, appointmentApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import { Plus, Trash2, Save, FileText, CheckCircle, ChevronRight, User, Stethoscope } from 'lucide-react'
import toast from 'react-hot-toast'

const generateAvatarUrl = (name?: string, size: number = 40) => 
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0d9488&color=fff&bold=true&size=${size}`

const blankMed = () => ({ medicineName:'',dosage:'',frequency:'',duration:'',instructions:'',type:'Tablet' })
const MED_TYPES = ['Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler','Powder']
const FREQS = ['Once a day','Twice a day','Thrice a day','Before meals','After meals','At bedtime','As needed']

const MED_TYPE_ICONS: Record<string, string> = { Tablet:'💊', Capsule:'💉', Syrup:'🥤', Injection:'💉', Cream:'🧴', Drops:'💧', Inhaler:'🫁', Powder:'⚗️' }

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
    if (!diagnosis.trim()) { toast.error('Diagnosis is required'); return }
    setSaving(true)
    try {
      await prescriptionApi.add({
        appointmentId: selectedAppt.id, diagnosis,
        medicines: medicines.filter(m => m.medicineName.trim()),
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
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .rx-page { font-family: 'Sora', sans-serif; }
        .rx-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(14px); } to { opacity:1;transform:translateY(0); } }

        .pv-card {
          background: white; border-radius: 16px;
          border: 1px solid #f0fdf4;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(13,148,136,0.04);
          animation: fadeSlide 0.4s ease both;
        }
        .rx-input {
          width: 100%; padding: 11px 14px;
          border-radius: 11px; border: 1.5px solid #e6f7f5;
          background: #fafffe; color: #0f172a; font-size: 13px;
          font-family: 'Sora', sans-serif; outline: none;
          transition: all 0.2s; box-sizing: border-box;
        }
        .rx-input:focus { border-color: #0d9488; background: white; box-shadow: 0 0 0 3px rgba(13,148,136,0.08); }
        .rx-input::placeholder { color: #94a3b8; }
        .rx-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.07em; display: block; margin-bottom: 7px; }
        .rx-label span { color: #ef4444; }

        .add-med-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 16px; border-radius: 10px;
          background: #f0fdfa; border: 1.5px solid #5eead4;
          color: #0d9488; font-size: 12px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.18s;
        }
        .add-med-btn:hover { background: #ccfbf1; }

        .save-rx-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 28px; border-radius: 12px;
          background: linear-gradient(135deg, #0d9488, #0891b2);
          color: white; border: none; font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s;
          flex: 1; justify-content: center;
        }
        .save-rx-btn:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,148,136,0.25); }
        .save-rx-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .appt-select-card {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 20px; border-radius: 14px;
          border: 1.5px solid #f0fdf4; background: white;
          cursor: pointer; transition: all 0.2s; animation: fadeSlide 0.4s ease both;
        }
        .appt-select-card:hover { border-color: #0d9488; box-shadow: 0 4px 20px rgba(13,148,136,0.12); transform: translateX(4px); }

        .med-card {
          background: #fafffe; border: 1.5px solid #f0fdf4;
          border-radius: 14px; padding: 18px; transition: border-color 0.2s;
          animation: fadeSlide 0.4s ease both;
        }
        .med-card:hover { border-color: #ccfbf1; }
      `}</style>

      <div className="rx-page" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28, animation: 'fadeSlide 0.4s ease both' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Doctor Portal</p>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 }}>Write Prescription</h1>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Add prescriptions for completed appointments</p>
            </div>
            <Link
              to="/doctor/prescriptions"
              style={{ fontSize: 13, fontWeight: 700, color: '#0d9488', textDecoration: 'none', paddingTop: 4 }}
            >
              ← All prescriptions
            </Link>
          </div>
        </div>

        {!selectedAppt ? (
          <div>
            {/* Instruction card */}
            <div style={{ padding: '16px 20px', borderRadius: 14, background: '#f0fdfa', border: '1px solid #ccfbf1', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeSlide 0.4s ease both' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0d9488, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText style={{ width: 18, height: 18, color: 'white' }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0d9488', margin: '0 0 2px' }}>Select a completed appointment</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Only completed appointments without a prescription are shown below</p>
              </div>
            </div>

            {appointments.length === 0 ? (
              <div className="pv-card" style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle style={{ width: 32, height: 32, color: '#10b981' }} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>All caught up!</p>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>All completed appointments have prescriptions.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {appointments.map((a, idx) => (
                  <div key={a.id} className="appt-select-card" onClick={() => setSelectedAppt(a)} style={{ animationDelay: `${idx * 0.05}s` }}>
                    <img
                      src={generateAvatarUrl(a.patientName, 46)}
                      alt={a.patientName}
                      style={{ width: 46, height: 46, borderRadius: 12, objectFit: 'cover', border: '1.5px solid #f0fdf4', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{a.patientName}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20 }}>Completed</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="rx-mono">{new Date(a.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span style={{ color: '#e2e8f0' }}>•</span>
                        <span className="rx-mono">{a.startTime?.slice(0,5)}</span>
                        {a.reason && <><span style={{ color: '#e2e8f0' }}>•</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</span></>}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: 'white', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        Write Rx
                      </div>
                      <ChevronRight style={{ width: 16, height: 16, color: '#0d9488' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>

            {/* Selected patient banner */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 14, background: '#f0fdfa', border: '1.5px solid #ccfbf1', animation: 'fadeSlide 0.4s ease both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={generateAvatarUrl(selectedAppt.patientName, 44)}
                  alt={selectedAppt.patientName}
                  style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', border: '2px solid #0d9488' }}
                />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>
                    Prescription for: <span style={{ color: '#0d9488' }}>{selectedAppt.patientName}</span>
                  </p>
                  <p className="rx-mono" style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                    {new Date(selectedAppt.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} • {selectedAppt.startTime?.slice(0,5)}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedAppt(null)} style={{ padding: '7px 14px', borderRadius: 8, background: 'white', border: '1.5px solid #e6f7f5', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                Change
              </button>
            </div>

            {/* Main form */}
            <div className="pv-card" style={{ padding: 28 }}>

              {/* Diagnosis */}
              <div style={{ marginBottom: 24 }}>
                <label className="rx-label">Diagnosis <span>*</span></label>
                <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                  rows={2} className="rx-input" style={{ resize: 'none' }} placeholder="Enter primary diagnosis..." />
              </div>

              {/* Medicines */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <label className="rx-label" style={{ margin: 0 }}>Medicines</label>
                  <button className="add-med-btn" onClick={() => setMedicines(m => [...m, blankMed()])}>
                    <Plus style={{ width: 14, height: 14 }} /> Add Medicine
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {medicines.map((med, i) => (
                    <div key={i} className="med-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{MED_TYPE_ICONS[med.type] || '💊'}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '3px 10px', borderRadius: 20 }}>
                            Medicine {i + 1}
                          </span>
                        </div>
                        {medicines.length > 1 && (
                          <button onClick={() => setMedicines(m => m.filter((_, idx) => idx !== i))}
                            style={{ width: 28, height: 28, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Trash2 style={{ width: 13, height: 13, color: '#ef4444' }} />
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr 2fr', gap: 12 }}>
                        <div>
                          <label className="rx-label">Name <span style={{ color: '#ef4444' }}>*</span></label>
                          <input value={med.medicineName} onChange={e => updateMed(i,'medicineName',e.target.value)} className="rx-input" placeholder="e.g. Paracetamol" />
                        </div>
                        <div>
                          <label className="rx-label">Type</label>
                          <select value={med.type} onChange={e => updateMed(i,'type',e.target.value)} className="rx-input">
                            {MED_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="rx-label">Frequency</label>
                          <select value={med.frequency} onChange={e => updateMed(i,'frequency',e.target.value)} className="rx-input">
                            <option value="">Select...</option>
                            {FREQS.map(f => <option key={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="rx-label">Dosage</label>
                          <input value={med.dosage} onChange={e => updateMed(i,'dosage',e.target.value)} className="rx-input" placeholder="500mg" />
                        </div>
                        <div>
                          <label className="rx-label">Duration</label>
                          <input value={med.duration} onChange={e => updateMed(i,'duration',e.target.value)} className="rx-input" placeholder="5 days" />
                        </div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <label className="rx-label">Special Instructions</label>
                        <input value={med.instructions} onChange={e => updateMed(i,'instructions',e.target.value)} className="rx-input" placeholder="e.g. Take after meals, avoid dairy..." />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
                <div>
                  <label className="rx-label">Additional Notes</label>
                  <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
                    rows={3} className="rx-input" style={{ resize: 'none' }} placeholder="Rest advice, diet, lifestyle recommendations..." />
                </div>
                <div>
                  <label className="rx-label">Follow-up Date</label>
                  <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]} className="rx-input" />
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                    Patient will be reminded about the follow-up appointment automatically.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, paddingTop: 20, borderTop: '1px solid #f0fdf4' }}>
                <button onClick={() => setSelectedAppt(null)}
                  style={{ padding: '12px 24px', borderRadius: 12, border: '1.5px solid #e6f7f5', background: 'white', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                  ← Back
                </button>
                <button className="save-rx-btn" onClick={handleSubmit} disabled={saving}>
                  <Save style={{ width: 16, height: 16 }} />
                  {saving ? 'Saving Prescription...' : 'Save Prescription'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}