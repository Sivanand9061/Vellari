import { useState, useEffect, useRef } from "react";
import biryaniImg from "@/imports/1_0040_chicken-FRY-biriyani.png";
import porattaImg from "@/imports/3_0097_london-poratta-specia.png";
import noodlesImg from "@/imports/2_0101_prawns-noodles.png";
import { Menu, X, ChevronRight, Play } from "lucide-react";

const NAV_LINKS = ["Menu", "About", "Gallery", "Contact"];

const CHEF_SPECIALS = [
  { name: "Chicken Stew", price: "17.00", tag: "Kerala Special" },
  { name: "Chicken Pothichoru", price: "14.00", tag: "Banana Leaf Feast" },
  { name: "Chicken Fry Dum Biriyani", price: "19.00", tag: "Karama Best" },
];

const MAKING_ITEMS = [
  { label: "Flaky Malabar Parotta", type: "video" },
  { label: "Meter Chai Stretching", type: "video" },
  { label: "Behind the Kitchen", type: "video" },
];

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5 md:px-14 flex items-center justify-between bg-[#fffcf2]/90 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span
          className="text-[#156734] font-black text-2xl tracking-tight uppercase"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Vellari
        </span>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((l) => (
          <a
            key={l}
            href="#"
            className="text-[#156734] font-medium text-sm tracking-wide hover:opacity-60 transition-opacity"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {l}
          </a>
        ))}
      </nav>


      {/* Mobile menu toggle */}
      <button
        className="md:hidden text-[#156734]"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-[#fffcf2] border-t border-[#e5dbb2] px-6 py-6 flex flex-col gap-5 md:hidden shadow-md">
          {NAV_LINKS.map((l) => (
            <a
              key={l}
              href="#"
              className="text-[#156734] font-semibold text-base"
              style={{ fontFamily: "Montserrat, sans-serif" }}
              onClick={() => setOpen(false)}
            >
              {l}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

const HERO_SLIDES = [
  { img: biryaniImg, alt: "Chicken Dum Biryani" },
  { img: porattaImg, alt: "London Poratta Special" },
  { img: noodlesImg, alt: "Prawns Noodles" },
];

function Hero() {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % HERO_SLIDES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      setCurrent((c) =>
        delta < 0
          ? (c + 1) % HERO_SLIDES.length
          : (c - 1 + HERO_SLIDES.length) % HERO_SLIDES.length
      );
    }
    touchStartX.current = null;
  };

  return (
    <section className="relative min-h-screen pt-20 pb-16 px-5 md:px-14 flex flex-col items-center justify-center gap-10 bg-[#fffcf2] overflow-hidden">
      {/* Eyebrow */}
      <div
        className="relative z-10 flex items-center gap-3 text-[#156734]/60 text-xs font-semibold tracking-[0.18em] uppercase"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        <span className="w-8 h-px bg-[#156734]/30" />
        Fine Dining Experience
        <span className="w-8 h-px bg-[#156734]/30" />
      </div>

      {/* Heading */}
      <div className="relative z-10 text-center max-w-3xl">
        <h1
          className="text-[#156734] font-bold leading-[1.08] tracking-[-0.04em]"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontSize: "clamp(2.6rem, 7vw, 5.5rem)",
          }}
        >
          Where Every Meal<br />
          <span className="text-[#156734]/35">Tells a Story</span>
        </h1>
      </div>

      {/* Carousel */}
      <div
        className="relative z-10 w-full max-w-2xl flex items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {HERO_SLIDES.map((slide, i) => (
          <img
            key={slide.alt}
            src={slide.img}
            alt={slide.alt}
            className="absolute w-full select-none pointer-events-none transition-all duration-700"
            style={{
              filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.18))",
              opacity: i === current ? 1 : 0,
              transform: i === current ? "scale(1) translateX(0)" : "scale(0.96) translateX(20px)",
            }}
          />
        ))}
        {/* Invisible spacer to hold height */}
        <img
          src={HERO_SLIDES[0].img}
          alt=""
          aria-hidden
          className="w-full invisible"
        />
      </div>

      {/* CTA */}
      <a
        href="#menu"
        className="relative z-10 inline-flex items-center gap-3 bg-[#156734] text-white font-semibold px-10 py-4 rounded-[20px] hover:bg-[#0f4d27] transition-colors text-lg shadow-[0_6px_20px_rgba(21,103,52,0.3)]"
        style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "-0.03em" }}
      >
        Explore Menu
        <ChevronRight size={18} />
      </a>
    </section>
  );
}

