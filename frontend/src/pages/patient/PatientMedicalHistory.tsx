import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { patientApi, assistantApi, treatmentEpisodeApi } from '../../api'
import {
  Brain, Send, X, Sparkles, ChevronDown, ChevronUp,
  FileText, Calendar, AlertTriangle, CheckCircle2,
  MessageSquare, Loader2, RefreshCw, Activity, Clock,
  Stethoscope, TrendingUp, Plus, Bot, FlaskConical,
  Scan, Syringe
} from 'lucide-react'
import { LoadingSpinner, MarkdownRenderer } from '../../components/common'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{ type: string; id: number; snippet: string }>
  suggestedActions?: Array<{ type: string; label: string }>
  confidence?: string
  timestamp: Date
}

interface Episode {
  id: number
  episodeName: string
  primaryDiagnosis: string
  conditionCategory: string
  status: string
  startDate: string
  endDate?: string
  followups: any[]
  aiLifestyleAdvice?: string
}

interface MedicalRecord {
  id: number
  recordType: string
  title: string
  summary?: string
  recordDate: string
  doctorName?: string
  episodeId?: number
}

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  ACTIVE:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6', label: 'Active' },
  ONGOING:  { bg: '#fefce8', text: '#92400e', border: '#fde68a', dot: '#f59e0b', label: 'Ongoing' },
  RESOLVED: { bg: '#f0fdf4', text: '#14532d', border: '#bbf7d0', dot: '#22c55e', label: 'Resolved' },
  CHRONIC:  { bg: '#fdf4ff', text: '#581c87', border: '#e9d5ff', dot: '#a855f7', label: 'Chronic' },
}

const REC_EMOJI: Record<string, typeof FileText> = {
  LAB_RESULT: FlaskConical,
  IMAGING_REPORT: Scan,
  DIAGNOSTIC_TEST: Activity,
  VACCINATION: Syringe,
  MEDICAL_HISTORY: FileText,
  OTHER: FileText,
}

