import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { notificationApi, authApi } from '../../api'
import {
  LayoutDashboard, Calendar, User, Bell, LogOut, Menu, X,
  Stethoscope, ClipboardList, Users, ScrollText, Shield,
  FileText, Clock, Search, Brain, Activity
} from 'lucide-react'
import toast from 'react-hot-toast'

// Generate avatar URL from user name
const generateAvatarUrl = (name?: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0d9488&color=fff&bold=true&size=80`

const navConfig = {
  PATIENT: [
    { to: '/patient/dashboard', label: 'Overview', icon: LayoutDashboard, section: 'main' },
    { to: '/patient/history', label: 'Medical History', icon: FileText, section: 'main' },
    { to: '/patient/book', label: 'Book Appointment', icon: Calendar, section: 'main' },
    { to: '/patient/appointments', label: 'My Appointments', icon: ClipboardList, section: 'main' },
    { to: '/patient/episodes', label: 'Treatment Episodes', icon: Activity, section: 'main' },
    { to: '/patient/prescriptions', label: 'Prescriptions', icon: FileText, section: 'main' },
    { to: '/patient/symptom-checker', label: 'AI Symptom Checker', icon: Brain, section: 'tools' },
    { to: '/patient/doctors', label: 'Find Doctors', icon: Search, section: 'tools' },
    { to: '/patient/profile', label: 'My Profile', icon: User, section: 'tools' },
  ],
  DOCTOR: [
    { to: '/doctor/dashboard', label: 'Overview', icon: LayoutDashboard, section: 'main' },
    { to: '/doctor/history', label: 'Medical History', icon: Activity, section: 'main' },
    { to: '/doctor/records', label: 'Medical Records', icon: ClipboardList, section: 'main' },
    { to: '/doctor/appointments', label: 'Appointments', icon: Calendar, section: 'main' },
    { to: '/doctor/patients', label: 'My Patients', icon: Users, section: 'main' },
    { to: '/doctor/prescriptions', label: 'Prescriptions', icon: FileText, section: 'main' },
    { to: '/doctor/availability', label: 'My Schedule', icon: Clock, section: 'main' },
    { to: '/doctor/profile', label: 'My Profile', icon: User, section: 'settings' },
  ],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, section: 'main' },
    { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope, section: 'main' },
    { to: '/admin/patients', label: 'Patients', icon: Users, section: 'main' },
    { to: '/admin/users', label: 'All Users', icon: Shield, section: 'main' },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, section: 'reports' },
  ],
}

const roleTheme = {
  PATIENT: {
    sidebar: 'linear-gradient(180deg, #0f1e2e 0%, #0d2a3a 50%, #071e2b 100%)',
    accent: '#0b86bf',
    accentLight: '#41b3e8',
    label: 'Patient Portal',
    activeItem: 'rgba(14,165,233,0.18)',
    activeBorder: '#055980',
  },
  DOCTOR: {
    sidebar: 'linear-gradient(180deg, #0a1628 0%, #0d2040 50%, #071220 100%)',
    accent: '#0d9488',
    accentLight: '#5eead4',
    label: 'Doctor Portal',
    activeItem: 'rgba(13,148,136,0.2)',
    activeBorder: '#0d9488',
  },
  ADMIN: {
    sidebar: 'linear-gradient(180deg, #1a0533 0%, #2d1060 50%, #130428 100%)',
    accent: '#8b5cf6',
    accentLight: '#c4b5fd',
    label: 'Admin Panel',
    activeItem: 'rgba(139,92,246,0.2)',
    activeBorder: '#8b5cf6',
  },
}

const sectionLabels: Record<string, string> = {
  main: 'Main Menu',
  tools: 'Tools',
  settings: 'Settings',
  reports: 'Reports',
}

export default function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const navItems = navConfig[user?.role as keyof typeof navConfig] || []
  const theme = roleTheme[user?.role as keyof typeof roleTheme] || roleTheme.PATIENT

  useEffect(() => {
    notificationApi.getUnreadCount()
      .then(res => setUnreadCount(res.data.data.count))
      .catch(() => { })
  }, [])

  const handleLogout = async () => {
    try { await authApi.logout() } catch { }
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

  const Sidebar = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.sidebar, position: 'relative', overflow: 'hidden' }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: `${theme.accent}08`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 100, left: -40, width: 150, height: 150, borderRadius: '50%', background: `${theme.accent}05`, pointerEvents: 'none' }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        .sidebar-all * { font-family: 'Sora', sans-serif !important; }

        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; border-radius: 12px;
          text-decoration: none; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.5); margin-bottom: 2px;
          transition: all 0.2s; border-left: 2px solid transparent;
          position: relative;
        }
        .nav-item:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.06); }
        .nav-item.active {
          color: #fff;
          background: ${theme.activeItem};
          border-left-color: ${theme.accent};
          font-weight: 600;
        }
        .nav-item.active .nav-icon { color: ${theme.accent} !important; }

        .logout-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; border-radius: 12px;
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.4); font-size: 13px; font-weight: 500;
          font-family: 'Sora', sans-serif;
          width: 100%; text-align: left;
          transition: all 0.2s;
        }
        .logout-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

        .section-label {
          font-size: 9px; font-weight: 800; letter-spacing: 0.14em;
          text-transform: uppercase; color: rgba(255,255,255,0.2);
          padding: 16px 16px 6px; margin: 0;
        }
      `}</style>

      <div className="sidebar-all" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${theme.accent}30` }}>
              <img src="/MediCare.png" alt="MediCare" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>MediCare</div>
              <div style={{ fontSize: 10, color: `${theme.accentLight}`, fontWeight: 600, letterSpacing: '0.05em' }}>{theme.label}</div>
            </div>
          </div>
        </div>



        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          {Object.entries(groupedNav).map(([section, items]) => (
            <div key={section}>
              <p className="section-label">{sectionLabels[section] || section}</p>
              {(items as NavItem[]).map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <Icon className="nav-icon" style={{ width: 17, height: 17, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User card */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderRadius: 10 }}>
            <img
              src={generateAvatarUrl(user?.name)}
              alt={user?.name}
              style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', border: `2px solid ${theme.accent}` }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut style={{ width: 15, height: 15 }} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { font-family: 'Sora', sans-serif; }
        body { background: #f4fffe; }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', background: '#f4fffe', overflow: 'hidden' }}>
        {/* Desktop sidebar */}
        <aside style={{ display: 'none', width: 248, flexShrink: 0 }} className="lg-sidebar">
          <style>{`.lg-sidebar { display: flex !important; } @media (max-width: 1024px) { .lg-sidebar { display: none !important; } }`}</style>
          <Sidebar />
        </aside>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setSidebarOpen(false)} />
            <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, zIndex: 10 }}>
              <button onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <X style={{ width: 16, height: 16, color: 'white' }} />
              </button>
              <Sidebar />
            </aside>
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Header */}
          <header style={{ background: 'white', borderBottom: '1px solid #f0fdf4', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => setSidebarOpen(true)} style={{ display: 'none', padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer' }} className="mobile-menu-btn">
                <Menu style={{ width: 20, height: 20, color: '#64748b' }} />
              </button>
              <style>{`@media (max-width: 1024px) { .mobile-menu-btn { display: flex !important; } }`}</style>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'capitalize' }}>
                  {user?.role?.toLowerCase()} dashboard
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => navigate(`/${user?.role?.toLowerCase()}/notifications`)}
                style={{ position: 'relative', width: 40, height: 40, borderRadius: 12, background: '#f0fdfa', border: '1.5px solid #ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Bell style={{ width: 17, height: 17, color: '#0d9488' }} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, background: '#ef4444', color: 'white', fontSize: 9, fontWeight: 700, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', fontFamily: 'Sora, sans-serif' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <img
                src={generateAvatarUrl(user?.name)}
                alt={user?.name}
                style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', border: `2px solid ${theme.accent}` }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{user?.name}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{user?.role}</div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}