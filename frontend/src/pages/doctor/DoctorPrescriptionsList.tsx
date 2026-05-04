import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { prescriptionApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import { FileDown, FileText, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DoctorPrescriptionsList() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    prescriptionApi
      .getMy()
      .then(r => setList(r.data.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [])

  const download = async (id: number) => {
    try {
      const res = await prescriptionApi.downloadPdf(id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prescription-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch {
      /* API interceptor shows error toast */
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 48, fontFamily: "'Sora', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Doctor Portal</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 }}>Prescriptions</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Issued prescriptions and PDF downloads</p>
        </div>
        <Link
          to="/doctor/prescriptions/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 12,
            background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: 'white',
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}
        >
          <Plus size={18} /> New prescription
        </Link>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0fdf4', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>No prescriptions yet</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Complete a visit and add a prescription from the button above.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '14px 16px' }}>Rx #</th>
                  <th style={{ padding: '14px 16px' }}>Patient</th>
                  <th style={{ padding: '14px 16px' }}>Diagnosis</th>
                  <th style={{ padding: '14px 16px' }}>Issued</th>
                  <th style={{ padding: '14px 16px', width: 120 }}>PDF</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>RX-{String(p.id).padStart(5, '0')}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{p.patientName || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#475569', maxWidth: 360 }}>{p.diagnosis || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        type="button"
                        onClick={() => download(p.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', borderRadius: 8, border: '1px solid #ccfbf1',
                          background: '#f0fdfa', color: '#0f766e', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <FileDown size={14} /> PDF
                      </button>
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
