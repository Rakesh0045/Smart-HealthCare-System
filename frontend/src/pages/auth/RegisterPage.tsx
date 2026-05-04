import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api'
import { Eye, EyeOff, ArrowRight, Heart, Stethoscope, User, Mail, Phone, Lock, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = [
  {
    value: 'PATIENT',
    label: 'Patient',
    desc: 'Book appointments, view prescriptions, track health',
    icon: User,
    gradient: 'from-blue-500 to-blue-600',
    activeClasses: 'border-blue-500 bg-blue-50/50',
  },
  {
    value: 'DOCTOR',
    label: 'Doctor',
    desc: 'Manage schedule, write prescriptions, see patients',
    icon: Stethoscope,
    gradient: 'from-emerald-500 to-emerald-600',
    activeClasses: 'border-emerald-500 bg-emerald-50/50',
  },
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
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)

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
        setOtp('')
        toast.success('Verification code sent to your email')
        return
      }

      setAuth({ userId: d.userId, name: d.name, email: d.email, role: d.role, profileComplete: d.profileComplete },
               d.accessToken, d.refreshToken)
      toast.success(`Welcome to SmartHealth, ${d.name}!`)
      navigate(d.profileComplete ? `/${d.role.toLowerCase()}/dashboard` : `/${d.role.toLowerCase()}/profile`)
    } finally { setLoading(false) }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationEmail || otp.trim().length < 4) {
      toast.error('Enter the verification code from your email')
      return
    }
    setVerifying(true)
    try {
      const { data } = await authApi.verifyEmail({ email: verificationEmail, otp: otp.trim() })
      const d = data.data
      setAuth({ userId: d.userId, name: d.name, email: d.email, role: d.role, profileComplete: d.profileComplete },
               d.accessToken, d.refreshToken)
      toast.success('Email verified successfully')
      navigate(d.profileComplete ? `/${d.role.toLowerCase()}/dashboard` : `/${d.role.toLowerCase()}/profile`)
    } finally { setVerifying(false) }
  }

  const handleResend = async () => {
    if (!verificationEmail) return
    setResending(true)
    try {
      await authApi.resendVerificationOtp(verificationEmail)
      toast.success('Verification code resent')
    } finally {
      setResending(false)
    }
  }

  const selectedRole = ROLES.find(r => r.value === form.role)!
  const passwordStrength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2 : 3
  const strengthLabels = ['', 'Weak', 'Good', 'Strong']
  const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500']

  return (
    <div className="min-h-screen flex">

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden bg-[#0f172a] flex-col justify-between p-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/[0.08] rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/[0.06] rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">MediCare</span>
        </div>

        <div className="relative z-10 space-y-10">
          <div className="space-y-6">
            <h2 className="text-4xl font-semibold text-white leading-tight">
              Start your healthcare<br />
              <span className="text-emerald-400">journey today</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs">
              Join thousands of patients and doctors on India's most trusted healthcare platform.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            {BENEFITS.map(b => (
              <div key={b} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-slate-300 text-sm">{b}</span>
              </div>
            ))}
          </div>

          {/* Role preview */}
          <div className={`p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]`}>
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${selectedRole.gradient} flex items-center justify-center`}>
                <selectedRole.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Creating account as: {selectedRole.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{selectedRole.desc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-slate-300 hover:text-white transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-start justify-center p-6 sm:p-10 bg-white overflow-y-auto">
        <div className="w-full max-w-[400px] py-10">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-lg">SmartHealth</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Create your account</h1>
            <p className="text-slate-500 text-sm">
              {verificationEmail ? 'Enter the code sent to your email to activate your account' : 'Get started with SmartHealth today'}
            </p>
          </div>

          {verificationEmail && (
            <form onSubmit={handleVerify} className="mb-8 space-y-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Verify {verificationEmail}</p>
                <p className="text-xs text-slate-600 mt-1">The account is created but inactive until the OTP is confirmed.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Verification code</label>
                <input
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={verifying}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
                  {verifying ? 'Verifying...' : 'Verify email'}
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50">
                  {resending ? 'Resending...' : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {/* Role selector */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-700 mb-3">Join as</label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(r => {
                const Icon = r.icon
                const isActive = form.role === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => up('role', r.value)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer
                      ${isActive ? r.activeClasses : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
                    {isActive && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${r.gradient} flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-medium text-sm text-slate-900">{r.label}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{r.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form */}
          {!verificationEmail && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  value={form.name}
                  onChange={e => up('name', e.target.value)}
                  placeholder={form.role === 'DOCTOR' ? 'Dr. Your Full Name' : 'Your Full Name'}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50
                    text-slate-900 text-sm placeholder:text-slate-400
                    focus:outline-none focus:border-blue-500 focus:bg-white
                    transition-all hover:border-slate-300"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => up('email', e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50
                    text-slate-900 text-sm placeholder:text-slate-400
                    focus:outline-none focus:border-blue-500 focus:bg-white
                    transition-all hover:border-slate-300"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <div className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-500 text-sm">+91</div>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => up('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Phone number"
                  className="w-full pl-[4.5rem] pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50
                    text-slate-900 text-sm placeholder:text-slate-400
                    focus:outline-none focus:border-blue-500 focus:bg-white
                    transition-all hover:border-slate-300"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => up('password', e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
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

              {/* Password strength */}
              {form.password.length > 0 && (
                <div className="mt-3">
                  <div className="flex gap-1.5 mb-2">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                          i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    passwordStrength === 1 ? 'text-red-500' : passwordStrength === 2 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {strengthLabels[passwordStrength]} password
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 mt-4 rounded-xl
                bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-slate-900/20">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>Create account <ArrowRight className="w-4 h-4 ml-1" /></>
              )}
            </button>
          </form>
          )}

          <p className="text-center text-slate-500 text-sm mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-slate-900 hover:text-blue-600 font-medium transition-colors">
              Sign in
            </Link>
          </p>

          <p className="text-center text-slate-400 text-xs mt-6">
            By creating an account, you agree to our{' '}
            <span className="underline cursor-pointer hover:text-slate-600">Terms of Service</span>
            {' '}and{' '}
            <span className="underline cursor-pointer hover:text-slate-600">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  )
}
