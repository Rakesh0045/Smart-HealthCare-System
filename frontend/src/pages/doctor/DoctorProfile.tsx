import { useEffect, useState } from 'react'
import { doctorApi } from '../../api'
import { LoadingSpinner } from '../../components/common'
import {
  Save, Stethoscope, Award, Building2, Clock, Star,
  CheckCircle2, User, IndianRupee, Activity, BadgeCheck,
  ChevronDown, Sparkles, MapPin, Phone, Mail, Calendar,
  Heart, Shield, Zap, TrendingUp, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

const SPECIALIZATIONS = [
  'Cardiology','Neurology','General Medicine','Dermatology','Orthopedics',
  'Gastroenterology','Ophthalmology','ENT','Endocrinology','Psychiatry',
  'Gynecology','Urology','Pediatrics','Oncology','Dentistry','Pulmonology',
]

const SLOT_OPTS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
]

function StarDisplay({ value, total }: { value: number | null; total: number | null }) {
  if (!value || !total) return (
    <span className="dp-no-rating">No ratings yet</span>
  )
  return (
    <div className="dp-rating-row">
      <div className="dp-stars">
        {[1,2,3,4,5].map(n => (
          <span key={n} className={n <= Math.round(value) ? 'dp-star dp-star-lit' : 'dp-star'}>★</span>
        ))}
      </div>
      <span className="dp-rating-val">{value.toFixed(1)}</span>
      <span className="dp-rating-count">({total} review{total !== 1 ? 's' : ''})</span>
    </div>
  )
}

