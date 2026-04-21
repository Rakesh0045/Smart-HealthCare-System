import { useEffect, useState } from 'react'
import { doctorApi } from '../../api'
import { PageHeader, LoadingSpinner } from '../../components/common'
import { Clock, Save, ToggleLeft, ToggleRight, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']
const DAY_LABELS: Record<string,string> = { MONDAY:'Mon',TUESDAY:'Tue',WEDNESDAY:'Wed',THURSDAY:'Thu',FRIDAY:'Fri',SATURDAY:'Sat',SUNDAY:'Sun' }
const DAY_FULL: Record<string,string> = { MONDAY:'Monday',TUESDAY:'Tuesday',WEDNESDAY:'Wednesday',THURSDAY:'Thursday',FRIDAY:'Friday',SATURDAY:'Saturday',SUNDAY:'Sunday' }

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
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime + ':00',
        endTime: d.endTime + ':00',
        isAvailable: true,
        breakStart: d.breakStart ? d.breakStart + ':00' : null,
        breakEnd: d.breakEnd ? d.breakEnd + ':00' : null,
      }))
      await doctorApi.setAvailability(payload)
      toast.success('Schedule saved!')
    } finally { setSaving(false) }
  }

  const handleToggle = async () => {
    try {
      await doctorApi.toggleAvailability()
      setDocAvailable(p => !p)
      toast.success(docAvailable ? 'You are now offline' : 'You are now available')
    } catch {}
  }

  if (loading) return <LoadingSpinner />

  const activeDays = schedule.filter(d => d.isAvailable).length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .doc-sched * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        @keyframes heroShiftSched {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes orbS1 {
          0%, 100% { transform: translate(0,0) scale(1); opacity:0.7; }
          50%       { transform: translate(25px,-18px) scale(1.12); opacity:1; }
        }
        @keyframes orbS2 {
          0%, 100% { transform: translate(0,0) scale(1); opacity:0.6; }
          60%       { transform: translate(-20px,16px) scale(1.09); opacity:0.9; }
        }
        .hero-sched-banner {
          background: linear-gradient(130deg, #0d9488, #0891b2, #06b6d4, #1e40af, #0d9488, #0d4f4a);
          background-size: 400% 400%;
          animation: heroShiftSched 10s ease infinite;
          border-radius: 1rem;
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
          color: white;
        }
        .hero-sched-banner::before {
          content:''; position:absolute; top:-50px; right:-40px;
          width:200px; height:200px; border-radius:50%;
          background: radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%);
          animation: orbS1 6s ease-in-out infinite;
        }
        .hero-sched-banner::after {
          content:''; position:absolute; bottom:-60px; left:10px;
          width:170px; height:170px; border-radius:50%;
          background: radial-gradient(circle, rgba(30,64,175,0.22) 0%, transparent 70%);
          animation: orbS2 8s ease-in-out infinite;
        }
          padding: 7px 10px; border-radius: 10px;
          border: 1.5px solid #ccfbf1; background: #f0fdfa;
          color: #0f172a; font-size: 13px; outline: none;
          width: 110px; transition: all 0.15s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .time-input:focus { border-color: #0d9488; background: #fff; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
        .save-btn {
          background: linear-gradient(135deg, #0d9488, #0891b2);
          color: white; border: none; border-radius: 12px;
          padding: 10px 22px; font-size: 13px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; gap: 7px;
          transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .save-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(13,148,136,0.25); }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .day-card-active {
          background: #fff; border: 1.5px solid #5eead4;
          box-shadow: 0 2px 12px rgba(13,148,136,0.08);
        }
        .day-card-inactive {
          background: #fafafa; border: 1.5px solid #f1f5f9;
          opacity: 0.65;
        }
        .toggle-track {
          width: 40px; height: 22px; border-radius: 11px;
          cursor: pointer; transition: background 0.2s; position: relative; flex-shrink: 0;
        }
        .toggle-thumb {
          position: absolute; top: 3px;
          width: 16px; height: 16px;
          border-radius: 50%; background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          transition: transform 0.2s;
        }
      `}</style>

      <div className="doc-sched space-y-6">
        {/* Header */}
        <div className="hero-sched-banner">
          <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-0.5">Doctor Portal</p>
                <h1 className="text-xl font-bold text-white">My Schedule</h1>
                <p className="text-teal-200 text-sm">Set your weekly availability for patient bookings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleToggle}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all"
                style={docAvailable
                  ? { background: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }
                  : { background: 'rgba(239,68,68,0.2)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }
                }>
                {docAvailable ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {docAvailable ? 'Available' : 'Unavailable'}
              </button>
              <button onClick={handleSave} disabled={saving} className="save-btn">
                <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 mt-5 relative z-10">
            <div className="bg-white/15 rounded-xl px-4 py-2.5 text-center">
              <p className="text-teal-100 text-[10px] font-bold uppercase tracking-wider">Active Days</p>
              <p className="text-white text-xl font-bold">{activeDays}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-2.5 text-center">
              <p className="text-teal-100 text-[10px] font-bold uppercase tracking-wider">Status</p>
              <p className={`text-xl font-bold ${docAvailable ? 'text-white' : 'text-red-300'}`}>
                {docAvailable ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        {/* Day Cards */}
        <div className="grid gap-3">
          {schedule.map((day, i) => (
            <div key={day.dayOfWeek} className={`rounded-2xl p-4 transition-all duration-200 ${day.isAvailable ? 'day-card-active' : 'day-card-inactive'}`}>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Day toggle */}
                <div className="flex items-center gap-3 w-36 flex-shrink-0">
                  <div
                    className="toggle-track"
                    style={{ background: day.isAvailable ? '#0d9488' : '#e2e8f0' }}
                    onClick={() => update(i, 'isAvailable', !day.isAvailable)}
                  >
                    <div className="toggle-thumb"
                      style={{ transform: day.isAvailable ? 'translateX(18px)' : 'translateX(3px)' }} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${day.isAvailable ? 'text-teal-700' : 'text-slate-400'}`}>
                      {DAY_LABELS[day.dayOfWeek]}
                    </p>
                    <p className={`text-[10px] ${day.isAvailable ? 'text-teal-500' : 'text-slate-300'}`}>
                      {DAY_FULL[day.dayOfWeek]}
                    </p>
                  </div>
                </div>

                {day.isAvailable ? (
                  <div className="flex items-center gap-3 flex-wrap flex-1">
                    {/* Work hours */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: '#ccfbf1' }}>
                        <Clock className="w-3.5 h-3.5" style={{ color: '#0d9488' }} />
                      </div>
                      <input type="time" value={day.startTime} onChange={e => update(i, 'startTime', e.target.value)} className="time-input" />
                      <span className="text-slate-400 text-sm font-medium">to</span>
                      <input type="time" value={day.endTime} onChange={e => update(i, 'endTime', e.target.value)} className="time-input" />
                    </div>
                    {/* Break */}
                    <div className="flex items-center gap-2 pl-3" style={{ borderLeft: '1.5px solid #ccfbf1' }}>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 whitespace-nowrap">Break:</span>
                      <input type="time" value={day.breakStart} onChange={e => update(i, 'breakStart', e.target.value)} className="time-input" placeholder="--:--" />
                      <span className="text-slate-400 text-sm">–</span>
                      <input type="time" value={day.breakEnd} onChange={e => update(i, 'breakEnd', e.target.value)} className="time-input" placeholder="--:--" />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 italic">Not working this day</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 p-4 rounded-2xl text-sm" style={{ background: '#f0fdfa', border: '1.5px solid #99f6e4', color: '#0d9488' }}>
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold">💡 Slots are auto-generated every 30 minutes within your working hours. Break times are excluded.</span>
        </div>
      </div>
    </>
  )
}