"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase";

export default function Home() {
  const [isMaintenance, setIsMaintenance] = useState(false);

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

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [activeOrderId, setActiveOrderId] = useState(null);

  // Check for active order on mount and subscribe in real-time
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

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-brandLight">
      {/* Header */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-brandDark/95 backdrop-blur-md shadow-md border-b border-brandGreen/25"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center">
          {/* English Logo on the Left */}
          <div
            className="flex items-center cursor-pointer transition-transform duration-300 hover:scale-102"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <img
              src="/logo_english.png"
              alt="Vellari Karama Dubai"
              className="h-10 md:h-12 w-auto object-contain mix-blend-screen"
            />
          </div>

          {/* Contact Link on the Right */}
          <a
            href="#contact"
            className="inline-flex items-center text-sm font-bold text-white/90 hover:text-brandGold transition-colors duration-300"
          >
            CONTACT US
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[85vh] flex items-end justify-center pb-24 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url('/street_food_hero.png')` }}
            ></div>
            <div className="absolute inset-0 hero-gradient"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 text-center px-6 max-w-3xl mx-auto flex flex-col items-center">
            {/* Malayalam Logo above Menu Button */}
            <div className="animate-fade-in-up mb-8 flex flex-col items-center">
              <span className="text-[10px] md:text-[11px] font-black tracking-[0.3em] text-[#F5B041] uppercase mb-3 leading-none">
                KL 10 RESTAURANT
              </span>
              <img
                src="/logo_malayalam.png"
                alt="വെള്ളരി"
                className="h-24 md:h-32 w-auto object-contain mix-blend-screen"
              />
            </div>

            {/* Central CTA Button (Glassmorphic Style) */}
            <div className="animate-fade-in-up">
              <Link
                href="/menu"
                className="inline-flex items-center gap-3 px-8 py-5 bg-white/10 backdrop-blur-md text-white text-base font-black tracking-widest rounded-full border-2 border-white/30 hover:bg-white/20 hover:border-brandGold hover:text-brandGold transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined">menu_book</span>
                EXPLORE MENU
              </Link>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 bg-brandLight">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-black text-brandGreen tracking-wide mb-2">JOIN THE VIBE</h2>
              <div className="w-16 h-1 bg-brandGold mx-auto rounded-full"></div>
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {/* Location Card */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-brandGreen/5 hover:border-brandGreen/25 transition-all duration-300 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-brandGreen text-3xl mb-4">location_on</span>
                <h3 className="text-sm font-black text-brandGreen tracking-widest uppercase mb-3">Location</h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed mb-4">
                  Near Nesto Hypermarket,<br />
                  Al Karama, Dubai - UAE
                </p>
                <a
                  href="https://maps.app.goo.gl/CwqrXARF8BGvKfEQ7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto text-xs font-bold text-brandGold hover:text-brandGoldDark transition-colors"
                >
                  FIND US ON MAPS &rarr;
                </a>
              </div>

              {/* Hours Card */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-brandGreen/5 hover:border-brandGreen/25 transition-all duration-300 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-brandGreen text-3xl mb-4">schedule</span>
                <h3 className="text-sm font-black text-brandGreen tracking-widest uppercase mb-3">OPEN HOURS</h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed">
                  Every Single Day<br />
                  <span className="text-brandGreen text-lg font-black block mt-2">7:00 AM - 11:00 PM</span>
                </p>
                <p className="text-xs text-gray-400 mt-4">Breakfast, lunch & late night bites served daily</p>
              </div>

              {/* Phone/Email Card */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-brandGreen/5 hover:border-brandGreen/25 transition-all duration-300 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-brandGreen text-3xl mb-4">contact_phone</span>
                <h3 className="text-sm font-black text-brandGreen tracking-widest uppercase mb-3">SAY HELLO</h3>
                <div className="text-sm text-gray-600 font-medium leading-relaxed mb-4">
                  Need a table or takeout?
                  <a href="tel:+97148342856" className="text-brandGreen font-black hover:underline block mt-1">
                    +971 4 834 2856
                  </a>
                  <a
                    href="https://api.whatsapp.com/send?phone=971568867131"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-whatsappGreen hover:bg-whatsappGreenDark text-white text-xs font-bold rounded-full transition-all duration-300"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.638 1.97 14.162.947 11.53.947c-5.445 0-9.87 4.373-9.874 9.8.001 2.012.528 3.98 1.527 5.717l-.991 3.616 3.755-.972zm10.902-6.53c-.299-.149-1.771-.862-2.046-.962-.275-.1-.475-.149-.675.15-.2.299-.774.962-.949 1.162-.175.199-.349.224-.648.075-1.125-.563-1.895-1.036-2.656-2.336-.2-.349.2-.324.573-1.073.06-.12.03-.224-.015-.324-.045-.1-.475-1.123-.65-1.547-.17-.41-.358-.353-.49-.36-.125-.006-.27-.008-.413-.008-.143 0-.377.054-.574.271-.197.216-.753.727-.753 1.773s.77 2.059.877 2.203c.107.143 1.513 2.288 3.664 3.203.512.219.91.35 1.22.447.515.162.983.139 1.353.084.413-.06 1.771-.715 2.021-1.407.25-.693.25-1.288.175-1.408-.075-.12-.275-.2-.574-.349z" />
                    </svg>
                    WhatsApp Chat
                  </a>
                  <a
                    href="mailto:vellarirestaurant@gmail.com"
                    className="text-xs text-gray-400 hover:text-brandGreen transition-colors block mt-2"
                  >
                    vellarirestaurant@gmail.com
                  </a>
                </div>
                <a
                  href="tel:+97148342856"
                  className="mt-auto text-xs font-bold text-brandGold hover:text-brandGoldDark transition-colors"
                >
                  CALL DIRECT &rarr;
                </a>
              </div>
            </div>

            {/* Social Media Bar */}
            <div className="flex flex-col items-center gap-6">
              <h4 className="text-xs font-black text-gray-400 tracking-[0.25em] uppercase">Connect With Us</h4>
              <div className="flex justify-center">
                <a
                  href="https://www.instagram.com/vellari_restaurant?igsh=emxoZG9jY3pjM2Z3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-brandGreen/10 text-brandGreen hover:bg-brandGreen hover:text-white hover:border-brandGreen transition-all duration-300 shadow-sm hover:scale-110"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-brandDark text-white py-12 border-t border-brandGreen/20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs text-gray-400 font-medium">
            © 2026 Vellari Restaurant. All rights reserved. Al Karama, Dubai, UAE.
          </p>
        </div>
      </footer>

      {/* Active Order Recovery Banner */}
      {activeOrderId && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-[350px] z-40 bg-brandDark/95 backdrop-blur-md border border-brandGold/30 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-brandGold text-xl animate-spin">sync</span>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black text-brandGold tracking-widest uppercase">ACTIVE ORDER</span>
              <span className="text-[10px] text-white/70 font-bold">Your order is being processed!</span>
            </div>
          </div>
          <Link
            href={`/order/${activeOrderId}`}
            className="px-4 py-2 bg-brandGold hover:bg-brandGold/90 text-black text-[9px] font-black tracking-widest uppercase rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Track
          </Link>
        </div>
      )}
    </div>
  );
}

function MaintenancePage() {
  return (
    <div className="min-h-screen bg-brandDark text-white font-sans flex flex-col justify-between items-center px-6 py-12 relative overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brandGreen/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-brandGold/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header English Logo */}
      <div className="w-full max-w-6xl flex justify-center md:justify-start items-center z-10">
        <img
          src="/logo_english.png"
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
            src="/logo_malayalam.png"
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