function ChefsSpecial() {
  return (
    <section
      id="menu"
      className="py-20 px-5 md:px-14 bg-[#fffcf2]"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p
              className="text-[#156734]/50 text-xs font-semibold tracking-[0.18em] uppercase mb-3"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Handpicked by our head chef
            </p>
            <h2
              className="text-[#156734] font-semibold leading-tight tracking-[-0.04em]"
              style={{ fontFamily: "Montserrat, sans-serif", fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
            >
              Chef&apos;s Special
            </h2>
          </div>
          <a
            href="#"
            className="hidden md:inline-flex items-center gap-1 text-[#156734] font-medium text-sm hover:opacity-60 transition-opacity tracking-wide"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            View full menu
            <ChevronRight size={14} />
          </a>
        </div>

        {/* Cards grid */}
        <div className="flex flex-col gap-4">
          {CHEF_SPECIALS.map((dish) => (
            <div
              key={dish.name}
              className="group flex items-center gap-5 rounded-[16px] overflow-hidden bg-[#fffcf2] shadow-[0px_3px_12px_rgba(0,0,0,0.10)] hover:shadow-[0px_6px_22px_rgba(0,0,0,0.14)] transition-shadow p-3"
            >
              {/* Image placeholder */}
              <div
                className="shrink-0 rounded-[12px]"
                style={{ width: 88, height: 88, background: "#e5dbb2" }}
              />

              {/* Info */}
              <div className="flex flex-1 items-center justify-between min-w-0 pr-2">
                <div className="min-w-0">
                  <span
                    className="text-[#156734]/50 text-[10px] font-semibold uppercase tracking-widest block mb-1"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {dish.tag}
                  </span>
                  <p
                    className="text-[#156734] font-medium text-sm tracking-[-0.02em] truncate"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {dish.name}
                  </p>
                </div>
                <p
                  className="text-[#156734] font-bold text-lg tracking-[-0.04em] shrink-0 ml-4"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  ${dish.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TheMaking() {
  return (
    <section className="py-20 px-5 md:px-14 bg-[#fef8e0]">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="mb-12">
          <p
            className="text-[#156734]/50 text-xs font-semibold tracking-[0.18em] uppercase mb-3"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            A peek behind the curtain
          </p>
          <h2
            className="text-[#156734] font-semibold leading-tight tracking-[-0.04em]"
            style={{ fontFamily: "Montserrat, sans-serif", fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
          >
            The Making
          </h2>
        </div>

        {/* Cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 md:-mx-14 md:px-14 scrollbar-none">
          {MAKING_ITEMS.map((item) => (
            <div
              key={item.label}
              className="relative group shrink-0 rounded-[24px] overflow-hidden shadow-[2px_2px_12px_rgba(0,0,0,0.15)] hover:shadow-[2px_2px_24px_rgba(0,0,0,0.2)] transition-shadow"
              style={{ width: 176, height: 280, background: "#e5dbb2" }}
            >
              {/* Video badge on last card */}
              {item.type === "video" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#156734]/20 backdrop-blur-sm flex items-center justify-center border border-[#156734]/30">
                    <Play size={22} className="text-[#156734] ml-1" fill="#156734" />
                  </div>
                  <span
                    className="text-[#156734]/60 text-xs font-semibold tracking-widest uppercase"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    Watch Video
                  </span>
                </div>
              )}

              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 px-5 py-4">
                <p
                  className="text-[#156734] font-semibold text-sm tracking-[-0.02em]"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReservationBanner() {
  return (
    <section className="py-24 px-5 md:px-14 bg-[#156734]">
      <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
        <p
          className="text-white/50 text-xs font-semibold tracking-[0.18em] uppercase"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Dine with us
        </p>
        <h2
          className="text-white font-bold leading-tight tracking-[-0.04em]"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
          }}
        >
          Reserve Your<br />Table Tonight
        </h2>
        <p
          className="text-white/60 text-base max-w-md leading-relaxed"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Whether it&apos;s an intimate dinner for two or a celebration with loved ones, we&apos;re ready to make it memorable.
        </p>
        <a
          href="#"
          className="inline-flex items-center gap-3 bg-[#fffcf2] text-[#156734] font-bold px-10 py-4 rounded-[20px] hover:bg-white transition-colors text-base shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
          style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "-0.02em" }}
        >
          Book a Table
          <ChevronRight size={16} />
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#fffcf2] border-t border-[#e5dbb2] px-5 md:px-14 py-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start justify-between gap-10">
        <div>
          <p
            className="text-[#156734] font-black text-xl tracking-tight uppercase mb-2"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Vellari Restaurant
          </p>
          <p
            className="text-[#156734]/50 text-sm max-w-xs leading-relaxed"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Authentic Kerala street eats in Al Karama, Dubai. Open daily 7:00 AM – 11:00 PM.
          </p>
        </div>
        <div className="flex gap-14 flex-wrap">
          <div>
            <p
              className="text-[#156734] font-semibold text-xs tracking-[0.15em] uppercase mb-4"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Navigate
            </p>
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((l) => (
                <a
                  key={l}
                  href="#"
                  className="text-[#156734]/60 text-sm hover:text-[#156734] transition-colors font-medium"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
          <div>
            <p
              className="text-[#156734] font-semibold text-xs tracking-[0.15em] uppercase mb-4"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Visit Us
            </p>
            <div
              className="text-[#156734]/60 text-sm leading-relaxed font-medium flex flex-col gap-1"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              <span>Near Nesto Hypermarket</span>
              <span>Al Karama, Dubai - UAE</span>
              <span className="mt-2">+971 4 834 2856</span>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-[#e5dbb2] flex items-center justify-between">
        <p
          className="text-[#156734]/40 text-xs"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          © 2026 Vellari Restaurant. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#fffcf2]">
      <Navbar />
      <Hero />
      <ChefsSpecial />
      <TheMaking />

      <Footer />
    </div>
  );
}
