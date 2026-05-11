import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { AUTH_SESSION_EXPIRED_FLAG, authApi } from '../../api'
import { Eye, EyeOff, ArrowRight, Heart, Stethoscope, Shield } from 'lucide-react'
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
        maskImage: 'radial-gradient(ellipse 65% 65% at 50% 50%, black 20%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 65% 65% at 50% 50%, black 20%, transparent 80%)',
      }} />
    </div>
  )
}

const DEMO_ACCOUNTS = [
  { role: 'patient', label: 'Patient', email: 'patient@demo.com', password: 'password123', color: '#0ea5e9', icon: Heart },
  { role: 'doctor', label: 'Doctor', email: 'doctor@demo.com', password: 'password123', color: '#10b981', icon: Stethoscope },
  { role: 'admin', label: 'Admin', email: 'admin@healthcare.com', password: 'password123', color: '#8b5cf6', icon: Shield },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeDemo, setActiveDemo] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem(AUTH_SESSION_EXPIRED_FLAG) === '1') {
      sessionStorage.removeItem(AUTH_SESSION_EXPIRED_FLAG)
      toast.error('Session expired. Please login again.')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      const d = data.data
      setAuth(
        { userId: d.userId, name: d.name, email: d.email, role: d.role, profileComplete: d.profileComplete },
        d.accessToken, d.refreshToken
      )
      toast.success(`Welcome back, ${d.name}!`)
      navigate(d.profileComplete ? `/${d.role.toLowerCase()}/dashboard` : `/${d.role.toLowerCase()}/profile`)
    } finally { setLoading(false) }
  }

  const handleDemo = (demo: typeof DEMO_ACCOUNTS[0]) => {
    setActiveDemo(demo.role)
    setForm({ email: demo.email, password: demo.password })
    setTimeout(() => setActiveDemo(null), 700)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif", background: '#03080f' }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes gridDrift { from { transform: translate(0,0); } to { transform: translate(64px,64px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-ring { 0% { transform:scale(1); opacity:0.7; } 100% { transform:scale(2); opacity:0; } }
        @keyframes shimmer { 0% { transform:translateX(-100%); } 100% { transform:translateX(100%); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* ─── Left Panel ─────────────────────────────────────────────── */}
      <div style={{
        display: 'none',
        position: 'relative', overflow: 'hidden',
        width: '46%', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem',
        background: '#03080f',
      }}
        className="login-left-panel"
      >
        {/* BG image */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&q=80')",
          backgroundSize: 'cover', backgroundPosition: 'center top',
          filter: 'grayscale(25%) brightness(0.14)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(3,8,15,0.4) 0%, rgba(3,8,15,0.6) 40%, rgba(3,8,15,0.97) 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(14,165,233,0.09) 0%, transparent 65%)',
        }} />

        <AnimatedGrid />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, overflow: 'hidden',
            border: '1px solid rgba(14,165,233,0.25)',
            boxShadow: '0 0 24px rgba(14,165,233,0.2)',
          }}>
            <img src="/MediCare.png" alt="MediCare" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#eef2ff', letterSpacing: '-0.03em' }}>MediCare</div>
            <div style={{ fontSize: '0.58rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.1em' }}>HEALTHCARE</div>
          </div>
        </div>

        {/* Hero copy */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            padding: '4px 12px', borderRadius: 100,
            background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)',
            marginBottom: '1.5rem',
          }}>
            <div style={{ position: 'relative', width: 7, height: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8', position: 'relative', zIndex: 1 }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#38bdf8', animation: 'pulse-ring 1.8s ease-out infinite' }} />
            </div>
            <span style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 700, fontFamily: "'Sora', sans-serif", letterSpacing: '0.07em' }}>
              AI-POWERED PLATFORM
            </span>
          </div>

          <h2 style={{
            fontFamily: "'Sora', sans-serif", fontWeight: 800,
            fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: '#eef2ff',
            lineHeight: 1.12, letterSpacing: '-0.03em', marginBottom: '1rem',
          }}>
            Welcome back<br />
            <span style={{
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>to healthcare.</span>
          </h2>
          <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.8, maxWidth: 320, marginBottom: '2.5rem' }}>
            Access world-class healthcare services. Connect with certified specialists and manage your health efficiently.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 0, marginBottom: '2.5rem' }}>
            {[['500+', 'Specialists'], ['10K+', 'Patients'], ['24/7', 'Support']].map(([v, l], i) => (
              <div key={l} style={{
                textAlign: 'center', padding: '0 1.75rem',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.04em' }}>{v}</div>
                <div style={{ fontSize: '0.72rem', color: '#334155', marginTop: 4, fontWeight: 500, letterSpacing: '0.04em' }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
            {[
              { name: 'Digital Prescriptions', desc: 'Eco-friendly & instant' },
              { name: 'Smart Scheduling', desc: 'Book slots that fit you' },
              { name: 'Health Records', desc: 'All your data, one place' },
              { name: 'AI Symptom Check', desc: 'Instant health insights' },
            ].map(f => (
              <div key={f.name} style={{
                padding: '1rem 1.1rem', borderRadius: 14,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{ color: '#eef2ff', fontSize: '0.82rem', fontWeight: 600, fontFamily: "'Sora', sans-serif", marginBottom: 3 }}>{f.name}</div>
                <div style={{ color: '#334155', fontSize: '0.75rem' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ color: '#1e293b', fontSize: '0.8rem' }}>All systems operational</span>
        </div>
      </div>

      {/* ─── Right Form Panel ────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1.5rem',
        background: '#ffffff',
        position: 'relative',
      }}>
        {/* Subtle top-right glow on white */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 400, height: 300,
          background: 'radial-gradient(ellipse, rgba(14,165,233,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 380, animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both' }}>
          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.5rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
              <img src="/MediCare.png" alt="MediCare" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, color: '#0f172a', fontSize: '1rem', letterSpacing: '-0.02em' }}>MediCare</span>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>
              Sign in
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Enter your credentials to access your account
            </p>
          </div>

          {/* Demo accounts */}
          <div style={{ marginBottom: '1.75rem' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.1em', marginBottom: '0.75rem', fontFamily: "'Sora', sans-serif" }}>
              DEMO ACCOUNTS
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.6rem' }}>
              {DEMO_ACCOUNTS.map(d => {
                const Icon = d.icon
                const isActive = activeDemo === d.role
                return (
                  <button
                    key={d.role}
                    onClick={() => handleDemo(d)}
                    style={{
                      padding: '0.9rem 0.5rem', borderRadius: 14,
                      border: `1.5px solid ${isActive ? d.color + '60' : '#f1f5f9'}`,
                      background: isActive ? d.color + '08' : '#fafafa',
                      cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                      outline: 'none',
                      transform: isActive ? 'scale(0.97)' : 'none',
                      boxShadow: isActive ? `0 0 0 3px ${d.color}18` : 'none',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc' } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#fafafa' } }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: d.color + '18',
                      border: `1px solid ${d.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.25s ease',
                    }}>
                      <Icon size={16} color={d.color} />
                    </div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569', fontFamily: "'Sora', sans-serif" }}>{d.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
            <span style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600, letterSpacing: '0.06em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={focusedField === 'email' ? '#0ea5e9' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={{
                    width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                    borderRadius: 12, fontSize: '0.875rem', color: '#0f172a',
                    border: `1.5px solid ${focusedField === 'email' ? '#0ea5e9' : '#e2e8f0'}`,
                    background: focusedField === 'email' ? '#fff' : '#fafafa',
                    outline: 'none', transition: 'all 0.2s ease',
                    boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(14,165,233,0.08)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={focusedField === 'password' ? '#0ea5e9' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{
                    width: '100%', paddingLeft: 42, paddingRight: 46, paddingTop: 12, paddingBottom: 12,
                    borderRadius: 12, fontSize: '0.875rem', color: '#0f172a',
                    border: `1.5px solid ${focusedField === 'password' ? '#0ea5e9' : '#e2e8f0'}`,
                    background: focusedField === 'password' ? '#fff' : '#fafafa',
                    outline: 'none', transition: 'all 0.2s ease',
                    boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(14,165,233,0.08)' : 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '13px 24px', borderRadius: 12,
                background: loading ? '#94a3b8' : '#0f172a',
                color: '#fff', fontFamily: "'Sora', sans-serif", fontWeight: 700,
                fontSize: '0.875rem', letterSpacing: '-0.01em',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                marginTop: '0.25rem',
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
                  Signing in…
                </>
              ) : (
                <>Sign in <ArrowRight size={15} style={{ marginLeft: 2 }} /></>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.83rem', marginTop: '1.75rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#0ea5e9', fontWeight: 600, textDecoration: 'none' }}>
              Create account
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .login-left-panel { display: flex !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}