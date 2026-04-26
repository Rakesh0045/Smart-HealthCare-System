import { X, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { useState } from 'react'

interface CancellationModalProps {
  appointment: any
  onConfirm: (reason: { reason?: string; reasonText?: string }) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const CANCELLATION_REASONS = [
  { value: 'PERSONAL', label: 'Personal/Schedule Conflict' },
  { value: 'MEDICAL', label: 'Medical Emergency' },
  { value: 'DOCTOR_UNAVAILABLE', label: 'Doctor Unavailable' },
  { value: 'SCHEDULING_CONFLICT', label: 'Scheduling Conflict' },
  { value: 'OTHER', label: 'Other (please specify)' },
]

export function CancellationModal({ appointment, onConfirm, onCancel, loading = false }: CancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [reasonText, setReasonText] = useState('')
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!selectedReason) {
      setError('Please select a cancellation reason')
      return
    }
    if (selectedReason === 'OTHER' && !reasonText.trim()) {
      setError('Please provide details for your cancellation reason')
      return
    }
    
    try {
      await onConfirm({
        reason: selectedReason,
        reasonText: selectedReason === 'OTHER' ? reasonText : undefined,
      })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel appointment')
    }
  }

  const isPaid = appointment?.paymentStatus === 'PAID'
  const appointmentDate = new Date(appointment?.appointmentDate)
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Cancel Appointment</h2>
            <p className="text-sm text-slate-600 mt-1">Please provide a reason for cancellation</p>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Appointment Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-slate-900">Dr. {appointment?.doctorName}</div>
                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">{appointment?.doctorSpecialization}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{formattedDate} at {appointment?.startTime}</span>
              </div>
              <div className="text-sm text-slate-600">
                Consultation Fee: <span className="font-semibold text-slate-900">₹{appointment?.consultationFee}</span>
              </div>
            </div>
          </div>

          {/* Cancellation Reason Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">Reason for Cancellation *</label>
            <div className="space-y-2">
              {CANCELLATION_REASONS.map((option) => (
                <label key={option.value} className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    borderColor: selectedReason === option.value ? '#2563eb' : '#e2e8f0',
                    backgroundColor: selectedReason === option.value ? '#eff6ff' : 'transparent',
                  }}>
                  <input type="radio" name="reason" value={option.value} checked={selectedReason === option.value}
                    onChange={(e) => { setSelectedReason(e.target.value); setError('') }}
                    className="w-4 h-4 accent-blue-600" />
                  <span className="ml-3 text-sm font-medium text-slate-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional Reason Details */}
          {selectedReason === 'OTHER' && (
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Please explain (optional)</label>
              <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)}
                placeholder="Tell us why you're cancelling..." maxLength={200}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                rows={3} />
              <p className="text-xs text-slate-500 mt-1">{reasonText.length}/200</p>
            </div>
          )}

          {/* Refund Info */}
          {isPaid && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-green-900">Refund Policy</p>
                <p className="text-green-800 text-xs mt-1">Your payment of ₹{appointment?.consultationFee} will be refunded to your original payment method within 3-5 business days.</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors">
            Keep Appointment
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            {loading ? 'Cancelling...' : 'Cancel Appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}
