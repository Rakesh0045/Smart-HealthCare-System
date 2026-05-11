import { useEffect, useMemo, useState } from 'react'
import { appointmentApi, medicalRecordApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import {
  Activity, Calendar, CheckCircle2, FileText, ListChecks, Plus, RefreshCw, Shield, Users, X,
} from 'lucide-react'
import toast from 'react-hot-toast'

type PatientOption = {
  patientId: number
  patientName: string
  patientEmail?: string
  patientPhone?: string
  lastVisit: string
  appointmentIds: number[]
}

type RecordRow = {
  id: number
  patientId: number
  patientName?: string
  doctorName?: string
  recordType: string
  title: string
  summary?: string
  details?: string
  recordDate: string
  appointmentId?: number
  attachmentUrl?: string
  versionNumber?: number
}

const TYPE_OPTIONS = [
  ['MEDICAL_HISTORY', 'Medical history'],
  ['LAB_RESULT', 'Lab result'],
  ['IMAGING_REPORT', 'Imaging report'],
  ['DIAGNOSTIC_TEST', 'Diagnostic test'],
  ['VACCINATION', 'Vaccination'],
  ['OTHER', 'Other'],
] as const

const TYPE_STYLE: Record<string, { fg: string; bg: string }> = {
  MEDICAL_HISTORY: { fg: '#0d9488', bg: '#f0fdfa' },
  LAB_RESULT: { fg: '#2563eb', bg: '#eff6ff' },
  IMAGING_REPORT: { fg: '#7c3aed', bg: '#f5f3ff' },
  DIAGNOSTIC_TEST: { fg: '#d97706', bg: '#fffbeb' },
  VACCINATION: { fg: '#059669', bg: '#ecfdf5' },
  OTHER: { fg: '#475569', bg: '#f8fafc' },
}

const today = () => new Date().toISOString().split('T')[0]
const fmtDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function DoctorMedicalRecords() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [timeline, setTimeline] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | ''>('')
  const [recordType, setRecordType] = useState('MEDICAL_HISTORY')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [details, setDetails] = useState('')
  const [recordDate, setRecordDate] = useState(today())
  const [attachmentUrl, setAttachmentUrl] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [apptRes, myRes] = await Promise.all([appointmentApi.getMy(), medicalRecordApi.getMy()])
      const appts = apptRes.data.data || []
      setAppointments(appts)
      setRecords(myRes.data.data || [])

      const firstPatientId = appts.find((a: any) => a.patientId != null)?.patientId
      if (firstPatientId != null) {
        setSelectedPatientId((prev) => (prev === '' ? firstPatientId : prev))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const patientOptions = useMemo<PatientOption[]>(() => {
    const map = new Map<number, PatientOption>()
    for (const appt of appointments) {
      if (appt.patientId == null) continue
      const existing = map.get(appt.patientId)
      const item = existing || {
        patientId: appt.patientId,
        patientName: appt.patientName || 'Patient',
        patientEmail: appt.patientEmail,
        patientPhone: appt.patientPhone,
        lastVisit: appt.appointmentDate || '',
        appointmentIds: [] as number[],
      }
      item.lastVisit = item.lastVisit && appt.appointmentDate && new Date(item.lastVisit).getTime() > new Date(appt.appointmentDate).getTime()
        ? item.lastVisit
        : (appt.appointmentDate || item.lastVisit)
      if (appt.patientEmail) item.patientEmail = appt.patientEmail
      if (appt.patientPhone) item.patientPhone = appt.patientPhone
      if (appt.id != null) item.appointmentIds.push(appt.id)
      map.set(appt.patientId, item)
    }
    return [...map.values()].sort((a, b) => a.patientName.localeCompare(b.patientName))
  }, [appointments])

  const selectedPatient = useMemo(
    () => patientOptions.find(patient => patient.patientId === selectedPatientId),
    [patientOptions, selectedPatientId]
  )

  const patientAppointments = useMemo(
    () => appointments.filter(appt => appt.patientId === selectedPatientId),
    [appointments, selectedPatientId]
  )

  useEffect(() => {
    if (selectedPatientId === '') {
      setTimeline([])
      return
    }
    medicalRecordApi.getPatientTimeline(Number(selectedPatientId))
      .then(res => setTimeline(res.data.data || []))
      .catch(() => setTimeline([]))
  }, [selectedPatientId])

  const stats = useMemo(() => ({
    total: records.length,
    patients: patientOptions.length,
    recent: records.filter(record => (Date.now() - new Date(record.recordDate).getTime()) <= 30 * 86400000).length,
    linked: records.filter(record => record.appointmentId != null).length,
  }), [records, patientOptions.length])

  const handleSubmit = async () => {
    if (selectedPatientId === '') {
      toast.error('Select a patient first')
      return
    }
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    try {
      await medicalRecordApi.create({
        patientId: Number(selectedPatientId),
        appointmentId: selectedAppointmentId === '' ? null : Number(selectedAppointmentId),
        recordType,
        title,
        summary,
        details,
        recordDate: recordDate || null,
        attachmentUrl: attachmentUrl || null,
      })
      toast.success('Medical record added')
      setTitle('')
      setSummary('')
      setDetails('')
      setAttachmentUrl('')
      setSelectedAppointmentId('')
      await load()
      const refreshed = await medicalRecordApi.getPatientTimeline(Number(selectedPatientId))
      setTimeline(refreshed.data.data || [])
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', paddingBottom: 40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .dm-page { font-family: 'Sora', sans-serif; color: #0f172a; }
        .dm-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .dm-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: .08em; display: block; margin-bottom: 7px; }
        .dm-input { width: 100%; box-sizing: border-box; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; padding: 10px 12px; font-family: 'Sora', sans-serif; font-size: 13px; outline: none; color: #0f172a; }
        .dm-input:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,.08); }
        .dm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 14px; border-radius: 12px; border: none; font-size: 13px; font-weight: 800; cursor: pointer; transition: transform .15s, opacity .15s; }
        .dm-btn:hover { transform: translateY(-1px); }
        .dm-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dot { 0%, 100% { opacity: .3; transform: scale(.8); } 50% { opacity: 1; transform: scale(1); } }
      `}</style>

      <div className="dm-page">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '.09em', margin: '0 0 6px' }}>Doctor Portal</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Medical Records</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0', maxWidth: 720 }}>
              Add structured records for consultations, lab work, imaging, diagnoses, and vaccinations.
            </p>
          </div>
          <button className="dm-btn" onClick={load} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#0f172a' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Records created', value: stats.total, icon: FileText, bg: 'linear-gradient(135deg,#0d9488,#14b8a6)' },
            { label: 'Patients with records', value: stats.patients, icon: Users, bg: 'linear-gradient(135deg,#2563eb,#3b82f6)' },
            { label: 'Recent records', value: stats.recent, icon: Activity, bg: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
            { label: 'Linked to appointments', value: stats.linked, icon: Shield, bg: 'linear-gradient(135deg,#059669,#10b981)' },
          ].map((item, index) => (
            <div key={item.label} style={{ background: item.bg, borderRadius: 16, padding: '18px 20px', color: 'white', position: 'relative', overflow: 'hidden', animation: `fadeUp .4s ease both ${index * 0.06}s` }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 76, height: 76, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <item.icon size={16} />
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, opacity: .75, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.07em' }}>{item.label}</p>
                <p style={{ fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1 }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 16, alignItems: 'start' }}>
          <div className="dm-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Plus size={14} color="#0d9488" />
              <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Add new record</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="dm-label">Patient</label>
                <select className="dm-input" value={selectedPatientId} onChange={e => { setSelectedPatientId(e.target.value ? Number(e.target.value) : ''); setSelectedAppointmentId('') }}>
                  <option value="">Select patient</option>
                  {patientOptions.map(patient => (
                    <option key={patient.patientId} value={patient.patientId}>
                      {patient.patientName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="dm-label">Appointment</label>
                <select className="dm-input" value={selectedAppointmentId} onChange={e => setSelectedAppointmentId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Optional link</option>
                  {patientAppointments.map(appt => (
                    <option key={appt.id} value={appt.id}>
                      #{appt.id} · {fmtDate(appt.appointmentDate)} · {appt.startTime?.slice(0, 5)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="dm-label">Record type</label>
                <select className="dm-input" value={recordType} onChange={e => setRecordType(e.target.value)}>
                  {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="dm-label">Date</label>
                <input className="dm-input" type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="dm-label">Title</label>
              <input className="dm-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chest X-ray report" />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="dm-label">Summary</label>
              <textarea className="dm-input" value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Short clinical summary" />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="dm-label">Details</label>
              <textarea className="dm-input" value={details} onChange={e => setDetails(e.target.value)} rows={5} placeholder="Observations, results, impressions, vaccination notes, or next steps" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="dm-label">Attachment URL</label>
              <input className="dm-input" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} placeholder="https://..." />
            </div>

            <button className="dm-btn" onClick={handleSubmit} disabled={saving} style={{ width: '100%', background: 'linear-gradient(135deg,#0d9488,#0891b2)', color: 'white' }}>
              {saving ? 'Saving…' : <><CheckCircle2 size={14} /> Save medical record</>}
            </button>

            {selectedPatient && (
              <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                  <div>
                    <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 800 }}>{selectedPatient.patientName}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{selectedPatient.patientEmail || selectedPatient.patientPhone || 'No contact details'}</p>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{selectedPatient.appointmentIds.length} linked appointment{selectedPatient.appointmentIds.length === 1 ? '' : 's'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedPatient.appointmentIds.slice(0, 4).map(id => (
                    <span key={id} style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: 'white', border: '1px solid #e2e8f0', color: '#475569' }}>Appointment #{id}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div className="dm-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <ListChecks size={14} color="#0d9488" />
                <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Selected patient timeline</p>
              </div>

              {selectedPatientId === '' ? (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>Pick a patient to see their existing records.</p>
              ) : timeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '18px 0' }}>
                  <FileText size={22} color="#cbd5e1" style={{ marginBottom: 8 }} />
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>No records yet</p>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>This patient has no medical records on file.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {timeline.map(record => {
                    const style = TYPE_STYLE[record.recordType] || TYPE_STYLE.OTHER
                    return (
                      <div key={record.id} style={{ padding: 14, borderRadius: 14, border: `1px solid ${style.bg}`, background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ padding: '4px 9px', borderRadius: 999, background: style.bg, color: style.fg, fontSize: 11, fontWeight: 800 }}>{record.recordType}</span>
                            <span className="dm-mono" style={{ fontSize: 11, color: '#94a3b8' }}>v{record.versionNumber || 1}</span>
                          </div>
                          <span className="dm-mono" style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(record.recordDate)}</span>
                        </div>
                        <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800 }}>{record.title}</p>
                        {record.summary && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{record.summary}</p>}
                        {record.details && <p style={{ margin: 0, fontSize: 12.5, color: '#64748b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{record.details}</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="dm-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Calendar size={14} color="#0d9488" />
                <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Recently created records</p>
              </div>

              {records.length === 0 ? (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No records have been created yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {records.slice(0, 5).map(record => {
                    const style = TYPE_STYLE[record.recordType] || TYPE_STYLE.OTHER
                    return (
                      <div key={record.id} style={{ padding: 12, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ padding: '3px 8px', borderRadius: 999, background: style.bg, color: style.fg, fontSize: 11, fontWeight: 800 }}>{record.recordType}</span>
                          <span className="dm-mono" style={{ fontSize: 11, color: '#94a3b8' }}>{fmtDate(record.recordDate)}</span>
                        </div>
                        <p style={{ margin: '0 0 3px', fontSize: 13.5, fontWeight: 800 }}>{record.title}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{record.patientName || 'Patient'} · v{record.versionNumber || 1}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
