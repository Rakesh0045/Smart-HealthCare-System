import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { patientApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import {
  User, Save, Calendar, Droplets, MapPin, Phone,
  AlertCircle, CheckCircle2, Heart, Shield, ChevronDown,
  Edit3, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = ['MALE', 'FEMALE', 'OTHER']

const BLOOD_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'A+':  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  'A-':  { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  'B+':  { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'B-':  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'AB+': { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  'AB-': { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  'O+':  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'O-':  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
function calcAge(dob: string) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

/* ─── Custom select ──────────────────────────────────────── */
function CustomSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void
  options: string[]; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8,
          border: `1.5px solid ${open ? '#93c5fd' : '#e5e7eb'}`,
          background: open ? '#fff' : '#f8fafc', color: value ? '#0f172a' : '#94a3b8',
          fontSize: 13, fontWeight: value ? 500 : 400, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'all 0.14s ease',
          boxShadow: open ? '0 0 0 3px rgba(37,99,235,0.07)' : 'none',
          fontFamily: 'inherit',
        }}>
        <span>{value || placeholder}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={14} style={{ color: '#94a3b8' }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
              background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
              boxShadow: '0 8px 24px rgba(15,23,42,0.1)', overflow: 'hidden',
            }}>
            {options.map(opt => (
              <div key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                style={{
                  padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                  color: value === opt ? '#2563eb' : '#334155',
                  fontWeight: value === opt ? 600 : 400,
                  background: value === opt ? '#eff6ff' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (value !== opt) (e.target as HTMLElement).style.background = '#f8fafc' }}
                onMouseLeave={e => { if (value !== opt) (e.target as HTMLElement).style.background = 'transparent' }}>
                {opt}
                {value === opt && <CheckCircle2 size={13} style={{ color: '#2563eb' }} />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Field component ────────────────────────────────────── */
function Field({ label, icon: Icon, accent = '#2563eb', children }: {
  label: string; icon: any; accent?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>
        <Icon size={10} style={{ color: accent }} />{label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid #e5e7eb', background: '#f8fafc',
  color: '#0f172a', fontSize: 13, outline: 'none',
  transition: 'all 0.14s ease', fontFamily: 'inherit',
  boxSizing: 'border-box',
}

/* ═══════════════════════════════════════════════════════════ */
export default function PatientProfile() {
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    dateOfBirth: '', bloodGroup: '', address: '',
    gender: '', allergies: '', emergencyContact: '', emergencyContactName: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changed, setChanged] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const up = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setChanged(true)
  }

  useEffect(() => {
    patientApi.getProfile().then(r => {
      const d = r.data.data
      if (d) setForm({
        dateOfBirth: d.dateOfBirth || '', bloodGroup: d.bloodGroup || '',
        address: d.address || '', gender: d.gender || '',
        allergies: d.allergies || '', emergencyContact: d.emergencyContact || '',
        emergencyContactName: d.emergencyContactName || '',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await patientApi.updateProfile(form)
      toast.success('Profile updated!')
      setChanged(false)
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  const age = calcAge(form.dateOfBirth)
  const bloodCfg = form.bloodGroup ? BLOOD_COLORS[form.bloodGroup] : null
  const initials = (user?.name || 'P').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  /* Profile completeness */
  const fields = ['dateOfBirth', 'bloodGroup', 'address', 'gender', 'allergies', 'emergencyContact', 'emergencyContactName']
  const filled = fields.filter(f => !!(form as any)[f]).length
  const pct = Math.round((filled / fields.length) * 100)

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { font-family: 'Geist', system-ui, sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .profile-input:focus { border-color:#93c5fd !important; box-shadow:0 0 0 3px rgba(37,99,235,0.07) !important; background:#fff !important; }
        .profile-input:hover { border-color:#cbd5e1 !important; }
        .save-btn:hover:not(:disabled) { box-shadow:0 6px 18px rgba(37,99,235,0.32) !important; transform:scale(1.02); }
        .save-btn:active:not(:disabled) { transform:scale(0.97); }
        .save-btn { transition: all 0.15s ease; }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div style={S.header}
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <div>
          <p style={S.eyebrow}>Account</p>
          <h1 style={S.title}>My Profile</h1>
          <p style={S.subtitle}>Manage your personal health information</p>
        </div>

        <AnimatePresence>
          {changed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: '#d97706', fontWeight: 600, background: '#fffbeb', border: '1px solid #fde68a', padding: '5px 12px', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertCircle size={12} /> Unsaved changes
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div style={S.layout}>

        {/* ── Left column: identity card ────────────────────── */}
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 }}>

          {/* Avatar card */}
          <div style={S.card}>
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={S.avatarWrap}>
                <div style={S.avatar}>{initials}</div>
                <div style={S.avatarBadge}><Edit3 size={10} /></div>
              </div>
              <h2 style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', margin: '12px 0 3px', letterSpacing: '-0.02em' }}>
                {user?.name}
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{user?.email}</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '4px 12px', borderRadius: 999, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>
                <Shield size={11} /> Patient
              </div>
            </div>

            <div style={S.divider} />

            {/* Quick stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {form.bloodGroup && bloodCfg && (
                <div style={S.infoRow}>
                  <div style={{ ...S.infoIcon, background: bloodCfg.bg, color: bloodCfg.color }}>
                    <Droplets size={13} />
                  </div>
                  <div>
                    <p style={S.infoLabel}>Blood Group</p>
                    <span style={{ fontSize: 14, fontWeight: 800, color: bloodCfg.color }}>{form.bloodGroup}</span>
                  </div>
                </div>
              )}
              {form.dateOfBirth && (
                <div style={S.infoRow}>
                  <div style={{ ...S.infoIcon, background: '#f0fdf4', color: '#16a34a' }}>
                    <Calendar size={13} />
                  </div>
                  <div>
                    <p style={S.infoLabel}>Date of Birth</p>
                    <p style={S.infoVal}>{fmtDate(form.dateOfBirth)}{age !== null && <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}> · {age} yrs</span>}</p>
                  </div>
                </div>
              )}
              {form.gender && (
                <div style={S.infoRow}>
                  <div style={{ ...S.infoIcon, background: '#f5f3ff', color: '#7c3aed' }}>
                    <User size={13} />
                  </div>
                  <div>
                    <p style={S.infoLabel}>Gender</p>
                    <p style={S.infoVal}>{form.gender.charAt(0) + form.gender.slice(1).toLowerCase()}</p>
                  </div>
                </div>
              )}
              {form.emergencyContact && (
                <div style={S.infoRow}>
                  <div style={{ ...S.infoIcon, background: '#fef2f2', color: '#dc2626' }}>
                    <Phone size={13} />
                  </div>
                  <div>
                    <p style={S.infoLabel}>Emergency Contact</p>
                    <p style={S.infoVal}>{form.emergencyContactName || 'Contact'}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{form.emergencyContact}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Completeness card */}
          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#334155' }}>Profile Completeness</p>
              <span style={{ fontSize: 13, fontWeight: 800, color: pct === 100 ? '#16a34a' : '#2563eb' }}>{pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: '100%', borderRadius: 999, background: pct === 100 ? '#16a34a' : 'linear-gradient(90deg,#2563eb,#7c3aed)' }} />
            </div>
            {pct < 100 && (
              <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#94a3b8' }}>
                {fields.length - filled} field{fields.length - filled !== 1 ? 's' : ''} remaining
              </p>
            )}
            {pct === 100 && (
              <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={11} /> Profile complete
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Right column: form ───────────────────────────── */}
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}>

          {/* Personal info */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={{ ...S.cardIcon, background: '#eff6ff', color: '#2563eb' }}>
                <User size={14} />
              </div>
              <h3 style={S.cardTitle}>Personal Information</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
              <Field label="Date of Birth" icon={Calendar} accent="#16a34a">
                <input
                  type="date"
                  className="profile-input"
                  style={inputStyle}
                  value={form.dateOfBirth}
                  onChange={e => up('dateOfBirth', e.target.value)}
                />
              </Field>

              <Field label="Gender" icon={User} accent="#7c3aed">
                <CustomSelect
                  value={form.gender}
                  onChange={v => up('gender', v)}
                  options={GENDERS}
                  placeholder="Select gender…"
                />
              </Field>

              <Field label="Blood Group" icon={Droplets} accent="#dc2626">
                <CustomSelect
                  value={form.bloodGroup}
                  onChange={v => up('bloodGroup', v)}
                  options={BLOOD_GROUPS}
                  placeholder="Select blood group…"
                />
              </Field>
            </div>

            <Field label="Address" icon={MapPin} accent="#0891b2">
              <textarea
                className="profile-input"
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                rows={2}
                value={form.address}
                onChange={e => up('address', e.target.value)}
                placeholder="Your home address…"
              />
            </Field>
          </div>

          {/* Medical info */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={{ ...S.cardIcon, background: '#fef2f2', color: '#dc2626' }}>
                <Heart size={14} />
              </div>
              <h3 style={S.cardTitle}>Medical Information</h3>
            </div>

            <Field label="Known Allergies" icon={AlertCircle} accent="#d97706">
              <textarea
                className="profile-input"
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                rows={3}
                value={form.allergies}
                onChange={e => up('allergies', e.target.value)}
                placeholder="e.g., Penicillin, Peanuts, Latex… (leave blank if none)"
              />
              {form.allergies && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {form.allergies.split(',').map(a => a.trim()).filter(Boolean).map(a => (
                    <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                      <AlertCircle size={9} />{a}
                    </span>
                  ))}
                </motion.div>
              )}
            </Field>
          </div>

          {/* Emergency contact */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={{ ...S.cardIcon, background: '#fef2f2', color: '#dc2626' }}>
                <Phone size={14} />
              </div>
              <h3 style={S.cardTitle}>Emergency Contact</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
              <Field label="Contact Name" icon={User} accent="#dc2626">
                <input
                  type="text"
                  className="profile-input"
                  style={inputStyle}
                  value={form.emergencyContactName}
                  onChange={e => up('emergencyContactName', e.target.value)}
                  placeholder="Full name…"
                />
              </Field>
              <Field label="Phone Number" icon={Phone} accent="#dc2626">
                <input
                  type="text"
                  className="profile-input"
                  style={inputStyle}
                  value={form.emergencyContact}
                  onChange={e => up('emergencyContact', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </Field>
            </div>
          </div>

          {/* Save button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
            {changed && (
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ padding: '9px 16px', borderRadius: 9, background: '#f8fafc', border: '1.5px solid #e5e7eb', fontSize: 13, fontWeight: 500, color: '#64748b', cursor: 'pointer' }}
                onClick={() => { setChanged(false); setForm(f => f) }}>
                <X size={13} style={{ display: 'inline', marginRight: 5 }} />Discard
              </motion.button>
            )}
            <motion.button
              className="save-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '10px 22px', borderRadius: 9,
                background: changed ? '#2563eb' : '#94a3b8',
                color: '#fff', border: 'none',
                fontSize: 13.5, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                boxShadow: changed ? '0 3px 12px rgba(37,99,235,0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
              whileHover={changed && !saving ? { scale: 1.02 } : {}}
              whileTap={changed && !saving ? { scale: 0.97 } : {}}
              onClick={handleSave}
              disabled={saving || !changed}>
              {saving
                ? <><span style={S.spinner} />Saving…</>
                : <><Save size={14} />Save Profile</>}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/* ─── Styles ──────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  page: {
    padding: '1.75rem',
    maxWidth: 1100, margin: '0 auto',
    display: 'flex', flexDirection: 'column', gap: 16, minHeight: '100%',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', flexWrap: 'wrap', gap: 12,
  },
  eyebrow: { fontSize: 10.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 3px' },
  title:   { fontSize: 'clamp(1.25rem,2.5vw,1.65rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.1 },
  subtitle:{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0', fontWeight: 400 },
  layout: {
    display: 'grid',
    gridTemplateColumns: '280px minmax(0,1fr)',
    gap: 14, alignItems: 'start',
  },
  card: {
    background: '#fff', borderRadius: 12,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    padding: '20px',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    paddingBottom: 4,
  },
  cardIcon: {
    width: 30, height: 30, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' },
  divider: { height: 1, background: '#f1f5f9', margin: '0 -20px' },
  avatarWrap: { position: 'relative', display: 'inline-block', marginBottom: 2 },
  avatar: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 26, fontWeight: 800,
    boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
    margin: '0 auto',
  },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: -2,
    width: 22, height: 22, borderRadius: '50%',
    background: '#fff', border: '2px solid #f1f5f9',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#64748b', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  infoRow: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '8px 10px', borderRadius: 9,
    background: '#fafafa', border: '1px solid #f1f5f9',
  },
  infoIcon: {
    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' },
  infoVal:   { fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 },
  spinner: {
    display: 'block', width: 13, height: 13, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
  },
}