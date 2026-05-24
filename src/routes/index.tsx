import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wrench, Shield, Star, Smartphone, Users, Briefcase, Clock, MapPin,
  CheckCircle2, ArrowRight, LogIn, Sparkles, Zap, Heart, Award,
  Hammer, Paintbrush, Plug, Droplets, Wind, Scissors, Apple, Play,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ApnaUstad — Pakistan's #1 On-Demand Home Services App" },
      { name: "description", content: "Book trusted electricians, plumbers, AC technicians, painters & more in minutes. ApnaUstad connects clients with verified skilled workers across Pakistan." },
      { property: "og:title", content: "ApnaUstad — Trusted Home Services, On Demand" },
      { property: "og:description", content: "Book verified workers across Pakistan in minutes. Plumbers, electricians, AC repair, painting, cleaning and more." },
    ],
  }),
  component: LandingPage,
});

/* ---------- Reusable bits ---------- */

function Particles({ count = 40 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-primary/40 pointer-events-none"
          style={{
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
            opacity: 0.2 + Math.random() * 0.6,
          }}
        />
      ))}
    </>
  );
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-14">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-semibold tracking-wider uppercase text-primary mb-4">
        <Sparkles className="w-3.5 h-3.5" /> {eyebrow}
      </div>
      <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">{title}</h2>
      {sub && <p className="mt-4 text-muted-foreground text-lg">{sub}</p>}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, accent = "cyan" }: any) {
  const grad = accent === "orange" ? "gradient-orange" : accent === "purple" ? "gradient-purple" : "gradient-cyan";
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

function ServiceTile({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col items-center text-center card-hover">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: color }}>
        <Icon className="w-7 h-7 text-background" strokeWidth={2.5} />
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

/* ---------- Page ---------- */

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ============== HEADER ============== */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-cyan flex items-center justify-center glow-cyan">
              <Wrench className="w-5 h-5 text-background" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-extrabold text-gradient-cyan">ApnaUstad</div>
              <div className="text-[9px] text-muted-foreground tracking-wider">HOME SERVICES PK</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition">Services</a>
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#download" className="hover:text-foreground transition">Download</a>
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
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-bold uppercase tracking-wider text-primary mb-6">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
              Live in 25+ cities across Pakistan
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight">
              Skilled <span className="text-gradient-cyan">Ustads</span><br />
              at your <span className="text-gradient-cyan">doorstep.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              From a leaky tap to a full home makeover — book verified electricians, plumbers,
              AC technicians, painters, cleaners and more in just a few taps.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#download" className="btn-press inline-flex items-center gap-2 h-12 px-6 rounded-xl gradient-cyan text-background font-bold glow-cyan hover:opacity-90 transition">
                <Smartphone className="w-5 h-5" /> Download the App
              </a>
              <a href="#services" className="btn-press inline-flex items-center gap-2 h-12 px-6 rounded-xl glass border border-border font-semibold hover:border-primary/50 transition">
                Explore Services <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Star className="w-4 h-4 text-gold fill-gold" /> <span className="font-semibold text-foreground">4.9</span>/5 rating</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> <span className="font-semibold text-foreground">50K+</span> happy clients</div>
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-success" /> Verified workers</div>
            </div>
          </div>

          {/* Hero visual: phone mock */}
          <div className="relative animate-slide-up">
            <div className="absolute -inset-10 gradient-glow blur-3xl opacity-70" />
            <div className="relative mx-auto w-[280px] md:w-[320px] aspect-[9/19] rounded-[2.5rem] glass border-2 border-primary/30 p-3 shadow-card">
              <div className="w-full h-full rounded-[2rem] gradient-cosmic overflow-hidden relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-background rounded-b-2xl" />
                <div className="p-5 pt-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Good morning</div>
                      <div className="text-sm font-bold">Ahmed Khan</div>
                    </div>
                    <div className="w-9 h-9 rounded-full gradient-purple" />
                  </div>
                  <div className="glass rounded-2xl p-3 text-xs flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> DHA Phase 5, Lahore
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { i: Plug, c: "linear-gradient(135deg,#FF8C00,#FF5E00)", l: "Electric" },
                      { i: Droplets, c: "linear-gradient(135deg,#00F5FF,#007AFF)", l: "Plumber" },
                      { i: Wind, c: "linear-gradient(135deg,#BF5AF2,#FF2D55)", l: "AC" },
                      { i: Paintbrush, c: "linear-gradient(135deg,#34C759,#11998e)", l: "Paint" },
                      { i: Hammer, c: "linear-gradient(135deg,#FFD700,#FF8C00)", l: "Carpenter" },
                      { i: Scissors, c: "linear-gradient(135deg,#FF1493,#BF5AF2)", l: "Cleaner" },
                    ].map(({ i: Ic, c, l }, idx) => (
                      <div key={idx} className="rounded-xl p-2.5 flex flex-col items-center gap-1.5" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c }}>
                          <Ic className="w-4 h-4 text-background" strokeWidth={2.5} />
                        </div>
                        <span className="text-[9px] font-semibold">{l}</span>
                      </div>
                    ))}
                  </div>
                  <div className="glass rounded-2xl p-3">
                    <div className="text-[10px] text-muted-foreground mb-1">Top rated near you</div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full gradient-cyan" />
                      <div className="flex-1">
                        <div className="text-xs font-bold">Usman Ali</div>
                        <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 text-gold fill-gold" /> 4.9 · Electrician
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-primary">Book</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== STATS ============== */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: "50K+", l: "Happy Clients" },
            { v: "8K+", l: "Verified Workers" },
            { v: "25+", l: "Cities Covered" },
            { v: "4.9★", l: "Average Rating" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-3xl md:text-4xl font-black text-gradient-cyan">{s.v}</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1 font-medium">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============== SERVICES ============== */}
      <section id="services" className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionTitle
            eyebrow="Our Services"
            title={<>Every <span className="text-gradient-cyan">home service</span> you need</>}
            sub="One app for all your home maintenance and repair needs — booked in minutes, done by professionals."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { i: Plug, l: "Electrician", c: "linear-gradient(135deg,#FF8C00,#FF5E00)" },
              { i: Droplets, l: "Plumber", c: "linear-gradient(135deg,#00F5FF,#007AFF)" },
              { i: Wind, l: "AC Repair", c: "linear-gradient(135deg,#BF5AF2,#FF2D55)" },
              { i: Paintbrush, l: "Painter", c: "linear-gradient(135deg,#34C759,#11998e)" },
              { i: Hammer, l: "Carpenter", c: "linear-gradient(135deg,#FFD700,#FF8C00)" },
              { i: Scissors, l: "Cleaning", c: "linear-gradient(135deg,#FF1493,#BF5AF2)" },
            ].map((s) => <ServiceTile key={s.l} icon={s.i} label={s.l} color={s.c} />)}
          </div>
        </div>
      </section>

      {/* ============== FEATURES ============== */}
      <section id="features" className="py-24 px-4 md:px-8 bg-card/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <SectionTitle
            eyebrow="Why ApnaUstad"
            title={<>Built for <span className="text-gradient-cyan">trust</span>, speed & quality</>}
            sub="We obsess over the details so you can relax. Every booking is backed by verified professionals and our quality guarantee."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={Shield} title="Verified Professionals" desc="Every Ustad is CNIC-verified, background-checked and skill-rated before joining the platform." />
            <FeatureCard icon={Zap} title="Instant Booking" desc="Find a professional and confirm your booking in under 60 seconds. Real-time arrival tracking included." accent="orange" />
            <FeatureCard icon={Star} title="Quality Guaranteed" desc="Not happy? We re-do the job at no cost. Our 4.9★ average rating speaks for itself." accent="purple" />
            <FeatureCard icon={Clock} title="On-Time, Every Time" desc="Live ETA tracking and on-time guarantee. Your time is precious — we respect it." />
            <FeatureCard icon={Award} title="Transparent Pricing" desc="See the price before you book. No hidden fees, no surprises. Pay only after the job is done." accent="orange" />
            <FeatureCard icon={Heart} title="24/7 Support" desc="Real humans, real fast. Our support team is just one tap away — in Urdu or English." accent="purple" />
          </div>
        </div>
      </section>

      {/* ============== FOR CLIENTS / WORKERS ============== */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Clients */}
          <div className="relative glass rounded-3xl p-8 md:p-10 overflow-hidden card-hover">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full gradient-cyan opacity-20 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-bold text-primary uppercase tracking-wider mb-4">
                <Users className="w-3.5 h-3.5" /> For Clients
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold mb-3">Get any job done. Fast.</h3>
              <p className="text-muted-foreground mb-6">Skip the asking around. Book trusted workers from the comfort of your couch.</p>
              <ul className="space-y-3">
                {[
                  "Browse and compare verified professionals in your area",
                  "Transparent upfront pricing — no haggling",
                  "Live tracking from booking to completion",
                  "Rate, review, and rebook your favorite Ustads",
                  "Secure in-app payments with cashback rewards",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <a href="#download" className="btn-press mt-7 inline-flex items-center gap-2 h-11 px-5 rounded-xl gradient-cyan text-background font-bold glow-cyan hover:opacity-90 transition">
                Get the Client App <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Workers */}
          <div className="relative glass rounded-3xl p-8 md:p-10 overflow-hidden card-hover">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full gradient-orange opacity-20 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-xs font-bold text-accent uppercase tracking-wider mb-4">
                <Briefcase className="w-3.5 h-3.5" /> For Workers
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold mb-3">Grow your business. Earn more.</h3>
              <p className="text-muted-foreground mb-6">Join thousands of skilled Ustads earning a steady income with ApnaUstad.</p>
              <ul className="space-y-3">
                {[
                  "Get matched with paying customers near you, every day",
                  "Set your own schedule — work when you want",
                  "Weekly payouts directly to your bank or JazzCash",
                  "Build a verified rating to earn more bookings",
                  "Free training, ID card, and uniform when you join",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <a href="#download" className="btn-press mt-7 inline-flex items-center gap-2 h-11 px-5 rounded-xl gradient-orange text-background font-bold glow-orange hover:opacity-90 transition">
                Become an Ustad <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section id="how" className="py-24 px-4 md:px-8 bg-card/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <SectionTitle
            eyebrow="How it works"
            title={<>Booked in <span className="text-gradient-cyan">3 simple steps</span></>}
          />
          <div className="grid md:grid-cols-3 gap-6 relative">
            {[
              { n: "01", t: "Download & Sign Up", d: "Install the ApnaUstad app, verify your phone number, and you're in. Takes less than a minute." },
              { n: "02", t: "Choose Your Service", d: "Pick from 20+ home services, see prices upfront, and select a verified Ustad based on rating and reviews." },
              { n: "03", t: "Sit Back & Relax", d: "Track your Ustad in real-time, get the job done right, and pay securely in-app. Rate & rebook anytime." },
            ].map((s) => (
              <div key={s.n} className="glass rounded-2xl p-7 card-hover relative">
                <div className="text-6xl font-black text-gradient-cyan opacity-30 leading-none mb-2">{s.n}</div>
                <h4 className="text-xl font-bold mb-2">{s.t}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== DOWNLOAD CTA ============== */}
      <section id="download" className="py-24 px-4 md:px-8 relative overflow-hidden">
        <Particles count={30} />
        <div className="absolute inset-0 gradient-glow opacity-40 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto glass rounded-3xl p-10 md:p-16 text-center shadow-card border border-primary/20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-bold text-primary uppercase tracking-wider mb-5">
            <Smartphone className="w-3.5 h-3.5" /> Available now
          </div>
          <h2 className="text-4xl md:text-6xl font-black leading-tight">
            Download <span className="text-gradient-cyan">ApnaUstad</span> today
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Free to download. Free to use. Pay only for the service you book. Join 50,000+ Pakistanis who trust ApnaUstad.
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
            Or scan the QR code on the app store · Available for Android 8+ and iOS 13+
          </p>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-cyan flex items-center justify-center glow-cyan">
                <Wrench className="w-5 h-5 text-background" strokeWidth={2.5} />
              </div>
              <div className="text-lg font-extrabold text-gradient-cyan">ApnaUstad</div>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              Pakistan's most trusted on-demand home services marketplace. Connecting clients with skilled professionals, one booking at a time.
            </p>
          </div>
          <div>
            <div className="text-sm font-bold mb-3">Company</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition">About</a></li>
              <li><a href="#" className="hover:text-foreground transition">Careers</a></li>
              <li><a href="#" className="hover:text-foreground transition">Press</a></li>
              <li><Link to="/login" className="hover:text-foreground transition">Admin Portal</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold mb-3">Support</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition">Help Center</a></li>
              <li><a href="#" className="hover:text-foreground transition">Safety</a></li>
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
