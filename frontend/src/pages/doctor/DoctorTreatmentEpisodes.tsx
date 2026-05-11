import { useState, useEffect, useCallback } from 'react'
import { treatmentEpisodeApi, medicalRecordApi, analyticsApi } from '../../api'
import {
  Activity, BarChart3, Calendar, ChevronDown, ChevronUp, Clock, Brain,
  AlertTriangle, Apple, Dumbbell, CheckCircle, Stethoscope, RefreshCw,
  Link2, TrendingUp, X, ArrowRight, Search, Users, Loader2, Moon,
  Zap, FileText, Shield, Heart, Star, ArrowUpRight, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'

type EpisodeStatus = 'ACTIVE' | 'ONGOING' | 'RESOLVED' | 'CHRONIC'
type FollowupType = 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CANCELLED'

interface EpisodeFollowup {
  id: number; episodeId: number; appointmentId: number
  appointmentDate: string; appointmentTime: string; doctorName: string
  followupType: FollowupType; followupPurpose?: string; notes?: string; createdAt: string
}

interface TreatmentEpisode {
  id: number; patientId: number; patientName: string; doctorId: number
  doctorName: string; doctorSpecialization: string; primaryAppointmentId: number
  episodeName: string; primaryDiagnosis?: string; conditionCategory?: string
  status: EpisodeStatus; startDate: string; endDate?: string
  aiLifestyleAdvice?: string; aiGeneratedAt?: string
  followups: EpisodeFollowup[]; createdAt: string; updatedAt: string
}

interface LifestyleAdvice {
  dietRecommendations: string[]; exerciseRecommendations: string[]
  sleepRecommendations: string[]; stressManagement: string[]
  avoidFoods: string[]; recommendedActivities: string[]
  redFlags: string[]; followUpFrequency: string
  providerUsed: string; aiPowered: boolean
}

const STATUS_CFG: Record<EpisodeStatus, {
  label: string; bg: string; text: string; border: string; dot: string
  gradient: string; lightBg: string
}> = {
  ACTIVE:   { label: 'Active',   bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6', gradient: 'linear-gradient(135deg,#1d4ed8,#60a5fa)', lightBg: '#dbeafe' },
  ONGOING:  { label: 'Ongoing',  bg: '#fffbeb', text: '#92400e', border: '#fde68a', dot: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#fbbf24)', lightBg: '#fef3c7' },
  RESOLVED: { label: 'Resolved', bg: '#f0fdf4', text: '#14532d', border: '#bbf7d0', dot: '#22c55e', gradient: 'linear-gradient(135deg,#15803d,#4ade80)', lightBg: '#dcfce7' },
  CHRONIC:  { label: 'Chronic',  bg: '#fdf4ff', text: '#581c87', border: '#e9d5ff', dot: '#a855f7', gradient: 'linear-gradient(135deg,#7c3aed,#c084fc)', lightBg: '#ede9fe' },
}

const FU_CFG: Record<FollowupType, { bg: string; text: string; border: string; icon: string }> = {
  SCHEDULED:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: '📅' },
  COMPLETED:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', icon: '✅' },
  MISSED:     { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', icon: '⚠️' },
  CANCELLED:  { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', icon: '✕' },
}

const generateAvatarUrl = (name?: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'P')}&background=0d9488&color=fff&bold=true&size=40`

const fmt = (v?: string) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const fmtShort = (v?: string) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'

export default function DoctorTreatmentEpisodes() {
  const [episodes, setEpisodes] = useState<TreatmentEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<EpisodeStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [generatingAdvice, setGeneratingAdvice] = useState<Set<number>>(new Set())
  const [parsedAdvice, setParsedAdvice] = useState<Record<number, LifestyleAdvice>>({})
  const [analytics, setAnalytics] = useState<any>(null)
  const [contextDrawer, setContextDrawer] = useState<{
    open: boolean; patientId: number | null; patientName: string; records: any[]
  }>({ open: false, patientId: null, patientName: '', records: [] })
  const [linkedRecords, setLinkedRecords] = useState<Record<number, any[]>>({})
  const [loadingRecords, setLoadingRecords] = useState<Set<number>>(new Set())
  const [linkingRecord, setLinkingRecord] = useState<{ recordId: number; episodeId: number } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await treatmentEpisodeApi.getMy()
      const data: TreatmentEpisode[] = res.data.data || []
      setEpisodes(data)
      const adviceMap: Record<number, LifestyleAdvice> = {}
      data.forEach(ep => {
        if (ep.aiLifestyleAdvice) {
          try { adviceMap[ep.id] = JSON.parse(ep.aiLifestyleAdvice) } catch {}
        }
      })
      setParsedAdvice(adviceMap)
      const from = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
      const to = new Date().toISOString().split('T')[0]
      const anaRes = await analyticsApi.episodeSummary(from, to)
      setAnalytics(anaRes.data?.data)
    } catch {
      toast.error('Failed to load clinical data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleGenerateAdvice = async (episodeId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setGeneratingAdvice(prev => new Set(prev).add(episodeId))
    try {
      const res = await treatmentEpisodeApi.generateLifestyleAdvice(episodeId)
      setParsedAdvice(prev => ({ ...prev, [episodeId]: res.data.data }))
      toast.success('AI lifestyle advice generated')
      load()
    } catch { toast.error('Failed to generate advice') }
    finally {
      setGeneratingAdvice(prev => { const n = new Set(prev); n.delete(episodeId); return n })
    }
  }

  const handleTransitionStatus = async (episodeId: number, newStatus: string) => {
    try {
      await treatmentEpisodeApi.transitionStatus(episodeId, { status: newStatus })
      toast.success(`Episode moved to ${newStatus.toLowerCase()}`)
      load()
    } catch { toast.error('Failed to update status') }
  }

  const loadLinkedRecords = async (episodeId: number) => {
    setLoadingRecords(prev => new Set(prev).add(episodeId))
    try {
      const res = await treatmentEpisodeApi.getLinkedRecords(episodeId)
      setLinkedRecords(prev => ({ ...prev, [episodeId]: res.data?.data || [] }))
    } catch { toast.error('Failed to load linked records') }
    finally { setLoadingRecords(prev => { const n = new Set(prev); n.delete(episodeId); return n }) }
  }

  const openContextDrawer = async (patientId: number, patientName: string) => {
    setContextDrawer({ open: true, patientId, patientName, records: [] })
    try {
      const res = await medicalRecordApi.getPatientTimeline(patientId)
      setContextDrawer(prev => ({ ...prev, records: res.data?.data || [] }))
    } catch { toast.error('Failed to load patient timeline') }
  }

  const handleLinkRecord = async (recordId: number, episodeId: number) => {
    setLinkingRecord({ recordId, episodeId })
    try {
      await medicalRecordApi.linkToEpisode(recordId, { episodeId })
      toast.success('Record linked successfully')
      loadLinkedRecords(episodeId)
    } catch { toast.error('Failed to link record') }
    finally { setLinkingRecord(null) }
  }

  const filtered = episodes.filter(ep => {
    const matchStatus = filter === 'ALL' || ep.status === filter
    const matchSearch = !search ||
      ep.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      ep.episodeName?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const totalFU = episodes.reduce((acc, ep) => acc + ep.followups.length, 0)
  const activeCount = episodes.filter(ep => ['ACTIVE', 'ONGOING'].includes(ep.status)).length
  const totalPatients = new Set(episodes.map(ep => ep.patientId)).size
  const resolvedCount = episodes.filter(ep => ep.status === 'RESOLVED').length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 14, fontFamily: "'Sora', sans-serif" }}>
      <div style={{ width: 40, height: 40, border: '3px solid #f0fdfa', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'te-spin 0.8s linear infinite' }} />
      <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, fontWeight: 500 }}>Syncing treatment journeys…</p>
      <style>{`@keyframes te-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .te-root { font-family: 'Sora', sans-serif; color: #0f172a; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        @keyframes te-spin   { to { transform: rotate(360deg); } }
        @keyframes te-up     { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
        @keyframes te-slide  { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes te-expand { from { opacity:0; transform:scaleY(.96); } to { opacity:1; transform:scaleY(1); } }

        .te-fade-up { animation: te-up .4s ease both; }

        /* ── Stat cards ── */
        .te-stat {
          border-radius: 16px; padding: 20px 22px;
          position: relative; overflow: hidden;
          transition: transform .2s, box-shadow .2s;
        }
        .te-stat:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,.1); }

        /* ── Episode card ── */
        .te-episode {
          background: white;
          border-radius: 16px;
          border: 1.5px solid #f1f5f9;
          overflow: hidden;
          transition: border-color .2s, box-shadow .2s, transform .15s;
          animation: te-up .35s ease both;
        }
        .te-episode:hover { border-color: #ccfbf1; box-shadow: 0 4px 20px rgba(13,148,136,.08); }
        .te-episode.expanded { border-color: #99f6e4; box-shadow: 0 6px 28px rgba(13,148,136,.1); }

        /* ── Episode header ── */
        .te-ep-header {
          padding: 18px 22px;
          cursor: pointer;
          display: grid;
          grid-template-columns: 4px 44px 1fr auto;
          gap: 14px;
          align-items: center;
          transition: background .15s;
        }
        .te-ep-header:hover { background: #fafffe; }
        .te-ep-header.expanded-hdr { background: #f8fffe; }

        /* ── Filter button ── */
        .te-filter {
          padding: 7px 16px; border-radius: 999px;
          font-size: 11px; font-weight: 700;
          border: 1.5px solid #e2e8f0; background: white; color: #64748b;
          cursor: pointer; transition: all .15s;
          font-family: 'Sora', sans-serif; letter-spacing: .02em;
        }
        .te-filter:hover { border-color: #0d9488; color: #0d9488; }
        .te-filter.active { background: #f0fdfa; border-color: #5eead4; color: #0f766e; }

        /* ── Action button ── */
        .te-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 10px;
          font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all .2s;
          font-family: 'Sora', sans-serif; border: 1.5px solid;
          white-space: nowrap;
        }
        .te-btn:hover { transform: translateY(-1px); }
        .te-btn:active { transform: translateY(0); }

        /* ── Search ── */
        .te-search {
          width: 100%; padding: 9px 12px 9px 38px;
          border-radius: 10px; border: 1.5px solid #e2e8f0;
          font-family: 'Sora', sans-serif; font-size: 13px;
          color: #1e293b; outline: none; transition: all .2s;
          background: white;
        }
        .te-search:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,.08); }
        .te-search::placeholder { color: #cbd5e1; }

        /* ── Drawer ── */
        .te-overlay {
          position: fixed; inset: 0; z-index: 2000;
          background: rgba(15,23,42,.5); backdrop-filter: blur(8px);
          display: flex; justify-content: flex-end;
        }
        .te-drawer {
          width: 480px; height: 100%; background: white;
          display: flex; flex-direction: column;
          animation: te-slide .28s ease-out;
          box-shadow: -20px 0 60px rgba(15,23,42,.15);
        }

        /* ── Status transition btn ── */
        .te-trans-btn {
          padding: 5px 14px; border-radius: 8px; cursor: pointer;
          font-size: 11px; font-weight: 700; font-family: 'Sora', sans-serif;
          transition: all .15s; border: 1.5px solid;
        }
        .te-trans-btn:hover { transform: translateY(-1px); }

        /* ── Advice section ── */
        .te-advice-section {
          border-radius: 12px; padding: 14px;
          animation: te-up .3s ease;
        }

        /* ── Follow-up row ── */
        .te-followup-row {
          background: white; border: 1.5px solid #f1f5f9;
          border-radius: 12px; padding: 12px 16px;
          display: flex; align-items: center;
          justify-content: space-between; gap: 12px;
          transition: border-color .15s;
        }
        .te-followup-row:hover { border-color: #ccfbf1; }

        /* ── Expanded body ── */
        .te-body {
          padding: 20px 22px;
          border-top: 1.5px solid #f0fdfa;
          background: #fafffe;
          display: flex; flex-direction: column; gap: 20px;
          animation: te-expand .25s ease;
          transform-origin: top;
        }

        /* ── Analytics card ── */
        .te-analytics-metric {
          padding: 14px 16px; border-radius: 12px;
          background: #fafafa; border: 1px solid #f1f5f9;
          text-align: center; transition: background .15s;
        }
        .te-analytics-metric:hover { background: #f0fdfa; border-color: #ccfbf1; }

        /* ── Section label ── */
        .te-section-label {
          font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: .1em;
          color: #94a3b8; margin: 0 0 12px;
          display: flex; align-items: center; gap: 6px;
        }
      `}</style>

      <div className="te-root" style={{ maxWidth: 1300, margin: '0 auto', paddingBottom: 80 }}>

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div className="te-fade-up" style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '.12em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Heart size={10} /> Clinical Journey Track
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
              Treatment Episodes
            </h1>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 5 }}>
              Coordinate patient journeys, AI guidance, and follow-up care
            </p>
          </div>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Sora,sans-serif', transition: 'all .15s' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* ── STAT CARDS ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Total Episodes', val: episodes.length, sub: 'all time', icon: Stethoscope, bg: 'linear-gradient(135deg,#0f766e,#0d9488)', delay: 0 },
            { label: 'Active Care',    val: activeCount,     sub: 'active + ongoing', icon: Activity, bg: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', delay: .07 },
            { label: 'Follow-ups',     val: totalFU,         sub: 'total scheduled', icon: Calendar, bg: 'linear-gradient(135deg,#7c3aed,#a78bfa)', delay: .14 },
            { label: 'Patients',       val: totalPatients,   sub: 'unique', icon: Users, bg: 'linear-gradient(135deg,#be185d,#ec4899)', delay: .21 },
          ].map((s, i) => (
            <div key={i} className="te-stat te-fade-up" style={{ background: s.bg, animationDelay: `${s.delay}s` }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <s.icon size={16} color="white" />
                </div>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 4px' }}>{s.label}</p>
                <p style={{ fontSize: 32, fontWeight: 700, color: 'white', margin: '0 0 5px', lineHeight: 1 }}>{s.val}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', margin: 0 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── ANALYTICS STRIP ────────────────────────────────────────── */}
        {analytics && (
          <div className="te-fade-up" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #f1f5f9', padding: '18px 22px', marginBottom: 22, animationDelay: '.28s', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={14} color="#0d9488" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Clinical Performance</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Last 90 days</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
              {[
                { label: 'Resolved Rate', val: `${((analytics.resolved / analytics.totalEpisodes) * 100 || 0).toFixed(0)}%`, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                { label: 'Avg Journey',   val: `${analytics.avgEpisodeLengthDays?.toFixed(0) || 0}d`, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
                { label: 'Missed F-ups',  val: `${analytics.missedRate || 0}%`, color: analytics.missedRate > 20 ? '#dc2626' : '#64748b', bg: analytics.missedRate > 20 ? '#fef2f2' : '#f8fafc', border: analytics.missedRate > 20 ? '#fecaca' : '#e2e8f0' },
                { label: 'Active Load',   val: analytics.active || 0, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
              ].map((a, i) => (
                <div key={i} className="te-analytics-metric" style={{ background: a.bg, borderColor: a.border }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 6px' }}>{a.label}</p>
                  <p className="mono" style={{ fontSize: 24, fontWeight: 800, margin: 0, color: a.color }}>{a.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTERS ────────────────────────────────────────────────── */}
        <div className="te-fade-up" style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center', animationDelay: '.32s' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#cbd5e1' }} />
            <input className="te-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or episode…" />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Filter size={13} color="#94a3b8" />
            {(['ALL', 'ACTIVE', 'ONGOING', 'RESOLVED', 'CHRONIC'] as const).map(s => (
              <button key={s} className={`te-filter${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
                {s === 'ALL' ? 'All Cases' : STATUS_CFG[s as EpisodeStatus].label}
                {s !== 'ALL' && <span style={{ marginLeft: 5, background: filter === s ? 'rgba(13,148,136,.15)' : '#f1f5f9', borderRadius: 99, padding: '1px 6px', fontSize: 10 }}>
                  {episodes.filter(e => e.status === s).length}
                </span>}
              </button>
            ))}
          </div>
        </div>

        {/* ── EPISODE LIST ───────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, border: '2px dashed #e2e8f0', padding: 60, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Stethoscope size={26} color="#5eead4" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No treatment cases found</p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Cases are created when prescriptions are grouped into clinical journeys</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((ep, idx) => {
              const sc = STATUS_CFG[ep.status]
              const isExp = expandedId === ep.id
              const advice = parsedAdvice[ep.id]
              const isGen = generatingAdvice.has(ep.id)
              const linked = linkedRecords[ep.id]
              const isLoadingLinked = loadingRecords.has(ep.id)
              const completedFU = ep.followups.filter(f => f.followupType === 'COMPLETED').length
              const missedFU = ep.followups.filter(f => f.followupType === 'MISSED').length

              return (
                <div key={ep.id} className={`te-episode${isExp ? ' expanded' : ''}`} style={{ animationDelay: `${idx * .05}s` }}>

                  {/* ── Episode header row ─── */}
                  <div
                    className={`te-ep-header${isExp ? ' expanded-hdr' : ''}`}
                    onClick={() => setExpandedId(isExp ? null : ep.id)}
                  >
                    {/* Status accent bar */}
                    <div style={{ width: 4, height: 44, borderRadius: 99, background: sc.gradient, alignSelf: 'center', flexShrink: 0 }} />

                    {/* Avatar */}
                    <img
                      src={generateAvatarUrl(ep.patientName)}
                      alt={ep.patientName}
                      style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                    />

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{ep.episodeName}</span>
                        {/* Status pill */}
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                          {sc.label}
                        </span>
                        {ep.conditionCategory && (
                          <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 999, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 600, flexShrink: 0 }}>
                            {ep.conditionCategory}
                          </span>
                        )}
                        {advice && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                            <Brain size={9} /> AI
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={11} color="#94a3b8" /> {ep.patientName}
                        </span>
                        {ep.primaryDiagnosis && (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>· {ep.primaryDiagnosis}</span>
                        )}
                        <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> {fmtShort(ep.startDate)}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={10} />
                          <span className="mono">{ep.followups.length}</span> follow-ups
                          {missedFU > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>· {missedFU} missed</span>}
                        </span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: isExp ? '#f0fdfa' : '#f8fafc', border: `1.5px solid ${isExp ? '#ccfbf1' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                      {isExp ? <ChevronUp size={15} color="#0d9488" /> : <ChevronDown size={15} color="#94a3b8" />}
                    </div>
                  </div>

                  {/* ── Expanded body ─── */}
                  {isExp && (
                    <div className="te-body">

                      {/* Action buttons row */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => openContextDrawer(ep.patientId, ep.patientName)}
                          className="te-btn" style={{ background: 'white', color: '#475569', borderColor: '#e2e8f0' }}>
                          <TrendingUp size={13} /> Patient Timeline
                        </button>
                        <button onClick={() => loadLinkedRecords(ep.id)} disabled={isLoadingLinked}
                          className="te-btn" style={{ background: 'white', color: '#475569', borderColor: '#e2e8f0', opacity: isLoadingLinked ? .7 : 1 }}>
                          {isLoadingLinked ? <Loader2 size={13} style={{ animation: 'te-spin .8s linear infinite' }} /> : <Link2 size={13} />}
                          Linked Records {linked ? `(${linked.length})` : ''}
                        </button>
                        <button onClick={(e) => handleGenerateAdvice(ep.id, e)} disabled={isGen}
                          className="te-btn" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0', opacity: isGen ? .7 : 1 }}>
                          {isGen ? <Loader2 size={13} style={{ animation: 'te-spin .8s linear infinite' }} /> : <Brain size={13} />}
                          {isGen ? 'Generating…' : advice ? 'Regenerate AI Advice' : 'Generate AI Advice'}
                        </button>
                        <button onClick={() => window.open(`/doctor/records/new?patientId=${ep.patientId}`, '_blank')}
                          className="te-btn" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
                          <FileText size={13} /> Add Record
                        </button>
                      </div>

                      {/* Status transition + follow-up mini progress */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'stretch' }}>
                        {/* Workflow transition */}
                        <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #f1f5f9', padding: '14px 18px' }}>
                          <p className="te-section-label">
                            <Shield size={11} /> Workflow Transition
                          </p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: sc.text, fontWeight: 700, background: sc.bg, border: `1px solid ${sc.border}`, padding: '3px 12px', borderRadius: 7 }}>
                              ● {sc.label}
                            </span>
                            <ArrowRight size={12} color="#94a3b8" />
                            {(['ACTIVE', 'ONGOING', 'RESOLVED', 'CHRONIC'] as EpisodeStatus[]).filter(s => s !== ep.status).map(s => {
                              const tc = STATUS_CFG[s]
                              return (
                                <button key={s} className="te-trans-btn" onClick={() => handleTransitionStatus(ep.id, s)}
                                  style={{ background: tc.bg, color: tc.text, borderColor: tc.border }}>
                                  → {tc.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Follow-up mini stats */}
                        {ep.followups.length > 0 && (
                          <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #f1f5f9', padding: '14px 18px', minWidth: 160 }}>
                            <p className="te-section-label"><Calendar size={11} /> F-up Stats</p>
                            <div style={{ display: 'flex', gap: 12 }}>
                              {[
                                { label: 'Done', val: completedFU, color: '#16a34a' },
                                { label: 'Missed', val: missedFU, color: missedFU > 0 ? '#dc2626' : '#94a3b8' },
                                { label: 'Total', val: ep.followups.length, color: '#0f172a' },
                              ].map(f => (
                                <div key={f.label} style={{ textAlign: 'center' }}>
                                  <p className="mono" style={{ fontSize: 18, fontWeight: 700, color: f.color, margin: 0, lineHeight: 1 }}>{f.val}</p>
                                  <p style={{ fontSize: 9, color: '#94a3b8', margin: '3px 0 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{f.label}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* AI Lifestyle advice */}
                      {advice && (
                        <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #bbf7d0', padding: '18px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <p className="te-section-label" style={{ margin: 0 }}>
                              <Brain size={11} color="#16a34a" />
                              <span style={{ color: '#16a34a' }}>AI Lifestyle Guidance</span>
                            </p>
                            {advice.followUpFrequency && (
                              <span style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: 7, fontWeight: 600 }}>
                                Follow-up: {advice.followUpFrequency}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
                            {[
                              { label: 'Diet',     icon: Apple,       items: advice.dietRecommendations,     color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                              { label: 'Exercise', icon: Dumbbell,    items: advice.exerciseRecommendations, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                              { label: 'Sleep',    icon: Moon,        items: advice.sleepRecommendations,    color: '#7c3aed', bg: '#f5f3ff', border: '#e9d5ff' },
                              { label: 'Red Flags',icon: AlertTriangle,items: advice.redFlags,               color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                            ].filter(sec => sec.items?.length > 0).map((sec, i) => (
                              <div key={i} className="te-advice-section" style={{ background: sec.bg, border: `1px solid ${sec.border}` }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: sec.color, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <sec.icon size={11} /> {sec.label}
                                </p>
                                <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11.5, color: '#475569', lineHeight: 1.7 }}>
                                  {sec.items.slice(0, 3).map((it, j) => <li key={j}>{it}</li>)}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Linked records */}
                      {linked && linked.length > 0 && (
                        <div>
                          <p className="te-section-label"><Link2 size={11} /> Linked Medical Records ({linked.length})</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {linked.map((r, i) => (
                              <div key={i} style={{ padding: '11px 14px', borderRadius: 10, background: 'white', border: '1.5px solid #f1f5f9', fontSize: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <FileText size={13} color="#0d9488" />
                                </div>
                                <span style={{ fontWeight: 600, color: '#1e293b', flex: 1 }}>{r.title}</span>
                                <span className="mono" style={{ color: '#94a3b8', fontSize: 11 }}>{r.recordDate}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-ups list */}
                      {ep.followups?.length > 0 && (
                        <div>
                          <p className="te-section-label"><Calendar size={11} /> Clinical Follow-ups</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {ep.followups.map((f, i) => {
                              const cfg = FU_CFG[f.followupType]
                              return (
                                <div key={i} className="te-followup-row">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: 14, flexShrink: 0 }}>
                                      {cfg.icon}
                                    </span>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0, color: '#1e293b' }}>{f.followupPurpose || 'General Checkup'}</p>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: cfg.text, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: '1px 8px', borderRadius: 999, textTransform: 'uppercase' }}>
                                          {f.followupType}
                                        </span>
                                      </div>
                                      {f.appointmentDate && (
                                        <p className="mono" style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>
                                          {f.appointmentDate}{f.appointmentTime ? ` · ${f.appointmentTime}` : ''}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {f.doctorName && (
                                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, flexShrink: 0 }}>Dr. {f.doctorName}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── CONTEXT DRAWER ─────────────────────────────────────────────── */}
      {contextDrawer.open && (
        <div className="te-overlay" onClick={() => setContextDrawer(p => ({ ...p, open: false }))}>
          <div className="te-drawer" onClick={e => e.stopPropagation()}>

            {/* Drawer header */}
            <div style={{ padding: '22px 24px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: 'white' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={generateAvatarUrl(contextDrawer.patientName)} alt={contextDrawer.patientName} style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} />
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>{contextDrawer.patientName}</h2>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <TrendingUp size={11} /> Clinical Context & Timeline
                  </p>
                </div>
              </div>
              <button onClick={() => setContextDrawer(p => ({ ...p, open: false }))}
                style={{ width: 34, height: 34, borderRadius: 9, background: '#f8fafc', border: '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                <X size={15} color="#64748b" />
              </button>
            </div>

            {/* Quick stats strip */}
            {contextDrawer.records.length > 0 && (
              <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafffe', display: 'flex', gap: 20 }}>
                {[
                  { label: 'Records', val: contextDrawer.records.length, color: '#0d9488' },
                  { label: 'Unlinked', val: contextDrawer.records.filter((r: any) => !r.episodeId).length, color: '#d97706' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {contextDrawer.records.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ width: 40, height: 40, border: '3px solid #f0fdfa', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'te-spin .8s linear infinite', margin: '0 auto 12px' }} />
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Loading records…</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {contextDrawer.records.map((r: any, i: number) => (
                    <div key={i} style={{ padding: '14px 16px', border: `1.5px solid ${r.episodeId ? '#ccfbf1' : '#f1f5f9'}`, borderRadius: 14, background: r.episodeId ? '#fafffe' : 'white', transition: 'all .15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                            <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#0f172a' }}>{r.title}</h4>
                            {r.episodeId && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: '#0d9488', background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '1px 7px', borderRadius: 999, textTransform: 'uppercase' }}>Linked</span>
                            )}
                          </div>
                          <p className="mono" style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>{r.recordDate} · {r.recordType}</p>
                          {r.summary && <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{r.summary}</p>}
                        </div>
                        {expandedId && !r.episodeId && (
                          <button onClick={() => handleLinkRecord(r.id, expandedId)}
                            disabled={linkingRecord?.recordId === r.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'Sora,sans-serif', flexShrink: 0, transition: 'all .15s' }}>
                            <Link2 size={11} />
                            {linkingRecord?.recordId === r.id ? '…' : 'Link'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}