import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import {
  treatmentEpisodeApi, medicalRecordApi, appointmentApi, assistantApi, analyticsApi
} from '../../api'
import {
  Activity, AlertTriangle, BarChart3, Brain, Calendar, CheckCircle2, ChevronDown, ChevronUp,
  Clock, FileText, Folder, FolderOpen, Loader2, MessageSquare, Plus, RefreshCw,
  Send, Sparkles, Stethoscope, TrendingUp, Users, X, Bot, RotateCcw,
  FlaskConical, Scan, Syringe, Edit3, CheckSquare, XSquare, ArrowRight,
  FileEdit, Apple, Dumbbell, Search, Filter, Heart, Shield, Moon, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { MarkdownRenderer } from '../../components/common'

// ─── Types ────────────────────────────────────────────────────────────────────
interface LifestyleAdvice {
  dietRecommendations: string[]
  exerciseRecommendations: string[]
  sleepRecommendations: string[]
  stressManagement: string[]
  avoidFoods: string[]
  recommendedActivities: string[]
  redFlags: string[]
  followUpFrequency: string
  providerUsed: string
  aiPowered: boolean
}

interface Followup {
  id: number
  followupType: string
  followupPurpose?: string
  notes?: string
  appointmentDate?: string
  appointmentTime?: string
  doctorName?: string
  appointmentId?: number
}

interface Episode {
  id: number
  patientId: number
  patientName: string
  episodeName: string
  primaryDiagnosis: string
  conditionCategory: string
  status: string
  startDate: string
  endDate?: string
  doctorName?: string
  doctorSpecialization?: string
  followups: Followup[]
  aiLifestyleAdvice?: string
  primaryAppointmentId?: number
}

interface MedRecord {
  id: number
  recordType: string
  title: string
  summary?: string
  details?: string
  recordDate: string
  patientId: number
  patientName?: string
  episodeId?: number
  attachmentUrl?: string
  doctorName?: string
}

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: { type: string; id: number; snippet: string }[]
  suggestedActions?: { type: string; label: string }[]
  confidence?: string
  timestamp: Date
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, {
  bg: string; text: string; border: string; dot: string; label: string; gradient: string
}> = {
  ACTIVE:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6', label: 'Active',   gradient: 'linear-gradient(135deg,#1d4ed8,#60a5fa)' },
  ONGOING:  { bg: '#fffbeb', text: '#92400e', border: '#fde68a', dot: '#f59e0b', label: 'Ongoing',  gradient: 'linear-gradient(135deg,#d97706,#fbbf24)' },
  RESOLVED: { bg: '#f0fdf4', text: '#14532d', border: '#bbf7d0', dot: '#22c55e', label: 'Resolved', gradient: 'linear-gradient(135deg,#15803d,#4ade80)' },
  CHRONIC:  { bg: '#fdf4ff', text: '#581c87', border: '#e9d5ff', dot: '#a855f7', label: 'Chronic',  gradient: 'linear-gradient(135deg,#7c3aed,#c084fc)' },
}

const FOLLOWUP_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  SCHEDULED:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: '📅' },
  COMPLETED:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', icon: '✅' },
  MISSED:     { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', icon: '⚠️' },
  CANCELLED:  { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', icon: '✕' },
}

const REC_ICON: Record<string, typeof FileText> = {
  LAB_RESULT: FlaskConical,
  IMAGING_REPORT: Scan,
  DIAGNOSTIC_TEST: Activity,
  VACCINATION: Syringe,
  MEDICAL_HISTORY: FileText,
  OTHER: FileText,
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  ACTIVE:   ['ONGOING', 'RESOLVED', 'CHRONIC'],
  ONGOING:  ['ACTIVE', 'RESOLVED', 'CHRONIC'],
  RESOLVED: ['ACTIVE', 'CHRONIC'],
  CHRONIC:  ['ACTIVE', 'RESOLVED'],
}

const generateAvatarUrl = (name?: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'P')}&background=0d9488&color=fff&bold=true&size=40`

// ─── Chat Bubble ──────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', gap: 8, padding: '5px 14px',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'dmh-fade .22s ease'
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg,#0d9488,#0f766e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 2
        }}>
          <Bot style={{ width: 13, height: 13, color: 'white' }} />
        </div>
      )}
      <div style={{ maxWidth: '78%' }}>
        <div style={{
          background: isUser ? 'linear-gradient(135deg,#0d9488,#0f766e)' : 'white',
          color: isUser ? 'white' : '#1e293b',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '10px 14px', fontSize: 13, lineHeight: 1.65,
          border: isUser ? 'none' : '1.5px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,.05)',
          wordBreak: 'break-word'
        }}>
          {isUser ? msg.content : <MarkdownRenderer content={msg.content} />}
        </div>
        {!isUser && msg.citations?.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
            {msg.citations.map((c, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 20,
                background: '#f0fdfa', color: '#0d9488',
                border: '1px solid #ccfbf1', fontWeight: 700
              }}>
                {c.type}#{c.id}
              </span>
            ))}
          </div>
        ) : null}
        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isUser && msg.confidence && (
            <span style={{
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em',
              color: msg.confidence === 'high' ? '#16a34a' : msg.confidence === 'medium' ? '#d97706' : '#dc2626',
            }}>{msg.confidence}</span>
          )}
          {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DoctorMedicalHistory() {
  const { user } = useAuthStore()

  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [recordsByEp, setRecordsByEp] = useState<Record<number, MedRecord[]>>({})

  const [statusLoading, setStatusLoading] = useState<Record<number, boolean>>({})
  const [followupLoading, setFollowupLoading] = useState<Record<number, boolean>>({})

  const [chatOpen, setChatOpen] = useState(false)
  const [chatEpisode, setChatEpisode] = useState<Episode | null>(null)
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [sessionId] = useState(() => `doc${user?.userId}_${Date.now()}`)

  const [insightsMap, setInsightsMap] = useState<Record<number, any>>({})
  const [insightsLoading, setInsightsLoading] = useState<Record<number, boolean>>({})
  const [generatingAdvice, setGeneratingAdvice] = useState<Set<number>>(new Set())
  const [parsedAdvice, setParsedAdvice] = useState<Record<number, LifestyleAdvice>>({})

  const [patientSearch, setPatientSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, chatLoading])

  const load = async () => {
    setLoading(true)
    try {
      const from = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
      const to = new Date().toISOString().split('T')[0]
      const [epRes, anaRes] = await Promise.all([
        treatmentEpisodeApi.getMy(),
        analyticsApi.episodeSummary(from, to),
      ])
      const eps: Episode[] = epRes.data.data || []
      setEpisodes(eps)
      setAnalytics(anaRes.data?.data)

      const adviceMap: Record<number, LifestyleAdvice> = {}
      eps.forEach(ep => {
        if (ep.aiLifestyleAdvice) {
          try { adviceMap[ep.id] = JSON.parse(ep.aiLifestyleAdvice) } catch {}
        }
      })
      setParsedAdvice(adviceMap)
    } catch { toast.error('Failed to load clinical data') }
    finally { setLoading(false) }
  }

  const loadEpisodeRecords = async (epId: number) => {
    if (recordsByEp[epId]) return
    try {
      const { data } = await treatmentEpisodeApi.getLinkedRecords(epId)
      setRecordsByEp(p => ({ ...p, [epId]: data.data || [] }))
    } catch { setRecordsByEp(p => ({ ...p, [epId]: [] })) }
  }

  const handleExpand = (epId: number) => {
    if (expanded === epId) { setExpanded(null); return }
    setExpanded(epId)
    loadEpisodeRecords(epId)
  }

  const changeStatus = async (ep: Episode, newStatus: string) => {
    setStatusLoading(p => ({ ...p, [ep.id]: true }))
    try {
      await treatmentEpisodeApi.transitionStatus(ep.id, { status: newStatus })
      setEpisodes(prev => prev.map(e => e.id === ep.id ? { ...e, status: newStatus } : e))
      toast.success(`Episode marked as ${newStatus.toLowerCase()}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update status')
    } finally { setStatusLoading(p => ({ ...p, [ep.id]: false })) }
  }

  const updateFollowup = async (ep: Episode, followupId: number, status: string) => {
    setFollowupLoading(p => ({ ...p, [followupId]: true }))
    try {
      await treatmentEpisodeApi.updateFollowupStatus(followupId, status)
      setEpisodes(prev => prev.map(e => e.id !== ep.id ? e : {
        ...e, followups: e.followups.map(f => f.id === followupId ? { ...f, followupType: status } : f)
      }))
      toast.success('Follow-up updated')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update follow-up')
    } finally { setFollowupLoading(p => ({ ...p, [followupId]: false })) }
  }

  const openChat = (ep: Episode) => {
    setChatEpisode(ep)
    setChatOpen(true)
    setMsgs([{
      id: 'init', role: 'assistant', timestamp: new Date(), confidence: 'high',
      content: `Clinical context loaded for **${ep.patientName}** — *${ep.episodeName}*${ep.primaryDiagnosis ? ` (${ep.primaryDiagnosis})` : ''}.\n\nWhat would you like to know?`
    }])
  }

  const sendMsg = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || chatLoading || !chatEpisode) return
    setMsgs(prev => [...prev, { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() }])
    setInput('')
    setChatLoading(true)
    try {
      const { data } = await assistantApi.chat({
        patientId: chatEpisode.patientId,
        message: msg,
        episodeId: chatEpisode.id,
        sessionId: `${sessionId}_ep${chatEpisode.id}`,
      })
      setMsgs(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', timestamp: new Date(),
        content: data.data.reply, citations: data.data.citations,
        suggestedActions: data.data.suggestedActions, confidence: data.data.confidence
      }])
    } catch (err: any) {
      setMsgs(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', timestamp: new Date(),
        content: err?.response?.data?.error || 'Something went wrong.', confidence: 'low'
      }])
    } finally { setChatLoading(false); inputRef.current?.focus() }
  }, [input, chatLoading, chatEpisode, sessionId])

  const generateInsights = async (epId: number) => {
    setInsightsLoading(p => ({ ...p, [epId]: true }))
    try {
      const { data } = await assistantApi.generateEpisodeInsights(epId)
      setInsightsMap(p => ({ ...p, [epId]: data.data }))
    } catch { toast.error('Failed to generate insights') }
    finally { setInsightsLoading(p => ({ ...p, [epId]: false })) }
  }

  const handleGenerateAdvice = async (episodeId: number) => {
    setGeneratingAdvice(prev => new Set(prev).add(episodeId))
    try {
      const res = await treatmentEpisodeApi.generateLifestyleAdvice(episodeId)
      setParsedAdvice(prev => ({ ...prev, [episodeId]: res.data.data }))
      toast.success('Lifestyle advice generated')
    } catch { toast.error('Failed to generate advice') }
    finally {
      setGeneratingAdvice(prev => { const n = new Set(prev); n.delete(episodeId); return n })
    }
  }

  const filtered = episodes.filter(ep => {
    const matchPt = !patientSearch || ep.patientName?.toLowerCase().includes(patientSearch.toLowerCase())
    const matchSt = statusFilter === 'ALL' || ep.status === statusFilter
    return matchPt && matchSt
  })

  const stats = {
    total: episodes.length,
    active: episodes.filter(e => ['ACTIVE', 'ONGOING'].includes(e.status)).length,
    resolved: episodes.filter(e => e.status === 'RESOLVED').length,
    chronic: episodes.filter(e => e.status === 'CHRONIC').length,
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 14, fontFamily: "'Sora', sans-serif" }}>
      <div style={{ width: 40, height: 40, border: '3px solid #f0fdfa', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'dmh-spin .8s linear infinite' }} />
      <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, fontWeight: 500 }}>Loading patient episodes…</p>
      <style>{`@keyframes dmh-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .dmh-root { font-family: 'Sora', sans-serif; color: #0f172a; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        @keyframes dmh-fade   { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes dmh-spin   { to{transform:rotate(360deg);} }
        @keyframes dmh-up     { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
        @keyframes dmh-expand { from{opacity:0;transform:scaleY(.96);} to{opacity:1;transform:scaleY(1); } }
        @keyframes dmh-bounce { 0%,80%,100%{transform:scale(0);opacity:.5;} 40%{transform:scale(1);opacity:1;} }

        .dmh-fade-up { animation: dmh-up .4s ease both; }

        /* ── Stat cards ── */
        .dmh-stat {
          border-radius: 16px; padding: 20px 22px;
          position: relative; overflow: hidden;
          transition: transform .2s, box-shadow .2s;
        }
        .dmh-stat:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,.12); }

        /* ── Episode card ── */
        .dmh-episode {
          background: white; border-radius: 16px;
          border: 1.5px solid #f1f5f9; overflow: hidden;
          transition: border-color .2s, box-shadow .2s;
          animation: dmh-fade .35s ease both;
        }
        .dmh-episode:hover { border-color: #ccfbf1; box-shadow: 0 4px 20px rgba(13,148,136,.08); }
        .dmh-episode.is-expanded { border-color: #99f6e4; box-shadow: 0 6px 28px rgba(13,148,136,.1); }

        /* ── Episode header ── */
        .dmh-ep-hdr {
          padding: 18px 22px; cursor: pointer;
          display: grid;
          grid-template-columns: 4px 44px 1fr auto;
          gap: 14px; align-items: center;
          transition: background .15s;
        }
        .dmh-ep-hdr:hover { background: #fafffe; }
        .dmh-ep-hdr.expanded { background: #f8fffe; }

        /* ── Filter chip ── */
        .dmh-chip {
          padding: 7px 16px; border-radius: 999px;
          font-size: 11px; font-weight: 700;
          border: 1.5px solid #e2e8f0; background: white; color: #64748b;
          cursor: pointer; transition: all .15s;
          font-family: 'Sora', sans-serif;
        }
        .dmh-chip:hover { border-color: #0d9488; color: #0d9488; }
        .dmh-chip.active { background: #f0fdfa; border-color: #5eead4; color: #0f766e; }

        /* ── Status transition btn ── */
        .dmh-trans-btn {
          padding: 5px 14px; border-radius: 8px; border: 1.5px solid;
          cursor: pointer; font-size: 11px; font-weight: 700;
          font-family: 'Sora', sans-serif; transition: all .15s;
        }
        .dmh-trans-btn:hover { transform: translateY(-1px); opacity: .85; }

        /* ── Search ── */
        .dmh-search {
          width: 100%; padding: 9px 12px 9px 38px;
          border-radius: 10px; border: 1.5px solid #e2e8f0;
          font-family: 'Sora', sans-serif; font-size: 13px;
          color: #1e293b; outline: none; transition: all .2s; background: white;
        }
        .dmh-search:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,.08); }
        .dmh-search::placeholder { color: #cbd5e1; }

        /* ── Section label ── */
        .dmh-section-label {
          font-size: 10px; font-weight: 800; text-transform: uppercase;
          letter-spacing: .1em; color: #94a3b8; margin: 0 0 12px;
          display: flex; align-items: center; gap: 6px;
        }

        /* ── Expanded body ── */
        .dmh-body {
          padding: 20px 22px; border-top: 1.5px solid #f0fdfa;
          background: #fafffe; display: flex; flex-direction: column; gap: 20px;
          animation: dmh-expand .25s ease; transform-origin: top;
        }

        /* ── Follow-up row ── */
        .dmh-fu-row {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 14px; border-radius: 12px;
          background: white; border: 1.5px solid #f1f5f9;
          transition: border-color .15s;
        }
        .dmh-fu-row:hover { border-color: #ccfbf1; }

        /* ── Record row ── */
        .dmh-rec-row {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          background: white; border: 1.5px solid #f1f5f9;
          transition: border-color .15s;
        }
        .dmh-rec-row:hover { border-color: #e9d5ff; }

        /* ── Chat panel ── */
        .dmh-chat-panel {
          position: fixed; bottom: 24px; right: 24px; width: 420px; height: 560px;
          background: white; border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,.14), 0 4px 16px rgba(0,0,0,.06);
          display: flex; flex-direction: column; z-index: 1000;
          border: 1.5px solid #e2e8f0; animation: dmh-up .28s ease;
        }

        .dmh-fab {
          position: fixed; bottom: 24px; right: 24px; width: 52px; height: 52px;
          border-radius: 50%; background: linear-gradient(135deg,#0d9488,#0f766e);
          border: none; cursor: pointer; display: flex; align-items: center;
          justify-content: center; box-shadow: 0 8px 24px rgba(13,148,136,.35);
          z-index: 999; transition: all .2s;
        }
        .dmh-fab:hover { transform: scale(1.08); }

        /* ── Insight / advice panels ── */
        .dmh-insight-panel {
          background: linear-gradient(135deg,#faf5ff,#ede9fe);
          border: 1.5px solid #c4b5fd; border-radius: 14px; padding: 16px;
          animation: dmh-fade .3s ease;
        }
        .dmh-advice-panel {
          background: white; border: 1.5px solid #bbf7d0;
          border-radius: 14px; padding: 16px; animation: dmh-fade .3s ease;
        }

        /* ── Action button ── */
        .dmh-action-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 10px; font-size: 12px;
          font-weight: 700; cursor: pointer; transition: all .2s;
          font-family: 'Sora', sans-serif; border: 1.5px solid;
          white-space: nowrap;
        }
        .dmh-action-btn:hover { transform: translateY(-1px); }
        .dmh-action-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }

        .dmh-analytics-metric {
          padding: 14px 16px; border-radius: 12px; text-align: center;
          transition: background .15s;
        }
        .dmh-analytics-metric:hover { background: #f0fdfa !important; border-color: #ccfbf1 !important; }
      `}</style>

      <div className="dmh-root" style={{ maxWidth: 1300, margin: '0 auto', paddingBottom: 100 }}>

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div className="dmh-fade-up" style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '.12em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Heart size={10} /> Doctor Portal
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>Patient Episodes</h1>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 5 }}>
              Manage treatment episodes, follow-ups, and AI clinical insights
            </p>
          </div>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Sora,sans-serif', transition: 'all .15s' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* ── STAT CARDS ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Total Episodes',  val: stats.total,    sub: 'all time',          icon: Stethoscope, bg: 'linear-gradient(135deg,#0f766e,#0d9488)', delay: 0 },
            { label: 'Active / Ongoing',val: stats.active,   sub: 'requiring attention',icon: Activity,   bg: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', delay: .07 },
            { label: 'Resolved',        val: stats.resolved, sub: 'completed journeys', icon: CheckCircle2,bg: 'linear-gradient(135deg,#15803d,#22c55e)', delay: .14 },
            { label: 'Chronic',         val: stats.chronic,  sub: 'long-term care',     icon: Shield,     bg: 'linear-gradient(135deg,#7c3aed,#a78bfa)', delay: .21 },
          ].map((s, i) => (
            <div key={i} className="dmh-stat dmh-fade-up" style={{ background: s.bg, animationDelay: `${s.delay}s` }}>
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
          <div className="dmh-fade-up" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #f1f5f9', padding: '18px 22px', marginBottom: 22, animationDelay: '.28s', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
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
                <div key={i} className="dmh-analytics-metric" style={{ background: a.bg, border: `1px solid ${a.border}` }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 6px' }}>{a.label}</p>
                  <p className="mono" style={{ fontSize: 24, fontWeight: 800, margin: 0, color: a.color }}>{a.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTERS ────────────────────────────────────────────────── */}
        <div className="dmh-fade-up" style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center', animationDelay: '.32s' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#cbd5e1' }} />
            <input className="dmh-search" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} placeholder="Search patients…" />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Filter size={13} color="#94a3b8" />
            {(['ALL', 'ACTIVE', 'ONGOING', 'RESOLVED', 'CHRONIC'] as const).map(s => (
              <button key={s} className={`dmh-chip${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s === 'ALL' ? 'All' : STATUS_CFG[s]?.label || s}
                {s !== 'ALL' && (
                  <span style={{ marginLeft: 5, background: statusFilter === s ? 'rgba(13,148,136,.15)' : '#f1f5f9', borderRadius: 99, padding: '1px 6px', fontSize: 10 }}>
                    {episodes.filter(e => e.status === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── EPISODE LIST ───────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, border: '2px dashed #e2e8f0', padding: 60, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <FolderOpen size={26} color="#5eead4" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No episodes found</p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Episodes are created when you add prescriptions or via appointment details</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((ep, idx) => {
              const sc = STATUS_CFG[ep.status] || STATUS_CFG.ACTIVE
              const isOpen = expanded === ep.id
              const records = recordsByEp[ep.id] || []
              const insight = insightsMap[ep.id]
              const transitions = STATUS_TRANSITIONS[ep.status] || []
              const advice = parsedAdvice[ep.id]
              const isGen = generatingAdvice.has(ep.id)
              const missedFU = ep.followups?.filter(f => f.followupType === 'MISSED').length || 0
              const completedFU = ep.followups?.filter(f => f.followupType === 'COMPLETED').length || 0

              return (
                <div key={ep.id} className={`dmh-episode${isOpen ? ' is-expanded' : ''}`} style={{ animationDelay: `${idx * .05}s` }}>

                  {/* ── Header row ── */}
                  <div className={`dmh-ep-hdr${isOpen ? ' expanded' : ''}`} onClick={() => handleExpand(ep.id)}>
                    {/* Accent bar */}
                    <div style={{ width: 4, height: 44, borderRadius: 99, background: sc.gradient, alignSelf: 'center', flexShrink: 0 }} />

                    {/* Avatar */}
                    <img src={generateAvatarUrl(ep.patientName)} alt={ep.patientName}
                      style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{ep.episodeName}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 999,
                          background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                          {sc.label}
                        </span>
                        {ep.conditionCategory && (
                          <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 999, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 600, flexShrink: 0 }}>
                            {ep.conditionCategory}
                          </span>
                        )}
                        {insight && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                            <Sparkles size={9} /> Insights
                          </span>
                        )}
                        {advice && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                            <Brain size={9} /> AI
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={11} color="#94a3b8" /> {ep.patientName}
                          {ep.primaryDiagnosis && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {ep.primaryDiagnosis}</span>}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> {ep.startDate}{ep.endDate ? ` → ${ep.endDate}` : ' (ongoing)'}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={10} />
                          <span className="mono">{ep.followups?.length || 0}</span> follow-ups
                          {missedFU > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>· {missedFU} missed</span>}
                        </span>
                      </div>
                    </div>

                    {/* Right: AI Chat + expand */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => openChat(ep)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: '#f0fdfa', color: '#0d9488', border: '1.5px solid #ccfbf1', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'Sora,sans-serif', transition: 'all .15s' }}>
                        <Bot size={12} /> AI Chat
                      </button>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: isOpen ? '#f0fdfa' : '#f8fafc', border: `1.5px solid ${isOpen ? '#ccfbf1' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s' }} onClick={() => handleExpand(ep.id)}>
                        {isOpen ? <ChevronUp size={15} color="#0d9488" /> : <ChevronDown size={15} color="#94a3b8" />}
                      </div>
                    </div>
                  </div>

                  {/* ── Expanded body ── */}
                  {isOpen && (
                    <div className="dmh-body">

                      {/* Status transition + follow-up stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'stretch' }}>
                        <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #f1f5f9', padding: '14px 18px' }}>
                          <p className="dmh-section-label"><Shield size={11} /> Update Episode Status</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: sc.text, fontWeight: 700, background: sc.bg, border: `1px solid ${sc.border}`, padding: '3px 12px', borderRadius: 7 }}>
                              ● {sc.label}
                            </span>
                            <ArrowRight size={12} color="#94a3b8" />
                            {transitions.map(t => {
                              const tsc = STATUS_CFG[t]
                              return (
                                <button key={t} className="dmh-trans-btn" disabled={statusLoading[ep.id]}
                                  style={{ borderColor: tsc?.border, color: tsc?.text, background: tsc?.bg, opacity: statusLoading[ep.id] ? .6 : 1 }}
                                  onClick={() => changeStatus(ep, t)}>
                                  {statusLoading[ep.id] ? '…' : `→ ${tsc?.label || t}`}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {ep.followups?.length > 0 && (
                          <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #f1f5f9', padding: '14px 18px', minWidth: 160 }}>
                            <p className="dmh-section-label"><Calendar size={11} /> F-up Stats</p>
                            <div style={{ display: 'flex', gap: 12 }}>
                              {[
                                { label: 'Done',   val: completedFU,          color: '#16a34a' },
                                { label: 'Missed', val: missedFU,              color: missedFU > 0 ? '#dc2626' : '#94a3b8' },
                                { label: 'Total',  val: ep.followups.length,   color: '#0f172a' },
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

                      {/* AI Insights */}
                      {insight ? (
                        <div className="dmh-insight-panel">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(124,58,237,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Sparkles size={13} color="#7c3aed" />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '.08em' }}>AI Clinical Insights</span>
                            <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 999, background: 'rgba(124,58,237,.12)', color: '#7c3aed', marginLeft: 'auto', fontWeight: 700, textTransform: 'uppercase' }}>
                              {insight.confidence}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.7 }}>
                            <MarkdownRenderer content={insight.reply} />
                          </div>
                        </div>
                      ) : (
                        <button className="dmh-action-btn" onClick={() => generateInsights(ep.id)} disabled={insightsLoading[ep.id]}
                          style={{ background: 'linear-gradient(135deg,#faf5ff,#ede9fe)', color: '#7c3aed', borderColor: '#c4b5fd' }}>
                          {insightsLoading[ep.id] ? <Loader2 size={13} style={{ animation: 'dmh-spin .8s linear infinite' }} /> : <Sparkles size={13} />}
                          {insightsLoading[ep.id] ? 'Generating…' : 'Generate AI Insights'}
                        </button>
                      )}

                      {/* Lifestyle Advice */}
                      {advice ? (
                        <div className="dmh-advice-panel">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Apple size={13} color="#16a34a" />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '.08em' }}>AI Lifestyle Guidance</span>
                            {advice.followUpFrequency && (
                              <span style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 9px', borderRadius: 7, fontWeight: 600, marginLeft: 4 }}>
                                {advice.followUpFrequency}
                              </span>
                            )}
                            <button onClick={() => handleGenerateAdvice(ep.id)} disabled={isGen}
                              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#16a34a', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'Sora,sans-serif', textDecoration: 'underline' }}>
                              {isGen ? 'Regenerating…' : 'Regenerate'}
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(185px,1fr))', gap: 12 }}>
                            {[
                              { label: 'Diet',      icon: Apple,         items: advice.dietRecommendations,     color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                              { label: 'Exercise',  icon: Dumbbell,      items: advice.exerciseRecommendations, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                              { label: 'Sleep',     icon: Moon,          items: advice.sleepRecommendations,    color: '#7c3aed', bg: '#f5f3ff', border: '#e9d5ff' },
                              { label: 'Red Flags', icon: AlertTriangle, items: advice.redFlags,                color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                            ].filter(sec => sec.items?.length > 0).map((sec, i) => (
                              <div key={i} style={{ background: sec.bg, border: `1px solid ${sec.border}`, borderRadius: 12, padding: '12px 14px' }}>
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
                      ) : (
                        <button className="dmh-action-btn" onClick={() => handleGenerateAdvice(ep.id)} disabled={isGen}
                          style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                          {isGen ? <Loader2 size={13} style={{ animation: 'dmh-spin .8s linear infinite' }} /> : <Apple size={13} />}
                          {isGen ? 'Generating…' : 'Generate Lifestyle Advice'}
                        </button>
                      )}

                      {/* Follow-ups */}
                      {ep.followups?.length > 0 && (
                        <div>
                          <p className="dmh-section-label"><Calendar size={11} /> Follow-ups</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {ep.followups.map(f => {
                              const fc = FOLLOWUP_COLORS[f.followupType] || FOLLOWUP_COLORS.SCHEDULED
                              return (
                                <div key={f.id} className="dmh-fu-row">
                                  <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: fc.bg, border: `1px solid ${fc.border}`, fontSize: 14, flexShrink: 0 }}>
                                    {fc.icon}
                                  </span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>{f.followupPurpose || f.notes || 'Follow-up appointment'}</span>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: fc.text, background: fc.bg, border: `1px solid ${fc.border}`, padding: '1px 8px', borderRadius: 999, textTransform: 'uppercase', flexShrink: 0 }}>
                                        {f.followupType}
                                      </span>
                                    </div>
                                    {f.appointmentDate && (
                                      <p className="mono" style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>
                                        {f.appointmentDate}{f.appointmentTime ? ` · ${f.appointmentTime}` : ''}
                                      </p>
                                    )}
                                  </div>
                                  {f.doctorName && (
                                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, flexShrink: 0 }}>Dr. {f.doctorName}</span>
                                  )}
                                  {f.followupType === 'SCHEDULED' && (
                                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                      <button onClick={() => updateFollowup(ep, f.id, 'COMPLETED')} disabled={followupLoading[f.id]}
                                        title="Mark completed"
                                        style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                                        {followupLoading[f.id] ? '…' : <CheckSquare size={13} />}
                                      </button>
                                      <button onClick={() => updateFollowup(ep, f.id, 'MISSED')} disabled={followupLoading[f.id]}
                                        title="Mark missed"
                                        style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                                        <XSquare size={13} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Medical Records */}
                      {records.length > 0 && (
                        <div>
                          <p className="dmh-section-label"><FileText size={11} /> Medical Records ({records.length})</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {records.map(r => {
                              const RIcon = REC_ICON[r.recordType] || FileText
                              return (
                                <div key={r.id} className="dmh-rec-row">
                                  <div style={{ width: 32, height: 32, borderRadius: 9, background: '#f5f3ff', border: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <RIcon size={14} color="#7c3aed" />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#1e293b' }}>{r.title}</p>
                                    {r.summary && <p style={{ fontSize: 11.5, color: '#64748b', margin: '3px 0 0', lineHeight: 1.5 }}>{r.summary}</p>}
                                    <p className="mono" style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>{r.recordDate}</p>
                                  </div>
                                  {r.attachmentUrl && (
                                    <a href={r.attachmentUrl} target="_blank" rel="noopener noreferrer"
                                      style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, textDecoration: 'none', flexShrink: 0, padding: '5px 12px', borderRadius: 8, background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
                                      View
                                    </a>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {records.length === 0 && (!ep.followups || ep.followups.length === 0) && (
                        <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '8px 0', margin: 0 }}>No records or follow-ups linked yet</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── CHAT PANEL ─────────────────────────────────────────────────── */}
      {chatOpen && chatEpisode ? (
        <div className="dmh-chat-panel">
          {/* Header */}
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,#0f172a,#134e4a)', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0d9488,#0f766e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={16} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>Clinical AI — {chatEpisode.patientName}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chatEpisode.episodeName}</p>
            </div>
            <button onClick={() => { setMsgs([]); assistantApi.clearSession?.(`${sessionId}_ep${chatEpisode.id}`).catch(() => {}); setChatOpen(false) }}
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={13} color="white" />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: 10 }}>
            {msgs.map(m => <Bubble key={m.id} msg={m} />)}
            {chatLoading && (
              <div style={{ display: 'flex', gap: 8, padding: '6px 14px', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0d9488,#0f766e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={13} color="white" />
                </div>
                <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '16px 16px 16px 4px', padding: '11px 14px', display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#5eead4', animation: `dmh-bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1.5px solid #f0fdfa', display: 'flex', gap: 8, alignItems: 'center', background: '#fafffe', borderRadius: '0 0 20px 20px' }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }}
              placeholder={`Ask about ${chatEpisode.patientName}…`}
              style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontFamily: 'Sora,sans-serif', outline: 'none', background: 'white', color: '#1e293b', transition: 'border-color .15s' }} />
            <button onClick={() => sendMsg()} disabled={!input.trim() || chatLoading}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0d9488,#0f766e)', border: 'none', cursor: !input.trim() || chatLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || chatLoading ? .45 : 1, flexShrink: 0, transition: 'opacity .15s' }}>
              {chatLoading ? <Loader2 size={15} color="white" style={{ animation: 'dmh-spin .8s linear infinite' }} /> : <Send size={15} color="white" />}
            </button>
          </div>
        </div>
      ) : !chatOpen && (
        <button className="dmh-fab" onClick={() => episodes.length > 0 ? openChat(episodes[0]) : toast('Select an episode to chat')}>
          <Bot size={22} color="white" />
        </button>
      )}
    </>
  )
}