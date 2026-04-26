import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { symptomApi } from '../../api'
import { PageHeader, DoctorCard, LoadingSpinner } from '../../components/common'
import { Brain, Sparkles, AlertTriangle, CheckCircle2, Info, Stethoscope } from 'lucide-react'
import toast from 'react-hot-toast'

const QUICK_SYMPTOMS = [
  'Chest pain and shortness of breath',
  'Severe headache and dizziness',
  'Stomach pain and vomiting',
  'Skin rash and itching',
  'Joint pain and swelling',
  'Fever and body aches',
  'Eye pain and blurred vision',
  'Anxiety and sleep problems',
]

const urgencyConfig = {
  HIGH:   { color: 'bg-red-50 border-red-200 text-red-700',    icon: AlertTriangle, label: 'Seek care today' },
  MEDIUM: { color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: Info, label: 'Schedule soon' },
  LOW:    { color: 'bg-green-50 border-green-200 text-green-700',  icon: CheckCircle2, label: 'Non-urgent' },
}

const confidenceConfig = {
  HIGH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function SymptomChecker() {
  const navigate = useNavigate()
  const [symptoms, setSymptoms] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!symptoms.trim()) { toast.error('Please describe your symptoms'); return }
    setLoading(true)
    setResult(null)
    try {
      const { data } = await symptomApi.suggest(symptoms)
      setResult(data.data)
    } finally { setLoading(false) }
  }

  const urgency = result ? urgencyConfig[result.urgencyLevel as keyof typeof urgencyConfig] : null
  const confidenceClass = result
    ? confidenceConfig[(result.confidenceLevel || 'MEDIUM') as keyof typeof confidenceConfig] || confidenceConfig.MEDIUM
    : confidenceConfig.MEDIUM

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="AI Symptom Checker"
        subtitle="Describe your symptoms and get instant doctor specialization recommendations"
      />

      {/* Input section */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Brain className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">Powered by AI Triage</p>
            <p className="text-xs text-slate-400">Keyword fallback available offline</p>
          </div>
        </div>

        <div>
          <label className="label">Describe Your Symptoms *</label>
          <textarea
            value={symptoms}
            onChange={e => setSymptoms(e.target.value)}
            placeholder="e.g., I have been experiencing severe chest pain for the past 2 hours, along with shortness of breath and dizziness..."
            rows={4}
            className="input resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">
            Be as descriptive as possible for the most accurate suggestion
          </p>
        </div>

        {/* Quick symptom chips */}
        <div>
          <p className="text-xs text-slate-500 mb-2 font-medium">Quick select:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SYMPTOMS.map(s => (
              <button key={s} onClick={() => setSymptoms(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  symptoms === s
                    ? 'bg-violet-100 text-violet-700 border-violet-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-violet-200 hover:bg-violet-50'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleAnalyze} disabled={loading || !symptoms.trim()}
          className="btn-primary bg-violet-600 hover:bg-violet-700">
          <Sparkles className="w-4 h-4" />
          {loading ? 'Analyzing with AI...' : 'Analyze Symptoms'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card text-center py-10">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">AI is analyzing your symptoms...</p>
          <p className="text-slate-400 text-sm">This may take a moment</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-4 page-enter">
          {/* AI badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-fit ${
            result.aiPowered ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
          }`}>
            {result.aiPowered ? <Sparkles className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
            {result.aiPowered ? `${result.providerUsed || 'AI'} Analysis` : 'Rule-based Analysis (AI unavailable)'}
          </div>

          {/* Main result */}
          <div className="card">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-1">Recommended Specialization</p>
                <h2 className="text-2xl font-bold text-slate-900">{result.suggestedSpecialization}</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{result.reasoning}</p>
              </div>
            </div>

            {/* Urgency */}
            {urgency && (
              <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium ${urgency.color}`}>
                <urgency.icon className="w-4 h-4" />
                <span>Urgency Level: <strong>{result.urgencyLevel}</strong> — {urgency.label}</span>
              </div>
            )}

            <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${confidenceClass}`}>
              <span>Triage Confidence: {result.confidenceLevel || 'MEDIUM'}</span>
            </div>
          </div>

          {/* Possible conditions */}
          {result.possibleConditions?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-slate-900 mb-3">Possible Conditions</h3>
              <div className="flex flex-wrap gap-2">
                {result.possibleConditions.map((c: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-100">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.immediateActions?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-slate-900 mb-3">What You Should Do Now</h3>
              <ul className="space-y-2">
                {result.immediateActions.map((step: string, i: number) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.redFlags?.length > 0 && (
            <div className="card border border-red-200 bg-red-50/40">
              <h3 className="font-semibold text-red-700 mb-3">Emergency Warning Signs</h3>
              <ul className="space-y-2">
                {result.redFlags.map((flag: string, i: number) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended doctors */}
          {result.recommendedDoctors?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Available {result.suggestedSpecialization} Specialists</h3>
              {result.recommendedDoctors.map((doc: any) => (
                <DoctorCard key={doc.id} doctor={doc} action={
                  <button onClick={() => navigate(`/patient/book?doctorId=${doc.id}`)}
                    className="btn-primary text-sm">
                    Book Appointment
                  </button>
                } />
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex gap-2 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <strong>Medical Disclaimer:</strong> This tool provides general guidance only and is not a substitute
              for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider
              for medical concerns, especially in emergencies.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
