import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { symptomApi } from '../../api'
import { DoctorCard } from '../../components/common'
import {
  Brain, Sparkles, AlertTriangle, CheckCircle2,
  Stethoscope, ChevronRight, Activity, Shield, Clock,
  Info, Mic, RotateCcw, TrendingUp, Zap, Star,
  Heart, Eye, Bone, Wind, Thermometer, Frown
} from 'lucide-react'
import toast from 'react-hot-toast'

const QUICK_SYMPTOMS = [
  { label: 'Chest pain', desc: 'chest pain and shortness of breath with dizziness', icon: Heart, color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  { label: 'Headache', desc: 'severe headache and dizziness with nausea', icon: Brain, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { label: 'Stomach pain', desc: 'stomach pain and vomiting with nausea', icon: Frown, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { label: 'Skin rash', desc: 'skin rash and itching with swelling', icon: Shield, color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  { label: 'Joint pain', desc: 'joint pain and swelling with stiffness', icon: Bone, color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
  { label: 'Fever', desc: 'high fever and body aches with chills', icon: Thermometer, color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  { label: 'Eye pain', desc: 'eye pain and blurred vision with redness', icon: Eye, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  { label: 'Breathing', desc: 'difficulty breathing and chest tightness with cough', icon: Wind, color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' },
]

const URGENCY_CONFIG = {
  HIGH: {
    gradient: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
    border: '#fca5a5',
    text: '#991b1b',
    badge: { bg: '#fee2e2', text: '#991b1b' },
    icon: AlertTriangle,
    label: 'Seek care today',
    barColor: '#ef4444',
    barWidth: '100%',
    glow: 'rgba(239,68,68,0.15)',
  },
  MEDIUM: {
    gradient: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
    border: '#fcd34d',
    text: '#92400e',
    badge: { bg: '#fef3c7', text: '#92400e' },
    icon: Clock,
    label: 'Schedule within a few days',
    barColor: '#f59e0b',
    barWidth: '65%',
    glow: 'rgba(245,158,11,0.15)',
  },
  LOW: {
    gradient: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
    border: '#86efac',
    text: '#166534',
    badge: { bg: '#dcfce7', text: '#166534' },
    icon: CheckCircle2,
    label: 'Non-urgent, monitor symptoms',
    barColor: '#22c55e',
    barWidth: '33%',
    glow: 'rgba(34,197,94,0.15)',
  },
}

const CONFIDENCE_CONFIG = {
  HIGH: { label: 'High confidence', filled: 3, color: '#059669', track: '#d1fae5' },
  MEDIUM: { label: 'Moderate confidence', filled: 2, color: '#d97706', track: '#fef3c7' },
  LOW: { label: 'Low confidence', filled: 1, color: '#94a3b8', track: '#f1f5f9' },
}

function ConfidenceMeter({ level }: { level: string }) {
  const cfg = CONFIDENCE_CONFIG[level as keyof typeof CONFIDENCE_CONFIG] || CONFIDENCE_CONFIG.MEDIUM
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            width: 20, height: 6, borderRadius: 3,
            background: i <= cfg.filled ? cfg.color : cfg.track,
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
    </div>
  )
}

function AnalyzingLoader() {
  const [step, setStep] = useState(0)
  const steps = ['Reading symptoms…', 'Matching conditions…', 'Finding specialists…', 'Generating insights…']

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 900)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      background: 'white', borderRadius: 20, border: '1px solid #e2e8f0',
      padding: '40px 32px', textAlign: 'center',
      boxShadow: '0 4px 24px rgba(139,92,246,0.08)',
    }}>
      <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 20px' }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '3px solid #ede9fe',
          borderTopColor: '#7c3aed',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 8,
          background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Activity size={22} color="white" />
        </div>
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 16, height: 16, background: '#7c3aed',
          borderRadius: '50%', border: '2px solid white',
          animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
        }} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
        Analyzing your symptoms
      </p>
      <p style={{
        fontSize: 13, color: '#7c3aed', fontWeight: 600, margin: '0 0 20px',
        minHeight: 20, transition: 'opacity 0.3s',
      }}>
        {steps[step]}
      </p>
      <div style={{ width: 200, height: 4, background: '#ede9fe', borderRadius: 2, margin: '0 auto', overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
          borderRadius: 2, width: '40%',
          animation: 'slide 1.5s ease-in-out infinite',
        }} />
      </div>
    </div>
  )
}

export default function SymptomChecker() {
  const navigate = useNavigate()
  const [symptoms, setSymptoms] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedChip, setSelectedChip] = useState('')
  const [charCount, setCharCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const handleAnalyze = async () => {
    if (!symptoms.trim()) { toast.error('Please describe your symptoms'); return }
    setLoading(true)
    setResult(null)
    try {
      const { data } = await symptomApi.suggest(symptoms)
      setResult(data.data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch {
      toast.error('Analysis failed. Please try again.')
    } finally { setLoading(false) }
  }

  const handleChip = (chip: typeof QUICK_SYMPTOMS[0]) => {
    setSelectedChip(chip.label)
    setSymptoms(chip.desc)
    setCharCount(chip.desc.length)
    textareaRef.current?.focus()
  }

  const handleReset = () => {
    setSymptoms('')
    setResult(null)
    setSelectedChip('')
    setCharCount(0)
  }

  const urgency = result ? URGENCY_CONFIG[result.urgencyLevel as keyof typeof URGENCY_CONFIG] : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        .sc-page * { font-family: 'Sora', sans-serif !important; }
        .sc-mono { font-family: 'JetBrains Mono', monospace !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }
        @keyframes slide { 0% { transform: translateX(-150%); } 100% { transform: translateX(350%); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        
        .sc-container {
          max-width: 1300px;
          margin: 0 auto;
          padding: 20px 0 60px;
          animation: fadeSlideUp 0.4s ease both;
        }

        .sc-result { animation: fadeSlideUp 0.4s ease both; }
        
        .sc-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 18px; border-radius: 16px; border: 1.5px solid #eef2f7;
          cursor: pointer; transition: all 0.25s cubic-bezier(.4,0,.2,1); text-align: left;
          background: white;
        }
        .sc-chip:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); border-color: #7c3aed30; }

        .sc-analyze-btn {
          width: 100%; padding: 18px; border-radius: 18px; border: none;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: white; font-size: 16px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          cursor: pointer; transition: all 0.25s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 10px 25px rgba(124,58,237,0.3);
        }
        .sc-analyze-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 35px rgba(124,58,237,0.4); }
        .sc-analyze-btn:disabled { background: #e2e8f0; color: #94a3b8; box-shadow: none; cursor: not-allowed; }

        .sc-section-card {
          background: white; border-radius: 24px;
          border: 1.5px solid #eef2f7;
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .sc-condition-pill {
          padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 700;
          background: #f5f3ff; color: #7c3aed; border: 1.5px solid #ede9fe;
          transition: all 0.2s;
        }
        .sc-condition-pill:hover { background: #7c3aed; color: white; transform: scale(1.05); }

        .sc-doctor-book {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 12px; border: none;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: white; font-size: 13px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s;
        }
      `}</style>

      <div className="sc-page sc-container">

        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Brain size={18} color="#7c3aed" />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.15em' }}>AI Medical Intelligence</span>
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Symptom Checker</h1>
              <p style={{ fontSize: 15, color: '#64748b', marginTop: 6 }}>Identify potential conditions and find the right specialist in seconds.</p>
            </div>
            {result && (
              <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, border: '1.5px solid #eef2f7', background: 'white', color: '#64748b', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                <RotateCcw size={16} /> New Assessment
              </button>
            )}
          </div>
        </div>

        {/* ── HOW IT WORKS STRIP ── */}
        {!result && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
            {[
              { step: '01', label: 'Describe symptoms', desc: 'Detail what you\'re feeling or select common symptoms below.', icon: Mic, color: '#7c3aed' },
              { step: '02', label: 'AI Diagnostic Flow', desc: 'Our clinical engine cross-references your inputs with medical data.', icon: Zap, color: '#0891b2' },
              { step: '03', label: 'Actionable Insights', desc: 'Receive a triage level, specialist match, and next steps.', icon: TrendingUp, color: '#059669' },
            ].map(item => (
              <div key={item.step} style={{ background: 'white', borderRadius: 20, padding: '24px', border: '1.5px solid #eef2f7', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: `${item.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.icon size={22} color={item.color} />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: item.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Step {item.step}</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── INPUT CARD ── */}
        {!result && (
          <div className="sc-section-card" style={{ marginBottom: 24 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1.5px solid #f8fafc', background: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={16} color="#7c3aed" />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Triage Engine v2.4</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>System Online</span>
              </div>
            </div>

            <div style={{ padding: '32px' }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>How are you feeling today?</label>
              <div style={{ position: 'relative', borderRadius: 20, border: `2px solid ${symptoms ? '#7c3aed' : '#eef2f7'}`, transition: 'all 0.3s ease', padding: '4px' }}>
                <textarea
                  ref={textareaRef}
                  value={symptoms}
                  onChange={e => { setSymptoms(e.target.value); setCharCount(e.target.value.length); setSelectedChip('') }}
                  placeholder="Example: I have sharp chest pain that started 30 mins ago, and I'm feeling lightheaded..."
                  rows={6}
                  style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', outline: 'none', fontSize: 16, lineHeight: 1.6, color: '#0f172a', background: 'transparent', resize: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc', borderRadius: '0 0 16px 16px' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}><Info size={14} /> Be as specific as possible for better accuracy</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: charCount > 50 ? '#7c3aed' : '#94a3b8' }} className="sc-mono">{charCount} characters</span>
                </div>
              </div>

              {/* Quick Select Chips */}
              <div style={{ marginTop: 32 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Or select common symptoms</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {QUICK_SYMPTOMS.map(chip => (
                    <button key={chip.label} className="sc-chip" onClick={() => handleChip(chip)} style={{ borderColor: selectedChip === chip.label ? chip.color : '#eef2f7', background: selectedChip === chip.label ? chip.bg : 'white' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: chip.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <chip.icon size={20} color={chip.color} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: selectedChip === chip.label ? chip.color : '#374151' }}>{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button className="sc-analyze-btn" onClick={handleAnalyze} disabled={loading || !symptoms.trim()} style={{ marginTop: 40 }}>
                <Sparkles size={20} />
                {loading ? 'Processing Clinical Data...' : 'Run Symptom Analysis'}
              </button>
            </div>
          </div>
        )}

        {loading && <AnalyzingLoader />}

        {result && !loading && (
          <div ref={resultRef} className="sc-result" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Results Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 800, background: result.aiPowered ? '#f5f3ff' : '#f8fafc', color: result.aiPowered ? '#7c3aed' : '#64748b', border: `1.5px solid ${result.aiPowered ? '#ddd6fe' : '#eef2f7'}` }}>
                  {result.aiPowered ? <Sparkles size={14} /> : <Brain size={14} />}
                  {result.aiPowered ? `AI Intelligence: ${result.providerUsed}` : 'Standard Triage'}
                </div>
                <ConfidenceMeter level={result.confidenceLevel || 'MEDIUM'} />
              </div>
            </div>

            {/* Main Result Card */}
            {urgency && (
              <div className="sc-section-card">
                <div style={{ background: urgency.gradient, borderBottom: `1.5px solid ${urgency.border}`, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                      <urgency.icon size={24} color={urgency.text} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: urgency.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Assessment: {result.urgencyLevel}</p>
                      <h2 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800, color: urgency.text }}>{urgency.label}</h2>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: urgency.text }}>Urgency Score</span>
                    <div style={{ width: 140, height: 10, background: 'rgba(255,255,255,0.4)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: urgency.barWidth, background: urgency.barColor, borderRadius: 5 }} />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 32 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f0f9ff', border: '2.5px solid #e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Stethoscope size={32} color="#0369a1" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Recommended Specialization</p>
                      <h3 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>{result.suggestedSpecialization}</h3>
                      <p style={{ fontSize: 15, color: '#64748b', marginTop: 12, lineHeight: 1.7, background: '#fafbfc', padding: '16px 20px', borderRadius: 16, border: '1.5px solid #f1f5f9' }}>{result.reasoning}</p>
                    </div>
                  </div>

                  {result.possibleConditions?.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Clinical Possibilities</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {result.possibleConditions.map((c: string, i: number) => (
                          <span key={i} className="sc-condition-pill">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                    {result.immediateActions?.length > 0 && (
                      <div style={{ background: '#f0fdfa', borderRadius: 20, padding: '24px', border: '1.5px solid #ccfbf1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                          <Shield size={20} color="#0d9488" />
                          <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0d9488', margin: 0 }}>Immediate Care Steps</h4>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 20, color: '#134e4a', fontSize: 14, lineHeight: 1.8 }}>
                          {result.immediateActions.map((step: string, i: number) => <li key={i}>{step}</li>)}
                        </ul>
                      </div>
                    )}
                    {result.redFlags?.length > 0 && (
                      <div style={{ background: '#fff1f2', borderRadius: 20, padding: '24px', border: '1.5px solid #fecada' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                          <AlertTriangle size={20} color="#e11d48" />
                          <h4 style={{ fontSize: 15, fontWeight: 800, color: '#e11d48', margin: 0 }}>Emergency Indicators</h4>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 20, color: '#881337', fontSize: 14, lineHeight: 1.8 }}>
                          {result.redFlags.map((flag: string, i: number) => <li key={i}>{flag}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recommended Doctors */}
            {result.recommendedDoctors?.length > 0 && (
              <div className="sc-section-card">
                <div style={{ padding: '16px 24px', borderBottom: '1.5px solid #f8fafc', background: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Star size={16} color="#7c3aed" />
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0 }}>Matched {result.suggestedSpecialization} Specialists</h3>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{result.recommendedDoctors.length} Providers Available</span>
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.recommendedDoctors.map((doc: any) => (
                    <DoctorCard
                      key={doc.id}
                      doctor={doc}
                      action={
                        <button className="sc-doctor-book" onClick={() => navigate(`/patient/book?doctorId=${doc.id}`)}>
                          Schedule Visit <ChevronRight size={14} />
                        </button>
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div style={{ display: 'flex', gap: 16, padding: '24px', background: '#fffbeb', borderRadius: 24, border: '1.5px solid #fde68a' }}>
              <Info size={20} color="#d97706" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.7 }}>
                <strong>Important Medical Disclaimer:</strong> This AI-driven tool provides preliminary guidance and should not be used as a substitute for professional medical judgment. If you are experiencing a life-threatening emergency, please contact emergency services immediately.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}