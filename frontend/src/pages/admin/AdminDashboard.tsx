import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api'
import { StatCard, LoadingSpinner } from '../../components/common'
import {
  Users, Stethoscope, Calendar, TrendingUp,
  CheckCircle, XCircle, Clock, DollarSign, ArrowRight, Activity
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const STATUS_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
        <p className="font-medium text-slate-700">{label}</p>
        <p className="text-blue-600">{payload[0]?.value} appointments</p>
      </div>
    )
  }
  return null
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getDashboard().then(r => setStats(r.data.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-violet-200 text-sm mb-1">System Overview</p>
            <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
            <p className="text-violet-100 text-sm">{today}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
            <Activity className="w-5 h-5 text-violet-200" />
            <div>
              <p className="text-xs text-violet-200">Today</p>
              <p className="font-bold text-white text-lg">{stats?.todayAppointments ?? 0} appts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users"     value={stats?.totalUsers ?? 0}      icon={Users}      color="violet" />
        <StatCard title="Doctors"         value={stats?.totalDoctors ?? 0}     icon={Stethoscope} color="blue" />
        <StatCard title="Patients"        value={stats?.totalPatients ?? 0}    icon={Users}      color="cyan" />
        <StatCard title="Total Revenue"
          value={`₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`}
          icon={DollarSign} color="green" />
      </div>

      {/* Appointment stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Appointments" value={stats?.totalAppointments ?? 0} icon={Calendar}     color="blue" />
        <StatCard title="Scheduled"          value={stats?.scheduledAppointments ?? 0} icon={Clock}   color="cyan" />
        <StatCard title="Completed"          value={stats?.completedAppointments ?? 0} icon={CheckCircle} color="green" />
        <StatCard title="Cancelled"          value={stats?.cancelledAppointments ?? 0} icon={XCircle} color="red" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Area chart */}
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-slate-900 mb-1">Appointments — Last 7 Days</h2>
          <p className="text-xs text-slate-400 mb-4">Daily appointment volume</p>
          {(stats?.appointmentsByDate?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.appointmentsByDate} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2}
                  fill="url(#blueGrad)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                  activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
              No appointment data yet
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-1">By Status</h2>
          <p className="text-xs text-slate-400 mb-4">Appointment distribution</p>
          {(stats?.appointmentsByStatus?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.appointmentsByStatus} dataKey="count" nameKey="status"
                  cx="50%" cy="45%" outerRadius={75} innerRadius={35}
                  paddingAngle={3}>
                  {stats.appointmentsByStatus.map((_: any, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v, n]} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Top doctors bar chart */}
      {(stats?.topDoctors?.length ?? 0) > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Top Performing Doctors</h2>
              <p className="text-xs text-slate-400 mt-0.5">Ranked by completed appointments</p>
            </div>
            <button onClick={() => navigate('/admin/doctors')}
              className="text-sm text-blue-600 flex items-center gap-1 hover:gap-2 transition-all font-medium">
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.topDoctors} margin={{ top: 5, right: 10, bottom: 20, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="doctorName" tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={name => name.split(' ').slice(-1)[0]} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                formatter={(v: any) => [v, 'Completed']}
                labelFormatter={(l: any) => `Dr. ${l}`}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Bar dataKey="completedAppointments" fill="#22c55e" radius={[6, 6, 0, 0]}
                maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Manage Doctors',  to: '/admin/doctors',    icon: Stethoscope, color: 'text-blue-600 bg-blue-50' },
          { label: 'Manage Patients', to: '/admin/patients',   icon: Users,       color: 'text-emerald-600 bg-emerald-50' },
          { label: 'View Audit Logs', to: '/admin/audit-logs', icon: TrendingUp,  color: 'text-purple-600 bg-purple-50' },
        ].map(({ label, to, icon: Icon, color }) => (
          <button key={to} onClick={() => navigate(to)}
            className="card flex items-center gap-3 hover:shadow-card-hover transition-all duration-200 text-left">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-slate-700 text-sm flex-1">{label}</span>
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </button>
        ))}
      </div>
    </div>
  )
}