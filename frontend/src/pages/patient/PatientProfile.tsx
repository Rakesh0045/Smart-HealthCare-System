import { useEffect, useState } from 'react'
import { patientApi } from '../../api'
import { PageHeader, LoadingSpinner } from '../../components/common'
import { User, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

export default function PatientProfile() {
  const { user } = useAuthStore()
  const [form, setForm] = useState({ dateOfBirth:'', bloodGroup:'', address:'', gender:'', allergies:'', emergencyContact:'', emergencyContactName:'' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const up = (k: string, v: string) => setForm(f => ({...f, [k]: v}))

  useEffect(() => {
    patientApi.getProfile().then(r => {
      const d = r.data.data
      if (d) setForm({ dateOfBirth: d.dateOfBirth || '', bloodGroup: d.bloodGroup || '', address: d.address || '', gender: d.gender || '', allergies: d.allergies || '', emergencyContact: d.emergencyContact || '', emergencyContactName: d.emergencyContactName || '' })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await patientApi.updateProfile(form)
      toast.success('Profile updated!')
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />
  const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle="Manage your health information" />
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] items-start">
        <div className="card text-center py-7">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <h2 className="font-bold text-xl text-slate-900">{user?.name}</h2>
          <p className="text-slate-500 text-sm">{user?.email}</p>
          <span className="badge bg-blue-50 text-blue-700 border border-blue-200 mt-2">Patient</span>
        </div>

        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><User className="w-4 h-4"/>Personal Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label:'Date of Birth', key:'dateOfBirth', type:'date' },
              { label:'Gender', key:'gender', type:'select', opts:['MALE','FEMALE','OTHER'] },
              { label:'Blood Group', key:'bloodGroup', type:'select', opts: bloodGroups },
              { label:'Emergency Contact Number', key:'emergencyContact', type:'text' },
              { label:'Emergency Contact Name', key:'emergencyContactName', type:'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                {f.type === 'select' ? (
                  <select value={(form as any)[f.key]} onChange={e => up(f.key, e.target.value)} className="input">
                    <option value="">Select...</option>
                    {f.opts?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => up(f.key, e.target.value)} className="input" />
                )}
              </div>
            ))}
          </div>
          <div>
            <label className="label">Address</label>
            <textarea value={form.address} onChange={e => up('address', e.target.value)} rows={2} className="input resize-none" />
          </div>
          <div>
            <label className="label">Known Allergies</label>
            <textarea value={form.allergies} onChange={e => up('allergies', e.target.value)} rows={2} placeholder="e.g., Penicillin, Peanuts..." className="input resize-none" />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full sm:w-auto">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}