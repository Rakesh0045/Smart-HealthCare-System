import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor: handle 401, show errors ──────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = useAuthStore.getState().refreshToken

      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', null, {
            params: { refreshToken },
          })
          const newToken = data.data.accessToken
          useAuthStore.getState().setAuth(
            useAuthStore.getState().user!,
            newToken,
            refreshToken
          )
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } catch {
          useAuthStore.getState().logout()
          window.location.href = '/login'
          return Promise.reject(error)
        }
      } else {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      'Something went wrong. Please try again.'

    if (error.response?.status !== 401) {
      toast.error(message)
    }

    return Promise.reject(error)
  }
)

export default api

// ─── Typed API functions ─────────────────────────────────────────────────────

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: (token: string) => api.post('/auth/refresh', null, { params: { refreshToken: token } }),
}

export const doctorApi = {
  getAll: () => api.get('/doctors'),
  getById: (id: number) => api.get(`/doctors/${id}`),
  search: (params: any) => api.get('/doctors/search', { params }),
  getSpecializations: () => api.get('/doctors/specializations'),
  getSlots: (id: number, date: string) => api.get(`/doctors/${id}/slots`, { params: { date } }),
  getMyProfile: () => api.get('/doctor/profile'),
  updateProfile: (data: any) => api.post('/doctor/profile', data),
  setAvailability: (data: any) => api.post('/doctor/availability', data),
  toggleAvailability: () => api.patch('/doctor/toggle-availability'),
}

export const appointmentApi = {
  book: (data: any) => api.post('/appointments', data),
  getMy: () => api.get('/appointments/my'),
  getById: (id: number) => api.get(`/appointments/${id}`),
  getByDate: (date: string) => api.get('/appointments/doctor/today', { params: { date } }),
  cancel: (id: number) => api.delete(`/appointments/${id}/cancel`),
  reschedule: (id: number, data: any) => api.put(`/appointments/${id}/reschedule`, data),
  complete: (id: number, doctorNotes: string) =>
    api.patch(`/appointments/${id}/complete`, { doctorNotes }),
}

export const prescriptionApi = {
  add: (data: any) => api.post('/prescriptions', data),
  getMy: () => api.get('/prescriptions/my'),
  getById: (id: number) => api.get(`/prescriptions/${id}`),
  getByAppointment: (id: number) => api.get(`/prescriptions/appointment/${id}`),
  downloadPdf: (id: number) => api.get(`/prescriptions/${id}/download`, { responseType: 'blob' }),
}

export const paymentApi = {
  createOrder: (appointmentId: number) => api.post(`/payments/create-order/${appointmentId}`),
  verify: (data: any) => api.post('/payments/verify', data),
}

export const notificationApi = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAllRead: () => api.patch('/notifications/mark-all-read'),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
}

export const symptomApi = {
  suggest: (symptoms: string) => api.post('/symptoms/suggest', { symptoms }),
}

export const patientApi = {
  getProfile: () => api.get('/patient/profile'),
  updateProfile: (data: any) => api.post('/patient/profile', data),
  rate: (data: any) => api.post('/patient/rate', data),
}

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAllDoctors: () => api.get('/admin/doctors'),
  getAllPatients: () => api.get('/admin/patients'),
  getAllUsers: () => api.get('/admin/users'),
  deactivateUser: (id: number) => api.delete(`/admin/users/${id}`),
  activateUser: (id: number) => api.patch(`/admin/users/${id}/activate`),
  getAuditLogs: (page = 0) => api.get('/admin/audit-logs', { params: { page } }),
}
