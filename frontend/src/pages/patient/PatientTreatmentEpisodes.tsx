import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { treatmentEpisodeApi, assistantApi, patientApi } from '../../api'
import { LoadingSpinner, MarkdownRenderer } from '../../components/common'
import {
  Activity, Calendar, ChevronDown, ChevronUp, Clock, Heart, Brain,
  AlertTriangle, Apple, Dumbbell, Moon, Smile, Ban, CheckCircle,
  Stethoscope, RefreshCw, MessageCircle, X, Send, Sparkles,
  FileText, TrendingUp, Zap, ArrowRight, Bot, CornerDownRight
} from 'lucide-react'
import toast from 'react-hot-toast'

const SimpleMarkdown = ({ content }: { content: string }) => (
  <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
)
const MD = MarkdownRenderer || SimpleMarkdown

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
  label: string; bg: string; text: string; border: string
  dot: string; icon: typeof Activity; accent: string; glow: string
}> = {
  ACTIVE:   { label: 'Active',   bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e', icon: Activity,    accent: '#16a34a', glow: 'rgba(34,197,94,0.15)' },
  ONGOING:  { label: 'Ongoing',  bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6', icon: RefreshCw,   accent: '#2563eb', glow: 'rgba(59,130,246,0.15)' },
  RESOLVED: { label: 'Resolved', bg: '#f8fafc', text: '#475569', border: '#cbd5e1', dot: '#94a3b8', icon: CheckCircle, accent: '#64748b', glow: 'rgba(148,163,184,0.15)' },
  CHRONIC:  { label: 'Chronic',  bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#f97316', icon: Clock,       accent: '#ea580c', glow: 'rgba(249,115,22,0.15)' },
}

const FU_CFG: Record<FollowupType, { bg: string; text: string; border: string; dot: string }> = {
  SCHEDULED:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  COMPLETED:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  MISSED:     { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', dot: '#ef4444' },
  CANCELLED:  { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#94a3b8' },
}

const ADVICE_SECTIONS = [
  { key: 'dietRecommendations',     label: 'Diet',        icon: Apple,         color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'exerciseRecommendations', label: 'Exercise',    icon: Dumbbell,      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'sleepRecommendations',    label: 'Sleep',       icon: Moon,          color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'stressManagement',        label: 'Stress',      icon: Smile,         color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  { key: 'avoidFoods',             label: 'Avoid',       icon: Ban,           color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { key: 'recommendedActivities',   label: 'Activities',  icon: Heart,         color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { key: 'redFlags',               label: 'Red Flags',   icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
]

const fmt = (v?: string) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const duration = (start: string, end?: string) => {
  const days = Math.floor((new Date(end || Date.now()).getTime() - new Date(start).getTime()) / 86400000)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

export default function PatientTreatmentEpisodes() {
  const [episodes, setEpisodes]           = useState<TreatmentEpisode[]>([])
  const [loading, setLoading]             = useState(true)
  const [filter, setFilter]               = useState<EpisodeStatus | 'ALL'>('ALL')
  const [expandedId, setExpandedId]       = useState<number | null>(null)
  const [activeTab, setActiveTab]         = useState<Record<number, string>>({})
  const [genAdvice, setGenAdvice]         = useState<Set<number>>(new Set())
  const [parsedAdvice, setParsedAdvice]   = useState<Record<number, LifestyleAdvice>>({})
  const [chatOpen, setChatOpen]           = useState(false)
  const [chatEpId, setChatEpId]           = useState<number | null>(null)
  const [chatEpName, setChatEpName]       = useState('')
  const [chatMsgs, setChatMsgs]           = useState<{ role: 'user'|'assistant'; text: string; citations?: any[] }[]>([])
  const [chatInput, setChatInput]         = useState('')
  const [chatLoading, setChatLoading]     = useState(false)
  const [myPatientId, setMyPatientId]     = useState(0)
  const [epRecords, setEpRecords]         = useState<Record<number, any[]>>({})
  const chatBottomRef                     = useRef<HTMLDivElement>(null)
  const chatInputRef                      = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadEpisodes()
    patientApi.getProfile().then(r => setMyPatientId(r.data?.data?.id || 0)).catch(() => {})
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs])

  const loadEpisodes = async () => {
    try {
      const res = await treatmentEpisodeApi.getMy()
      const data: TreatmentEpisode[] = res.data.data || []
      setEpisodes(data)
      const map: Record<number, LifestyleAdvice> = {}
      data.forEach(ep => { if (ep.aiLifestyleAdvice) { try { map[ep.id] = JSON.parse(ep.aiLifestyleAdvice) } catch {} } })
      setParsedAdvice(map)
    } catch { toast.error('Failed to load treatment episodes') }
    finally { setLoading(false) }
  }

  const handleGenerateAdvice = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setGenAdvice(p => new Set(p).add(id))
    try {
      const res = await treatmentEpisodeApi.generateLifestyleAdvice(id)
      setParsedAdvice(p => ({ ...p, [id]: res.data.data }))
      await loadEpisodes()
      toast.success('AI lifestyle advice generated!')
    } catch { toast.error('Failed to generate advice') }
    finally { setGenAdvice(p => { const n = new Set(p); n.delete(id); return n }) }
  }

  const handleExpand = async (id: number) => {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    if (!activeTab[id]) setActiveTab(p => ({ ...p, [id]: 'followups' }))
    if (next && !epRecords[next]) {
      try {
        const res = await treatmentEpisodeApi.getLinkedRecords(next)
        setEpRecords(p => ({ ...p, [next]: res.data?.data || [] }))
      } catch {}
    }
  }

  const openChat = (ep: TreatmentEpisode, e: React.MouseEvent) => {
    e.stopPropagation()
    setChatEpId(ep.id); setChatEpName(ep.episodeName)
    setChatMsgs([{ role: 'assistant', text: `Hi! I'm your Health Assistant. I have full context about **"${ep.episodeName}"**${ep.primaryDiagnosis ? ` — diagnosed as *${ep.primaryDiagnosis}*` : ''}.\n\nWhat would you like to know?` }])
    setChatOpen(true)
    setTimeout(() => chatInputRef.current?.focus(), 120)
  }

  const sendMessage = async () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatMsgs(p => [...p, { role: 'user', text: msg }])
    setChatLoading(true)
    try {
      const res = await assistantApi.chat({ patientId: myPatientId, message: msg, episodeId: chatEpId || undefined })
      const d = res.data?.data
      if (d) setChatMsgs(p => [...p, { role: 'assistant', text: d.reply, citations: d.citations }])
    } catch {
      setChatMsgs(p => [...p, { role: 'assistant', text: 'Unable to process that right now. Please try again.' }])
    } finally { setChatLoading(false) }
  }

  const filtered = episodes.filter(ep => filter === 'ALL' || ep.status === filter)
  const activeCount   = episodes.filter(ep => ['ACTIVE','ONGOING'].includes(ep.status)).length
  const resolvedCount = episodes.filter(ep => ep.status === 'RESOLVED').length
  const totalFU       = episodes.reduce((a, ep) => a + ep.followups.length, 0)
  const doneFU        = episodes.reduce((a, ep) => a + ep.followups.filter(f => f.followupType === 'COMPLETED').length, 0)

  if (loading) return <LoadingSpinner />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        .te-root * { font-family: 'Sora', sans-serif !important; }
        .te-mono { font-family: 'JetBrains Mono', monospace !important; }

        @keyframes te-in { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes te-spin { to { transform:rotate(360deg); } }
        @keyframes te-dot { 0%,100% { transform:scale(0.6); opacity:0.4; } 40% { transform:scale(1); opacity:1; } }
        @keyframes te-ring { 0% { transform:scale(1); opacity:0.6; } 100% { transform:scale(1.5); opacity:0; } }

        .te-container {
          max-width: 1100px; margin: 0 auto; padding-bottom: 80px;
          animation: te-in 0.4s ease both;
        }

        .te-card {
          background: #fff; border-radius: 20px; border: 1.5px solid #eef2f7;
          box-shadow: 0 4px 15px rgba(0,0,0,0.03); overflow: hidden;
          transition: all 0.25s cubic-bezier(.4,0,.2,1);
          margin-bottom: 16px;
        }
        .te-card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: #0d948830; }

        .te-stat-card {
          border-radius: 24px; padding: 24px; color: #fff;
          position: relative; overflow: hidden;
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }
        .te-stat-card:hover { transform: scale(1.02); }

        .te-filter-btn {
          padding: 8px 18px; border-radius: 14px; font-size: 13px; font-weight: 700;
          border: 1.5px solid #eef2f7; cursor: pointer; transition: all 0.2s;
          background: #fff; color: #64748b;
        }
        .te-filter-btn.on { background: #0f172a; color: #fff; border-color: #0f172a; }
        .te-filter-btn:hover:not(.on) { background: #f8fafc; border-color: #cbd5e1; }

        .te-tab-btn {
          padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 700;
          cursor: pointer; border: none; transition: all 0.2s;
          background: transparent; color: #94a3b8;
        }
        .te-tab-btn.on { background: #f1f5f9; color: #0f172a; }
        .te-tab-btn:hover:not(.on) { background: #f8fafc; color: #475569; }

        .te-chat-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(15,23,42,0.4); backdrop-filter: blur(8px);
          display: flex; align-items: flex-end; justify-content: flex-end; padding: 24px;
        }
        .te-chat-window {
          width: 440px; height: 640px; background: #fff; border-radius: 28px;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,0.25);
          animation: te-in 0.3s cubic-bezier(.34,1.56,.64,1) both;
        }
      `}</style>

      <div className="te-root te-container">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <TrendingUp size={18} color="#0d9488" />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Journey Track</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Treatment Episodes</h1>
            <p style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>Monitor your healthcare milestones and AI lifestyle guidance</p>
          </div>
          <button onClick={loadEpisodes} style={{ padding: '12px 24px', borderRadius: 14, background: '#fff', border: '1.5px solid #eef2f7', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'} onMouseLeave={e => e.currentTarget.style.borderColor = '#eef2f7'}>
            <RefreshCw size={16} /> Refresh Data
          </button>
        </div>

        {/* ── Stats Row ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
          {[
            { label: 'Total Episodes', val: episodes.length, color1: '#0d9488', color2: '#0891b2', icon: Stethoscope },
            { label: 'Active Care', val: activeCount, color1: '#2563eb', color2: '#3b82f6', icon: Activity },
            { label: 'Milestones', val: doneFU, color1: '#7c3aed', color2: '#a855f7', icon: CheckCircle },
          ].map((s, i) => (
            <div key={i} className="te-stat-card" style={{ background: `linear-gradient(135deg, ${s.color1}, ${s.color2})` }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <s.icon size={22} color="#fff" />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter Status:</span>
          {(['ALL', 'ACTIVE', 'ONGOING', 'RESOLVED', 'CHRONIC'] as const).map(s => (
            <button key={s} className={`te-filter-btn ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* ── Episodes List ──────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 24, border: '2px dashed #e2e8f0', padding: 80, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Stethoscope size={32} color="#0d9488" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 10px' }}>No episodes found</h3>
            <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 440, margin: '0 auto' }}>Treatments are created by your doctor to group visits, medications, and clinical notes.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filtered.map((ep, idx) => {
              const sc = STATUS_CFG[ep.status] || STATUS_CFG.ACTIVE
              const advice = parsedAdvice[ep.id]
              const expanded = expandedId === ep.id
              const isGen = genAdvice.has(ep.id)
              const tab = activeTab[ep.id] || 'followups'
              const recs = epRecords[ep.id] || []

              return (
                <div key={ep.id} className="te-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                  {/* Header */}
                  <div onClick={() => handleExpand(ep.id)} style={{ padding: '24px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, background: expanded ? '#fafbfc' : '#fff' }}>
                    <div style={{ display: 'flex', gap: 20, flex: 1 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${sc.accent}, ${sc.dot})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 8px 20px ${sc.glow}` }}>
                        <sc.icon size={24} color="#fff" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: sc.text, background: sc.bg, padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${sc.border}` }}>
                            {sc.label}
                          </span>
                          {ep.conditionCategory && <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: '#f8fafc', padding: '4px 12px', borderRadius: 20, border: '1.5px solid #eef2f7' }}>{ep.conditionCategory}</span>}
                        </div>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.01em' }}>{ep.episodeName}</h3>
                        {ep.primaryDiagnosis && <p style={{ fontSize: 13, color: '#475569', margin: '0 0 12px' }}><strong>Diagnosis:</strong> {ep.primaryDiagnosis}</p>}
                        
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#94a3b8', fontSize: 11.5, fontWeight: 600 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={13} /> Dr. {ep.doctorName}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={13} /> {fmt(ep.startDate)}{ep.endDate ? ` → ${fmt(ep.endDate)}` : ' (ongoing)'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'center', background: '#f8fafc', padding: '8px 16px', borderRadius: 14, border: '1.5px solid #eef2f7' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }} className="te-mono">{duration(ep.startDate, ep.endDate)}</div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</div>
                      </div>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: expanded ? '#f0fdfa' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {expanded ? <ChevronUp size={22} color="#0d9488" /> : <ChevronDown size={22} color="#94a3b8" />}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  {expanded && (
                    <div style={{ borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
                      <div style={{ padding: '0 24px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 4, padding: '12px 0' }}>
                          {[
                            { id: 'followups', label: 'Timeline', count: ep.followups.length },
                            { id: 'records', label: 'Clinical Records', count: recs.length },
                            { id: 'advice', label: 'AI Lifestyle Advice', count: advice ? 1 : 0 },
                          ].map(t => (
                            <button key={t.id} className={`te-tab-btn ${tab === t.id ? 'on' : ''}`} onClick={() => setActiveTab(p => ({ ...p, [ep.id]: t.id }))}>
                              {t.label} {t.count > 0 && <span style={{ marginLeft: 6, opacity: 0.5 }}>{t.count}</span>}
                            </button>
                          ))}
                        </div>
                        <button onClick={e => openChat(ep, e)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: '#f0fdfa', color: '#0d9488', border: '1.5px solid #99f6e4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          <Bot size={16} /> Consult AI
                        </button>
                      </div>

                      <div style={{ padding: '24px' }}>
                        {/* Tab Contents */}
                        {tab === 'followups' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', paddingLeft: 24 }}>
                            <div style={{ position: 'absolute', left: 4, top: 12, bottom: 12, width: 3, background: 'linear-gradient(to bottom, #0d9488, #eef2f7)', borderRadius: 4 }} />
                            {ep.followups.map((f, i) => {
                              const fc = FU_CFG[f.followupType] || FU_CFG.SCHEDULED
                              return (
                                <div key={f.id} style={{ position: 'relative' }}>
                                  <div style={{ position: 'absolute', left: -28, top: 16, width: 12, height: 12, borderRadius: '50%', background: '#fff', border: `3px solid ${fc.dot}`, boxShadow: '0 0 0 4px #fafbfc' }} />
                                  <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 16, border: '1.5px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                        <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Visit #{i + 1}</span>
                                        <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: fc.bg, color: fc.text, border: `1px solid ${fc.border}` }}>{f.followupType}</span>
                                      </div>
                                      <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{f.followupPurpose}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{f.appointmentDate}</div>
                                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{f.appointmentTime}</div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {tab === 'records' && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                            {recs.map((r: any) => (
                              <div key={r.id} style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1.5px solid #eef2f7' }}>
                                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileText size={18} color="#0d9488" />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{r.title}</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{fmt(r.recordDate)}</div>
                                  </div>
                                </div>
                                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{r.summary}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {tab === 'advice' && (
                          <div style={{ background: '#fff', padding: 24, borderRadius: 20, border: '1.5px solid #eef2f7' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Brain size={22} color="#9333ea" />
                                </div>
                                <div>
                                  <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>AI Lifestyle Guidance</h4>
                                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Personalised clinical recommendations</p>
                                </div>
                              </div>
                              <button onClick={e => handleGenerateAdvice(ep.id, e)} disabled={isGen} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: isGen ? '#f8fafc' : '#7c3aed', color: isGen ? '#94a3b8' : '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: isGen ? 'not-allowed' : 'pointer', boxShadow: isGen ? 'none' : '0 4px 12px rgba(124,58,237,0.3)' }}>
                                {isGen ? <RefreshCw size={16} className="te-spin" /> : <Sparkles size={16} />}
                                {isGen ? 'Thinking...' : advice ? 'Regenerate' : 'Analyze Now'}
                              </button>
                            </div>

                            {advice ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                                {ADVICE_SECTIONS.map(s => {
                                  const items = (advice as any)[s.key] || []
                                  if (!items.length) return null
                                  return (
                                    <div key={s.key} style={{ background: '#fff', padding: 20, borderRadius: 16, border: `1.5px solid ${s.border}` }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <s.icon size={16} color={s.color} />
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: s.color, textTransform: 'uppercase' }}>{s.label}</span>
                                      </div>
                                      <ul style={{ paddingLeft: 16, margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
                                        {items.map((it: string, idx: number) => <li key={idx}>{it}</li>)}
                                      </ul>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Zap size={48} color="#e2e8f0" style={{ marginBottom: 16 }} />
                                <p style={{ fontSize: 14, color: '#94a3b8' }}>Generate AI advice to see lifestyle recommendations for this episode.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── AI Consultation Overlay ─────────────────────────────────────── */}
      {chatOpen && (
        <div className="te-chat-overlay" onClick={() => setChatOpen(false)}>
          <div className="te-chat-window" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>MediCare Assistant</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>Episode Context: {chatEpName}</div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: 36, height: 36, borderRadius: 10, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {chatMsgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%', padding: '14px 18px', borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background: m.role === 'user' ? 'linear-gradient(135deg, #0d9488, #0891b2)' : '#f1f5f9',
                    color: m.role === 'user' ? '#fff' : '#1e293b',
                    fontSize: 14, lineHeight: 1.6, boxShadow: m.role === 'user' ? '0 4px 12px rgba(13,148,136,0.2)' : 'none'
                  }}>
                    <MD content={m.text} />
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: '#f1f5f9', borderRadius: '4px 20px 20px 20px', alignSelf: 'flex-start' }}>
                  {[0,1,2].map(d => <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: `te-dot 1s ${d*0.2}s infinite` }} />)}
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div style={{ padding: '20px 24px 32px', background: '#fafbfc', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Ask a health question..."
                  style={{ flex: 1, padding: '12px 18px', borderRadius: 14, border: '1.5px solid #eef2f7', outline: 'none', fontSize: 14, fontFamily: 'Sora, sans-serif' }}
                />
                <button onClick={sendMessage} disabled={!chatInput.trim() || chatLoading} style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {chatLoading ? <RefreshCw size={20} className="te-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}