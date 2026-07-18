"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [activeOrderId, setActiveOrderId] = useState(null);

  const updateStats = () => {
    try {
      // 1. Get Cart Count
      const savedCart = localStorage.getItem("vellari_cart");
      if (savedCart) {
        const cartObj = JSON.parse(savedCart);
        const count = Object.values(cartObj).reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        setCartCount(count);
      } else {
        setCartCount(0);
      }

      // 2. Get Active Order
      const savedOrderId = localStorage.getItem("vellari_active_order_id");
      setActiveOrderId(savedOrderId);
    } catch (e) {
      console.error("Error reading localStorage for BottomNav:", e);
    }
  };

  useEffect(() => {
    updateStats();

    // Listen to custom local storage events
    window.addEventListener("vellari_cart_updated", updateStats);
    window.addEventListener("storage", updateStats);

    return () => {
      window.removeEventListener("vellari_cart_updated", updateStats);
      window.removeEventListener("storage", updateStats);
    };
  }, []);

  const handleNavigation = (path) => {
    router.push(path);
  };

  // Hide BottomNav on superadmin, admin, kitchen screens using client-accessible environment variables
  const STAFF_PATH = process.env.NEXT_PUBLIC_STAFF_PATH || "kitchen";
  const ADMIN_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH || "office";
  const SUPERADMIN_PATH = process.env.NEXT_PUBLIC_SUPERADMIN_PATH || "superadmin";

  const isDashboardRoute = 
    pathname.includes(`/${STAFF_PATH}`) || 
    pathname.includes(`/${ADMIN_PATH}`) || 
    pathname.includes(`/${SUPERADMIN_PATH}`);

  if (isDashboardRoute) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-4 pointer-events-none">
      <nav className="w-full max-w-md bg-[#fffcf2]/95 backdrop-blur-md border border-[#e5dbb2]/60 rounded-2xl shadow-[0_-6px_24px_rgba(21,103,52,0.06)] h-[58px] flex items-center justify-around px-2 pointer-events-auto">
        {/* HOME */}
        <button
          onClick={() => handleNavigation("/")}
          className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all focus:outline-none cursor-pointer ${
            pathname === "/" ? "text-[#156734]" : "text-[#156734]/55 hover:text-[#156734]"
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">home</span>
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ fontFamily: "Montserrat, sans-serif" }}>Home</span>
        </button>

        {/* MENU */}
        <button
          onClick={() => handleNavigation("/menu")}
          className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all focus:outline-none cursor-pointer ${
            pathname === "/menu" ? "text-[#156734]" : "text-[#156734]/55 hover:text-[#156734]"
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">restaurant_menu</span>
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ fontFamily: "Montserrat, sans-serif" }}>Menu</span>
        </button>

        {/* CART */}
        <button
          onClick={() => {
            if (pathname !== "/menu") {
              // Open menu page with cart trigger
              router.push("/menu?openCart=true");
            } else {
              // Trigger custom cart toggle event on menu page
              window.dispatchEvent(new Event("vellari_toggle_cart"));
            }
          }}
          className={`relative flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all focus:outline-none cursor-pointer ${
            pathname === "/menu" && cartCount > 0 ? "text-[#156734]" : "text-[#156734]/55 hover:text-[#156734]"
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">shopping_cart</span>
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ fontFamily: "Montserrat, sans-serif" }}>Cart</span>
          {cartCount > 0 && (
            <span className="absolute top-2.5 right-4 bg-[#156734] text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#fffcf2] shadow-sm">
              {cartCount}
            </span>
          )}
        </button>

        {/* TRACK ORDER */}
        <button
          onClick={() => {
            if (activeOrderId) {
              handleNavigation(`/order/${activeOrderId}`);
            } else {
              alert("No active orders found. Place an order to start tracking!");
            }
          }}
          className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all focus:outline-none cursor-pointer ${
            pathname.startsWith("/order/") ? "text-[#156734]" : activeOrderId ? "text-[#156734]/85 animate-pulse" : "text-[#156734]/30"
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">track_changes</span>
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ fontFamily: "Montserrat, sans-serif" }}>Track</span>
        </button>
      </nav>
    </div>
  );
}
