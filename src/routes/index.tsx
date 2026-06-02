import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Wrench, Shield, Star, Smartphone, Users, Briefcase, Clock, MapPin,
  CheckCircle2, ArrowRight, LogIn, Sparkles, Zap, Heart, Award,
  Hammer, Paintbrush, Plug, Droplets, Wind, Scissors, Apple, Play,
  ChevronRight, ChevronDown, Banknote, BadgeCheck, Radar, CalendarClock,
  MessageSquare, Activity, Wallet, ThumbsUp, Bell, Navigation, Target,
  Phone, Mail, Send, Headphones, FileCheck, Layers, Search,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ApnaUstad — Find Trusted Ustads Near You | Pakistan Home Services" },
      { name: "description", content: "Book verified electricians, plumbers, AC technicians, painters, carpenters & cleaners across Pakistan. Post instant or scheduled jobs, get matched with nearby Ustads, pay cash." },
      { property: "og:title", content: "ApnaUstad — Find Trusted Ustads Near You" },
      { property: "og:description", content: "Pakistan's local services platform. Post a job, get matched with nearby verified workers, track work, pay cash on completion." },
    ],
  }),
  component: LandingPage,
});

/* =====================================================================
   REUSABLE PRIMITIVES
   ===================================================================== */

const visualSeed = (index: number, salt: number) => ((index * 73 + salt * 41) % 101) / 100;
const FEATURE_ACCENTS = ["cyan", "orange", "purple", "success"] as const;

function Particles({ count = 40 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-primary/40 pointer-events-none"
          style={{
            width: 2 + visualSeed(i, 1) * 3,
            height: 2 + visualSeed(i, 2) * 3,
            left: `${visualSeed(i, 3) * 100}%`,
            top: `${visualSeed(i, 4) * 100}%`,
            animation: `float ${4 + visualSeed(i, 5) * 6}s ease-in-out infinite`,
            animationDelay: `${visualSeed(i, 6) * 5}s`,
            opacity: 0.2 + visualSeed(i, 7) * 0.6,
          }}
        />
      ))}
    </>
  );
}

function Eyebrow({ icon: Icon, children, tone = "primary" }: { icon?: any; children: React.ReactNode; tone?: "primary" | "accent" | "secondary" }) {
  const color = tone === "accent" ? "text-accent" : tone === "secondary" ? "text-secondary" : "text-primary";
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[11px] font-bold tracking-[0.18em] uppercase ${color}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />} {children}
    </div>
  );
}

function SectionTitle({ eyebrow, eyebrowIcon = Sparkles, title, sub, tone = "primary" }: {
  eyebrow: string; eyebrowIcon?: any; title: React.ReactNode; sub?: string; tone?: "primary" | "accent" | "secondary";
}) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-14">
      <Eyebrow icon={eyebrowIcon} tone={tone}>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-4xl md:text-5xl font-black leading-[1.1]">{title}</h2>
      {sub && <p className="mt-4 text-muted-foreground text-lg leading-relaxed">{sub}</p>}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, accent = "cyan" }: any) {
  const grad = accent === "orange" ? "gradient-orange" : accent === "purple" ? "gradient-purple" : accent === "success" ? "gradient-success" : "gradient-cyan";
  return (
    <div className="glass rounded-2xl p-6 card-hover group">
      <div className={`w-12 h-12 rounded-xl ${grad} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-background" strokeWidth={2.5} />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function ServiceTile({ icon: Icon, label, desc, color }: { icon: any; label: string; desc: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-5 card-hover group h-full">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform" style={{ background: color }}>
        <Icon className="w-6 h-6 text-background" strokeWidth={2.5} />
      </div>
      <div className="text-sm font-bold mb-1">{label}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
    </div>
  );
}

function StepRow({ n, title, desc, icon: Icon }: { n: string; title: string; desc: string; icon: any }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex flex-col items-center">
        <div className="w-11 h-11 rounded-xl gradient-cyan flex items-center justify-center text-background font-black text-sm flex-shrink-0">
          {n}
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent mt-2 min-h-[24px]" />
      </div>
      <div className="pb-6 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-primary" />
          <h4 className="font-bold">{title}</h4>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* =====================================================================
   PHONE MOCKUPS
   ===================================================================== */

function PhoneFrame({ children, accent = "cyan", tagText, tagIcon: TagIcon }: {
  children: React.ReactNode; accent?: "cyan" | "orange"; tagText: string; tagIcon: any;
}) {
  const glow = accent === "orange" ? "glow-orange" : "glow-cyan";
  const border = accent === "orange" ? "border-accent/40" : "border-primary/40";
  const tagGrad = accent === "orange" ? "gradient-orange" : "gradient-cyan";
  return (
    <div className="relative mx-auto w-[260px] md:w-[280px]">
      <div className={`absolute -inset-6 ${accent === "orange" ? "bg-accent/20" : "bg-primary/20"} blur-3xl rounded-full`} />
      <div className={`relative aspect-[9/19] rounded-[2.5rem] glass border-2 ${border} p-3 shadow-card ${glow}`}>
        <div className="w-full h-full rounded-[2rem] gradient-cosmic overflow-hidden relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-background rounded-b-2xl z-10" />
          {children}
        </div>
      </div>
      <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 ${tagGrad} text-background text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shadow-card`}>
        <TagIcon className="w-3 h-3" /> {tagText}
      </div>
    </div>
  );
}

