import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Heart, Stethoscope, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

const DEMO_ACCOUNTS = [
  { role: 'patient', label: 'Patient', email: 'patient@demo.com', password: 'password123', color: 'from-blue-500 to-blue-600', icon: Heart },
  { role: 'doctor', label: 'Doctor', email: 'doctor@demo.com', password: 'password123', color: 'from-emerald-500 to-emerald-600', icon: Stethoscope },
  { role: 'admin', label: 'Admin', email: 'admin@healthcare.com', password: 'password123', color: 'from-violet-500 to-violet-600', icon: Shield },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeDemo, setActiveDemo] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      const d = data.data
      setAuth({ userId: d.userId, name: d.name, email: d.email, role: d.role, profileComplete: d.profileComplete },
               d.accessToken, d.refreshToken)
      toast.success(`Welcome back, ${d.name}!`)
      navigate(`/${d.role.toLowerCase()}/dashboard`)
    } finally { setLoading(false) }
  }

  const handleDemo = (demo: typeof DEMO_ACCOUNTS[0]) => {
    setActiveDemo(demo.role)
    setForm({ email: demo.email, password: demo.password })
    setTimeout(() => setActiveDemo(null), 600)
  }

  return (
    <div className="min-h-screen flex">

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-[#0f172a] flex-col justify-between p-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/[0.15] via-transparent to-transparent" />
          <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-500/[0.08] rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-20 w-72 h-72 bg-violet-500/[0.06] rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">MediCare</span>
        </div>

        {/* Hero content */}
        <div className="relative z-10 space-y-10">
          <div className="space-y-6">
            <h2 className="text-4xl font-semibold text-white leading-tight">
              Welcome to the future<br />
              <span className="text-blue-400">of healthcare</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Access world-class healthcare services from the comfort of your home. Connect with certified specialists and manage your health efficiently.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-8">
            {[['500+', 'Specialists'], ['10K+', 'Patients'], ['24/7', 'Support']].map(([v, l]) => (
              <div key={l}>
                <div className="text-3xl font-semibold text-white">{v}</div>
                <div className="text-slate-500 text-sm mt-1">{l}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'Video Consultations', desc: 'Connect face-to-face with doctors' },
              { name: 'Digital Prescriptions', desc: 'Eco-friendly and instant' },
              { name: 'Smart Scheduling', desc: 'Book slots that fit you' },
              { name: 'Health Records', desc: 'All your data, one place' },
            ].map(f => (
              <div key={f.name} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-white text-sm font-medium">{f.name}</div>
                <div className="text-slate-500 text-xs mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-500 text-sm">All systems operational</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-lg">MediCare</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Sign in to your account</h1>
            <p className="text-slate-500 text-sm">Enter your credentials to access your account</p>
          </div>

          {/* Demo login */}
          <div className="mb-6">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Demo accounts
            </p>
            <div className="grid grid-cols-3 gap-3">
              {DEMO_ACCOUNTS.map(d => {
                const Icon = d.icon
                return (
                  <button
                    key={d.role}
                    onClick={() => handleDemo(d)}
                    className={`group p-4 rounded-xl border transition-all duration-200 cursor-pointer
                      ${activeDemo === d.role
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}>
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${d.color} flex items-center justify-center mb-3 mx-auto shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-xs font-medium text-slate-700 text-center">{d.label}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50
                    text-slate-900 text-sm placeholder:text-slate-400
                    focus:outline-none focus:border-blue-500 focus:bg-white
                    transition-all hover:border-slate-300"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50
                    text-slate-900 text-sm placeholder:text-slate-400
                    focus:outline-none focus:border-blue-500 focus:bg-white
                    transition-all hover:border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl
                bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-slate-900/20 mt-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4 ml-1" /></>
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-8">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-slate-900 hover:text-blue-600 font-medium transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
