import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import DashboardLayout from './components/layout/DashboardLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import PatientDashboard from './pages/patient/PatientDashboard'
import BookAppointment from './pages/patient/BookAppointment'
import PatientAppointments from './pages/patient/PatientAppointments'
import PatientPrescriptions from './pages/patient/PatientPrescriptions'
import PatientProfile from './pages/patient/PatientProfile'
import SymptomChecker from './pages/patient/SymptomChecker'
import FindDoctors from './pages/patient/FindDoctors'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import DoctorAppointments from './pages/doctor/DoctorAppointments'
import DoctorSchedule from './pages/doctor/DoctorSchedule'
import DoctorProfile from './pages/doctor/DoctorProfile'
import AddPrescription from './pages/doctor/AddPrescription'
import AdminDashboard from './pages/admin/AdminDashboard'
import ManageDoctors from './pages/admin/ManageDoctors'
import ManagePatients from './pages/admin/ManagePatients'
import ManageUsers from './pages/admin/ManageUsers'
import AuditLogs from './pages/admin/AuditLogs'
import NotificationsPage from './pages/common/NotificationsPage'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />
  if (user && ['PATIENT', 'DOCTOR'].includes(user.role) && !user.profileComplete) {
    const profilePath = `/${user.role.toLowerCase()}/profile`
    if (location.pathname !== profilePath) return <Navigate to={profilePath} replace />
  }
  return <>{children}</>
}

function RoleRedirect() {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user && ['PATIENT', 'DOCTOR'].includes(user.role) && !user.profileComplete) {
    return <Navigate to={`/${user.role.toLowerCase()}/profile`} replace />
  }
  if (user?.role === 'PATIENT') return <Navigate to="/patient/dashboard" replace />
  if (user?.role === 'DOCTOR') return <Navigate to="/doctor/dashboard" replace />
  if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/patient" element={<ProtectedRoute roles={['PATIENT']}><DashboardLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="book" element={<BookAppointment />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="prescriptions" element={<PatientPrescriptions />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="doctors" element={<FindDoctors />} />
        <Route path="symptom-checker" element={<SymptomChecker />} />
        <Route path="profile" element={<PatientProfile />} />
      </Route>

      <Route path="/doctor" element={<ProtectedRoute roles={['DOCTOR']}><DashboardLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="availability" element={<DoctorSchedule />} />
        <Route path="schedule" element={<Navigate to="/doctor/availability" replace />} />
        <Route path="prescriptions" element={<AddPrescription />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<DoctorProfile />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><DashboardLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="doctors" element={<ManageDoctors />} />
        <Route path="patients" element={<ManagePatients />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="/unauthorized" element={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
            <p className="text-slate-500 mb-6">You don't have permission to view this page.</p>
            <a href="/" className="btn-primary">Go Home</a>
          </div>
        </div>
      } />
      <Route path="*" element={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-8xl font-black text-slate-200 mb-2">404</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h1>
            <a href="/" className="btn-primary">Go Home</a>
          </div>
        </div>
      } />
    </Routes>
  )
}
