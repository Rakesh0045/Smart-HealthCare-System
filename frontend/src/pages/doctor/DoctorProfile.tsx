import { useEffect, useState } from 'react'
import { doctorApi } from '../../api'
import { PageHeader, LoadingSpinner } from '../../components/common'
import { Save, Stethoscope, User, Award, Building2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const SPECIALIZATIONS = ['Cardiology','Neurology','General Medicine','Dermatology','Orthopedics',
  'Gastroenterology','Ophthalmology','ENT','Endocrinology','Psychiatry',
  'Gynecology','Urology','Pediatrics','Oncology','Dentistry','Pulmonology']

export default function DoctorProfile() {
  const [form, setForm] = useState({ specialization:'',experience:'',consultationFee:'',bio:'',qualification:'',hospital:'',slotDuration:'30' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    doctorApi.getMyProfile().then(r => {
      const d = r.data.data
      if (d) setForm({ specialization:d.specialization||'', experience:d.experience||'', consultationFee:d.consultationFee||'', bio:d.bio||'', qualification:d.qualification||'', hospital:d.hospital||'', slotDuration:d.slotDuration||'30' })
    }).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  const u = (k: string, v: string) => setForm(f => ({...f, [k]: v}))

  const handleSave = async () => {
    if (!form.specialization || !form.experience || !form.consultationFee) { toast.error('Fill required fields'); return }
    setSaving(true)
    try {
      await doctorApi.updateProfile({ ...form, experience: parseInt(form.experience), consultationFee: parseFloat(form.consultationFee), slotDuration: parseInt(form.slotDuration) })
      toast.success('Profile updated!')
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .doc-profile * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .teal-input {
          display: block; width: 100%; box-sizing: border-box;
          padding: 10px 14px;
          border-radius: 12px; border: 1.5px solid #ccfbf1;
          background: #fff; color: #0f172a; font-size: 14px;
          transition: all 0.2s; outline: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .teal-input:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
        .teal-input::placeholder { color: #94a3b8; }
        .teal-label { display:block; font-size:12px; font-weight:700; color:#0d9488; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.04em; }
        .save-btn {
          background: linear-gradient(135deg, #0d9488, #0891b2);
          color: white; border: none; border-radius: 12px;
          padding: 11px 28px; font-size: 14px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; gap: 8px;
          transition: all 0.2s; min-width: 150px; justify-content: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .save-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(13,148,136,0.25); }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .info-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-radius: 14px;
          background: #f0fdfa; border: 1.5px solid #ccfbf1;
        }
      `}</style>

      <div className="doc-profile space-y-6">
        {/* Header */}
        <div className="rounded-2xl p-6 text-white"
          style={{ background: 'linear-gradient(130deg,#0d9488 0%,#0891b2 60%,#1e40af 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-0.5">Doctor Portal</p>
              <h1 className="text-xl font-bold text-white">Doctor Profile</h1>
              <p className="text-teal-200 text-sm">Update your professional information</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] items-start">

          {/* Side card */}
          <div className="rounded-2xl p-6 space-y-4" style={{ background: '#f0fdfa', border: '1.5px solid #99f6e4' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}>
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Professional Details</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Keep these details accurate for better patient trust and booking quality.
              </p>
            </div>
            <div className="space-y-2">
              {[
                { icon: User,      label: 'Profile Info' },
                { icon: Award,     label: 'Qualifications' },
                { icon: Building2, label: 'Hospital Details' },
                { icon: Clock,     label: 'Slot Timing' },
              ].map(item => (
                <div key={item.label} className="info-chip">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}>
                    <item.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-teal-800">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 text-xs font-semibold text-teal-700"
              style={{ background: '#ccfbf1', border: '1px solid #5eead4' }}>
              Fields marked * are required.
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl p-6 space-y-5 bg-white" style={{ border: '1.5px solid #e6f7f5' }}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="teal-label">Specialization *</label>
                <select value={form.specialization} onChange={e => u('specialization', e.target.value)} className="teal-input">
                  <option value="">Select specialization</option>
                  {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="teal-label">Experience (years) *</label>
                <input type="number" min="0" max="60" value={form.experience}
                  onChange={e => u('experience', e.target.value)} className="teal-input" placeholder="e.g. 5" />
              </div>
              <div>
                <label className="teal-label">Consultation Fee (₹) *</label>
                <input type="number" min="0" value={form.consultationFee}
                  onChange={e => u('consultationFee', e.target.value)} className="teal-input" placeholder="e.g. 500" />
              </div>
              <div>
                <label className="teal-label">Qualification</label>
                <input value={form.qualification} onChange={e => u('qualification', e.target.value)}
                  className="teal-input" placeholder="MBBS, MD, etc." />
              </div>
              <div>
                <label className="teal-label">Hospital / Clinic</label>
                <input value={form.hospital} onChange={e => u('hospital', e.target.value)}
                  className="teal-input" placeholder="Hospital name" />
              </div>
              <div>
                <label className="teal-label">Slot Duration (minutes)</label>
                <select value={form.slotDuration} onChange={e => u('slotDuration', e.target.value)} className="teal-input">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="teal-label">Bio / About</label>
                <textarea value={form.bio} onChange={e => u('bio', e.target.value)}
                  rows={3} className="teal-input resize-none"
                  placeholder="Write a short professional bio..." />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={handleSave} disabled={saving} className="save-btn">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}