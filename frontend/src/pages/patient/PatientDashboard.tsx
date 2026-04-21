import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { appointmentApi, notificationApi } from '../../api'
import { Calendar, ClipboardList, Activity, Bell, Plus, ArrowRight, Brain, Video, FileText, Search, Clock, CheckCircle2 } from 'lucide-react'

export default function PatientDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      appointmentApi.getMy(),
      notificationApi.getAll(),
    ]).then(([apptRes, notifRes]) => {
      setAppointments(apptRes.data.data || [])
      setNotifications((notifRes.data.data || []).slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  const upcoming = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'RESCHEDULED')
  const completed = appointments.filter(a => a.status === 'COMPLETED')
  const nextAppointment = upcoming.sort((a, b) =>
    new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())[0]

  const getTimeUntil = (date: string) => {
    const now = new Date()
    const target = new Date(date)
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    return `In ${Math.ceil(diffDays / 7)} weeks`
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Topbar */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-slate-900 mb-1">
            {getGreeting()}, <span className="font-semibold">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-slate-500">Here's your health summary for today</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/patient/symptom-checker')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all">
            <Brain className="w-4 h-4" />
            AI Symptom Checker
          </button>
          <button
            onClick={() => navigate('/patient/book')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-sm font-medium text-white hover:bg-blue-600 transition-all shadow-sm shadow-blue-500/25">
            <Plus className="w-4 h-4" />
            Book Appointment
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Upcoming', value: upcoming.length, color: 'blue', suffix: 'appointments' },
          { label: 'Completed', value: completed.length, color: 'green', suffix: 'sessions' },
          { label: 'Total Visits', value: appointments.length, color: 'purple', suffix: 'all time' },
          { label: 'Unread', value: notifications.filter(n => !n.isRead).length, color: 'amber', suffix: 'notifications' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-5 border border-slate-100 relative overflow-hidden animate-fadeUp"
            style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.06] -translate-y-1/2 translate-x-1/2 ${
              stat.color === 'blue' ? 'bg-blue-500' :
              stat.color === 'green' ? 'bg-emerald-500' :
              stat.color === 'purple' ? 'bg-violet-500' :
              'bg-amber-500'
            }`} />
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">{stat.label}</div>
            <div className={`text-4xl font-light mb-1 ${
              stat.color === 'blue' ? 'text-blue-500' :
              stat.color === 'green' ? 'text-emerald-500' :
              stat.color === 'purple' ? 'text-violet-500' :
              'text-amber-500'
            }`}>{stat.value}</div>
            <span className="text-[11px] text-slate-400 font-medium">{stat.suffix}</span>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-5">

        {/* Left Column */}
        <div className="col-span-2 space-y-5">
          {/* Next Appointment */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-fadeUp" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-slate-900">Next Appointment</h2>
              <button
                onClick={() => navigate('/patient/appointments')}
                className="text-xs text-blue-500 font-medium hover:text-blue-600 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {nextAppointment ? (
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                      {getTimeUntil(nextAppointment.appointmentDate)}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      nextAppointment.paymentStatus === 'PAID'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {nextAppointment.paymentStatus === 'PAID' ? 'Paid' : 'Payment Pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-semibold shadow-sm shadow-blue-500/25">
                      {nextAppointment.doctorName?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Dr. {nextAppointment.doctorName}</h3>
                      <p className="text-sm text-slate-500">{nextAppointment.doctorSpecialization}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Date</div>
                        <div className="text-sm font-medium text-slate-700">
                          {new Date(nextAppointment.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                        <Clock className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Time</div>
                        <div className="text-sm font-medium text-slate-700">
                          {nextAppointment.startTime?.slice(0,5)} – {nextAppointment.endTime?.slice(0,5)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {nextAppointment.reason && (
                    <p className="text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100">{nextAppointment.reason}</p>
                  )}
                </div>
                <div className="flex sm:flex-col gap-2 sm:items-end">
                  <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-all">
                    <Video className="w-4 h-4" />
                    Join Call
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all">
                    <Calendar className="w-4 h-4" />
                    Reschedule
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">No upcoming appointments</h3>
                <p className="text-xs text-slate-500 mb-4">Book your first appointment with our specialists</p>
                <button
                  onClick={() => navigate('/patient/book')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-sm font-medium text-white hover:bg-blue-600 transition-all">
                  <Plus className="w-4 h-4" />
                  Book Now
                </button>
              </div>
            )}
          </div>

          {/* Health Overview */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-fadeUp" style={{ animationDelay: '0.25s' }}>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Health Overview</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Last Visit</div>
                <div className="text-sm font-medium text-slate-900">
                  {completed[0] ? new Date(completed[0].appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {completed[0]?.doctorSpecialization || 'No visits yet'}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Last Doctor</div>
                <div className="text-sm font-medium text-slate-900">
                  {completed[0] ? `Dr. ${completed[0].doctorName}` : 'N/A'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {completed[0]?.doctorSpecialization || '-'}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Last Payment</div>
                <div className="text-sm font-medium text-slate-900">
                  {completed[0]?.consultationFee ? `₹${completed[0].consultationFee}` : 'N/A'}
                </div>
                <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  {completed[0]?.paymentStatus === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
                  {completed[0]?.paymentStatus === 'PAID' ? 'Confirmed' : '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-fadeUp" style={{ animationDelay: '0.25s' }}>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { icon: Brain, label: 'AI Symptom Checker', sub: 'Analyze your symptoms', color: 'blue' },
                { icon: Video, label: 'Video Consultation', sub: 'Start a virtual visit', color: 'green' },
                { icon: FileText, label: 'View Prescriptions', sub: 'Download your Rx', color: 'purple' },
                { icon: Search, label: 'Find Doctors', sub: 'Browse specialists', color: 'amber' },
              ].map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    onClick={() => navigate(`/patient/${action.label === 'AI Symptom Checker' ? 'symptom-checker' : action.label === 'Video Consultation' ? 'book' : action.label === 'View Prescriptions' ? 'prescriptions' : 'doctors'}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      action.color === 'blue' ? 'bg-blue-50 text-blue-500' :
                      action.color === 'green' ? 'bg-emerald-50 text-emerald-500' :
                      action.color === 'purple' ? 'bg-violet-50 text-violet-500' :
                      'bg-amber-50 text-amber-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-slate-700">{action.label}</div>
                      <div className="text-xs text-slate-400">{action.sub}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-fadeUp" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-500">
                {notifications.filter(n => !n.isRead).length} new
              </span>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No notifications yet</p>
            ) : (
              <div className="space-y-0">
                {notifications.map((n) => (
                  <div key={n.id} className="flex gap-3 py-3 border-b border-slate-50 last:border-0">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      n.isRead ? 'bg-slate-300' : 'bg-blue-500'
                    }`} />
                    <div>
                      <p className="text-xs font-medium text-slate-800 leading-snug">{n.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
