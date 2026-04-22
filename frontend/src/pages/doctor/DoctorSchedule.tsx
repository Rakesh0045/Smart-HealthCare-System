// DoctorSchedule.tsx - ProvoHeal redesign
import { useEffect, useState } from 'react'
import { doctorApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import { Clock, Save, ToggleLeft, ToggleRight, Info, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']
const DAY_SHORT: Record<string,string> = { MONDAY:'Mon',TUESDAY:'Tue',WEDNESDAY:'Wed',THURSDAY:'Thu',FRIDAY:'Fri',SATURDAY:'Sat',SUNDAY:'Sun' }
const DAY_FULL: Record<string,string> = { MONDAY:'Monday',TUESDAY:'Tuesday',WEDNESDAY:'Wednesday',THURSDAY:'Thursday',FRIDAY:'Friday',SATURDAY:'Saturday',SUNDAY:'Sunday' }
const DAY_COLOR: Record<string,string> = { MONDAY:'#0d9488',TUESDAY:'#0891b2',WEDNESDAY:'#7c3aed',THURSDAY:'#f59e0b',FRIDAY:'#10b981',SATURDAY:'#ef4444',SUNDAY:'#6b7280' }

interface DaySchedule { dayOfWeek: string; isAvailable: boolean; startTime: string; endTime: string; breakStart: string; breakEnd: string }
const blank = (day: string): DaySchedule => ({ dayOfWeek: day, isAvailable: false, startTime: '09:00', endTime: '17:00', breakStart: '', breakEnd: '' })

export default function DoctorSchedule() {
  const [schedule, setSchedule] = useState<DaySchedule[]>(DAYS.map(blank))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [docAvailable, setDocAvailable] = useState(true)

  useEffect(() => {
    Promise.all([doctorApi.getMyProfile()]).then(([res]) => {
      const avails: any[] = res.data.data?.availabilities || []
      setDocAvailable(res.data.data?.isAvailable ?? true)
      setSchedule(DAYS.map(day => {
        const existing = avails.find((a: any) => a.dayOfWeek === day)
        return existing ? {
          dayOfWeek: day, isAvailable: existing.isAvailable ?? false,
          startTime: existing.startTime?.slice(0,5) || '09:00',
          endTime: existing.endTime?.slice(0,5) || '17:00',
          breakStart: existing.breakStart?.slice(0,5) || '',
          breakEnd: existing.breakEnd?.slice(0,5) || '',
        } : blank(day)
      }))
    }).finally(() => setLoading(false))
  }, [])

  const update = (i: number, field: keyof DaySchedule, value: any) =>
    setSchedule(s => s.map((d, idx) => idx === i ? { ...d, [field]: value } : d))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = schedule.filter(d => d.isAvailable).map(d => ({
        dayOfWeek: d.dayOfWeek, startTime: d.startTime + ':00', endTime: d.endTime + ':00',
        isAvailable: true, breakStart: d.breakStart ? d.breakStart + ':00' : null, breakEnd: d.breakEnd ? d.breakEnd + ':00' : null,
      }))
      await doctorApi.setAvailability(payload)
      toast.success('Schedule saved!')
    } finally { setSaving(false) }
  }

  const handleToggle = async () => {
    try { await doctorApi.toggleAvailability(); setDocAvailable(p => !p); toast.success(docAvailable ? 'You are now offline' : 'You are now available') } catch {}
  }

  const activeDays = schedule.filter(d => d.isAvailable).length

  if (loading) return <LoadingSpinner />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .sched-page { font-family: 'Sora', sans-serif; }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(14px); } to { opacity:1;transform:translateY(0); } }

        .pv-card {
          background: white; border-radius: 16px;
          border: 1px solid #f0fdf4;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(13,148,136,0.04);
        }
        .time-input {
          padding: 9px 12px; border-radius: 10px;
          border: 1.5px solid #e6f7f5; background: #fafffe;
          color: #0f172a; font-size: 12px; font-family: 'JetBrains Mono', monospace;
          outline: none; width: 120px; transition: all 0.2s;
        }
        .time-input:focus { border-color: #0d9488; background: white; box-shadow: 0 0 0 3px rgba(13,148,136,0.08); }

        .day-toggle {
          width: 44px; height: 24px; border-radius: 12px;
          cursor: pointer; transition: background 0.2s; position: relative; flex-shrink: 0;
        }
        .day-toggle-thumb {
          position: absolute; top: 4px;
          width: 16px; height: 16px; border-radius: 50%;
          background: white; box-shadow: 0 1px 4px rgba(0,0,0,0.2); transition: transform 0.2s;
        }
        .save-sched-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 24px; border-radius: 12px;
          background: linear-gradient(135deg, #0d9488, #0891b2);
          color: white; border: none; font-size: 13px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s;
        }
        .save-sched-btn:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,148,136,0.25); }
        .save-sched-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .avail-toggle {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 12px;
          border: 1.5px solid; font-size: 13px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s;
          background: white;
        }
      `}</style>

      <div className="sched-page" style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16, animation: 'fadeSlide 0.4s ease both' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Doctor Portal</p>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 }}>My Schedule</h1>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Set your weekly availability for patient bookings</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="avail-toggle"
              onClick={handleToggle}
              style={{ color: docAvailable ? '#0d9488' : '#ef4444', borderColor: docAvailable ? '#ccfbf1' : '#fecaca', background: docAvailable ? '#f0fdfa' : '#fef2f2' }}
            >
              {docAvailable ? <ToggleRight style={{ width: 18, height: 18 }} /> : <ToggleLeft style={{ width: 18, height: 18 }} />}
              {docAvailable ? 'Available' : 'Unavailable'}
            </button>
            <button className="save-sched-btn" onClick={handleSave} disabled={saving}>
              <Save style={{ width: 16, height: 16 }} />
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Active Days',    value: activeDays,                         grad: 'linear-gradient(135deg, #1e40af, #3b82f6)', shadow: 'rgba(59,130,246,0.25)' },
            { label: 'Status',         value: docAvailable ? 'Online' : 'Offline', grad: docAvailable ? 'linear-gradient(135deg, #15803d, #22c55e)' : 'linear-gradient(135deg, #be123c, #f43f5e)', shadow: docAvailable ? 'rgba(34,197,94,0.25)' : 'rgba(244,63,94,0.25)' },
            { label: 'Slot Duration',  value: '30 min',                            grad: 'linear-gradient(135deg, #6d28d9, #a78bfa)', shadow: 'rgba(167,139,250,0.25)' },
            { label: 'Weekly Slots',   value: activeDays * 16,                     grad: 'linear-gradient(135deg, #b45309, #f59e0b)', shadow: 'rgba(245,158,11,0.25)' },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              padding: '20px 22px', borderRadius: 16,
              background: stat.grad,
              boxShadow: `0 4px 20px ${stat.shadow}`,
              animation: `fadeSlide 0.4s ${i * 0.07}s ease both`,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>{stat.label}</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* DAY CARDS */}
        <div className="pv-card" style={{ overflow: 'hidden', animation: 'fadeSlide 0.5s 0.2s ease both' }}>
          {/* Header row */}
          <div style={{ padding: '16px 24px', background: '#fafffe', borderBottom: '1px solid #f0fdf4', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Info style={{ width: 16, height: 16, color: '#0d9488' }} />
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              Slots are auto-generated every 30 minutes within your working hours. Break times are excluded from bookings.
            </span>
          </div>

          {schedule.map((day, i) => {
            const color = DAY_COLOR[day.dayOfWeek]
            return (
              <div key={day.dayOfWeek} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px',
                borderBottom: i < 6 ? '1px solid #f0fdf4' : 'none',
                background: day.isAvailable ? 'white' : '#fafffe',
                transition: 'background 0.2s',
                animation: `fadeSlide 0.4s ${i * 0.04}s ease both`,
                flexWrap: 'wrap'
              }}>

                {/* Day toggle + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 160, flexShrink: 0 }}>
                  <div
                    className="day-toggle"
                    style={{ background: day.isAvailable ? color : '#e2e8f0' }}
                    onClick={() => update(i, 'isAvailable', !day.isAvailable)}
                  >
                    <div className="day-toggle-thumb" style={{ transform: day.isAvailable ? 'translateX(20px)' : 'translateX(4px)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: day.isAvailable ? '#0f172a' : '#94a3b8' }}>
                      {DAY_FULL[day.dayOfWeek]}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: day.isAvailable ? color : '#cbd5e1' }}>
                      {day.isAvailable ? 'Working' : 'Day off'}
                    </div>
                  </div>
                </div>

                {day.isAvailable ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, flexWrap: 'wrap' }}>
                    {/* Work hours */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock style={{ width: 15, height: 15, color: '#0d9488' }} />
                      <input type="time" value={day.startTime} onChange={e => update(i, 'startTime', e.target.value)} className="time-input" />
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>to</span>
                      <input type="time" value={day.endTime} onChange={e => update(i, 'endTime', e.target.value)} className="time-input" />
                    </div>

                    {/* Break */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 16, borderLeft: '1px solid #f0fdf4' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Break:</span>
                      <input type="time" value={day.breakStart} onChange={e => update(i, 'breakStart', e.target.value)} className="time-input" />
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>–</span>
                      <input type="time" value={day.breakEnd} onChange={e => update(i, 'breakEnd', e.target.value)} className="time-input" />
                    </div>

                    {/* Slot count estimate */}
                    <div style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 8, background: `${color}10`, border: `1px solid ${color}20` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: color }}>~16 slots</span>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: '#cbd5e1', fontStyle: 'italic' }}>Not working — toggle to enable</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}