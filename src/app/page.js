"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase";

export default function Home() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(null);

  // Default fallback values
  const DEFAULT_HERO_SLIDES = [
    { img: "/img/biryani.png", alt: "Chicken Dum Biryani" },
    { img: "/img/poratta.png", alt: "London Poratta Special" },
    { img: "/img/noodles.png", alt: "Prawns Noodles" },
  ];

  const DEFAULT_SPECIALS = [
    { name: "Chicken Stew", price: "17.00", tag: "Kerala Special", image: "/img/chicken_stew.png" },
    { name: "Chicken Pothichoru", price: "14.00", tag: "Banana Leaf Feast", image: "/img/chicken_pothichoru.png" },
    { name: "Chicken Fry Dum Biriyani", price: "19.00", tag: "Karama Best", image: "/img/biryani.png" },
  ];

  const DEFAULT_MAKING_VIDEOS = [
    {
      title: "Flaky Malabar Parotta",
      thumbnail: "/img/making_parotta.png",
      embedUrl: "https://www.youtube.com/embed/v24g7c3s_Xk"
    },
    {
      title: "Meter Chai Stretching",
      thumbnail: "/img/making_chai.png",
      embedUrl: "https://www.youtube.com/embed/5U9N1wF35bU"
    }
  ];

  const DEFAULT_CONFIG = {
    heroHeadingLine1: "Authentic Kerala",
    heroHeadingLine2: "Street Eats",
    parentBrandText: "KL 10 RESTAURANT",
    englishLogoUrl: "/logo_english.png",
    malayalamLogoUrl: "/logo_malayalam.png",
  };

  const [heroSlides, setHeroSlides] = useState(DEFAULT_HERO_SLIDES);
  const [specials, setSpecials] = useState(DEFAULT_SPECIALS);
  const [makingVideos, setMakingVideos] = useState(DEFAULT_MAKING_VIDEOS);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  // Fetch CMS content and subscribe to changes
  useEffect(() => {
    const fetchCMSData = async () => {
      // 1. Fetch Config
      const { data: configData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "landingPageConfig")
        .single();
      if (configData && configData.value) {
        setConfig(prev => ({ ...prev, ...configData.value }));
        if (configData.value.heroSlides && Array.isArray(configData.value.heroSlides)) {
          setHeroSlides(configData.value.heroSlides);
        }
      }

      // 2. Fetch Specials
      const { data: specialsData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "landingPageSpecials")
        .single();
      if (specialsData && Array.isArray(specialsData.value)) {
        setSpecials(specialsData.value);
      }

      // 3. Fetch Videos
      const { data: videosData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "landingPageVideos")
        .single();
      if (videosData && Array.isArray(videosData.value)) {
        setMakingVideos(videosData.value);
      }
    };

    fetchCMSData();

    // Subscribe to settings table updates in real-time
    const channel = supabase
      .channel("landing-page-cms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        (payload) => {
          if (payload.new) {
            const { key, value } = payload.new;
            if (key === "landingPageConfig" && value) {
              setConfig(prev => ({ ...prev, ...value }));
              if (value.heroSlides && Array.isArray(value.heroSlides)) {
                setHeroSlides(value.heroSlides);
              }
            } else if (key === "landingPageSpecials" && Array.isArray(value)) {
              setSpecials(value);
            } else if (key === "landingPageVideos" && Array.isArray(value)) {
              setMakingVideos(value);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Maintenance Check
  useEffect(() => {
    fetch("/api/maintenance")
      .then((res) => res.json())
      .then((data) => {
        if (data.maintenanceMode) {
          setIsMaintenance(true);
        }
      })
      .catch((err) => console.error("Maintenance check error:", err));
  }, []);

  // Header Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Update scrolled state (background solid styling)
      if (currentScrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      // Smart header visibility logic
      if (currentScrollY > lastScrollYRef.current && currentScrollY > 80) {
        // Scrolling down: hide header
        setHeaderVisible(false);
      } else {
        // Scrolling up: show header
        setHeaderVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Active order recovery
  useEffect(() => {
    const checkActiveOrder = async () => {
      const savedId = localStorage.getItem("vellari_active_order_id");
      if (!savedId) return;

      const { data, error } = await supabase
        .from("orders")
        .select("status")
        .eq("id", savedId)
        .single();

      if (error || !data) {
        localStorage.removeItem("vellari_active_order_id");
        return;
      }

      if (data.status === "completed" || data.status === "cancelled") {
        localStorage.removeItem("vellari_active_order_id");
      } else {
        setActiveOrderId(savedId);
      }
    };

    checkActiveOrder();

    const savedId = localStorage.getItem("vellari_active_order_id");
    if (!savedId) return;

    const channel = supabase
      .channel(`home-active-order-${savedId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${savedId}` },
        (payload) => {
          if (payload.new) {
            const status = payload.new.status;
            if (status === "completed" || status === "cancelled") {
              localStorage.removeItem("vellari_active_order_id");
              setActiveOrderId(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Slide Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((c) => (c + 1) % heroSlides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      setCurrentSlide((c) =>
        delta < 0
          ? (c + 1) % heroSlides.length
          : (c - 1 + heroSlides.length) % heroSlides.length
      );
    }
    touchStartX.current = null;
  };

  if (isMaintenance) {
    return <MaintenancePage config={config} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fffcf2]">
      {/* Header / Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 px-6 py-5 md:px-14 flex items-center justify-between transition-all duration-300 ${
          headerVisible ? "translate-y-0" : "-translate-y-full"
        } ${
          scrolled
            ? "bg-[#fffcf2] shadow-md border-b border-[#e5dbb2]/30"
            : "bg-transparent"
        }`}
      >
        {/* Brand Logo */}
        <div
          className="flex items-center gap-1.5 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span
            className="text-[#156734] font-black text-2xl tracking-tight uppercase"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Vellari
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/menu"
            className="text-[#156734] font-semibold text-sm tracking-wide hover:opacity-60 transition-opacity"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            MENU
          </Link>
          <a
            href="#specials"
            className="text-[#156734] font-semibold text-sm tracking-wide hover:opacity-60 transition-opacity"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            SPECIALS
          </a>
          <a
            href="#making"
            className="text-[#156734] font-semibold text-sm tracking-wide hover:opacity-60 transition-opacity"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            THE MAKING
          </a>
          <a
            href="#contact"
            className="text-[#156734] font-semibold text-sm tracking-wide hover:opacity-60 transition-opacity"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            CONTACT
          </a>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-[#156734] focus:outline-none cursor-pointer"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="material-symbols-outlined text-[26px]">
            {mobileMenuOpen ? "close" : "menu"}
          </span>
        </button>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-[#fffcf2] border-t border-[#e5dbb2] px-6 py-6 flex flex-col gap-5 md:hidden shadow-md animate-fade-in">
            <Link
              href="/menu"
              className="text-[#156734] font-bold text-base text-left"
              style={{ fontFamily: "Montserrat, sans-serif" }}
              onClick={() => setMobileMenuOpen(false)}
            >
              MENU
            </Link>
            <a
              href="#specials"
              className="text-[#156734] font-bold text-base text-left"
              style={{ fontFamily: "Montserrat, sans-serif" }}
              onClick={() => setMobileMenuOpen(false)}
            >
              SPECIALS
            </a>
            <a
              href="#making"
              className="text-[#156734] font-bold text-base text-left"
              style={{ fontFamily: "Montserrat, sans-serif" }}
              onClick={() => setMobileMenuOpen(false)}
            >
              THE MAKING
            </a>
            <a
              href="#contact"
              className="text-[#156734] font-bold text-base text-left"
              style={{ fontFamily: "Montserrat, sans-serif" }}
              onClick={() => setMobileMenuOpen(false)}
            >
              CONTACT
            </a>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[82vh] min-h-[480px] max-h-[800px] pt-4 pb-6 px-5 md:px-14 flex flex-col items-center justify-center gap-3 md:gap-5 bg-[#fffcf2] overflow-hidden">
          {/* Eyebrow */}
          <div
            className="relative z-10 flex items-center gap-2 text-[#156734]/60 text-[10px] md:text-xs font-bold tracking-[0.18em] uppercase"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            <span className="w-6 h-px bg-[#156734]/30" />
            {config.parentBrandText}
            <span className="w-6 h-px bg-[#156734]/30" />
          </div>

          {/* Heading */}
          <div className="relative z-10 text-center max-w-3xl flex flex-col items-center">
            <h1
              className="text-[#156734] font-black leading-[1.1] tracking-tight mb-1"
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: "clamp(2rem, 6.5vw, 4.2rem)",
              }}
            >
              {config.heroHeadingLine1}<br />
              <span className="text-[#156734]/35">{config.heroHeadingLine2}</span>
            </h1>
            
            {/* Malayalam Subtitle Logo */}
            <img
              src={config.malayalamLogoUrl}
              alt="വെള്ളരി"
              className="h-10 md:h-14 w-auto object-contain mt-1 opacity-90"
              style={{ filter: "brightness(0) saturate(100%) invert(26%) sepia(91%) saturate(542%) hue-rotate(97deg) brightness(91%) contrast(98%)" }}
            />
          </div>

          {/* Carousel */}
          <div
            className="relative z-10 w-full max-w-[220px] md:max-w-[340px] flex items-center justify-center aspect-square"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {heroSlides.map((slide, i) => (
              <img
                key={slide.alt || i}
                src={slide.img}
                alt={slide.alt || "Food Plate"}
                className="absolute w-[95%] select-none pointer-events-none transition-all duration-700"
                style={{
                  filter: "drop-shadow(0 16px 32px rgba(0,0,0,0.12))",
                  opacity: i === currentSlide ? 1 : 0,
                  transform: i === currentSlide ? "scale(1) translateX(0)" : "scale(0.95) translateX(20px)",
                }}
              />
            ))}
            {/* Invisible spacer to hold height */}
            <img
              src={heroSlides[0]?.img || ""}
              alt=""
              aria-hidden
              className="w-[95%] invisible"
            />
          </div>

          {/* CTA */}
          <Link
            href="/menu"
            className="relative z-10 inline-flex items-center gap-2 bg-[#156734] hover:bg-[#0f4d27] text-white font-bold px-8 py-3.5 rounded-[16px] transition-all text-sm shadow-[0_6px_20px_rgba(21,103,52,0.25)] hover:scale-102 active:scale-98 cursor-pointer"
            style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "-0.03em" }}
          >
            EXPLORE MENU
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </section>

        {/* Chef's Specials Section */}
        <section
          id="specials"
          className="pt-8 pb-14 md:pt-12 md:pb-20 px-5 md:px-14 bg-[#fffcf2] border-t border-[#e5dbb2]/30"
        >
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="mb-12 text-left">
              <p
                className="text-[#156734]/50 text-xs font-bold tracking-[0.18em] uppercase mb-3"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Handpicked by our head chef
              </p>
              <h2
                className="text-[#156734] font-black leading-tight tracking-tight uppercase"
                style={{ fontFamily: "Montserrat, sans-serif", fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
              >
                Chef&apos;s Special
              </h2>
            </div>

            {/* List Layout matching Premium Figma */}
            <div className="flex flex-col gap-5">
              {specials.map((dish) => (
                <div
                  key={dish.name}
                  className="group flex items-center gap-5 rounded-[24px] overflow-hidden bg-[#fffcf2] shadow-[0px_4px_16px_rgba(21,103,52,0.06)] border border-[#e5dbb2]/20 hover:shadow-[0px_8px_24px_rgba(21,103,52,0.12)] hover:border-[#156734]/20 transition-all duration-300 p-4 text-left"
                >
                  {/* Image with background fallback */}
                  <div
                    className="shrink-0 rounded-[20px] overflow-hidden bg-[#e5dbb2]/40 relative w-[105px] h-[105px] md:w-[145px] md:h-[145px]"
                  >
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 items-center justify-between min-w-0 pr-2">
                    <div className="min-w-0">
                      <span
                        className="text-[#156734]/50 text-[9px] font-bold uppercase tracking-widest block mb-1"
                        style={{ fontFamily: "Montserrat, sans-serif" }}
                      >
                        {dish.tag}
                      </span>
                      <p
                        className="text-[#156734] font-bold text-sm md:text-base tracking-tight truncate uppercase"
                        style={{ fontFamily: "Montserrat, sans-serif" }}
                      >
                        {dish.name}
                      </p>
                    </div>
                    <p
                      className="text-[#156734] font-black text-base md:text-lg tracking-tight shrink-0 ml-4"
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      AED {dish.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Making Section */}
        <section id="making" className="py-14 md:py-20 px-5 md:px-14 bg-[#fef8e0] border-t border-[#e5dbb2]/30">
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="mb-12 text-left">
              <p
                className="text-[#156734]/50 text-xs font-bold tracking-[0.18em] uppercase mb-3"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                A peek behind the curtain
              </p>
              <h2
                className="text-[#156734] font-black leading-tight tracking-tight uppercase"
                style={{ fontFamily: "Montserrat, sans-serif", fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
              >
                The Making
              </h2>
            </div>

            {/* Cards Horizontal scroll */}
            <div className="flex gap-5 overflow-x-auto pb-4 -mx-5 px-5 md:-mx-14 md:px-14 scrollbar-none">
              {makingVideos.map((video) => (
                <div
                  key={video.title}
                  onClick={() => setSelectedVideo(video.embedUrl)}
                  className="relative group shrink-0 rounded-[28px] overflow-hidden shadow-[2px_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[2px_6px_24px_rgba(0,0,0,0.15)] transition-all duration-300 cursor-pointer"
                  style={{ width: 180, height: 290 }}
                >
                  {/* Thumbnail Image */}
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                  {/* Dark transparent mask overlay */}
                  <div className="absolute inset-0 bg-[#156734]/15 group-hover:bg-[#156734]/25 transition-colors duration-300" />

                  {/* Play badge */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-white/90 shadow-md flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <span className="material-symbols-outlined text-[#156734] text-2xl ml-0.5">play_arrow</span>
                    </div>
                    <span
                      className="text-white text-[9px] font-bold tracking-widest uppercase"
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      Watch Video
                    </span>
                  </div>

                  {/* Label */}
                  <div className="absolute bottom-0 left-0 right-0 px-5 py-5 bg-gradient-to-t from-black/60 to-transparent">
                    <p
                      className="text-white font-bold text-xs tracking-wide uppercase text-left"
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      {video.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Order / Table Reservation Banner */}
        <section className="py-14 md:py-20 px-5 md:px-14 bg-[#156734]">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
            <p
              className="text-white/50 text-xs font-bold tracking-[0.18em] uppercase"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              DINE WITH US OR ORDER TAKEAWAY
            </p>
            <h2
              className="text-white font-black leading-tight tracking-tight uppercase"
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: "clamp(2rem, 5vw, 3.2rem)",
              }}
            >
              Experience Vellari<br />At Karama Today
            </h2>
            <p
              className="text-white/70 text-sm max-w-md leading-relaxed font-medium"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Enjoy high-energy Kerala street eats. Dine-in, pickup at the counter, or order delivery straight to your door!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="tel:+97148342856"
                className="inline-flex items-center gap-2 bg-[#fffcf2] text-[#156734] font-bold px-8 py-4 rounded-[20px] hover:bg-white transition-all text-sm shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:scale-102 active:scale-98"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                CALL TO ORDER
              </a>
              <a
                href="https://api.whatsapp.com/send?phone=971568867131"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-8 py-4 rounded-[20px] hover:bg-[#20ba59] transition-all text-sm shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:scale-102 active:scale-98"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.638 1.97 14.162.947 11.53.947c-5.445 0-9.87 4.373-9.874 9.8.001 2.012.528 3.98 1.527 5.717l-.991 3.616 3.755-.972zm10.902-6.53c-.299-.149-1.771-.862-2.046-.962-.275-.1-.475-.149-.675.15-.2.299-.774.962-.949 1.162-.175.199-.349.224-.648.075-1.125-.563-1.895-1.036-2.656-2.336-.2-.349.2-.324.573-1.073.06-.12.03-.224-.015-.324-.045-.1-.475-1.123-.65-1.547-.17-.41-.358-.353-.49-.36-.125-.006-.27-.008-.413-.008-.143 0-.377.054-.574.271-.197.216-.753.727-.753 1.773s.77 2.059.877 2.203c.107.143 1.513 2.288 3.664 3.203.512.219.91.35 1.22.447.515.162.983.139 1.353.084.413-.06 1.771-.715 2.021-1.407.25-.693.25-1.288.175-1.408-.075-.12-.275-.2-.574-.349z" />
                </svg>
                WHATSAPP CHAT
              </a>
            </div>
          </div>
        </section>

        {/* Contact details section */}
        <section id="contact" className="py-14 md:py-20 px-5 md:px-14 bg-[#fffcf2]">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between gap-12 text-left">
            {/* Address */}
            <div className="flex-1">
              <h3
                className="text-[#156734] font-bold text-xs tracking-[0.15em] uppercase mb-4"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Visit Us
              </h3>
              <p
                className="text-[#156734]/70 text-sm leading-relaxed font-semibold flex flex-col gap-1"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                <span>Near Nesto Hypermarket</span>
                <span>Al Karama, Dubai - UAE</span>
                <span className="mt-3 font-black text-[#156734]">Open Daily: 7:00 AM – 11:00 PM</span>
              </p>
            </div>

            {/* Direct contact */}
            <div className="flex-1">
              <h3
                className="text-[#156734] font-bold text-xs tracking-[0.15em] uppercase mb-4"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Say Hello
              </h3>
              <p
                className="text-[#156734]/70 text-sm leading-relaxed font-semibold flex flex-col gap-1"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                <a href="tel:+97148342856" className="hover:underline font-black text-[#156734]">
                  Phone: +971 4 834 2856
                </a>
                <a href="mailto:vellarirestaurant@gmail.com" className="hover:underline mt-1">
                  Email: vellarirestaurant@gmail.com
                </a>
                <a
                  href="https://www.instagram.com/vellari_restaurant?igsh=emxoZG9jY3pjM2Z3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline mt-1 font-bold text-[#156734] flex items-center gap-1.5"
                >
                  Instagram: @vellari_restaurant
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#fffcf2] border-t border-[#e5dbb2] px-5 md:px-14 py-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start justify-between gap-10">
          <div>
            <p
              className="text-[#156734] font-black text-xl tracking-tight uppercase mb-2"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Vellari Restaurant
            </p>
            <p
              className="text-[#156734]/50 text-sm max-w-xs leading-relaxed font-medium"
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
                <Link
                  href="/menu"
                  className="text-[#156734]/60 text-sm hover:text-[#156734] transition-colors font-medium text-left"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Menu
                </Link>
                <a
                  href="#specials"
                  className="text-[#156734]/60 text-sm hover:text-[#156734] transition-colors font-medium text-left"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Specials
                </a>
                <a
                  href="#making"
                  className="text-[#156734]/60 text-sm hover:text-[#156734] transition-colors font-medium text-left"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  The Making
                </a>
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
                className="text-[#156734]/60 text-sm leading-relaxed font-medium flex flex-col gap-1 text-left"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                <span>Near Nesto Hypermarket</span>
                <span>Al Karama, Dubai - UAE</span>
                <span className="mt-2">+971 4 834 2856</span>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-10 pt-6 border-t border-[#e5dbb2] flex items-center justify-between">
          <p
            className="text-[#156734]/40 text-xs"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            © 2026 Vellari Restaurant. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Video Modal Overlay */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-3xl aspect-video bg-black rounded-[32px] overflow-hidden shadow-2xl border border-white/10">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            <iframe
              src={`${selectedVideo}?autoplay=1`}
              title="The Making Video"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Active Order Recovery Banner */}
      {activeOrderId && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-[350px] z-40 bg-[#111111]/95 backdrop-blur-md border border-brandGold/30 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-scaleUp">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-brandGold text-xl animate-spin">sync</span>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black text-brandGold tracking-widest uppercase">ACTIVE ORDER</span>
              <span className="text-[10px] text-white/70 font-bold">Your order is being processed!</span>
            </div>
          </div>
          <Link
            href={`/order/${activeOrderId}`}
            className="px-4 py-2 bg-brandGold hover:bg-brandGold/90 text-[#111111] text-[9px] font-black tracking-widest uppercase rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Track
          </Link>
        </div>
      )}
    </div>
  );
}

function MaintenancePage({ config }) {
  return (
    <div className="min-h-screen bg-brandDark text-white font-sans flex flex-col justify-between items-center px-6 py-12 relative overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brandGreen/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-brandGold/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header English Logo */}
      <div className="w-full max-w-6xl flex justify-center md:justify-start items-center z-10">
        <img
          src={config?.englishLogoUrl || "/logo_english.png"}
          alt="Vellari"
          className="h-10 md:h-12 w-auto object-contain mix-blend-screen"
        />
      </div>

      {/* Main Card Content */}
      <div className="max-w-md w-full bg-white/2 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-10 text-center shadow-2xl flex flex-col items-center gap-6 z-10">
        {/* Malayalam logo with pulsing ring */}
        <div className="relative flex items-center justify-center mb-2">
          <div className="absolute inset-0 bg-brandGold/20 rounded-full blur-xl animate-pulse"></div>
          <img
            src={config?.malayalamLogoUrl || "/logo_malayalam.png"}
            alt="വെള്ളരി"
            className="h-20 w-auto object-contain mix-blend-screen relative z-10"
          />
        </div>

        {/* Status indicator */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brandGold/15 border border-brandGold/30 text-brandGold text-[10px] font-black tracking-widest uppercase rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-brandGold animate-ping"></span>
          Cooking Up Upgrades
        </span>

        {/* Message */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider">
            Upgrading Our System 🍲
          </h2>
          <p className="text-xs text-white/70 leading-relaxed font-medium">
            We are currently cooking up some exciting digital upgrades to make your ordering experience faster and smoother! We will be back online shortly.
          </p>
          <p className="text-xs text-brandGold font-bold leading-relaxed">
            കൂടുതൽ മികച്ച സേവനങ്ങൾക്കായി ഞങ്ങളുടെ വെബ്സൈറ്റ് അപ്ഗ്രേഡ് ചെയ്യുകയാണ്. ഉടൻ തന്നെ തിരിച്ചെത്തുന്നതാണ്!
          </p>
        </div>

        <div className="w-full h-px bg-white/10 my-1"></div>

        {/* Call to Order CTA */}
        <div className="flex flex-col gap-2.5 w-full">
          <span className="text-[9px] font-black text-white/50 tracking-widest uppercase">
            Order directly via call:
          </span>
          <a
            href="tel:+971568867131"
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-brandGreen hover:bg-brandGreenDark text-white text-xs font-black tracking-widest rounded-xl transition-all duration-300 shadow-md border border-brandGold/20 hover:scale-102 active:scale-98"
          >
            <span className="material-symbols-outlined text-[16px] text-brandGold">call</span>
            +971 56 886 7131
          </a>
          <a
            href="tel:+97148342856"
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white/90 text-[11px] font-bold tracking-widest rounded-xl transition-all border border-white/10"
          >
            <span className="material-symbols-outlined text-[14px]">phone_in_talk</span>
            +971 4 834 2856
          </a>
        </div>
      </div>

      {/* Footer Socials */}
      <div className="flex flex-col items-center gap-3 z-10">
        <a
          href="https://www.instagram.com/vellari_restaurant?igsh=emxoZG9jY3pjM2Z3"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/60 hover:text-brandGold transition-colors flex items-center gap-1.5 text-xs font-bold"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
          @vellari_restaurant
        </a>
        <p className="text-[10px] text-white/30 font-medium">© 2026 Vellari Karama. All rights reserved.</p>
      </div>
    </div>
  );
}