export default function DoctorProfile() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({
    specialization: '', experience: '', consultationFee: '',
    bio: '', qualification: '', hospital: '', slotDuration: '30',
  })
  const [rating, setRating]           = useState<number | null>(null)
  const [totalRatings, setTotalRatings] = useState<number | null>(null)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  useEffect(() => {
    doctorApi.getMyProfile().then(r => {
      const d = r.data.data
      if (d) {
        setForm({
          specialization: d.specialization || '',
          experience:     String(d.experience || ''),
          consultationFee: String(d.consultationFee || ''),
          bio:             d.bio || '',
          qualification:   d.qualification || '',
          hospital:        d.hospital || '',
          slotDuration:   String(d.slotDuration || '30'),
        })
        setRating(d.rating != null ? Number(d.rating) : null)
        setTotalRatings(d.totalRatings != null ? Number(d.totalRatings) : null)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.specialization || !form.experience || !form.consultationFee) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      await doctorApi.updateProfile({
        ...form,
        experience:      parseInt(form.experience),
        consultationFee: parseFloat(form.consultationFee),
        slotDuration:    parseInt(form.slotDuration),
      })
      updateUser({ profileComplete: true })
      setSaved(true)
      toast.success('Profile updated!')
      setTimeout(() => setSaved(false), 3000)
    } finally { setSaving(false) }
  }

  const fields = [form.specialization, form.experience, form.consultationFee, form.qualification, form.hospital, form.bio]
  const completionPct = Math.round(fields.filter(Boolean).length / fields.length * 100)

  if (loading) return <LoadingSpinner />

  return (
    <div className="dp-root">
      <div className="dp-page">

        {/* ══ PAGE HEADER ══ */}
        <header className="dp-header">
          <div className="dp-header-left">
            <p className="dp-eyebrow">
              <span className="dp-live-dot" />
              Doctor Portal
            </p>
            <h1 className="dp-title">My Profile</h1>
            <p className="dp-subtitle">Manage your professional information and clinic settings</p>
          </div>
          <button
            className={`dp-save-btn ${saving ? 'dp-saving' : ''} ${saved ? 'dp-saved' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saved
              ? <><CheckCircle2 size={16} /> Saved</>
              : saving
              ? <><span className="dp-spin" /> Saving…</>
              : <><Save size={16} /> Save Profile</>}
          </button>
        </header>

        {/* ══ MAIN LAYOUT ══ */}
        <div className="dp-layout">

          {/* ── LEFT SIDEBAR ── */}
          <aside className="dp-aside">

            {/* Identity Card */}
            <div className="dp-id-card">
              <div className="dp-id-stripe" />

              <div className="dp-av-section">
                <div className="dp-av-wrap">
                  <div className="dp-av-halo" />
                  <div className="dp-av-ring">
                    <div className="dp-av">
                      {user?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'DR'}
                    </div>
                  </div>
                  <div className="dp-av-badge"><BadgeCheck size={13} /></div>
                </div>
                <h2 className="dp-id-name">Dr. {user?.name || 'Your Name'}</h2>
                <p className="dp-id-spec">{form.specialization || 'Specialization'}</p>
                <p className="dp-id-hospital">
                  <Building2 size={12} />
                  {form.hospital || 'Your Hospital / Clinic'}
                </p>
              </div>

              {/* Rating */}
              <div className="dp-rating-section">
                <StarDisplay value={rating} total={totalRatings} />
              </div>

              {/* Stats */}
              <div className="dp-stats-row">
                <div className="dp-stat">
                  <Activity size={14} className="dp-stat-icon dp-icon-green" />
                  <span className="dp-stat-val">{form.experience || '—'}</span>
                  <span className="dp-stat-lbl">Yrs Exp</span>
                </div>
                <div className="dp-stat-sep" />
                <div className="dp-stat">
                  <IndianRupee size={14} className="dp-stat-icon dp-icon-teal" />
                  <span className="dp-stat-val">{form.consultationFee || '—'}</span>
                  <span className="dp-stat-lbl">Per Visit</span>
                </div>
                <div className="dp-stat-sep" />
                <div className="dp-stat">
                  <Clock size={14} className="dp-stat-icon dp-icon-cyan" />
                  <span className="dp-stat-val">{form.slotDuration}m</span>
                  <span className="dp-stat-lbl">Slot</span>
                </div>
              </div>

              {/* Info pills */}
              <div className="dp-info-pills">
                <div className="dp-info-pill dp-pill-green">
                  <Stethoscope size={13} />
                  <span>{form.specialization || 'Specialization not set'}</span>
                </div>
                <div className="dp-info-pill dp-pill-teal">
                  <Award size={13} />
                  <span>{form.qualification || 'Qualification not set'}</span>
                </div>
                <div className="dp-info-pill dp-pill-emerald">
                  <Building2 size={13} />
                  <span>{form.hospital || 'Hospital not set'}</span>
                </div>
                <div className="dp-info-pill dp-pill-cyan">
                  <Clock size={13} />
                  <span>{form.slotDuration} min appointment slots</span>
                </div>
              </div>

              {/* Completion bar */}
              <div className="dp-completion">
                <div className="dp-comp-hd">
                  <span className="dp-comp-lbl">
                    <TrendingUp size={11} />
                    Profile Completion
                  </span>
                  <span className="dp-comp-pct">{completionPct}%</span>
                </div>
                <div className="dp-comp-track">
                  <div className="dp-comp-fill" style={{ width: `${completionPct}%` }} />
                </div>
                {completionPct < 100 && (
                  <p className="dp-comp-hint">Fill all fields to go live to patients</p>
                )}
              </div>
            </div>
          </aside>

          {/* ── RIGHT FORM AREA ── */}
          <div className="dp-form-area">

            {/* Panel 1 — Practice Info */}
            <div className="dp-panel">
              <div className="dp-panel-hd">
                <div className="dp-panel-ic dp-ic-green">
                  <Stethoscope size={16} />
                </div>
                <div>
                  <h3 className="dp-panel-title">Practice Information</h3>
                  <p className="dp-panel-sub">Your professional details visible to patients</p>
                </div>
              </div>

              <div className="dp-grid-2">

                {/* Specialization — full width */}
                <div className="dp-field dp-full">
                  <label className="dp-lbl">
                    <Stethoscope size={12} className="dp-lbl-icon" />
                    Specialization <span className="dp-req">*</span>
                  </label>
                  <div className="dp-select-wrap">
                    <select
                      value={form.specialization}
                      onChange={e => u('specialization', e.target.value)}
                      className="dp-inp dp-select"
                    >
                      <option value="">Select your specialization…</option>
                      {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="dp-select-arrow" />
                  </div>
                </div>

                {/* Experience */}
                <div className="dp-field">
                  <label className="dp-lbl">
                    <Activity size={12} className="dp-lbl-icon" />
                    Experience <span className="dp-req">*</span>
                  </label>
                  <div className="dp-inp-wrap">
                    <input
                      type="number" min="0" max="60"
                      value={form.experience}
                      onChange={e => u('experience', e.target.value)}
                      className="dp-inp dp-inp-suffix-pad"
                      placeholder="Years of experience"
                    />
                    <span className="dp-suffix">yrs</span>
                  </div>
                </div>

                {/* Consultation Fee */}
                <div className="dp-field">
                  <label className="dp-lbl">
                    <IndianRupee size={12} className="dp-lbl-icon" />
                    Consultation Fee <span className="dp-req">*</span>
                  </label>
                  <div className="dp-inp-wrap">
                    <span className="dp-prefix">₹</span>
                    <input
                      type="number" min="0"
                      value={form.consultationFee}
                      onChange={e => u('consultationFee', e.target.value)}
                      className="dp-inp dp-inp-prefix-pad dp-inp-suffix-pad"
                      placeholder="0"
                    />
                    <span className="dp-suffix">INR</span>
                  </div>
                </div>

                {/* Qualification */}
                <div className="dp-field">
                  <label className="dp-lbl">
                    <Award size={12} className="dp-lbl-icon" />
                    Qualification
                  </label>
                  <div className="dp-inp-wrap">
                    <input
                      value={form.qualification}
                      onChange={e => u('qualification', e.target.value)}
                      className="dp-inp"
                      placeholder="MBBS, MD, FRCP…"
                    />
                  </div>
                </div>

                {/* Hospital */}
                <div className="dp-field">
                  <label className="dp-lbl">
                    <Building2 size={12} className="dp-lbl-icon" />
                    Hospital / Clinic
                  </label>
                  <div className="dp-inp-wrap">
                    <input
                      value={form.hospital}
                      onChange={e => u('hospital', e.target.value)}
                      className="dp-inp"
                      placeholder="Hospital or clinic name"
                    />
                  </div>
                </div>

                {/* Slot duration */}
                <div className="dp-field">
                  <label className="dp-lbl">
                    <Clock size={12} className="dp-lbl-icon" />
                    Appointment Slot
                  </label>
                  <div className="dp-slot-grid">
                    {SLOT_OPTS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`dp-slot-chip ${form.slotDuration === opt.value ? 'dp-slot-active' : ''}`}
                        onClick={() => u('slotDuration', opt.value)}
                      >
                        <Clock size={11} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Panel 2 — Bio */}
            <div className="dp-panel">
              <div className="dp-panel-hd">
                <div className="dp-panel-ic dp-ic-teal">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="dp-panel-title">Professional Bio</h3>
                  <p className="dp-panel-sub">Help patients understand your expertise and approach</p>
                </div>
              </div>
              <textarea
                value={form.bio}
                onChange={e => u('bio', e.target.value)}
                rows={5}
                className="dp-inp dp-textarea"
                placeholder="Tell patients about your expertise, approach to care, areas of special interest, and what makes your practice unique…"
              />
              <div className="dp-bio-hint">
                <Sparkles size={12} />
                A detailed bio helps patients feel confident choosing you
              </div>
            </div>

            {/* Footer bar */}
            <div className="dp-footer-bar">
              <div className={`dp-save-indicator ${completionPct === 100 ? 'dp-ind-full' : 'dp-ind-partial'}`}>
                <CheckCircle2 size={13} />
                {completionPct === 100
                  ? 'Profile complete — visible to patients'
                  : `${completionPct}% complete — fill remaining fields`}
              </div>
              <button
                className={`dp-save-btn ${saving ? 'dp-saving' : ''} ${saved ? 'dp-saved' : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saved
                  ? <><CheckCircle2 size={16} /> Saved</>
                  : saving
                  ? <><span className="dp-spin" /> Saving…</>
                  : <><Save size={16} /> Save Profile</>}
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        :root {
          --bg:         #f0faf6;
          --surface:    #ffffff;
          --rim:        rgba(16,185,129,0.10);
          --rim-md:     rgba(16,185,129,0.18);
          --rim-hi:     rgba(16,185,129,0.32);
          --green:      #059669;
          --green-lt:   #10b981;
          --green-dim:  rgba(5,150,105,0.07);
          --teal:       #0d9488;
          --teal-dim:   rgba(13,148,136,0.07);
          --emerald:    #047857;
          --cyan:       #0891b2;
          --cyan-dim:   rgba(8,145,178,0.07);
          --tx1:        #0f172a;
          --tx2:        #374151;
          --tx3:        #9ca3af;
          --amber:      #d97706;
          --sh-sm:      0 1px 3px rgba(5,150,105,0.06), 0 2px 10px rgba(5,150,105,0.08);
          --sh-md:      0 4px 20px rgba(5,150,105,0.11), 0 1px 4px rgba(5,150,105,0.06);
          --sh-lg:      0 10px 36px rgba(5,150,105,0.15);
          --radius-card: 20px;
          --radius-inp:  11px;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes halo      { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.1);opacity:.9} }
        @keyframes pulse     { 0%,100%{box-shadow:0 0 0 2px rgba(16,185,129,.1)} 50%{box-shadow:0 0 0 6px rgba(16,185,129,.04)} }

        /* ── Root ── */
        .dp-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'Sora', sans-serif;
          color: var(--tx1);
          -webkit-font-smoothing: antialiased;
        }

        /* ── Page ── */
        .dp-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2.75rem 2rem 5rem;
        }
        @media(max-width:768px){ .dp-page{ padding: 2rem 1rem 4rem; } }

        /* ── Header ── */
        .dp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 2.25rem;
          animation: slideDown .5s cubic-bezier(.16,1,.3,1) both;
        }
        .dp-eyebrow {
          display: flex; align-items: center; gap: .45rem;
          font-size: .6875rem; font-weight: 700; color: var(--green);
          text-transform: uppercase; letter-spacing: .1em;
          margin-bottom: .375rem;
        }
        .dp-live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--green-lt);
          animation: pulse 2.5s ease-in-out infinite;
        }
        .dp-title {
          font-size: 2rem; font-weight: 800;
          letter-spacing: -.045em; color: var(--tx1);
          line-height: 1; margin-bottom: .3rem;
        }
        .dp-subtitle { font-size: .8125rem; color: var(--tx3); font-weight: 400; }

        /* ── Save Button ── */
        .dp-save-btn {
          display: inline-flex; align-items: center; gap: .45rem;
          padding: .65rem 1.5rem; border-radius: 12px;
          background: linear-gradient(135deg, #059669, #0d9488);
          color: #fff; font-family: 'Sora', sans-serif;
          font-size: .875rem; font-weight: 700; border: none; cursor: pointer;
          box-shadow: 0 2px 14px rgba(5,150,105,0.28);
          transition: all .22s cubic-bezier(.16,1,.3,1);
          position: relative; overflow: hidden; white-space: nowrap;
        }
        .dp-save-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.18) 50%, transparent 65%);
          transform: translateX(-100%); transition: transform .5s ease;
        }
        .dp-save-btn:hover::before { transform: translateX(100%); }
        .dp-save-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(5,150,105,.34); }
        .dp-save-btn:active { transform: scale(.97); }
        .dp-save-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }
        .dp-saving { background: #64748b !important; box-shadow: none !important; }
        .dp-saved  { background: linear-gradient(135deg, #047857, #065f46) !important; }
        .dp-spin   {
          width: 13px; height: 13px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: #fff;
          animation: spin .8s linear infinite; display: inline-block;
        }

        /* ── Layout ── */
        .dp-layout {
          display: grid;
          grid-template-columns: 268px minmax(0, 1fr);
          gap: 1.5rem;
          align-items: start;
          animation: fadeUp .6s cubic-bezier(.16,1,.3,1) .1s both;
        }
        @media(max-width:920px){ .dp-layout{ grid-template-columns: 1fr; } }

        /* ══ IDENTITY CARD ══ */
        .dp-aside { position: sticky; top: 1.5rem; }
        .dp-id-card {
          background: var(--surface);
          border: 1.5px solid var(--rim-md);
          border-radius: var(--radius-card);
          overflow: hidden;
          box-shadow: var(--sh-md);
          transition: box-shadow .25s;
        }
        .dp-id-card:hover { box-shadow: var(--sh-lg); }

        .dp-id-stripe {
          height: 4px;
          background: linear-gradient(90deg, #059669, #10b981, #0d9488, #0891b2, #059669);
          background-size: 300%;
        }

        /* Avatar */
        .dp-av-section { text-align: center; padding: 2rem 1.25rem 1.25rem; }
        .dp-av-wrap {
          position: relative; width: 84px; height: 84px;
          margin: 0 auto 1rem; display: inline-block;
        }
        .dp-av-halo {
          position: absolute; inset: -6px; border-radius: 50%;
          background: linear-gradient(135deg, rgba(16,185,129,.2), rgba(13,148,136,.12));
          animation: halo 3.5s ease-in-out infinite alternate;
        }
        .dp-av-ring {
          position: absolute; inset: 0; border-radius: 50%;
          background: conic-gradient(#059669 0%, #10b981 40%, #0d9488 70%, #059669 100%);
          padding: 2.5px;
        }
        .dp-av {
          width: 100%; height: 100%; border-radius: 50%;
          background: linear-gradient(135deg, #059669, #0d9488);
          color: #fff; font-size: 1.5rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 3px solid #fff; letter-spacing: -.02em;
        }
        .dp-av-badge {
          position: absolute; bottom: 1px; right: 1px; z-index: 2;
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--green); color: #fff;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #fff; box-shadow: 0 2px 8px rgba(5,150,105,.3);
        }
        .dp-id-name {
          font-size: 1rem; font-weight: 800; color: var(--tx1);
          letter-spacing: -.02em; margin-bottom: .2rem;
        }
        .dp-id-spec {
          font-size: .8125rem; font-weight: 600;
          color: var(--green); margin-bottom: .4rem;
        }
        .dp-id-hospital {
          display: inline-flex; align-items: center; gap: .35rem;
          font-size: .75rem; color: var(--tx3); font-weight: 500;
        }

        /* Rating */
        .dp-rating-section {
          padding: .875rem 1.25rem;
          border-top: 1px solid var(--rim);
          border-bottom: 1px solid var(--rim);
          text-align: center;
        }
        .dp-rating-row { display: flex; align-items: center; justify-content: center; gap: .5rem; flex-wrap: wrap; }
        .dp-stars { display: flex; gap: 1px; }
        .dp-star     { font-size: .9375rem; color: #e5e7eb; }
        .dp-star-lit { color: #fbbf24; }
        .dp-rating-val   { font-size: .9375rem; font-weight: 800; color: var(--tx1); font-family: 'JetBrains Mono', monospace; }
        .dp-rating-count { font-size: .75rem; color: var(--tx3); }
        .dp-no-rating    { font-size: .8125rem; color: var(--tx3); font-weight: 500; }

        /* Stats */
        .dp-stats-row {
          display: flex; align-items: stretch;
          border-bottom: 1px solid var(--rim);
        }
        .dp-stat {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 1rem .5rem; gap: 3px;
        }
        .dp-stat-icon { margin-bottom: 1px; }
        .dp-icon-green  { color: var(--green); }
        .dp-icon-teal   { color: var(--teal); }
        .dp-icon-cyan   { color: var(--cyan); }
        .dp-stat-sep { width: 1px; background: var(--rim); flex-shrink: 0; }
        .dp-stat-val {
          font-size: 1.0625rem; font-weight: 800;
          font-family: 'JetBrains Mono', monospace; color: var(--tx1); line-height: 1;
        }
        .dp-stat-lbl {
          font-size: .5625rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: .09em; color: var(--tx3);
        }

        /* Info Pills */
        .dp-info-pills {
          display: flex; flex-direction: column; gap: .4rem;
          padding: .875rem 1rem; border-bottom: 1px solid var(--rim);
        }
        .dp-info-pill {
          display: flex; align-items: center; gap: .625rem;
          padding: .5rem .75rem; border-radius: 10px; border: 1px solid;
          font-size: .8125rem; font-weight: 600; color: var(--tx2);
          transition: transform .16s;
        }
        .dp-info-pill > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dp-info-pill:hover  { transform: translateX(3px); }
        .dp-pill-green   { background: rgba(5,150,105,.05);  border-color: rgba(5,150,105,.15);  }
        .dp-pill-green svg   { color: var(--green); flex-shrink: 0; }
        .dp-pill-teal    { background: rgba(13,148,136,.05); border-color: rgba(13,148,136,.15); }
        .dp-pill-teal svg    { color: var(--teal); flex-shrink: 0; }
        .dp-pill-emerald { background: rgba(4,120,87,.05);   border-color: rgba(4,120,87,.15);   }
        .dp-pill-emerald svg { color: var(--emerald); flex-shrink: 0; }
        .dp-pill-cyan    { background: rgba(8,145,178,.05);  border-color: rgba(8,145,178,.15);  }
        .dp-pill-cyan svg    { color: var(--cyan); flex-shrink: 0; }

        /* Completion */
        .dp-completion { padding: 1rem 1rem 1.125rem; }
        .dp-comp-hd {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: .5rem;
        }
        .dp-comp-lbl {
          display: flex; align-items: center; gap: .35rem;
          font-size: .6875rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: .09em; color: var(--tx3);
        }
        .dp-comp-pct {
          font-size: .875rem; font-weight: 800;
          color: var(--green); font-family: 'JetBrains Mono', monospace;
        }
        .dp-comp-track {
          height: 5px; border-radius: 99px;
          background: rgba(16,185,129,.12); overflow: hidden;
        }
        .dp-comp-fill {
          height: 100%; border-radius: 99px;
          background: linear-gradient(90deg, #059669, #10b981);
          transition: width .9s cubic-bezier(.16,1,.3,1);
          box-shadow: 0 0 8px rgba(16,185,129,.35);
        }
        .dp-comp-hint {
          font-size: .6875rem; color: var(--tx3); margin-top: .5rem; font-weight: 500;
        }

        /* ══ FORM AREA ══ */
        .dp-form-area { display: flex; flex-direction: column; gap: 1.125rem; }

        /* Panel */
        .dp-panel {
          background: var(--surface);
          border: 1.5px solid var(--rim);
          border-radius: var(--radius-card);
          padding: 1.625rem;
          box-shadow: var(--sh-sm);
          transition: box-shadow .2s, border-color .2s;
        }
        .dp-panel:hover { box-shadow: var(--sh-md); }
        .dp-panel:focus-within { border-color: var(--rim-hi); box-shadow: 0 4px 22px rgba(16,185,129,.1); }

        .dp-panel-hd {
          display: flex; align-items: center; gap: .875rem;
          margin-bottom: 1.375rem; padding-bottom: 1rem;
          border-bottom: 1px solid var(--rim);
        }
        .dp-panel-ic {
          width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; border: 1px solid;
        }
        .dp-ic-green { background: var(--green-dim); border-color: rgba(5,150,105,.2); color: var(--green); }
        .dp-ic-teal  { background: var(--teal-dim);  border-color: rgba(13,148,136,.2); color: var(--teal); }
        .dp-panel-title {
          font-size: .9375rem; font-weight: 700; color: var(--tx1);
          letter-spacing: -.015em; margin-bottom: 2px;
        }
        .dp-panel-sub { font-size: .75rem; color: var(--tx3); }

        /* Grid */
        .dp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.125rem; }
        @media(max-width:560px){ .dp-grid-2{ grid-template-columns: 1fr; } }
        .dp-full { grid-column: 1 / -1; }

        /* Field */
        .dp-field { display: flex; flex-direction: column; gap: .45rem; }
        .dp-lbl {
          display: flex; align-items: center; gap: .35rem;
          font-size: .75rem; font-weight: 700; color: var(--tx2);
        }
        .dp-lbl-icon { color: var(--tx3); }
        .dp-req { color: #ef4444; margin-left: 1px; }

        /* Input */
        .dp-inp {
          background: #f8fffe;
          border: 1.5px solid rgba(16,185,129,.13);
          border-radius: var(--radius-inp);
          padding: .65rem .875rem;
          color: var(--tx1); font-family: 'Sora', sans-serif; font-size: .875rem;
          width: 100%; outline: none;
          transition: border-color .18s, box-shadow .18s, background .18s;
        }
        .dp-inp::placeholder { color: var(--tx3); }
        .dp-inp:focus {
          border-color: var(--green-lt);
          background: var(--surface);
          box-shadow: 0 0 0 3px rgba(16,185,129,.11);
        }
        .dp-inp option { background: var(--surface); }
        .dp-textarea { resize: none; line-height: 1.7; }

        /* Input with prefix/suffix */
        .dp-inp-wrap { position: relative; }
        .dp-select-wrap { position: relative; }
        .dp-select { padding-right: 2.25rem; appearance: none; cursor: pointer; }
        .dp-select-arrow {
          position: absolute; right: .75rem; top: 50%;
          transform: translateY(-50%); color: var(--tx3); pointer-events: none;
        }
        .dp-prefix {
          position: absolute; left: .875rem; top: 50%;
          transform: translateY(-50%); font-size: .875rem;
          font-weight: 600; color: var(--tx3); pointer-events: none;
        }
        .dp-suffix {
          position: absolute; right: .875rem; top: 50%;
          transform: translateY(-50%); font-size: .6875rem;
          font-weight: 700; color: var(--tx3);
          font-family: 'JetBrains Mono', monospace; pointer-events: none;
        }
        .dp-inp-prefix-pad { padding-left: 1.875rem; }
        .dp-inp-suffix-pad { padding-right: 3rem; }

        /* Slot chips */
        .dp-slot-grid { display: flex; flex-wrap: wrap; gap: .4rem; }
        .dp-slot-chip {
          display: inline-flex; align-items: center; gap: .3rem;
          padding: .45rem .8rem; border-radius: 9px;
          background: #f8fffe; border: 1.5px solid rgba(16,185,129,.13);
          color: var(--tx2); font-size: .8125rem; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer;
          transition: all .16s ease;
        }
        .dp-slot-chip:hover {
          border-color: rgba(5,150,105,.35);
          color: var(--green); background: var(--green-dim);
        }
        .dp-slot-active {
          background: var(--green-dim) !important;
          border-color: rgba(5,150,105,.38) !important;
          color: var(--green) !important;
          box-shadow: 0 2px 8px rgba(5,150,105,.12) !important;
        }

        /* Bio hint */
        .dp-bio-hint {
          display: flex; align-items: center; gap: .4rem;
          margin-top: .75rem; font-size: .75rem; color: var(--tx3); font-weight: 500;
        }
        .dp-bio-hint svg { color: var(--teal); }

        /* Footer bar */
        .dp-footer-bar {
          display: flex; align-items: center;
          justify-content: space-between; gap: 1rem; flex-wrap: wrap;
          padding: 1.125rem 1.5rem;
          border-radius: 16px;
          background: var(--surface);
          border: 1.5px solid var(--rim);
          box-shadow: var(--sh-sm);
        }
        .dp-save-indicator {
          display: flex; align-items: center; gap: .5rem;
          font-size: .8125rem; font-weight: 600;
          padding: .4rem 1rem; border-radius: 999px; border: 1px solid;
        }
        .dp-ind-full    { color: #065f46; background: rgba(16,185,129,.07); border-color: rgba(16,185,129,.2); }
        .dp-ind-full svg    { color: var(--green); }
        .dp-ind-partial { color: var(--amber); background: rgba(217,119,6,.07); border-color: rgba(217,119,6,.18); }
        .dp-ind-partial svg { color: var(--amber); }
      `}</style>
    </div>
  )
}