function ClientPhone() {
  return (
    <PhoneFrame accent="cyan" tagText="Client App" tagIcon={Users}>
      <div className="p-4 pt-9 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] text-muted-foreground">Assalam-o-Alaikum</div>
            <div className="text-sm font-bold">Ahmed Khan</div>
          </div>
          <div className="w-9 h-9 rounded-full gradient-purple flex items-center justify-center text-[10px] font-bold">AK</div>
        </div>
        <div className="glass rounded-xl p-2.5 text-[10px] flex items-center gap-2">
          <MapPin className="w-3 h-3 text-primary" /> DHA Phase 5, Lahore
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { i: Plug, c: "linear-gradient(135deg,#FF8C00,#FF5E00)", l: "Electric" },
            { i: Droplets, c: "linear-gradient(135deg,#00F5FF,#007AFF)", l: "Plumber" },
            { i: Wind, c: "linear-gradient(135deg,#BF5AF2,#FF2D55)", l: "AC" },
            { i: Paintbrush, c: "linear-gradient(135deg,#34C759,#11998e)", l: "Paint" },
            { i: Hammer, c: "linear-gradient(135deg,#FFD700,#FF8C00)", l: "Wood" },
            { i: Scissors, c: "linear-gradient(135deg,#FF1493,#BF5AF2)", l: "Clean" },
          ].map(({ i: Ic, c, l }, idx) => (
            <div key={idx} className="rounded-lg p-1.5 flex flex-col items-center gap-1" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: c }}>
                <Ic className="w-3.5 h-3.5 text-background" strokeWidth={2.5} />
              </div>
              <span className="text-[8px] font-semibold">{l}</span>
            </div>
          ))}
        </div>
        <div className="glass rounded-xl p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary">Top Rated</span>
            <span className="text-[9px] text-muted-foreground">Nearby</span>
          </div>
          {[
            { n: "Usman Ali", s: "Electrician", r: "4.9", g: "gradient-cyan" },
            { n: "Bilal Sheikh", s: "Plumber", r: "4.8", g: "gradient-purple" },
          ].map((w) => (
            <div key={w.n} className="flex items-center gap-2 py-1.5 border-t border-border/40 first:border-0">
              <div className={`w-7 h-7 rounded-full ${w.g}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold truncate">{w.n}</div>
                <div className="text-[8px] text-muted-foreground flex items-center gap-1">
                  <Star className="w-2 h-2 text-gold fill-gold" /> {w.r} · {w.s}
                </div>
              </div>
              <div className="text-[9px] font-black text-primary">Book</div>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

function WorkerPhone() {
  return (
    <PhoneFrame accent="orange" tagText="Worker App" tagIcon={Briefcase}>
      <div className="p-4 pt-9 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full gradient-orange flex items-center justify-center text-[10px] font-bold">UA</div>
            <div>
              <div className="text-sm font-bold leading-none">Usman Ali</div>
              <div className="text-[9px] text-success mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" /> Online
              </div>
            </div>
          </div>
          <div className="glass rounded-full px-2 py-1 text-[9px] font-bold text-gold flex items-center gap-1">
            <Star className="w-2.5 h-2.5 fill-gold" /> 4.9
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="glass rounded-xl p-2">
            <div className="text-[9px] text-muted-foreground">Today</div>
            <div className="text-sm font-black text-success">Rs 4,500</div>
          </div>
          <div className="glass rounded-xl p-2">
            <div className="text-[9px] text-muted-foreground">Jobs</div>
            <div className="text-sm font-black text-primary">3 done</div>
          </div>
        </div>
        <div className="rounded-xl p-2.5 border border-accent/40" style={{ background: "rgba(255,140,0,0.08)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-accent flex items-center gap-1">
              <Bell className="w-3 h-3" /> New Job
            </span>
            <span className="text-[9px] text-muted-foreground">2 min ago</span>
          </div>
          <div className="text-[11px] font-bold">AC not cooling</div>
          <div className="text-[9px] text-muted-foreground mb-2 flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" /> Gulberg, 1.2 km away
          </div>
          <div className="flex gap-1.5">
            <button className="flex-1 h-6 rounded-md gradient-orange text-background text-[9px] font-black">Accept</button>
            <button className="flex-1 h-6 rounded-md glass text-[9px] font-semibold">Bid</button>
          </div>
        </div>
        <div className="glass rounded-xl p-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Active Mission</div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md gradient-cyan flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-background" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold">Wiring repair</div>
              <div className="text-[8px] text-success">In progress</div>
            </div>
            <div className="text-[10px] font-black text-accent">Rs 2,000</div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* =====================================================================
   FAQ
   ===================================================================== */

const FAQ_ITEMS = [
  { q: "How do I book a worker?", a: "Open the app, choose a service category, add job details with location and optional images, then post the job as instant or scheduled. Nearby Ustads will respond and you pick the one you like." },
  { q: "How do workers receive jobs?", a: "When a client posts a request, ApnaUstad matches it by category, location, urgency and worker availability. Relevant nearby workers receive the job in real time and can accept it or send a proposal." },
  { q: "Is payment online or cash?", a: "The current version is cash-only. After the job is done, the client pays the worker directly and confirms the payment in the app. The system records the transaction in both client and worker history." },
  { q: "Can I schedule a job for later?", a: "Yes. Choose 'Scheduled' when posting, pick a date and time, and interested workers will send proposals. You can compare and confirm the one you prefer." },
  { q: "How are workers verified?", a: "Workers register with CNIC, profile image, skills, category, city, rate and experience. Our admin team reviews and approves each profile before they can accept jobs." },
  { q: "How do reviews work?", a: "After a completed job, clients can rate the worker (1–5 stars) and leave a review. These ratings build the worker's reputation and help future clients choose trusted Ustads." },
  { q: "Is ApnaUstad available in my city?", a: "We are live in 25+ cities across Pakistan and expanding fast. Open the app and enter your location to see if your area is covered." },
  { q: "Can workers cancel or manage jobs?", a: "Yes. Workers can manage active missions from the home screen — update status, mark as complete, or cancel with a reason if something genuinely blocks the job." },
];

function FAQItem({ q, a, open, onClick }: { q: string; a: string; open: boolean; onClick: () => void }) {
  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all ${open ? "border-primary/40" : ""}`}>
      <button onClick={onClick} className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left">
        <span className="font-semibold text-sm md:text-base">{q}</span>
        <ChevronDown className={`w-5 h-5 text-primary flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed animate-fade-in">{a}</div>
      )}
    </div>
  );
}

/* =====================================================================
   PAGE
   ===================================================================== */

function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ============== HEADER ============== */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl border border-white/10 bg-black/20 flex items-center justify-center overflow-hidden shadow-lg">
              <img src="/images/logo_premium.png" alt="" className="h-10 w-10 scale-[1.35] object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-extrabold text-gradient-cyan">ApnaUstad</div>
              <div className="text-[9px] text-muted-foreground tracking-wider">HOME SERVICES PK</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition">Services</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#clients" className="hover:text-foreground transition">For Clients</a>
            <a href="#workers" className="hover:text-foreground transition">For Workers</a>
            <a href="#safety" className="hover:text-foreground transition">Safety</a>
            <a href="#faq" className="hover:text-foreground transition">FAQs</a>
          </nav>

          <Link
            to="/login"
            className="btn-press inline-flex items-center gap-2 h-10 px-4 md:px-5 rounded-xl gradient-cyan text-background text-sm font-bold glow-cyan hover:opacity-90 transition"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Admin Login</span>
            <span className="sm:hidden">Admin</span>
          </Link>
        </div>
      </header>

      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden gradient-cosmic">
        <Particles count={50} />
        <div className="absolute inset-0 gradient-glow opacity-60 pointer-events-none" />
        {/* glow blobs */}
        <div className="absolute top-20 -left-20 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -right-20 w-80 h-80 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-28 md:pt-24 md:pb-36 grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
          <div className="animate-fade-in">
            <Eyebrow icon={Sparkles}>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-dot mr-1" />
              Live in 25+ cities across Pakistan
            </Eyebrow>
            <h1 className="mt-5 text-5xl md:text-7xl font-black leading-[1.02] tracking-tight">
              Find Trusted <span className="text-gradient-cyan">Ustads</span><br />
              Near <span className="text-gradient-cyan">You.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              ApnaUstad connects you with skilled local workers for instant and scheduled services.
              Post a job, get matched with nearby professionals, track the work, and pay easily with cash.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#download" className="btn-press inline-flex items-center gap-2 h-12 px-6 rounded-xl gradient-cyan text-background font-bold glow-cyan hover:opacity-90 transition">
                <Smartphone className="w-5 h-5" /> Get the App
              </a>
              <a href="#workers" className="btn-press inline-flex items-center gap-2 h-12 px-6 rounded-xl gradient-orange text-background font-bold glow-orange hover:opacity-90 transition">
                <Briefcase className="w-5 h-5" /> Join as Worker
              </a>
              <a href="#how" className="btn-press inline-flex items-center gap-2 h-12 px-6 rounded-xl glass border border-border font-semibold hover:border-primary/50 transition">
                How It Works <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Star className="w-4 h-4 text-gold fill-gold" /> <span className="font-semibold text-foreground">4.9</span>/5 rating</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> <span className="font-semibold text-foreground">50K+</span> clients</div>
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-success" /> CNIC verified</div>
              <div className="flex items-center gap-2"><Banknote className="w-4 h-4 text-accent" /> Cash payment</div>
            </div>
          </div>

          {/* Dual phone showcase */}
          <div className="relative animate-slide-up">
            <div className="absolute inset-0 gradient-glow blur-3xl opacity-50" />
            <div className="relative grid grid-cols-2 gap-3 md:gap-6 items-end justify-items-center">
              <div className="translate-y-6 md:translate-y-10 -rotate-3 hover:rotate-0 transition-transform duration-500">
                <ClientPhone />
              </div>
              <div className="rotate-3 hover:rotate-0 transition-transform duration-500">
                <WorkerPhone />
              </div>
            </div>
            {/* floating chips */}
            <div className="hidden md:flex absolute -top-2 left-1/2 -translate-x-1/2 glass rounded-full px-4 py-2 items-center gap-2 text-xs font-bold shadow-card">
              <Radar className="w-4 h-4 text-primary animate-pulse-dot" />
              Matching nearby Ustads...
            </div>
          </div>
        </div>

        {/* curved divider */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-background pointer-events-none" />
      </section>

      {/* ============== STATS ============== */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: "50K+", l: "Happy Clients" },
            { v: "8K+", l: "Verified Ustads" },
            { v: "25+", l: "Cities Covered" },
            { v: "4.9★", l: "Average Rating" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-3xl md:text-5xl font-black text-gradient-cyan">{s.v}</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1 font-medium">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============== WHAT WE DO ============== */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionTitle
            eyebrow="What ApnaUstad Does"
            eyebrowIcon={Target}
            title={<>One app. Every <span className="text-gradient-cyan">local service</span>.</>}
            sub="From an emergency leak at midnight to a planned home makeover next week — we make hiring skilled workers fast, safe and organized."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { i: Search, t: "Book nearby skilled workers", d: "Discover verified Ustads in your neighborhood — sorted by rating, distance and price." },
              { i: Zap, t: "Post instant or scheduled jobs", d: "Need it now? Post instant. Planned for Sunday? Schedule it. The choice is yours." },
              { i: MessageSquare, t: "Compare worker responses", d: "Receive multiple proposals, see profiles and rates, then pick the Ustad that fits." },
              { i: Navigation, t: "Track booking progress", d: "Real-time updates from acceptance to arrival to completion — no more guessing." },
              { i: Banknote, t: "Confirm cash payments", d: "Pay the worker in cash on completion, then tap to confirm in the app for your records." },
              { i: ThumbsUp, t: "Leave reviews after work", d: "Rate the work and help build a trusted community of quality local professionals." },
            ].map((x, index) => (
              <FeatureCard key={x.t} icon={x.i} title={x.t} desc={x.d} accent={FEATURE_ACCENTS[index % 3]} />
            ))}
          </div>
        </div>
      </section>

      {/* ============== SERVICES ============== */}
      <section id="services" className="py-24 px-4 md:px-8 bg-card/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <SectionTitle
            eyebrow="Services Offered"
            eyebrowIcon={Layers}
            title={<>Every <span className="text-gradient-cyan">home service</span> you need</>}
            sub="Skilled, verified Ustads across the most-requested categories in Pakistan."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            {[
              { i: Plug, l: "Electrician", d: "Wiring, repair, installation and emergency electrical issues.", c: "linear-gradient(135deg,#FF8C00,#FF5E00)" },
              { i: Droplets, l: "Plumber", d: "Leaks, taps, drainage, geyser & water tank fixes.", c: "linear-gradient(135deg,#00F5FF,#007AFF)" },
              { i: Wind, l: "AC Repair", d: "Servicing, gas refill, installation and AC diagnostics.", c: "linear-gradient(135deg,#BF5AF2,#FF2D55)" },
              { i: Paintbrush, l: "Painter", d: "Interior & exterior painting, polish and finishing work.", c: "linear-gradient(135deg,#34C759,#11998e)" },
              { i: Hammer, l: "Carpenter", d: "Furniture repair, custom builds and woodwork at home.", c: "linear-gradient(135deg,#FFD700,#FF8C00)" },
              { i: Scissors, l: "Cleaner", d: "Deep cleaning for homes, offices and post-construction.", c: "linear-gradient(135deg,#FF1493,#BF5AF2)" },
              { i: Wrench, l: "Appliance Repair", d: "Washing machine, fridge, microwave and small-appliance fixes.", c: "linear-gradient(135deg,#00F5FF,#34C759)" },
              { i: Layers, l: "Mason / Labor", d: "Tile work, walls, plastering and skilled manual labor.", c: "linear-gradient(135deg,#5B5B5E,#1C1C2E)" },
              { i: Heart, l: "Home Maintenance", d: "General fixes, odd-jobs and routine home upkeep.", c: "linear-gradient(135deg,#FF8C00,#BF5AF2)" },
            ].map((s) => <ServiceTile key={s.l} icon={s.i} label={s.l} desc={s.d} color={s.c} />)}
          </div>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section id="how" className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionTitle
            eyebrow="How It Works"
            eyebrowIcon={Activity}
            title={<>From <span className="text-gradient-cyan">tap</span> to <span className="text-gradient-cyan">done</span> — in minutes</>}
          />
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Post your job", d: "Choose a category, add details, location, images and budget. Pick instant or scheduled.", i: Smartphone },
              { n: "02", t: "Get matched", d: "Nearby verified Ustads receive your request and respond with proposals — fast.", i: Radar },
              { n: "03", t: "Pay & review", d: "Confirm the worker, get the job done, pay cash on completion and leave a review.", i: ThumbsUp },
            ].map((s) => (
              <div key={s.n} className="glass rounded-2xl p-7 card-hover relative overflow-hidden">
                <div className="absolute top-3 right-3 opacity-10">
                  <s.i className="w-20 h-20" />
                </div>
                <div className="relative">
                  <div className="text-6xl font-black text-gradient-cyan opacity-40 leading-none mb-2">{s.n}</div>
                  <h4 className="text-xl font-bold mb-2">{s.t}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FOR CLIENTS ============== */}
      <section id="clients" className="py-24 px-4 md:px-8 bg-card/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Eyebrow icon={Users}>For Clients</Eyebrow>
            <h2 className="mt-4 text-4xl md:text-5xl font-black leading-tight">
              Get any job done. <span className="text-gradient-cyan">Stress-free.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Skip the asking around. From booking to payment, your full client journey on one screen.
            </p>
            <div className="mt-8">
              {[
                { n: "1", t: "Create your account", d: "Sign up with your phone number in under a minute.", i: BadgeCheck },
                { n: "2", t: "Pick a service & post the job", d: "Add location, images, budget — choose instant or scheduled.", i: FileCheck },
                { n: "3", t: "Compare nearby Ustads", d: "Workers respond or send proposals. Pick the best one.", i: Users },
                { n: "4", t: "Track work in real time", d: "From acceptance to completion — always know where things stand.", i: Navigation },
                { n: "5", t: "Pay cash & leave a review", d: "Confirm payment in the app. Rate the worker to help others.", i: ThumbsUp },
              ].map((s) => <StepRow key={s.n} n={s.n} title={s.t} desc={s.d} icon={s.i} />)}
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {["Fast nearby access", "Transparent details", "Ratings & profiles", "Booking history", "Cash confirmation"].map((c) => (
                <span key={c} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary">{c}</span>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <ClientPhone />
          </div>
        </div>
      </section>

      {/* ============== FOR WORKERS ============== */}
      <section id="workers" className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="lg:order-2">
            <Eyebrow icon={Briefcase} tone="accent">For Workers</Eyebrow>
            <h2 className="mt-4 text-4xl md:text-5xl font-black leading-tight">
              More jobs. More <span className="text-gradient-cyan">earnings.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Build your reputation, manage active missions and track your cash earnings — all from your phone.
            </p>
            <div className="mt-8">
              {[
                { n: "1", t: "Register as a worker", d: "Add skills, category, city, CNIC, photo, rate and experience.", i: BadgeCheck },
                { n: "2", t: "Go online", d: "Switch on to receive instant or scheduled jobs in your area.", i: Activity },
                { n: "3", t: "Accept jobs or send proposals", d: "Take instant requests or bid on scheduled jobs that fit you.", i: Bell },
                { n: "4", t: "Manage active missions", d: "Start, update status and complete jobs from your home screen.", i: Target },
                { n: "5", t: "Track earnings & reviews", d: "See cash history and grow your rating with every job.", i: Wallet },
              ].map((s) => <StepRow key={s.n} n={s.n} title={s.t} desc={s.d} icon={s.i} />)}
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {["More opportunities", "Digital profile", "Location matching", "Mission manager", "Cash history", "Reputation"].map((c) => (
                <span key={c} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent">{c}</span>
              ))}
            </div>
          </div>
          <div className="flex justify-center lg:order-1">
            <WorkerPhone />
          </div>
        </div>
      </section>

      {/* ============== JOB MATCHING + INSTANT vs SCHEDULED ============== */}
      <section className="py-24 px-4 md:px-8 bg-card/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <SectionTitle
            eyebrow="Smart Job Matching"
            eyebrowIcon={Radar}
            title={<>The right <span className="text-gradient-cyan">Ustad</span>, at the right <span className="text-gradient-cyan">moment</span></>}
            sub="When you post a job, ApnaUstad checks category, location, urgency and worker availability — and routes it to the most relevant nearby Ustads in real time."
          />
          <div className="grid md:grid-cols-5 gap-3 mb-12">
            {[
              { i: Layers, l: "Category" },
              { i: Activity, l: "Availability" },
              { i: MapPin, l: "Worker Location" },
              { i: Target, l: "Job Location" },
              { i: Zap, l: "Urgency" },
            ].map((x) => (
              <div key={x.l} className="glass rounded-2xl p-5 text-center card-hover">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl gradient-cyan flex items-center justify-center">
                  <x.i className="w-5 h-5 text-background" strokeWidth={2.5} />
                </div>
                <div className="text-sm font-bold">{x.l}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative glass rounded-3xl p-8 overflow-hidden card-hover">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full gradient-cyan opacity-20 blur-3xl" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl gradient-cyan flex items-center justify-center mb-4 glow-cyan">
                  <Zap className="w-6 h-6 text-background" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-extrabold mb-2">Instant Jobs</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  For urgent work that can't wait. Nearby available workers receive the request immediately and the first to accept gets the job. Perfect for emergencies — burst pipes, power failures, AC down on a hot day.
                </p>
              </div>
            </div>
            <div className="relative glass rounded-3xl p-8 overflow-hidden card-hover">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full gradient-orange opacity-20 blur-3xl" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl gradient-orange flex items-center justify-center mb-4 glow-orange">
                  <CalendarClock className="w-6 h-6 text-background" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-extrabold mb-2">Scheduled Jobs</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  For planned work. Pick your preferred date and time, and qualified Ustads will send you proposals. Compare profiles, rates and ratings — then confirm the one you trust.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== SAFETY & PAYMENT ============== */}
      <section id="safety" className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-6">
          {/* Safety */}
          <div className="relative glass rounded-3xl p-8 md:p-10 overflow-hidden card-hover">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full gradient-success opacity-20 blur-3xl" />
            <div className="relative">
              <Eyebrow icon={Shield} tone="primary">Safety & Trust</Eyebrow>
              <h3 className="mt-4 text-3xl md:text-4xl font-extrabold mb-3">Verified Ustads. Peace of mind.</h3>
              <p className="text-muted-foreground mb-6">Every worker on ApnaUstad goes through identity checks and admin approval before they can accept jobs.</p>
              <ul className="space-y-3">
                {[
                  "Worker profile verification with CNIC",
                  "Admin approval before going live",
                  "Public ratings and customer reviews",
                  "Full booking records and history",
                  "Payment ledger for every job",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm">
                    <BadgeCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Payment */}
          <div className="relative glass rounded-3xl p-8 md:p-10 overflow-hidden card-hover">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full gradient-orange opacity-20 blur-3xl" />
            <div className="relative">
              <Eyebrow icon={Banknote} tone="accent">Payments</Eyebrow>
              <h3 className="mt-4 text-3xl md:text-4xl font-extrabold mb-3">Simple cash payments — fully tracked.</h3>
              <p className="text-muted-foreground mb-6">
                ApnaUstad currently supports cash payments. After the job is done, the client pays the worker directly and confirms the payment in the app.
              </p>
              <ul className="space-y-3">
                {[
                  "Cash-only in the current version",
                  "Confirm payment with one tap in the app",
                  "Recorded in both client and worker history",
                  "Worker wallet/history updated automatically",
                  "Admin can monitor all payment records",
                  "Digital payments planned for future releases",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============== REVIEWS ============== */}
      <section className="py-24 px-4 md:px-8 bg-card/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <SectionTitle
            eyebrow="Reviews & Ratings"
            eyebrowIcon={Star}
            title={<>Real reviews from <span className="text-gradient-cyan">real customers</span></>}
            sub="After every completed job, clients rate the worker. These honest reviews build trust and help future customers choose the right Ustad."
          />
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "Sara Ahmed", c: "Karachi", s: "Plumber", r: 5, t: "Booked at 11 PM for a leaking tap. Bilal showed up within 30 minutes and fixed it cleanly. Such a lifesaver!" },
              { n: "Hamza Iqbal", c: "Lahore", s: "AC Repair", r: 5, t: "Scheduled an AC service. The worker was on time, professional and the price was exactly what was quoted. Highly recommend." },
              { n: "Ayesha Tariq", c: "Islamabad", s: "Cleaning", r: 5, t: "Deep cleaning before Eid — the team was thorough, polite and the app made everything organized. Will rebook." },
            ].map((r) => (
              <div key={r.n} className="glass rounded-2xl p-6 card-hover">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: r.r }).map((_, i) => <Star key={i} className="w-4 h-4 text-gold fill-gold" />)}
                </div>
                <p className="text-sm leading-relaxed mb-4 text-foreground/90">"{r.t}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-border/40">
                  <div className="w-10 h-10 rounded-full gradient-purple flex items-center justify-center text-xs font-bold">{r.n.split(" ").map(x => x[0]).join("")}</div>
                  <div>
                    <div className="text-sm font-bold">{r.n}</div>
                    <div className="text-[11px] text-muted-foreground">{r.c} · {r.s}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== WHY CHOOSE ============== */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionTitle
            eyebrow="Why ApnaUstad"
            eyebrowIcon={Award}
            title={<>Built for <span className="text-gradient-cyan">Pakistan's</span> local service market</>}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { i: Shield, t: "Trusted local workers", d: "CNIC-verified, admin-approved Ustads only." },
              { i: Zap, t: "Fast job posting", d: "Post a job in under a minute." },
              { i: Radar, t: "Nearby matching", d: "We connect you to workers closest to you." },
              { i: BadgeCheck, t: "Real worker profiles", d: "See skills, rates, photos and ratings." },
              { i: Banknote, t: "Cash payment tracking", d: "Every transaction recorded transparently." },
              { i: Star, t: "Ratings & reviews", d: "Quality stays high — customers decide." },
              { i: Layers, t: "Easy booking manager", d: "Track all your jobs in one place." },
              { i: Heart, t: "Made for Pakistan", d: "Local language, local payment, local trust." },
            ].map((x, index) => (
              <FeatureCard key={x.t} icon={x.i} title={x.t} desc={x.d} accent={FEATURE_ACCENTS[index % FEATURE_ACCENTS.length]} />
            ))}
          </div>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section id="faq" className="py-24 px-4 md:px-8 bg-card/30 border-y border-border/50">
        <div className="max-w-4xl mx-auto">
          <SectionTitle
            eyebrow="FAQs"
            eyebrowIcon={MessageSquare}
            title={<>Quick answers to <span className="text-gradient-cyan">common questions</span></>}
          />
          <div className="space-y-3">
            {FAQ_ITEMS.map((f, i) => (
              <FAQItem
                key={f.q}
                q={f.q}
                a={f.a}
                open={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============== DOWNLOAD CTA ============== */}
      <section id="download" className="py-24 px-4 md:px-8 relative overflow-hidden">
        <Particles count={30} />
        <div className="absolute inset-0 gradient-glow opacity-40 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto glass rounded-3xl p-10 md:p-16 text-center shadow-card border border-primary/20">
          <Eyebrow icon={Smartphone}>Available now</Eyebrow>
          <h2 className="mt-5 text-4xl md:text-6xl font-black leading-tight">
            Download <span className="text-gradient-cyan">ApnaUstad</span> today
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Free to download. Free to post jobs. Pay cash only when the job is done. Join thousands of Pakistanis who trust ApnaUstad.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href="#" className="btn-press inline-flex items-center gap-3 h-14 px-6 rounded-xl bg-foreground text-background hover:opacity-90 transition">
              <Apple className="w-7 h-7" />
              <div className="text-left leading-tight">
                <div className="text-[10px] opacity-70">Download on the</div>
                <div className="text-base font-bold">App Store</div>
              </div>
            </a>
            <a href="#" className="btn-press inline-flex items-center gap-3 h-14 px-6 rounded-xl bg-foreground text-background hover:opacity-90 transition">
              <Play className="w-7 h-7 fill-background" />
              <div className="text-left leading-tight">
                <div className="text-[10px] opacity-70">Get it on</div>
                <div className="text-base font-bold">Google Play</div>
              </div>
            </a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Available for Android 8+ and iOS 13+ · Free to install
          </p>

          {/* contact mini */}
          <div className="mt-10 pt-8 border-t border-border/40 grid sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 text-primary" /> +92 300 1234567</div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground"><Mail className="w-4 h-4 text-primary" /> hello@apnaustad.pk</div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground"><Headphones className="w-4 h-4 text-primary" /> 24/7 Support</div>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid sm:grid-cols-2 md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl border border-white/10 bg-black/20 flex items-center justify-center overflow-hidden shadow-lg">
                <img src="/images/logo_premium.png" alt="" className="h-10 w-10 scale-[1.35] object-contain" />
              </div>
              <div className="text-lg font-extrabold text-gradient-cyan">ApnaUstad</div>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              ApnaUstad is built to modernize local service hiring in Pakistan. We help customers find skilled workers quickly and help workers grow their income through a reliable digital platform.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:border-primary/50 border border-transparent transition"><Send className="w-4 h-4" /></a>
              <a href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:border-primary/50 border border-transparent transition"><Mail className="w-4 h-4" /></a>
              <a href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:border-primary/50 border border-transparent transition"><Phone className="w-4 h-4" /></a>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold mb-3">Platform</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#services" className="hover:text-foreground transition">Services</a></li>
              <li><a href="#how" className="hover:text-foreground transition">How It Works</a></li>
              <li><a href="#clients" className="hover:text-foreground transition">For Clients</a></li>
              <li><a href="#workers" className="hover:text-foreground transition">For Workers</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold mb-3">Company</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition">About Us</a></li>
              <li><a href="#safety" className="hover:text-foreground transition">Safety &amp; Trust</a></li>
              <li><a href="#faq" className="hover:text-foreground transition">FAQs</a></li>
              <li><Link to="/login" className="hover:text-foreground transition">Admin Portal</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold mb-3">Support</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition">Help Center</a></li>
              <li><a href="#" className="hover:text-foreground transition">Contact Us</a></li>
              <li><a href="#" className="hover:text-foreground transition">Terms</a></li>
              <li><a href="#" className="hover:text-foreground transition">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>© {new Date().getFullYear()} ApnaUstad. Made with ❤️ in Pakistan.</div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-foreground transition">Twitter</a>
              <a href="#" className="hover:text-foreground transition">Instagram</a>
              <a href="#" className="hover:text-foreground transition">Facebook</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
