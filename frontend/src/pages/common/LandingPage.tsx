import { useState, useEffect, useRef } from "react";

// ─── Animated Counter ──────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Scroll Reveal ─────────────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.08 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function RevealSection({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Animated Grid Background ──────────────────────────────────────────────────
function AnimatedGrid() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Primary grid */}
      <div style={{
        position: "absolute", inset: "-10%",
        backgroundImage: `
          linear-gradient(rgba(14,165,233,0.18) 1px, transparent 1px),
          linear-gradient(90deg, rgba(14,165,233,0.18) 1px, transparent 1px)
        `,
        backgroundSize: "72px 72px",
        animation: "gridDrift 20s linear infinite",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
      }} />
      {/* Secondary finer grid */}
      <div style={{
        position: "absolute", inset: "-10%",
        backgroundImage: `
          linear-gradient(rgba(56,189,248,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(56,189,248,0.07) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
        animation: "gridDrift 14s linear infinite reverse",
        maskImage: "radial-gradient(ellipse 60% 70% at 50% 40%, black 30%, transparent 90%)",
        WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 50% 40%, black 30%, transparent 90%)",
      }} />
      {/* Glowing intersection dots */}
      <div style={{
        position: "absolute", inset: "-10%",
        backgroundImage: `radial-gradient(circle 1.5px at center, rgba(56,189,248,0.55) 0%, transparent 100%)`,
        backgroundSize: "72px 72px",
        animation: "gridDrift 20s linear infinite",
        maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 80%)",
      }} />
    </div>
  );
}

// ─── Typing Animation ──────────────────────────────────────────────────────────
function TypingText({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[index];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 75);
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 2200);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIndex((prev) => (prev + 1) % words.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, index, words]);

  return (
    <span style={{
      background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #34d399 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    }}>
      {displayed}
      <span style={{
        animation: "blink 1s step-end infinite",
        WebkitTextFillColor: "#38bdf8",
        color: "#38bdf8",
      }}>|</span>
    </span>
  );
}

// ─── Feature Card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description, color, delay }: {
  icon: string; title: string; description: string; color: string; delay: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <RevealSection delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered
            ? `linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))`
            : "rgba(255,255,255,0.025)",
          border: `1px solid ${hovered ? color + "55" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 18,
          padding: "1.85rem 1.65rem",
          transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
          transform: hovered ? "translateY(-6px)" : "none",
          boxShadow: hovered
            ? `0 24px 64px ${color}18, inset 0 1px 0 rgba(255,255,255,0.06)`
            : "inset 0 1px 0 rgba(255,255,255,0.03)",
          cursor: "default",
          position: "relative",
          overflow: "hidden",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Top shimmer line on hover */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${color}90 50%, transparent 100%)`,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.4s ease",
        }} />

        {/* Bottom glow */}
        <div style={{
          position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "70%", height: 40,
          background: `radial-gradient(ellipse, ${color}15 0%, transparent 70%)`,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.4s ease",
        }} />

        <div style={{
          width: 48, height: 48, borderRadius: 13,
          background: `linear-gradient(145deg, ${color}22, ${color}0a)`,
          border: `1px solid ${color}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, marginBottom: "1.15rem",
          transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)",
          transform: hovered ? "scale(1.12) rotate(-6deg)" : "none",
          boxShadow: hovered ? `0 8px 24px ${color}25` : "none",
        }}>
          {icon}
        </div>

        <h3 style={{
          fontSize: "0.98rem", fontWeight: 700, color: "#eef2ff",
          marginBottom: "0.5rem", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.01em",
        }}>{title}</h3>
        <p style={{
          fontSize: "0.83rem", color: "#64748b", lineHeight: 1.75,
          fontFamily: "'DM Sans', sans-serif",
        }}>{description}</p>
      </div>
    </RevealSection>
  );
}

