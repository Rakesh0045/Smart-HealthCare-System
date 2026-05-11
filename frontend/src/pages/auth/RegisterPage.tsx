import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api'
import { Eye, EyeOff, ArrowRight, Heart, Stethoscope, User, Mail, Phone, Lock, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Animated Grid ────────────────────────────────────────────────────────────
function AnimatedGrid() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', inset: '-10%',
        backgroundImage: `
          linear-gradient(rgba(14,165,233,0.14) 1px, transparent 1px),
          linear-gradient(90deg, rgba(14,165,233,0.14) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
        animation: 'gridDrift 22s linear infinite',
        maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 35%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 35%, transparent 100%)',
      }} />
      <div style={{
        position: 'absolute', inset: '-10%',
        backgroundImage: `radial-gradient(circle 1.5px at center, rgba(56,189,248,0.5) 0%, transparent 100%)`,
        backgroundSize: '64px 64px',
        animation: 'gridDrift 22s linear infinite',
        maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 15%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 15%, transparent 75%)',
      }} />
    </div>
  )
}

// ─── OTP Modal ────────────────────────────────────────────────────────────────
function OtpModal({
  email,
  onVerify,
  onResend,
  onClose,
  verifying,
  resending,
}: {
  email: string
  onVerify: (otp: string) => void
  onResend: () => void
  onClose: () => void
  verifying: boolean
  resending: boolean
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [focused, setFocused] = useState<number | null>(null)
  const [shake, setShake] = useState(false)

  const handleChange = (i: number, val: string) => {
    const ch = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = ch
    setDigits(next)
    if (ch && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) inputRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...digits]
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    const lastFilled = Math.min(pasted.length, 5)
    inputRefs.current[lastFilled]?.focus()
  }

  const handleSubmit = () => {
    const otp = digits.join('')
    if (otp.length < 6) {
      setShake(true)
      setTimeout(() => setShake(false), 600)
      toast.error('Enter all 6 digits')
      return
    }
    onVerify(otp)
  }

  const filled = digits.filter(Boolean).length

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      background: 'rgba(3,8,15,0.85)',
      backdropFilter: 'blur(16px)',
      animation: 'fadeIn 0.25s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#ffffff',
        borderRadius: 24,
        padding: '2.5rem 2.25rem 2rem',
        position: 'relative',
        animation: 'modalUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 18, right: 18,
            width: 32, height: 32, borderRadius: '50%',
            background: '#f8fafc', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#94a3b8', transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8' }}
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 1.5rem',
          background: 'linear-gradient(145deg, rgba(14,165,233,0.12), rgba(14,165,233,0.04))',
          border: '1px solid rgba(14,165,233,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.85rem' }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.35rem', color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Check your email
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.65 }}>
            We sent a 6-digit verification code to<br />
            <strong style={{ color: '#475569' }}>{email}</strong>
          </p>
        </div>

        {/* 6 OTP boxes */}
        <div
          style={{
            display: 'flex', gap: '0.6rem', justifyContent: 'center',
            marginBottom: '1.75rem',
            animation: shake ? 'shake 0.5s ease' : 'none',
          }}
          onPaste={handlePaste}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused(null)}
              style={{
                width: 52, height: 60,
                textAlign: 'center',
                fontSize: '1.5rem', fontWeight: 800,
                fontFamily: "'Sora', sans-serif",
                color: d ? '#0f172a' : '#e2e8f0',
                borderRadius: 14,
                border: `2px solid ${
                  focused === i ? '#0ea5e9'
                  : d ? '#0ea5e9' + '60'
                  : '#e2e8f0'
                }`,
                background: focused === i ? '#f0f9ff' : d ? '#f8fbff' : '#fafafa',
                outline: 'none',
                transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: focused === i ? '0 0 0 3px rgba(14,165,233,0.12)' : 'none',
                caretColor: 'transparent',
              }}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: 2, background: '#f1f5f9', marginBottom: '1.75rem', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
            width: `${(filled / 6) * 100}%`,
            transition: 'width 0.2s ease',
          }} />
        </div>

        {/* Verify button */}
        <button
          onClick={handleSubmit}
          disabled={verifying || filled < 6}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '13px 24px', borderRadius: 12,
            background: verifying || filled < 6 ? '#e2e8f0' : '#0f172a',
            color: verifying || filled < 6 ? '#94a3b8' : '#fff',
            fontFamily: "'Sora', sans-serif", fontWeight: 700,
            fontSize: '0.875rem', letterSpacing: '-0.01em',
            border: 'none', cursor: verifying || filled < 6 ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease',
            marginBottom: '1rem',
            boxShadow: filled === 6 && !verifying ? '0 4px 16px rgba(15,23,42,0.18)' : 'none',
          }}
        >
          {verifying ? (
            <>
              <div style={{ width: 15, height: 15, border: '2px solid rgba(148,163,184,0.4)', borderTopColor: '#94a3b8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Verifying…
            </>
          ) : (
            <>Verify email <Check size={15} style={{ marginLeft: 2 }} /></>
          )}
        </button>

        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Didn't receive the code?{' '}</span>
          <button
            onClick={onResend}
            disabled={resending}
            style={{
              background: 'none', border: 'none', cursor: resending ? 'default' : 'pointer',
              color: resending ? '#94a3b8' : '#0ea5e9', fontWeight: 600, fontSize: '0.82rem',
              fontFamily: "'DM Sans', sans-serif", padding: 0,
            }}
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  )
}

// ─── Role Card ────────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'PATIENT', label: 'Patient', desc: 'Book appointments, view prescriptions', icon: User, color: '#0ea5e9' },
  { value: 'DOCTOR', label: 'Doctor', desc: 'Manage schedule, write prescriptions', icon: Stethoscope, color: '#10b981' },
]

const BENEFITS = [
  'Access to certified specialists',
  'Instant appointment booking',
  'Digital prescriptions & records',
  'Secure & private platform',
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'PATIENT' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { toast.error('Fill all required fields'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (form.phone && !/^\d{10}$/.test(form.phone)) { toast.error('Phone must be 10 digits'); return }
    setLoading(true)
    try {
      const { data } = await authApi.register(form)
      const d = data.data
      if (d.verificationRequired) {
        setVerificationEmail(form.email)
        toast.success('Verification code sent to your email')
        return
      }
      setAuth(
        { userId: d.userId, name: d.name, email: d.email, role: d.role, profileComplete: d.profileComplete },
        d.accessToken, d.refreshToken
      )
      toast.success(`Welcome to MediCare, ${d.name}!`)
      navigate(d.profileComplete ? `/${d.role.toLowerCase()}/dashboard` : `/${d.role.toLowerCase()}/profile`)
    } finally { setLoading(false) }
  }

  const handleVerify = async (otp: string) => {
    setVerifying(true)
    try {
      const { data } = await authApi.verifyEmail({ email: verificationEmail, otp })
      const d = data.data
      setAuth(
        { userId: d.userId, name: d.name, email: d.email, role: d.role, profileComplete: d.profileComplete },
        d.accessToken, d.refreshToken
      )
      toast.success('Email verified successfully!')
      navigate(d.profileComplete ? `/${d.role.toLowerCase()}/dashboard` : `/${d.role.toLowerCase()}/profile`)
    } finally { setVerifying(false) }
  }

  const handleResend = async () => {
    if (!verificationEmail) return
    setResending(true)
    try {
      await authApi.resendVerificationOtp(verificationEmail)
      toast.success('Verification code resent')
    } finally { setResending(false) }
  }

  const selectedRole = ROLES.find(r => r.value === form.role)!
  const pwdStrength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3
  const strengthMeta = [
    { label: '', color: '#e2e8f0' },
    { label: 'Weak', color: '#ef4444' },
    { label: 'Good', color: '#f59e0b' },
    { label: 'Strong', color: '#10b981' },
  ]

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 11, paddingBottom: 11,
    borderRadius: 12, fontSize: '0.875rem', color: '#0f172a',
    border: `1.5px solid ${focusedField === field ? '#0ea5e9' : '#e2e8f0'}`,
    background: focusedField === field ? '#fff' : '#fafafa',
    outline: 'none', transition: 'all 0.2s ease',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(14,165,233,0.08)' : 'none',
    fontFamily: "'DM Sans', sans-serif",
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif", background: '#03080f' }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes gridDrift { from { transform: translate(0,0); } to { transform: translate(64px,64px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-ring { 0% { transform:scale(1); opacity:0.7; } 100% { transform:scale(2); opacity:0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { transform:translateX(-100%); } 100% { transform:translateX(100%); } }
        * { box-sizing: border-box; }
        @media (min-width: 1024px) { .reg-left-panel { display: flex !important; } }
      `}</style>

      {/* OTP Modal */}
      {verificationEmail && (
        <OtpModal
          email={verificationEmail}
          onVerify={handleVerify}
          onResend={handleResend}
          onClose={() => setVerificationEmail('')}
          verifying={verifying}
          resending={resending}
        />
      )}

      {/* ─── Left Panel ─────────────────────────────────────────────── */}
      <div
        className="reg-left-panel"
        style={{
          display: 'none', position: 'relative', overflow: 'hidden',
          width: '44%', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem',
          background: '#03080f',
        }}
      >
        {/* BG image */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80')",
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'grayscale(30%) brightness(0.13)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(3,8,15,0.35) 0%, rgba(3,8,15,0.55) 40%, rgba(3,8,15,0.97) 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 65%)',
        }} />
        <AnimatedGrid />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(3,8,15,0.3) 0%, transparent 40%)',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, overflow: 'hidden',
            border: '1px solid rgba(16,185,129,0.25)',
            boxShadow: '0 0 24px rgba(16,185,129,0.15)',
          }}>
            <img src="/MediCare.png" alt="MediCare" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#eef2ff', letterSpacing: '-0.03em' }}>MediCare</div>
            <div style={{ fontSize: '0.58rem', color: '#34d399', fontWeight: 700, letterSpacing: '0.1em' }}>HEALTHCARE</div>
          </div>
        </div>

        {/* Hero */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            padding: '4px 12px', borderRadius: 100,
            background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)',
            marginBottom: '1.5rem',
          }}>
            <div style={{ position: 'relative', width: 7, height: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', position: 'relative', zIndex: 1 }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#34d399', animation: 'pulse-ring 1.8s ease-out infinite' }} />
            </div>
            <span style={{ color: '#34d399', fontSize: '0.7rem', fontWeight: 700, fontFamily: "'Sora', sans-serif", letterSpacing: '0.07em' }}>
              JOIN 10,000+ USERS
            </span>
          </div>

          <h2 style={{
            fontFamily: "'Sora', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.9rem, 3vw, 2.6rem)', color: '#eef2ff',
            lineHeight: 1.12, letterSpacing: '-0.03em', marginBottom: '1rem',
          }}>
            Start your<br />
            <span style={{
              background: 'linear-gradient(135deg, #34d399, #38bdf8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>healthcare journey.</span>
          </h2>
          <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.8, maxWidth: 300, marginBottom: '2.5rem' }}>
            Join thousands of patients and doctors on India's most trusted healthcare management platform.
          </p>

          {/* Benefits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2.5rem' }}>
            {BENEFITS.map((b, i) => (
              <div key={b} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                animation: `fadeUp 0.5s ease ${i * 80}ms both`,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={11} color="#34d399" />
                </div>
                <span style={{ color: '#64748b', fontSize: '0.84rem' }}>{b}</span>
              </div>
            ))}
          </div>

          {/* Dynamic role preview */}
          <div style={{
            padding: '1.1rem 1.25rem', borderRadius: 16,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', gap: '0.9rem',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: selectedRole.color + '18',
              border: `1px solid ${selectedRole.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <selectedRole.icon size={18} color={selectedRole.color} />
            </div>
            <div>
              <div style={{ color: '#eef2ff', fontSize: '0.83rem', fontWeight: 600, fontFamily: "'Sora', sans-serif" }}>
                Registering as: {selectedRole.label}
              </div>
              <div style={{ color: '#334155', fontSize: '0.75rem', marginTop: 2 }}>{selectedRole.desc}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#1e293b', fontSize: '0.82rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ─── Right Form Panel ────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '2rem 1.5rem', background: '#ffffff',
        overflowY: 'auto', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 400, height: 300,
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 400, paddingTop: '2rem', paddingBottom: '2rem', animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both' }}>
          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
              <img src="/MediCare.png" alt="MediCare" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, color: '#0f172a', fontSize: '1rem', letterSpacing: '-0.02em' }}>MediCare</span>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>
              Create account
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Get started with MediCare today — free forever
            </p>
          </div>

          {/* Role selector */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.1em', marginBottom: '0.65rem', fontFamily: "'Sora', sans-serif" }}>
              JOIN AS
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              {ROLES.map(r => {
                const Icon = r.icon
                const isActive = form.role === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => up('role', r.value)}
                    style={{
                      padding: '1rem', borderRadius: 14, textAlign: 'left',
                      border: `2px solid ${isActive ? r.color + '55' : '#f1f5f9'}`,
                      background: isActive ? r.color + '06' : '#fafafa',
                      cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                      position: 'relative', outline: 'none',
                      boxShadow: isActive ? `0 0 0 3px ${r.color}12` : 'none',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc' } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#fafafa' } }}
                  >
                    {isActive && (
                      <div style={{
                        position: 'absolute', top: 10, right: 10,
                        width: 20, height: 20, borderRadius: '50%',
                        background: r.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 2px 8px ${r.color}40`,
                      }}>
                        <Check size={11} color="#fff" />
                      </div>
                    )}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, marginBottom: '0.65rem',
                      background: r.color + '15',
                      border: `1px solid ${r.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={17} color={r.color} />
                    </div>
                    <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', marginBottom: 3 }}>{r.label}</div>
                    <div style={{ fontSize: '0.73rem', color: '#94a3b8', lineHeight: 1.5 }}>{r.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form fields */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.45rem' }}>
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focusedField === 'name' ? '#0ea5e9' : '#94a3b8', pointerEvents: 'none' }} />
                <input
                  value={form.name}
                  onChange={e => up('name', e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={form.role === 'DOCTOR' ? 'Dr. Your Full Name' : 'Your Full Name'}
                  style={inputStyle('name')}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.45rem' }}>
                Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focusedField === 'email' ? '#0ea5e9' : '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => up('email', e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={inputStyle('email')}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.45rem' }}>
                Phone <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focusedField === 'phone' ? '#0ea5e9' : '#94a3b8', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', left: 36, top: '50%', transform: 'translateY(-50%)', fontSize: '0.83rem', color: '#94a3b8', pointerEvents: 'none' }}>+91</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => up('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Phone number"
                  style={{ ...inputStyle('phone'), paddingLeft: 64 }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.45rem' }}>
                Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focusedField === 'pwd' ? '#0ea5e9' : '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => up('password', e.target.value)}
                  onFocus={() => setFocusedField('pwd')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  style={{ ...inputStyle('pwd'), paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#94a3b8', display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength bar */}
              {form.password.length > 0 && (
                <div style={{ marginTop: '0.6rem' }}>
                  <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.3rem' }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= pwdStrength ? strengthMeta[pwdStrength].color : '#f1f5f9',
                        transition: 'background 0.3s ease',
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: '0.73rem', fontWeight: 600, color: strengthMeta[pwdStrength].color }}>
                    {strengthMeta[pwdStrength].label} password
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '13px 24px', borderRadius: 12, marginTop: '0.25rem',
                background: loading ? '#94a3b8' : '#0f172a',
                color: '#fff', fontFamily: "'Sora', sans-serif", fontWeight: 700,
                fontSize: '0.875rem', letterSpacing: '-0.01em',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.25s ease',
                position: 'relative', overflow: 'hidden',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(15,23,42,0.2)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1e293b' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0f172a' }}
            >
              {!loading && (
                <div style={{
                  position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                  animation: 'shimmer 2.5s infinite',
                }} />
              )}
              {loading ? (
                <>
                  <div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Creating account…
                </>
              ) : (
                <>Create account <ArrowRight size={15} style={{ marginLeft: 2 }} /></>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.83rem', marginTop: '1.5rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#0ea5e9', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>

          <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.73rem', marginTop: '1rem', lineHeight: 1.6 }}>
            By creating an account, you agree to our{' '}
            <span style={{ textDecoration: 'underline', cursor: 'pointer', color: '#94a3b8' }}>Terms</span>
            {' '}and{' '}
            <span style={{ textDecoration: 'underline', cursor: 'pointer', color: '#94a3b8' }}>Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  )
}