const FOLLOWUP_CFG: Record<string, { bg: string; text: string; border: string }> = {
  SCHEDULED:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  COMPLETED:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  MISSED:     { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  CANCELLED:  { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
}

const QUICK_QUESTIONS = [
  'What are my current medications?',
  'When is my next follow-up?',
  'What should I avoid eating?',
  'Any concerning trends in my records?',
]

// ── Chat sub-components ────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '6px 14px', alignItems: 'center' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#0d9488,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Bot style={{ width: 14, height: 14, color: 'white' }} />
      </div>
      <div style={{ background: '#f8fafc', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', border: '1px solid #e2e8f0', display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: `pmh-bounce 1.2s ${i * .2}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  )
}

function ChatBubble({ msg, onActionSelect }: { msg: ChatMessage; onActionSelect?: (a: string) => void }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 14px', justifyContent: isUser ? 'flex-end' : 'flex-start', animation: 'pmh-fade .22s ease' }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#0d9488,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <Bot style={{ width: 14, height: 14, color: 'white' }} />
        </div>
      )}
      <div style={{ maxWidth: '76%' }}>
        <div style={{
          background: isUser ? 'linear-gradient(135deg,#0d9488,#0891b2)' : '#f8fafc',
          color: isUser ? 'white' : '#1e293b',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '9px 13px', fontSize: 13, lineHeight: 1.65,
          border: isUser ? 'none' : '1px solid #e2e8f0',
          wordBreak: 'break-word'
        }}>
          {isUser ? msg.content : <MarkdownRenderer content={msg.content} />}
        </div>
        {!isUser && msg.citations?.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
            {msg.citations.map((c, i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4', fontWeight: 600 }}>
                {c.type}#{c.id}
              </span>
            ))}
          </div>
        ) : null}
        {!isUser && msg.suggestedActions?.length ? (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {msg.suggestedActions.map((a, i) => (
              <button key={i} onClick={() => onActionSelect?.(a.label)}
                style={{ fontSize: 11, padding: '5px 10px', borderRadius: 999, background: 'white', color: '#0d9488', border: '1.5px solid #99f6e4', cursor: 'pointer', fontWeight: 600, fontFamily: 'Sora,sans-serif' }}>
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
          {!isUser && msg.confidence && (
            <span style={{ fontWeight: 700, textTransform: 'uppercase', color: msg.confidence === 'high' ? '#16a34a' : msg.confidence === 'medium' ? '#d97706' : '#dc2626' }}>
              {msg.confidence}
            </span>
          )}
          {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PatientMedicalHistory() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [history, setHistory] = useState<any>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null)
  const [patientId, setPatientId] = useState<number | null>(null)

  const [chatMode, setChatMode] = useState<'global' | 'episode'>('global')
  const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [sessionId] = useState(() => `${user?.userId}_${Date.now()}`)

  const [insightsLoading, setInsightsLoading] = useState<Record<number, boolean>>({})
  const [insights, setInsights] = useState<Record<number, any>>({})
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summary, setSummary] = useState<any>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (user?.userId) loadData() }, [user?.userId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, chatLoading])

  const loadData = async () => {
    if (!user?.userId) return
    setLoading(true)
    try {
      const profileRes = await patientApi.getProfile().catch(() => null)
      const fetchedPatientId = profileRes?.data?.data?.id
      setPatientId(fetchedPatientId || null)

      const [historyRes, episodesRes] = await Promise.all([
        fetchedPatientId ? patientApi.getMedicalHistory(fetchedPatientId).catch(() => null) : null,
        treatmentEpisodeApi.getMy().catch(() => ({ data: { data: [] } })),
      ])
      if (historyRes?.data?.data) setHistory(historyRes.data.data)
      setEpisodes(episodesRes.data.data || [])
    } catch {
      toast.error('Failed to load medical history')
    } finally { setLoading(false) }
  }

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (typeof text === 'string' ? text : inputValue).trim()
    if (!messageText || chatLoading) return
    if (!patientId) { toast.error('Patient profile not loaded'); return }

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: messageText, timestamp: new Date() }])
    setInputValue('')
    setChatLoading(true)

    try {
      const { data } = await assistantApi.chat({
        patientId,
        message: messageText,
        episodeId: chatMode === 'episode' && activeEpisodeId ? activeEpisodeId : undefined,
        sessionId: `${sessionId}_${chatMode}${activeEpisodeId || ''}`,
      })
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: data.data.reply, citations: data.data.citations,
        suggestedActions: data.data.suggestedActions, confidence: data.data.confidence,
        timestamp: new Date(),
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: err?.response?.data?.error || 'Sorry, something went wrong.',
        timestamp: new Date(), confidence: 'low',
      }])
    } finally { setChatLoading(false); inputRef.current?.focus() }
  }, [inputValue, chatLoading, chatMode, activeEpisodeId, sessionId, patientId])

  const startEpisodeChat = (ep: Episode) => {
    setChatMode('episode')
    setActiveEpisodeId(ep.id)
    setChatOpen(true)
    setMessages([{
      id: 'init', role: 'assistant', timestamp: new Date(), confidence: 'high',
      content: `Hi! I have full context on your **${ep.episodeName}** episode${ep.primaryDiagnosis ? ` (${ep.primaryDiagnosis})` : ''}. What would you like to know?`
    }])
  }

  const startGlobalChat = () => {
    setChatMode('global')
    setActiveEpisodeId(null)
    setChatOpen(true)
    setMessages([{
      id: 'init', role: 'assistant', timestamp: new Date(), confidence: 'high',
      content: `Hi ${user?.name?.split(' ')[0] || 'there'}! I have access to your complete medical history — all episodes, prescriptions, records, and appointments. What would you like to know?`
    }])
  }

  const generateInsights = async (episodeId: number) => {
    setInsightsLoading(prev => ({ ...prev, [episodeId]: true }))
    try {
      const { data } = await assistantApi.generateEpisodeInsights(episodeId)
      setInsights(prev => ({ ...prev, [episodeId]: data.data }))
    } catch { toast.error('Failed to generate insights') }
    finally { setInsightsLoading(prev => ({ ...prev, [episodeId]: false })) }
  }

  const generateSummary = async () => {
    if (!patientId) return
    setSummaryLoading(true)
    try {
      const { data } = await assistantApi.generateHistorySummary(patientId)
      setSummary(data.data)
    } catch { toast.error('Failed to generate summary') }
    finally { setSummaryLoading(false) }
  }

  if (loading) return <LoadingSpinner />

  const summaryData = history?.summary
  const episodeGroups: any[] = history?.episodes || []
  const standaloneRecords: MedicalRecord[] = history?.standaloneRecords || []
  const displayEpisodes = episodeGroups.length > 0 ? episodeGroups : episodes

  return (
    <>
      <style>{`
        @keyframes pmh-fade  { from{opacity:0;transform:translateY(8px);}  to{opacity:1;transform:translateY(0);} }
        @keyframes pmh-spin  { to{transform:rotate(360deg);} }
        @keyframes pmh-up    { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
        @keyframes pmh-bounce { 0%,80%,100%{transform:scale(.6);opacity:.4;} 40%{transform:scale(1);opacity:1;} }
        @keyframes pmh-pulse { 0%,100%{opacity:1;} 50%{opacity:.4;} }

        .pmh-episode-card {
          background: white; border-radius: 16px;
          border: 1.5px solid #e2e8f0; overflow: hidden;
          transition: border-color .2s, box-shadow .2s;
          animation: pmh-fade .3s ease both;
        }
        .pmh-episode-card:hover { border-color: #99f6e4; box-shadow: 0 4px 18px rgba(13,148,136,.08); }

        .pmh-chat-panel {
          position: fixed; bottom: 24px; right: 24px;
          width: 420px; height: 580px; background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,.14), 0 4px 16px rgba(0,0,0,.06);
          display: flex; flex-direction: column; z-index: 1000;
          border: 1.5px solid #e2e8f0; animation: pmh-up .28s ease;
        }

        .pmh-fab {
          position: fixed; bottom: 24px; right: 24px;
          width: 52px; height: 52px; border-radius: 50%;
          background: linear-gradient(135deg,#0d9488,#0891b2);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(13,148,136,.35);
          z-index: 999; transition: all .2s;
        }
        .pmh-fab:hover { transform: scale(1.08); }

        .pmh-summary-card {
          border-radius: 20px; padding: 24px; color: white;
          position: relative; overflow: hidden;
          background: linear-gradient(135deg,#0f172a 0%,#0d2040 100%);
          animation: pmh-fade .3s ease;
        }
        .pmh-summary-card::before {
          content: ''; position: absolute; top: -40px; right: -40px;
          width: 180px; height: 180px; border-radius: 50%;
          background: rgba(13,148,136,.15); pointer-events: none;
        }

        .pmh-insights-card {
          background: linear-gradient(135deg,#f0fdfa,#e0f2fe);
          border: 1.5px solid #99f6e4; border-radius: 14px;
          padding: 14px; animation: pmh-fade .3s ease;
        }

        .pmh-mode-btn {
          padding: 4px 10px; border-radius: 7px; border: none;
          cursor: pointer; font-size: 10px; font-weight: 700;
          font-family: 'Sora',sans-serif; transition: all .15s; color: white;
        }

        .pmh-quick-btn {
          padding: 6px 12px; border-radius: 999px;
          background: #f0fdfa; color: #0d9488;
          border: 1.5px solid #99f6e4; font-size: 11px; font-weight: 600;
          cursor: pointer; transition: all .15s; white-space: nowrap;
          font-family: 'Sora',sans-serif;
        }
        .pmh-quick-btn:hover { background: #ccfbf1; }
      `}</style>

      <div style={{ maxWidth: 1300, margin: '0 auto', paddingBottom: 120 }}>

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24, animation: 'pmh-fade .3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Activity style={{ width: 13, height: 13, color: '#0d9488' }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '.12em' }}>Health Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>Medical History</h1>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, margin: '4px 0 0' }}>Your complete health timeline with AI-powered insights</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={startGlobalChat} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 11, background: 'linear-gradient(135deg,#0d9488,#0891b2)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Sora,sans-serif', boxShadow: '0 4px 12px rgba(13,148,136,.28)' }}>
                <Bot style={{ width: 15, height: 15 }} /> Chat with AI
              </button>
              <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 11, background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Sora,sans-serif' }}>
                <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── HEALTH SUMMARY CARD ──────────────────────────────────────── */}
        <div className="pmh-summary-card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 8px' }}>Health Overview</p>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 14px' }}>{user?.name}</h2>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {summaryData?.summary?.allergiesSummary && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, background: 'rgba(239,68,68,.2)', color: '#fca5a5', fontSize: 12, fontWeight: 600 }}>
                    <AlertTriangle style={{ width: 11, height: 11 }} /> Allergies: {summaryData.summary.allergiesSummary}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, background: 'rgba(13,148,136,.2)', color: '#5eead4', fontSize: 12, fontWeight: 600 }}>
                  <Stethoscope style={{ width: 11, height: 11 }} /> {episodes.length} Episodes
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, background: 'rgba(99,102,241,.2)', color: '#c4b5fd', fontSize: 12, fontWeight: 600 }}>
                  <FileText style={{ width: 11, height: 11 }} /> {standaloneRecords.length + episodeGroups.reduce((acc: number, eg: any) => acc + (eg.records?.length || 0), 0)} Records
                </span>
              </div>

              {summaryData?.summary?.summary && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', lineHeight: 1.65, margin: 0, maxWidth: 480 }}>
                  {summaryData.summary.summary}
                </p>
              )}
            </div>

            {/* AI Summary */}
            <div style={{ flexShrink: 0 }}>
              {summary ? (
                <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 14, padding: 14, maxWidth: 260, border: '1px solid rgba(255,255,255,.14)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Sparkles style={{ width: 13, height: 13, color: '#5eead4' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#5eead4', textTransform: 'uppercase', letterSpacing: '.08em' }}>AI Summary</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.6 }}>
                    <MarkdownRenderer content={summary.reply?.substring(0, 200) + (summary.reply?.length > 200 ? '…' : '')} />
                  </div>
                </div>
              ) : (
                <button onClick={generateSummary} disabled={summaryLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 12, background: 'rgba(255,255,255,.12)', color: 'white', border: '1.5px solid rgba(255,255,255,.2)', cursor: summaryLoading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Sora,sans-serif' }}>
                  {summaryLoading ? <Loader2 style={{ width: 14, height: 14, animation: 'pmh-spin .8s linear infinite' }} /> : <Brain style={{ width: 14, height: 14 }} />}
                  {summaryLoading ? 'Generating…' : 'Generate AI Summary'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── EPISODES TIMELINE ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp style={{ width: 16, height: 16, color: '#0d9488' }} />
              Treatment Episodes
            </h2>
            <button onClick={() => navigate('/patient/book')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: '#f0fdfa', color: '#0d9488', border: '1.5px solid #99f6e4', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Sora,sans-serif' }}>
              <Plus style={{ width: 13, height: 13 }} /> Book Appointment
            </button>
          </div>

          {displayEpisodes.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 16, border: '2px dashed #e2e8f0', padding: 48, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Stethoscope style={{ width: 26, height: 26, color: '#99f6e4' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#64748b', margin: '0 0 6px' }}>No treatment episodes yet</p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Episodes are created by your doctor after appointments</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displayEpisodes.map((ep: any, idx: number) => {
                const epId = ep.episodeId || ep.id
                const epName = ep.episodeName
                const epDiagnosis = ep.primaryDiagnosis
                const epStatus = ep.status
                const epStart = ep.startDate
                const epEnd = ep.endDate
                const epRecords: MedicalRecord[] = ep.records || []
                const epFollowups: any[] = ep.followups || []
                const sc = STATUS_CFG[epStatus] || STATUS_CFG.ACTIVE
                const isExpanded = expandedEpisode === epId
                const hasInsights = !!insights[epId]
                const insightLoading = insightsLoading[epId]

                return (
                  <div key={epId} className="pmh-episode-card" style={{ animationDelay: `${idx * .05}s` }}>
                    {/* Episode header */}
                    <div onClick={() => setExpandedEpisode(isExpanded ? null : epId)}
                      style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
                        {/* Status bar */}
                        <div style={{ width: 4, borderRadius: 99, background: sc.dot, alignSelf: 'stretch', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{epName || 'Treatment Episode'}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 999,
                              background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                              display: 'flex', alignItems: 'center', gap: 4
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                              {sc.label}
                            </span>
                          </div>
                          {epDiagnosis && (
                            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px' }}>
                              <strong>Diagnosis:</strong> {epDiagnosis}
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar style={{ width: 11, height: 11 }} /> {epStart}{epEnd ? ` → ${epEnd}` : ' (ongoing)'}
                            </span>
                            {epRecords.length > 0 && (
                              <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FileText style={{ width: 11, height: 11 }} /> {epRecords.length} records
                              </span>
                            )}
                            {epFollowups.length > 0 && (
                              <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock style={{ width: 11, height: 11 }} /> {epFollowups.length} follow-ups
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 7, flexShrink: 0, alignItems: 'center' }}>
                        <button onClick={e => { e.stopPropagation(); startEpisodeChat({ id: epId, episodeName: epName, primaryDiagnosis: epDiagnosis, conditionCategory: ep.conditionCategory, status: epStatus, startDate: epStart, endDate: epEnd, followups: epFollowups }) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, background: '#f0fdfa', color: '#0d9488', border: '1.5px solid #99f6e4', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'Sora,sans-serif' }}>
                          <MessageSquare style={{ width: 12, height: 12 }} /> Chat
                        </button>
                        <button style={{ width: 32, height: 32, borderRadius: 8, background: '#f8fafc', border: '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isExpanded ? <ChevronUp style={{ width: 15, height: 15, color: '#64748b' }} /> : <ChevronDown style={{ width: 15, height: 15, color: '#64748b' }} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #f0fdf4', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* AI Insights */}
                        {hasInsights ? (
                          <div className="pmh-insights-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                              <Sparkles style={{ width: 13, height: 13, color: '#0d9488' }} />
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '.08em' }}>AI Clinical Insights</span>
                              {insights[epId]?.confidence && (
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#ccfbf1', color: '#0d9488', marginLeft: 'auto', fontWeight: 700 }}>
                                  {insights[epId].confidence}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.7 }}>
                              <MarkdownRenderer content={insights[epId]?.reply || ''} />
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => generateInsights(epId)} disabled={insightLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 11, background: 'linear-gradient(135deg,#f0fdfa,#e0f2fe)', color: '#0d9488', border: '1.5px solid #99f6e4', cursor: insightLoading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Sora,sans-serif', opacity: insightLoading ? .7 : 1, width: 'fit-content' }}>
                            {insightLoading ? <Loader2 style={{ width: 14, height: 14, animation: 'pmh-spin .8s linear infinite' }} /> : <Brain style={{ width: 14, height: 14 }} />}
                            {insightLoading ? 'Generating insights…' : 'Generate AI Insights'}
                          </button>
                        )}

                        {/* Records */}
                        {epRecords.length > 0 && (
                          <div>
                            <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 10px' }}>Medical Records</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {epRecords.map((r: MedicalRecord) => {
                                const RIcon = REC_EMOJI[r.recordType] || FileText
                                return (
                                  <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'white', border: '1px solid #f1f5f9' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <RIcon style={{ width: 14, height: 14, color: '#0d9488' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{r.title}</div>
                                      {r.summary && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.summary}</div>}
                                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, fontFamily: 'monospace' }}>
                                        {r.recordDate}{r.doctorName ? ` · Dr. ${r.doctorName}` : ''}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Follow-ups */}
                        {epFollowups.length > 0 && (
                          <div>
                            <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 10px' }}>Follow-up Timeline</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                              {epFollowups.map((f: any, i: number) => {
                                const fc = FOLLOWUP_CFG[f.followupType] || FOLLOWUP_CFG.SCHEDULED
                                return (
                                  <div key={i} style={{ background: 'white', borderRadius: 12, padding: '12px 14px', borderLeft: '3px solid #0d9488', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Follow-up #{i + 1}</span>
                                        <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 999, fontWeight: 700, color: fc.text, background: fc.bg, border: `1px solid ${fc.border}` }}>
                                          {f.followupType}
                                        </span>
                                      </div>
                                      {f.appointmentDate && (
                                        <p style={{ margin: '0 0 3px', fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>{f.appointmentDate}</p>
                                      )}
                                      {f.followupPurpose && <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{f.followupPurpose}</p>}
                                    </div>
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

        {/* ── STANDALONE RECORDS ────────────────────────────────────────── */}
        {standaloneRecords.length > 0 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText style={{ width: 16, height: 16, color: '#6366f1' }} /> Other Records
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
              {standaloneRecords.map((r: MedicalRecord, idx: number) => {
                const RIcon = REC_EMOJI[r.recordType] || FileText
                return (
                  <div key={r.id} style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: 14, animation: `pmh-fade .3s ${idx * .04}s ease both` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <RIcon style={{ width: 14, height: 14, color: '#6366f1' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{r.recordDate}</div>
                      </div>
                    </div>
                    {r.summary && <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{r.summary}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── CHAT PANEL ──────────────────────────────────────────────────── */}
      {chatOpen ? (
        <div className="pmh-chat-panel">
          {/* Chat header */}
          <div style={{ padding: '13px 16px', background: 'linear-gradient(135deg,#0f172a,#0d2040)', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#0d9488,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot style={{ width: 16, height: 16, color: 'white' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Health AI Assistant</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pmh-pulse 2s infinite' }} />
                {chatMode === 'episode' && activeEpisodeId ? `Episode #${activeEpisodeId} context` : 'Full history context'}
              </div>
            </div>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,.1)', borderRadius: 9, padding: 3 }}>
              <button className="pmh-mode-btn" onClick={() => { setChatMode('global'); setActiveEpisodeId(null) }}
                style={{ background: chatMode === 'global' ? 'rgba(255,255,255,.2)' : 'transparent' }}>
                Global
              </button>
              <button className="pmh-mode-btn" onClick={() => setChatMode('episode')}
                style={{ background: chatMode === 'episode' ? 'rgba(255,255,255,.2)' : 'transparent', opacity: chatMode === 'episode' ? 1 : .5 }}>
                Episode
              </button>
            </div>
            <button onClick={() => setChatOpen(false)}
              style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X style={{ width: 13, height: 13, color: 'white' }} />
            </button>
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0fdf4' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 7px' }}>Quick questions</p>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} className="pmh-quick-btn" onClick={() => sendMessage(q)}>{q}</button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
            {messages.map(msg => <ChatBubble key={msg.id} msg={msg} onActionSelect={sendMessage} />)}
            {chatLoading && <TypingDots />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #f0fdf4', display: 'flex', gap: 8, alignItems: 'center', background: '#fafffe', borderRadius: '0 0 20px 20px' }}>
            <input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={chatMode === 'episode' && activeEpisodeId ? `Ask about Episode #${activeEpisodeId}…` : 'Ask about your health…'}
              style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontFamily: 'Sora,sans-serif', outline: 'none', background: 'white', color: '#1e293b' }} />
            <button onClick={() => sendMessage()} disabled={!inputValue.trim() || chatLoading}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0d9488,#0891b2)', border: 'none', cursor: !inputValue.trim() || chatLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !inputValue.trim() || chatLoading ? .45 : 1 }}>
              {chatLoading ? <Loader2 style={{ width: 15, height: 15, color: 'white', animation: 'pmh-spin .8s linear infinite' }} /> : <Send style={{ width: 15, height: 15, color: 'white' }} />}
            </button>
          </div>
        </div>
      ) : (
        <button className="pmh-fab" onClick={startGlobalChat} title="Chat with AI">
          <Bot style={{ width: 22, height: 22, color: 'white' }} />
        </button>
      )}
    </>
  )
}