// ─── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ number, title, desc, color, delay }: {
  number: string; title: string; desc: string; color: string; delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <RevealSection delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          textAlign: "center", padding: "2rem 1.25rem",
          background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
          border: `1px solid ${hovered ? color + "30" : "transparent"}`,
          borderRadius: 20,
          transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{
          width: 68, height: 68, borderRadius: "50%", margin: "0 auto 1.5rem",
          background: `linear-gradient(145deg, ${color}30, ${color}10)`,
          border: `1px solid ${color}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.3rem", fontWeight: 800, color: color,
          fontFamily: "'Sora', sans-serif",
          boxShadow: hovered ? `0 0 40px ${color}35, 0 8px 24px ${color}20` : `0 4px 20px ${color}15`,
          transition: "all 0.4s ease",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", inset: -4, borderRadius: "50%",
            border: `1px dashed ${color}35`,
            animation: "spin 14s linear infinite",
          }} />
          {number}
        </div>
        <h3 style={{
          fontSize: "1rem", fontWeight: 700, color: "#eef2ff",
          marginBottom: "0.65rem", fontFamily: "'Sora', sans-serif",
        }}>{title}</h3>
        <p style={{
          fontSize: "0.83rem", color: "#64748b", lineHeight: 1.75,
          fontFamily: "'DM Sans', sans-serif", maxWidth: 240, margin: "0 auto",
        }}>{desc}</p>
      </div>
    </RevealSection>
  );
}

// ─── Testimonial ───────────────────────────────────────────────────────────────
function TestimonialCard({ quote, name, role, avatar, delay }: {
  quote: string; name: string; role: string; avatar: string; delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <RevealSection delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${hovered ? "rgba(56,189,248,0.25)" : "rgba(255,255,255,0.06)"}`,
          borderRadius: 18, padding: "1.85rem 1.75rem",
          transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
          transform: hovered ? "translateY(-4px)" : "none",
          backdropFilter: "blur(10px)",
          boxShadow: hovered ? "0 20px 50px rgba(14,165,233,0.08)" : "none",
        }}
      >
        <div style={{ display: "flex", gap: 3, marginBottom: "1.15rem" }}>
          {[...Array(5)].map((_, i) => (
            <span key={i} style={{ color: "#f59e0b", fontSize: "0.8rem" }}>★</span>
          ))}
        </div>
        <p style={{
          fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.8,
          fontStyle: "italic", marginBottom: "1.5rem",
          fontFamily: "'DM Sans', sans-serif",
        }}>"{quote}"</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, #0ea5e9, #818cf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.9rem", fontWeight: 700, color: "#fff",
            fontFamily: "'Sora', sans-serif", flexShrink: 0,
            boxShadow: "0 4px 14px rgba(14,165,233,0.3)",
          }}>{avatar}</div>
          <div>
            <div style={{ fontWeight: 700, color: "#eef2ff", fontSize: "0.85rem", fontFamily: "'Sora', sans-serif" }}>{name}</div>
            <div style={{ color: "#475569", fontSize: "0.76rem", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{role}</div>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

// ─── Portal Card ───────────────────────────────────────────────────────────────
function PortalCard({ role, icon, color, perks, delay }: {
  role: string; icon: string; color: string; perks: string[]; delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <RevealSection delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered
            ? `linear-gradient(145deg, ${color}0e, rgba(255,255,255,0.02))`
            : "rgba(255,255,255,0.02)",
          border: `1px solid ${hovered ? color + "40" : "rgba(255,255,255,0.06)"}`,
          borderRadius: 20, padding: "2rem 1.85rem",
          height: "100%",
          transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
          transform: hovered ? "translateY(-5px)" : "none",
          boxShadow: hovered ? `0 20px 60px ${color}12` : "none",
          backdropFilter: "blur(8px)",
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${color}80, transparent)`,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.4s ease",
        }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.65rem" }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: `linear-gradient(145deg, ${color}25, ${color}08)`,
            border: `1px solid ${color}30`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
            transition: "transform 0.3s ease",
            transform: hovered ? "scale(1.08)" : "none",
          }}>{icon}</div>
          <div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, color: "#eef2ff", fontSize: "1rem" }}>{role} Portal</div>
            <div style={{ fontSize: "0.72rem", color: color, fontWeight: 600, letterSpacing: "0.03em", marginTop: 2 }}>Full access dashboard</div>
          </div>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {perks.map((perk, i) => (
            <li key={perk} style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              padding: "0.48rem 0",
              borderBottom: i < perks.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              color: "#64748b", fontSize: "0.83rem", fontFamily: "'DM Sans', sans-serif",
              transition: "color 0.2s ease",
            }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#94a3b8"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#64748b"}
            >
              <span style={{ color: color, fontWeight: 700, flexShrink: 0, fontSize: "0.7rem" }}>✦</span>
              {perk}
            </li>
          ))}
        </ul>
      </div>
    </RevealSection>
  );
}

// ─── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const features = [
    { icon: "🧠", title: "AI Symptom Checker", color: "#8b5cf6", delay: 0, description: "Describe symptoms and get instant AI-powered specialist recommendations with urgency triage and red-flag alerts." },
    { icon: "📅", title: "Smart Appointment Booking", color: "#0ea5e9", delay: 80, description: "Real-time slot availability, conflict detection, and auto-reminders. Book, reschedule, or cancel in seconds." },
    { icon: "💊", title: "Digital Prescriptions", color: "#10b981", delay: 160, description: "Doctors issue digital prescriptions with dose tracking, medication reminders, and downloadable PDF slips." },
    { icon: "🗂️", title: "Medical Records & Timeline", color: "#f59e0b", delay: 240, description: "Versioned medical records grouped by treatment episodes. Full patient history available to authorized doctors." },
    { icon: "🤖", title: "AI Health Assistant", color: "#ec4899", delay: 320, description: "Chat with an AI trained on your patient context — citations, suggested actions, and confidence scoring included." },
    { icon: "💳", title: "Razorpay Payments", color: "#06b6d4", delay: 400, description: "Secure online payments or pay-at-clinic options. HMAC-verified transactions with instant confirmation slips." },
    { icon: "📊", title: "Analytics Dashboard", color: "#f97316", delay: 480, description: "Admin and doctor dashboards with episode summaries, adherence rates, revenue charts, and top-doctor rankings." },
    { icon: "🔔", title: "Smart Notifications", color: "#6366f1", delay: 560, description: "Automated email/in-app notifications for bookings, reminders, follow-ups, no-shows, and prescription updates." },
  ];

  const steps = [
    { number: "01", title: "Register & Verify", desc: "Sign up as a patient or doctor. Email OTP verification keeps accounts secure from day one.", color: "#0ea5e9", delay: 0 },
    { number: "02", title: "Find Your Doctor", desc: "Filter by specialization, fee, rating, or use the AI symptom checker to get matched automatically.", color: "#10b981", delay: 120 },
    { number: "03", title: "Book & Pay", desc: "Select an available slot, confirm your appointment, and pay online or at the clinic — your choice.", color: "#8b5cf6", delay: 240 },
    { number: "04", title: "Get Treated", desc: "Doctor issues prescriptions digitally, records are created, and follow-up reminders are sent automatically.", color: "#f59e0b", delay: 360 },
  ];

  const testimonials = [
    { quote: "The AI symptom checker recommended exactly the right specialist. The whole booking took under 2 minutes!", name: "Ravi Kumar", role: "Patient", avatar: "R", delay: 0 },
    { quote: "As a cardiologist, I love the treatment episode system. My patients' complete histories are always at my fingertips.", name: "Dr. Arjun Sharma", role: "Cardiologist", avatar: "A", delay: 120 },
    { quote: "Medication reminders and dose tracking have completely changed how I manage my follow-up treatment.", name: "Anita Reddy", role: "Patient", avatar: "A", delay: 240 },
  ];

  const portals = [
    {
      role: "Patient", icon: "🧑‍⚕️", color: "#0ea5e9", delay: 0,
      perks: ["Book & reschedule appointments", "AI symptom checker", "View prescriptions & dose reminders", "Medical history timeline", "Rate your doctors", "Pay online or at clinic"],
    },
    {
      role: "Doctor", icon: "👨‍⚕️", color: "#10b981", delay: 120,
      perks: ["Manage daily schedule & slots", "Issue digital prescriptions", "Create treatment episodes", "Add medical records", "View patient analytics", "AI lifestyle advice generator"],
    },
    {
      role: "Admin", icon: "🛡️", color: "#8b5cf6", delay: 240,
      perks: ["Full user management", "Revenue & appointment analytics", "Doctor & patient oversight", "Audit log trail", "Activate / deactivate accounts", "Top doctors leaderboard"],
    },
  ];

  return (
    <div style={{ background: "#03080f", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes gridDrift {
          from { transform: translate(0, 0); }
          to { transform: translate(72px, 72px); }
        }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes heroEntrance {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-14px) rotate(1deg); }
          66% { transform: translateY(-7px) rotate(-1deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .nav-link {
          color: #64748b; text-decoration: none; font-size: 0.84rem;
          font-weight: 500; transition: color 0.25s; font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.01em;
        }
        .nav-link:hover { color: #eef2ff; }

        .btn-primary {
          padding: 13px 28px; border-radius: 10px; font-weight: 700;
          font-size: 0.875rem; cursor: pointer; border: none;
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color: #fff; font-family: 'Sora', sans-serif; letter-spacing: -0.01em;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 0 0 0 rgba(14,165,233,0), inset 0 1px 0 rgba(255,255,255,0.15);
          position: relative; overflow: hidden;
        }
        .btn-primary::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(14,165,233,0.45); }
        .btn-primary:hover::after { opacity: 1; }
        .btn-primary:active { transform: translateY(0); }

        .btn-ghost {
          padding: 13px 28px; border-radius: 10px; font-weight: 600;
          font-size: 0.875rem; cursor: pointer;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: "#94a3b8"; font-family: 'Sora', sans-serif; letter-spacing: -0.01em;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1); text-decoration: none; display: inline-block;
          color: #94a3b8;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2);
          transform: translateY(-2px); color: #eef2ff;
        }

        .btn-cta {
          padding: 17px 38px; border-radius: 12px; font-weight: 700;
          font-size: 1rem; cursor: pointer; border: none;
          background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
          color: #fff; font-family: 'Sora', sans-serif; letter-spacing: -0.01em;
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 8px 32px rgba(14,165,233,0.35), inset 0 1px 0 rgba(255,255,255,0.12);
          position: relative; overflow: hidden;
        }
        .btn-cta::before {
          content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: shimmer 2.5s infinite;
        }
        .btn-cta:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(14,165,233,0.5); }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #03080f; }
        ::-webkit-scrollbar-thumb { background: #0ea5e9; border-radius: 3px; }
      `}</style>

      {/* ─── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 2.5rem",
        height: 64,
        background: scrolled ? "rgba(3,8,15,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(24px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "none",
        transition: "all 0.45s cubic-bezier(0.16,1,0.3,1)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(14,165,233,0.25)",
            border: "1px solid rgba(14,165,233,0.2)",
          }}>
            <img src="/MediCare.png" alt="MediCare Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: "1.05rem", color: "#eef2ff", letterSpacing: "-0.03em" }}>MediCare</div>
            <div style={{ fontSize: "0.58rem", color: "#38bdf8", fontWeight: 700, letterSpacing: "0.1em", lineHeight: 1 }}>HEALTHCARE</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "2.25rem", alignItems: "center" }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="#testimonials" className="nav-link">Reviews</a>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
          <a href="/login" className="nav-link" style={{ color: "#38bdf8" }}>Sign In</a>
          <a href="/register" className="btn-primary" style={{ padding: "8px 20px", fontSize: "0.82rem", textDecoration: "none" }}>
            Get Started →
          </a>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{
        position: "relative", minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        paddingTop: "5rem", overflow: "hidden",
      }}>
        {/* Full-bleed background image with overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          filter: "grayscale(30%) brightness(0.18)",
        }} />

        {/* Dark gradient over image */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(3,8,15,0.3) 0%, rgba(3,8,15,0.5) 40%, rgba(3,8,15,0.92) 80%, #03080f 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(14,165,233,0.1) 0%, transparent 65%)",
        }} />

        {/* Animated Grid on top */}
        <AnimatedGrid />

        {/* Side vignettes */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, rgba(3,8,15,0.6) 0%, transparent 25%, transparent 75%, rgba(3,8,15,0.6) 100%)",
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 1.5rem", maxWidth: 860, margin: "0 auto" }}>
          {/* Pill badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "5px 14px 5px 8px", borderRadius: 100,
            background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)",
            marginBottom: "2rem", animation: "heroEntrance 0.9s ease 0.1s both",
            backdropFilter: "blur(8px)",
          }}>
            <div style={{ position: "relative", width: 8, height: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", position: "relative", zIndex: 1 }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#38bdf8", animation: "pulse-ring 1.8s ease-out infinite" }} />
            </div>
            <span style={{ color: "#38bdf8", fontSize: "0.75rem", fontWeight: 700, fontFamily: "'Sora', sans-serif", letterSpacing: "0.06em" }}>
              AI-POWERED HEALTHCARE PLATFORM
            </span>
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: "clamp(2.8rem, 7vw, 5rem)",
            fontWeight: 800, lineHeight: 1.1,
            color: "#eef2ff", marginBottom: "1.5rem", letterSpacing: "-0.03em",
            animation: "heroEntrance 0.9s ease 0.2s both",
          }}>
            Healthcare,{" "}
            <TypingText words={["Reimagined.", "Intelligent.", "Connected.", "Simplified."]} />
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 2vw, 1.15rem)",
            color: "#64748b", lineHeight: 1.85, maxWidth: 580, margin: "0 auto 2.75rem",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 400,
            animation: "heroEntrance 0.9s ease 0.35s both",
          }}>
            A complete healthcare system with AI symptom checking, digital prescriptions,
            treatment episode tracking, and Razorpay-integrated payments.
          </p>

          <div style={{
            display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap",
            animation: "heroEntrance 0.9s ease 0.5s both",
          }}>
            <a href="/register" className="btn-primary" style={{ textDecoration: "none" }}>
              🚀 Get Started Free
            </a>
            <a href="/login" className="btn-ghost">
              Sign In to Dashboard
            </a>
          </div>

          {/* Stats */}
          <div style={{
            display: "flex", gap: "0", justifyContent: "center", flexWrap: "wrap",
            marginTop: "5rem", paddingTop: "3rem",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            animation: "heroEntrance 0.9s ease 0.65s both",
          }}>
            {[
              { label: "Appointments", value: 12000, suffix: "+" },
              { label: "Doctors", value: 500, suffix: "+" },
              { label: "Satisfaction", value: 98, suffix: "%" },
              { label: "Cities", value: 40, suffix: "+" },
            ].map((stat, i) => (
              <div key={stat.label} style={{
                textAlign: "center", padding: "0 2.5rem",
                borderRight: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
                <div style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: "clamp(1.6rem, 3vw, 2.25rem)",
                  fontWeight: 800, color: "#38bdf8", letterSpacing: "-0.04em",
                }}>
                  <Counter target={stat.value} suffix={stat.suffix} />
                </div>
                <div style={{ fontSize: "0.75rem", color: "#334155", fontFamily: "'DM Sans', sans-serif", marginTop: 5, letterSpacing: "0.04em", fontWeight: 500 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "7rem 1.5rem", position: "relative" }}>
        {/* Subtle section bg */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700, height: 500,
          background: "radial-gradient(ellipse, rgba(14,165,233,0.04) 0%, transparent 70%)",
          filter: "blur(40px)", pointerEvents: "none",
        }} />
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <RevealSection>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div style={{
                display: "inline-block", padding: "4px 14px", borderRadius: 100,
                background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.15)",
                color: "#38bdf8", fontSize: "0.72rem", fontWeight: 700,
                fontFamily: "'Sora', sans-serif", letterSpacing: "0.08em",
                marginBottom: "1.1rem",
              }}>EVERYTHING YOU NEED</div>
              <h2 style={{
                fontFamily: "'Sora', sans-serif", fontWeight: 800,
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#eef2ff",
                marginBottom: "1rem", letterSpacing: "-0.03em",
              }}>
                Built for Modern Healthcare
              </h2>
              <p style={{ color: "#475569", fontSize: "0.95rem", maxWidth: 520, margin: "0 auto", lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif" }}>
                From AI-assisted triage to Razorpay payments — every feature built for real clinical workflows.
              </p>
            </div>
          </RevealSection>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))", gap: "1rem" }}>
            {features.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ─── Role Showcase ───────────────────────────────────────────────────── */}
      <section style={{
        padding: "6rem 1.5rem", position: "relative", overflow: "hidden",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        {/* Background image */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1920&q=80')",
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "grayscale(40%) brightness(0.1)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, #03080f 0%, rgba(3,8,15,0.85) 50%, #03080f 100%)",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto" }}>
          <RevealSection>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <div style={{
                display: "inline-block", padding: "4px 14px", borderRadius: 100,
                background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)",
                color: "#a78bfa", fontSize: "0.72rem", fontWeight: 700,
                fontFamily: "'Sora', sans-serif", letterSpacing: "0.08em", marginBottom: "1.1rem",
              }}>THREE PORTALS</div>
              <h2 style={{
                fontFamily: "'Sora', sans-serif", fontWeight: 800,
                fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)", color: "#eef2ff", letterSpacing: "-0.03em",
              }}>One System. Three Portals.</h2>
            </div>
          </RevealSection>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {portals.map((p) => <PortalCard key={p.role} {...p} />)}
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "7rem 1.5rem" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <RevealSection>
            <div style={{ textAlign: "center", marginBottom: "5rem" }}>
              <div style={{
                display: "inline-block", padding: "4px 14px", borderRadius: 100,
                background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)",
                color: "#34d399", fontSize: "0.72rem", fontWeight: 700,
                fontFamily: "'Sora', sans-serif", letterSpacing: "0.08em", marginBottom: "1.1rem",
              }}>SIMPLE PROCESS</div>
              <h2 style={{
                fontFamily: "'Sora', sans-serif", fontWeight: 800,
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#eef2ff", letterSpacing: "-0.03em",
              }}>From Sign-Up to Healed</h2>
            </div>
          </RevealSection>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", position: "relative" }}>
            <div style={{
              position: "absolute", top: 34, left: "13%", right: "13%", height: 1,
              background: "linear-gradient(90deg, #0ea5e9, #10b981, #8b5cf6, #f59e0b)",
              opacity: 0.15,
            }} />
            {steps.map((s) => <StepCard key={s.number} {...s} />)}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ───────────────────────────────────────────────────── */}
      <section id="testimonials" style={{ padding: "7rem 1.5rem", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=1920&q=80')",
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "grayscale(50%) brightness(0.08)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, #03080f 0%, rgba(3,8,15,0.8) 50%, #03080f 100%)",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto" }}>
          <RevealSection>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <div style={{
                display: "inline-block", padding: "4px 14px", borderRadius: 100,
                background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)",
                color: "#fbbf24", fontSize: "0.72rem", fontWeight: 700,
                fontFamily: "'Sora', sans-serif", letterSpacing: "0.08em", marginBottom: "1.1rem",
              }}>REAL REVIEWS</div>
              <h2 style={{
                fontFamily: "'Sora', sans-serif", fontWeight: 800,
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#eef2ff", letterSpacing: "-0.03em",
              }}>Trusted by Patients & Doctors</h2>
            </div>
          </RevealSection>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {testimonials.map((t) => <TestimonialCard key={t.name} {...t} />)}
          </div>
        </div>
      </section>

      {/* ─── Tech Stack Strip ────────────────────────────────────────────────── */}
      <section style={{ padding: "3rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <RevealSection>
            <p style={{ color: "#1e293b", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", fontFamily: "'Sora', sans-serif", marginBottom: "1.5rem" }}>
              POWERED BY
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", justifyContent: "center" }}>
              {["Spring Boot 3", "React 18 + TypeScript", "MySQL", "JWT Auth", "Gemini AI", "Razorpay", "Zustand", "Tailwind CSS"].map((tech) => (
                <span key={tech} style={{
                  padding: "5px 13px", borderRadius: 7,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  color: "#334155", fontSize: "0.76rem", fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.01em",
                  transition: "all 0.25s ease",
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(56,189,248,0.25)";
                    e.currentTarget.style.color = "#64748b";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.color = "#334155";
                  }}
                >{tech}</span>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "8rem 1.5rem", position: "relative", overflow: "hidden" }}>
        {/* Background image for CTA */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1920&q=80')",
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "grayscale(30%) brightness(0.12)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(14,165,233,0.08) 0%, rgba(3,8,15,0.95) 70%)",
        }} />

        {/* Prominent grid in CTA */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: "-10%",
            backgroundImage: `
              linear-gradient(rgba(14,165,233,0.14) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14,165,233,0.14) 1px, transparent 1px)
            `,
            backgroundSize: "72px 72px",
            animation: "gridDrift 20s linear infinite",
            maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
          <RevealSection>
            <div style={{
              textAlign: "center", padding: "4.5rem 3.5rem", borderRadius: 24,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(14,165,233,0.15)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 0 80px rgba(14,165,233,0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16, margin: "0 auto 1.75rem",
                background: "linear-gradient(135deg, rgba(14,165,233,0.2), rgba(14,165,233,0.05))",
                border: "1px solid rgba(14,165,233,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.75rem",
              }}>🚀</div>

              <h2 style={{
                fontFamily: "'Sora', sans-serif", fontWeight: 800,
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)", color: "#eef2ff",
                marginBottom: "1rem", letterSpacing: "-0.03em",
              }}>
                Ready to Modernize Your Clinic?
              </h2>
              <p style={{
                color: "#475569", fontSize: "0.95rem", lineHeight: 1.8,
                maxWidth: 440, margin: "0 auto 2.5rem", fontFamily: "'DM Sans', sans-serif",
              }}>
                Join thousands of doctors and patients already using MediCare. Register in seconds, no credit card required.
              </p>
              <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
                <button className="btn-cta" onClick={() => window.location.href = "/register"}>
                  Start for Free →
                </button>
                <a href="/login" className="btn-ghost">
                  Sign In
                </a>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "3.5rem 1.5rem 2.5rem",
        background: "rgba(0,0,0,0.3)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "3rem", justifyContent: "space-between", marginBottom: "3rem" }}>
            <div style={{ maxWidth: 260 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.1rem" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid rgba(14,165,233,0.2)",
                }}>
                  <img src="/MediCare.png" alt="MediCare" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, color: "#eef2ff", fontSize: "1rem", letterSpacing: "-0.02em" }}>MediCare</span>
              </div>
              <p style={{ color: "#1e293b", fontSize: "0.82rem", lineHeight: 1.75, fontFamily: "'DM Sans', sans-serif" }}>
                A final year project showcasing a complete, production-grade healthcare management system with AI integration.
              </p>
            </div>

            {[
              { title: "Platform", links: ["Book Appointment", "Find Doctors", "AI Symptom Checker", "My Prescriptions"] },
              { title: "Portals", links: ["Patient Login", "Doctor Login", "Admin Panel", "Register"] },
              { title: "Project", links: ["GitHub Repo", "API Docs (Swagger)", "Tech Stack", "About"] },
            ].map((col) => (
              <div key={col.title}>
                <div style={{
                  fontFamily: "'Sora', sans-serif", fontWeight: 700, color: "#1e293b",
                  fontSize: "0.72rem", marginBottom: "1.1rem", letterSpacing: "0.08em",
                }}>{col.title}</div>
                <ul style={{ listStyle: "none" }}>
                  {col.links.map((link) => (
                    <li key={link} style={{ marginBottom: "0.6rem" }}>
                      <a href="/login" style={{ color: "#1e293b", fontSize: "0.83rem", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", transition: "color 0.2s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#38bdf8")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#1e293b")}
                      >{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "1.75rem",
            display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center",
          }}>
            <p style={{ color: "#0f172a", fontSize: "0.78rem", fontFamily: "'DM Sans', sans-serif" }}>
              © 2025 MediCare Healthcare System — Final Year Project
            </p>
            <p style={{ color: "#0f172a", fontSize: "0.78rem", fontFamily: "'DM Sans', sans-serif" }}>
              Built with Spring Boot · React · MySQL · Gemini AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}