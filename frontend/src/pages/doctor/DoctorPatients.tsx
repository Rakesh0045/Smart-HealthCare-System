import { useEffect, useMemo, useState } from 'react'
import { appointmentApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import { Users, Mail, Phone, Calendar } from 'lucide-react'

type Row = {
  patientId: number
  patientName: string
  patientEmail?: string
  patientPhone?: string
  visitCount: number
  lastVisit: string
}

export default function DoctorPatients() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    appointmentApi
      .getMy()
      .then(r => setAppointments(r.data.data || []))
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => {
    const byPatient = new Map<number, { name: string; email?: string; phone?: string; dates: string[] }>()
    for (const a of appointments) {
      const pid = a.patientId
      if (pid == null) continue
      const d = String(a.appointmentDate || '')
      const cur = byPatient.get(pid) || {
        name: a.patientName || 'Patient',
        email: a.patientEmail,
        phone: a.patientPhone,
        dates: [] as string[],
      }
      if (a.patientEmail) cur.email = a.patientEmail
      if (a.patientPhone) cur.phone = a.patientPhone
      if (d) cur.dates.push(d)
      byPatient.set(pid, cur)
    }
    const out: Row[] = []
    byPatient.forEach((v, patientId) => {
      const sorted = [...v.dates].sort()
      const last = sorted[sorted.length - 1] || ''
      out.push({
        patientId,
        patientName: v.name,
        patientEmail: v.email,
        patientPhone: v.phone,
        visitCount: v.dates.length,
        lastVisit: last,
      })
    })
    out.sort((a, b) => (a.patientName || '').localeCompare(b.patientName || ''))
    return out
  }, [appointments])

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 48, fontFamily: "'Sora', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Doctor Portal</p>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 }}>My patients</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          Distinct patients from your appointment history ({rows.length} patient{rows.length !== 1 ? 's' : ''})
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0fdf4', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
            <p style={{ fontWeight: 600 }}>No patients yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 16px' }}>Patient</th>
                  <th style={{ padding: '14px 16px' }}>Contact</th>
                  <th style={{ padding: '14px 16px' }}>Visits</th>
                  <th style={{ padding: '14px 16px' }}>Last appointment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.patientId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{r.patientName}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {r.patientEmail ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Mail size={14} color="#94a3b8" /> {r.patientEmail}
                          </span>
                        ) : null}
                        {r.patientPhone ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Phone size={14} color="#94a3b8" /> {r.patientPhone}
                          </span>
                        ) : null}
                        {!r.patientEmail && !r.patientPhone ? '—' : null}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{r.visitCount}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={14} />
                        {r.lastVisit ? new Date(r.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
