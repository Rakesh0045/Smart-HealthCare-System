import { useEffect, useState } from 'react'
import { doctorApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import { Save, Stethoscope, Award, Building2, Clock, Star, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

const generateAvatarUrl = (name?: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Doctor')}&background=0d9488&color=fff&bold=true&size=200`

const SPECIALIZATIONS = ['Cardiology','Neurology','General Medicine','Dermatology','Orthopedics',
  'Gastroenterology','Ophthalmology','ENT','Endocrinology','Psychiatry',
  'Gynecology','Urology','Pediatrics','Oncology','Dentistry','Pulmonology']

export default function DoctorProfile() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({ specialization:'',experience:'',consultationFee:'',bio:'',qualification:'',hospital:'',slotDuration:'30' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    doctorApi.getMyProfile().then(r => {
      const d = r.data.data
      if (d) setForm({ specialization:d.specialization||'', experience:String(d.experience||''), consultationFee:String(d.consultationFee||''), bio:d.bio||'', qualification:d.qualification||'', hospital:d.hospital||'', slotDuration:String(d.slotDuration||'30') })
    }).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  const u = (k: string, v: string) => setForm(f => ({...f, [k]: v}))


  const handleSave = async () => {
    if (!form.specialization || !form.experience || !form.consultationFee) { toast.error('Fill required fields'); return }
    setSaving(true)
    try {
      const profileData = { ...form, experience: parseInt(form.experience), consultationFee: parseFloat(form.consultationFee), slotDuration: parseInt(form.slotDuration) }
      await doctorApi.updateProfile(profileData)
      updateUser({ profileComplete: true })
      toast.success('Profile updated!')
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .prof-page { font-family: 'Sora', sans-serif; }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(16px); } to { opacity:1;transform:translateY(0); } }

        .pv-card {
          background: white; border-radius: 16px;
          border: 1px solid #f0fdf4;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(13,148,136,0.04);
          animation: fadeSlide 0.4s ease both;
        }
        .prof-input {
          width: 100%; padding: 12px 16px;
          border-radius: 12px; border: 1.5px solid #e6f7f5;
          background: #fafffe; color: #0f172a;
          font-size: 13px; font-family: 'Sora', sans-serif;
          outline: none; transition: all 0.2s;
          box-sizing: border-box;
        }
        .prof-input:focus { border-color: #0d9488; background: white; box-shadow: 0 0 0 3px rgba(13,148,136,0.08); }
        .prof-input::placeholder { color: #94a3b8; }
        .prof-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.07em; display: block; margin-bottom: 8px; }
        .prof-label span { color: #ef4444; }
        .save-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 28px; border-radius: 12px;
          background: linear-gradient(135deg, #0d9488, #0891b2);
          color: white; border: none; font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s;
        }
        .save-btn:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,148,136,0.25); }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .stat-pill {
          text-align: center; padding: 16px 12px;
          border-radius: 14px; background: #f0fdfa;
          border: 1px solid #ccfbf1;
        }
      `}</style>

      <div className="prof-page" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28, animation: 'fadeSlide 0.4s ease both' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Doctor Portal</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 }}>My Profile</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Manage your professional information and settings</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

          {/* LEFT: Profile card */}
          <div>
            <div className="pv-card" style={{ padding: 24, textAlign: 'center', animationDelay: '0.05s' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                <img
                  src={generateAvatarUrl(user?.name)}
                  alt="Doctor"
                  style={{ width: 110, height: 110, borderRadius: 20, objectFit: 'cover', border: '3px solid #0d9488' }}
                />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                {user?.name ? `Dr. ${user.name}` : 'Your Name'}
              </h2>
              <p style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, margin: '0 0 12px' }}>
                {form.hospital || 'Your Hospital'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Star style={{ width: 14, height: 14, color: '#f59e0b', fill: '#f59e0b' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>4.8</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>(120 reviews)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                <div className="stat-pill">
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#0d9488', margin: '0 0 2px' }}>{form.experience || 0}</p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600 }}>Yrs Exp</p>
                </div>
                <div className="stat-pill">
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#7c3aed', margin: '0 0 2px' }}>₹{form.consultationFee || 0}</p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600 }}>Per Visit</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: Stethoscope, label: form.specialization || 'Specialization', color: '#0d9488' },
                  { icon: Award, label: form.qualification || 'Qualification', color: '#7c3aed' },
                  { icon: Building2, label: form.hospital || 'Hospital', color: '#f59e0b' },
                  { icon: Clock, label: `${form.slotDuration} min slots`, color: '#10b981' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#fafffe', border: '1px solid #f0fdf4', textAlign: 'left' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <item.icon style={{ width: 14, height: 14, color: item.color }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Form */}
          <div className="pv-card" style={{ padding: 28, animationDelay: '0.1s' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 20px', paddingBottom: 16, borderBottom: '1px solid #f0fdf4' }}>
              Professional Information
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="prof-label">Specialization <span>*</span></label>
                <select value={form.specialization} onChange={e => u('specialization', e.target.value)} className="prof-input">
                  <option value="">Select your specialization</option>
                  {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="prof-label">Experience (years) <span>*</span></label>
                <input type="number" min="0" max="60" value={form.experience}
                  onChange={e => u('experience', e.target.value)} className="prof-input" placeholder="e.g. 8" />
              </div>

              <div>
                <label className="prof-label">Consultation Fee (₹) <span>*</span></label>
                <input type="number" min="0" value={form.consultationFee}
                  onChange={e => u('consultationFee', e.target.value)} className="prof-input" placeholder="e.g. 500" />
              </div>

              <div>
                <label className="prof-label">Qualification</label>
                <input value={form.qualification} onChange={e => u('qualification', e.target.value)}
                  className="prof-input" placeholder="MBBS, MD, FRCP..." />
              </div>

              <div>
                <label className="prof-label">Hospital / Clinic</label>
                <input value={form.hospital} onChange={e => u('hospital', e.target.value)}
                  className="prof-input" placeholder="Hospital or clinic name" />
              </div>

              <div>
                <label className="prof-label">Appointment Slot Duration</label>
                <select value={form.slotDuration} onChange={e => u('slotDuration', e.target.value)} className="prof-input">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="prof-label">Professional Bio</label>
                <textarea value={form.bio} onChange={e => u('bio', e.target.value)}
                  rows={4} className="prof-input" style={{ resize: 'none' }}
                  placeholder="Tell patients about your expertise, approach to care, and specializations..." />
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: '#10b981' }} />
                All changes are saved automatically
              </div>
              <button onClick={handleSave} disabled={saving} className="save-btn">
                <Save style={{ width: 16, height: 16 }} />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
