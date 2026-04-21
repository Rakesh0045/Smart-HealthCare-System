import { LucideIcon } from 'lucide-react'

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'blue' | 'green' | 'yellow' | 'red' | 'violet' | 'cyan'
  subtitle?: string
  trend?: { value: number; label: string }
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   text: 'text-blue-600' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', text: 'text-green-600' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600',text: 'text-yellow-600' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',     text: 'text-red-600' },
  violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600',text:'text-violet-600' },
  cyan:   { bg: 'bg-cyan-50',   icon: 'bg-cyan-100 text-cyan-600',   text: 'text-cyan-600' },
}

export function StatCard({ title, value, icon: Icon, color, subtitle, trend }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="card hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-slate-400 font-normal">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center flex-shrink-0 ml-4`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase()
  const cls = `badge badge-${s}`
  const labels: Record<string, string> = {
    scheduled: '● Scheduled',
    completed: '✓ Completed',
    cancelled: '✕ Cancelled',
    rescheduled: '↻ Rescheduled',
    no_show: '— No Show',
    paid: '✓ Paid',
    pending: '◌ Pending',
    failed: '✕ Failed',
    refunded: '↩ Refunded',
  }
  return <span className={cls}>{labels[s] || status}</span>
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex items-center justify-center py-12">
      <div className={`${sizes[size]} border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, subtitle, action }: {
  icon: LucideIcon; title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-slate-400 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Page Header ──────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────
export function DoctorCard({ doctor, action }: { doctor: any; action?: React.ReactNode }) {
  return (
    <div className="card hover:shadow-card-hover transition-all duration-200 group">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {doctor.name?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900 truncate">Dr. {doctor.name}</h3>
              <p className="text-sm text-blue-600 font-medium">{doctor.specialization}</p>
            </div>
            {doctor.rating > 0 && (
              <div className="flex items-center gap-1 text-sm flex-shrink-0">
                <span className="text-yellow-400">★</span>
                <span className="font-semibold text-slate-700">{doctor.rating?.toFixed(1)}</span>
                <span className="text-slate-400 text-xs">({doctor.totalRatings})</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            <span>🏥 {doctor.hospital || 'Hospital N/A'}</span>
            <span>🎓 {doctor.experience} yrs exp</span>
            <span>💰 ₹{doctor.consultationFee}</span>
            {doctor.qualification && <span>📋 {doctor.qualification}</span>}
          </div>
          {doctor.bio && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">{doctor.bio}</p>
          )}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  )
}

// ─── Appointment Card ─────────────────────────────────────────────────────────
export function AppointmentCard({ appointment, actions, role }: {
  appointment: any; actions?: React.ReactNode; role?: string
}) {
  const date = new Date(appointment.appointmentDate)
  const dateStr = date.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
  return (
    <div className="card hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex flex-col items-center justify-center flex-shrink-0 border border-blue-100">
            <span className="text-xs font-bold text-blue-700 leading-none">
              {date.toLocaleDateString('en-IN', { day: 'numeric' })}
            </span>
            <span className="text-[10px] text-blue-500 uppercase">
              {date.toLocaleDateString('en-IN', { month: 'short' })}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 text-sm">
                {role === 'DOCTOR' ? appointment.patientName : `Dr. ${appointment.doctorName}`}
              </h3>
              <StatusBadge status={appointment.status} />
              <StatusBadge status={appointment.paymentStatus} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {role !== 'DOCTOR' && <span className="text-blue-600 font-medium">{appointment.doctorSpecialization} • </span>}
              {dateStr} • {appointment.startTime?.slice(0,5)} – {appointment.endTime?.slice(0,5)}
            </p>
            {appointment.reason && (
              <p className="text-xs text-slate-400 mt-1">📋 {appointment.reason}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  )
}
