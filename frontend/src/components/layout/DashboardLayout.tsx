import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { notificationApi, authApi } from '../../api'
import {
  LayoutDashboard, Calendar, User, Bell, LogOut, Menu, X,
  Stethoscope, ClipboardList, Users, Settings, Activity,
  Search, Brain, FileText, Shield, ScrollText, ChevronRight,
  Clock, Heart
} from 'lucide-react'
import toast from 'react-hot-toast'

const navConfig = {
  PATIENT: [
    { to: '/patient/dashboard',       label: 'Dashboard',        icon: LayoutDashboard, section: 'main' },
    { to: '/patient/book',            label: 'Book Appointment', icon: Calendar, section: 'main' },
    { to: '/patient/appointments',    label: 'My Appointments',  icon: ClipboardList, section: 'main' },
    { to: '/patient/prescriptions',   label: 'Prescriptions',    icon: FileText, section: 'main' },
    { to: '/patient/symptom-checker', label: 'AI Symptom Checker',  icon: Brain, section: 'tools' },
    { to: '/patient/doctors',         label: 'Find Doctors',     icon: Search, section: 'tools' },
    { to: '/patient/profile',         label: 'My Profile',       icon: User, section: 'tools' },
  ],
  DOCTOR: [
    { to: '/doctor/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/doctor/appointments',  label: 'Appointments',   icon: Calendar },
    { to: '/doctor/prescriptions', label: 'Prescriptions',  icon: FileText },
    { to: '/doctor/availability',  label: 'Availability',   icon: Clock },
    { to: '/doctor/profile',       label: 'My Profile',     icon: User },
  ],
  ADMIN: [
    { to: '/admin/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/admin/doctors',     label: 'Doctors',     icon: Stethoscope },
    { to: '/admin/patients',    label: 'Patients',    icon: Users },
    { to: '/admin/users',       label: 'All Users',   icon: Shield },
    { to: '/admin/audit-logs',  label: 'Audit Logs',  icon: ScrollText },
  ],
}

// Role-specific theme config
const roleThemes = {
  PATIENT: {
    gradient: 'from-blue-500 to-blue-600',
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-700',
    activeHover: 'hover:bg-blue-100',
    headerGrad: 'from-blue-600 to-blue-700',
    dotColor: 'bg-blue-500',
  },
  DOCTOR: {
    gradient: 'from-teal-500 to-cyan-600',
    activeBg: 'bg-teal-50',
    activeText: 'text-teal-700',
    activeHover: 'hover:bg-teal-100',
    headerGrad: 'from-teal-600 to-cyan-700',
    dotColor: 'bg-teal-500',
  },
  ADMIN: {
    gradient: 'from-violet-500 to-violet-600',
    activeBg: 'bg-violet-50',
    activeText: 'text-violet-700',
    activeHover: 'hover:bg-violet-100',
    headerGrad: 'from-violet-600 to-violet-700',
    dotColor: 'bg-violet-500',
  },
}

const sectionLabels: Record<string, string> = { main: 'Main', tools: 'Tools' }

export default function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const role = (user?.role as keyof typeof navConfig) || 'PATIENT'
  const navItems = navConfig[role] || []
  const theme = roleThemes[role] || roleThemes.PATIENT
  const portalLabel = role === 'DOCTOR' ? 'Doctor Portal' : role === 'ADMIN' ? 'Admin Panel' : 'Patient Portal'

  useEffect(() => {
    notificationApi.getUnreadCount()
      .then(res => setUnreadCount(res.data.data.count))
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; section?: string }
  const groupedNav = (navItems as NavItem[]).reduce((acc, item) => {
    const section = item.section || 'main'
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {} as Record<string, NavItem[]>)

  // Doctor sidebar uses a special teal style
  const isDoctorRole = role === 'DOCTOR'

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`px-5 py-5 ${isDoctorRole ? 'border-b border-white/10' : 'border-b border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-sm`}>
            <Heart className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className={`text-sm font-bold leading-tight ${isDoctorRole ? 'text-white' : 'text-slate-900'}`}>
              Smart Healthcare
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-widest ${isDoctorRole ? 'text-cyan-300' : 'text-slate-400'}`}>
              {portalLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {Object.entries(groupedNav).map(([section, items]) => (
          <div key={section} className="mb-5">
            {Object.keys(groupedNav).length > 1 && (
              <div className={`px-3 mb-2 text-[10px] font-bold uppercase tracking-widest ${isDoctorRole ? 'text-cyan-300/60' : 'text-slate-400'}`}>
                {sectionLabels[section]}
              </div>
            )}
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-all duration-150 font-medium ${
                    isActive
                      ? isDoctorRole
                        ? 'bg-white/15 text-white shadow-sm'
                        : `${theme.activeBg} ${theme.activeText}`
                      : isDoctorRole
                        ? 'text-cyan-100/80 hover:bg-white/10 hover:text-white'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }>
                <Icon className="w-[17px] h-[17px]" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="px-3 pb-4">
        <div className={`p-4 rounded-xl flex items-center gap-3 ${isDoctorRole ? 'bg-white/10 border border-white/15' : 'bg-slate-50 border border-slate-100'}`}>
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ring-2 ring-white/20`}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-semibold truncate ${isDoctorRole ? 'text-white' : 'text-slate-900'}`}>{user?.name}</div>
            <div className={`text-xs truncate ${isDoctorRole ? 'text-cyan-200/70' : 'text-slate-500'}`}>{user?.email}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className={`w-full flex items-center gap-2 px-4 py-2.5 mt-2 rounded-xl text-sm font-medium transition-all ${isDoctorRole ? 'text-cyan-200/60 hover:text-red-300 hover:bg-white/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: isDoctorRole ? '#f0fdfb' : '#f8fafc' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col w-60 flex-shrink-0"
        style={isDoctorRole
          ? { background: 'linear-gradient(160deg, #0d4f4a 0%, #0d9488 35%, #0891b2 65%, #1e3a5f 100%)', borderRight: '1px solid rgba(6,182,212,0.2)' }
          : { background: '#ffffff', borderRight: '1px solid #f1f5f9' }
        }
      >
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside
            className="fixed left-0 top-0 bottom-0 w-64 shadow-xl flex flex-col z-10"
            style={isDoctorRole
              ? { background: 'linear-gradient(160deg, #0d4f4a 0%, #0d9488 35%, #0891b2 65%, #1e3a5f 100%)' }
              : { background: '#ffffff' }
            }
          >
            <button onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 p-1.5 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className={`border-b px-6 py-4 flex items-center justify-between flex-shrink-0 ${isDoctorRole ? 'bg-white border-teal-100/60' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className={`text-sm font-semibold capitalize ${isDoctorRole ? 'text-teal-600' : 'text-slate-500'}`}>
              {role?.toLowerCase()} Portal
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/${role?.toLowerCase()}/notifications`)}
              className={`relative p-2 rounded-xl transition-colors ${isDoctorRole ? 'hover:bg-teal-50' : 'hover:bg-slate-100'}`}>
              <Bell className={`w-5 h-5 ${isDoctorRole ? 'text-teal-500' : 'text-slate-500'}`} />
              {unreadCount > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center ${isDoctorRole ? 'bg-teal-500' : 'bg-red-500'}`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white text-sm font-bold`}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}