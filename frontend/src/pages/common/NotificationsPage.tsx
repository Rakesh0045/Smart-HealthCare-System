import { useEffect, useMemo, useState } from 'react'
import { notificationApi } from '../../api'
import { EmptyState, LoadingSpinner, PageHeader } from '../../components/common'
import { Bell, CheckCheck, MailOpen } from 'lucide-react'
import toast from 'react-hot-toast'

type NotificationItem = {
  id: number
  title: string
  message: string
  type: string
  isRead: boolean
  referenceId?: number | null
  createdAt: string
}

const typeColor: Record<string, string> = {
  APPOINTMENT_BOOKED: 'bg-blue-50 text-blue-700 border-blue-200',
  APPOINTMENT_CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  APPOINTMENT_REMINDER: 'bg-amber-50 text-amber-700 border-amber-200',
  PRESCRIPTION_ADDED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAYMENT_SUCCESS: 'bg-teal-50 text-teal-700 border-teal-200',
}

function formatDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)

  const unreadCount = useMemo(() => items.filter(n => !n.isRead).length, [items])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const { data } = await notificationApi.getAll()
      setItems(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications().catch(() => {})
  }, [])

  const markOneAsRead = async (id: number) => {
    setWorking(true)
    try {
      await notificationApi.markRead(id)
      setItems(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)))
    } finally {
      setWorking(false)
    }
  }

  const markAllAsRead = async () => {
    if (unreadCount === 0) return
    setWorking(true)
    try {
      await notificationApi.markAllRead()
      setItems(prev => prev.map(n => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    } finally {
      setWorking(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread of ${items.length} total`}
        action={
          <button
            onClick={markAllAsRead}
            disabled={working || unreadCount === 0}
            className="btn-secondary"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          subtitle="Updates about appointments, prescriptions, and payments will appear here."
        />
      ) : (
        <div className="space-y-3">
          {items.map(n => {
            const badgeClass = typeColor[n.type] || 'bg-slate-50 text-slate-700 border-slate-200'
            return (
              <div
                key={n.id}
                className={`card p-4 border ${n.isRead ? 'border-slate-200' : 'border-blue-200 bg-blue-50/30'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${badgeClass}`}>
                        {n.type.split('_').join(' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-2">{formatDateTime(n.createdAt)}</p>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={() => markOneAsRead(n.id)}
                      disabled={working}
                      className="btn-secondary whitespace-nowrap"
                    >
                      <MailOpen className="w-4 h-4" />
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
