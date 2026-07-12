"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { categories as staticCategories, menuData as staticMenuData } from "@/utils/menuData";

export default function MenuPage() {
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

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState("combo");
  const [cart, setCart] = useState({});
  const [orderType, setOrderType] = useState("delivery");
  const [address, setAddress] = useState("");
  const [addressDetails, setAddressDetails] = useState("");
  const [addressError, setAddressError] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [deliveryRadius, setDeliveryRadius] = useState("unlimited");
  const [isNewUser, setIsNewUser] = useState(false);
  const [unavailableItems, setUnavailableItems] = useState([]);
  const [unavailableCategories, setUnavailableCategories] = useState([]);
  const addressDetailsRef = useRef("");

  useEffect(() => {
    if (isCartOpen) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    } else {
      setIsAnimating(false);
      document.body.style.overflow = "";
    }
  }, [isCartOpen]);

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
      .channel(`menu-active-order-${savedId}`)
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

  // Fetch settings on mount and listen to updates in real-time
  useEffect(() => {
    const fetchSettings = async () => {
      // 1. Fetch delivery radius
      const { data: radiusData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "deliveryRadius")
        .single();
      if (radiusData) setDeliveryRadius(String(radiusData.value));

      // 2. Fetch unavailable items
      const { data: itemsData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "unavailableItems")
        .single();
      if (itemsData && Array.isArray(itemsData.value)) {
        setUnavailableItems(itemsData.value);
      }

      // 3. Fetch unavailable categories
      const { data: catsData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "unavailableCategories")
        .single();
      if (catsData && Array.isArray(catsData.value)) {
        setUnavailableCategories(catsData.value);
        // If combo is unavailable, set to first available category
        if (catsData.value.includes("combo")) {
          const firstAvailable = staticCategories.find(c => !catsData.value.includes(c.id));
          if (firstAvailable) {
            setActiveCategory(firstAvailable.id);
          }
        }
      }
    };

    fetchSettings();

    // Subscribe to settings changes in real-time
    const settingsChannel = supabase
      .channel("menu-settings-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        (payload) => {
          if (payload.new) {
            if (payload.new.key === "deliveryRadius") {
              setDeliveryRadius(String(payload.new.value));
            }
            if (payload.new.key === "unavailableItems" && Array.isArray(payload.new.value)) {
              setUnavailableItems(payload.new.value);
            }
            if (payload.new.key === "unavailableCategories" && Array.isArray(payload.new.value)) {
              setUnavailableCategories(payload.new.value);
              if (payload.new.value.includes(activeCategory)) {
                const firstAvailable = staticCategories.find(c => !payload.new.value.includes(c.id));
                if (firstAvailable) {
                  setActiveCategory(firstAvailable.id);
                }
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, [activeCategory]);

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setAddress(mapsLink);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        console.error("Geolocation error:", error);
        alert("Could not retrieve exact location. Please ensure location permissions are enabled on your browser/device.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const getCoordinatesFromAddress = (addr) => {
    if (!addr) return null;
    const match = addr.match(/q=([-\d.]+),([-\d.]+)/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    return null;
  };

  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };


  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("vellari_cart");
      const savedOrderType = localStorage.getItem("vellari_order_type");
      const savedAddress = localStorage.getItem("vellari_address");
      const savedAddressDetails = localStorage.getItem("vellari_address_details");
      const savedPhone = localStorage.getItem("vellari_phone");

      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedOrderType) setOrderType(savedOrderType);
      if (savedAddress) setAddress(savedAddress);
      if (savedAddressDetails) setAddressDetails(savedAddressDetails);
      if (savedPhone) setCustomerPhone(savedPhone);
    } catch (e) {
      console.error("Failed to load cart from localStorage", e);
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("vellari_cart", JSON.stringify(cart));
      localStorage.setItem("vellari_order_type", orderType);
      localStorage.setItem("vellari_address", address);
      localStorage.setItem("vellari_address_details", addressDetails);
      localStorage.setItem("vellari_phone", customerPhone);
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [cart, orderType, address, addressDetails, customerPhone, isLoaded]);

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  const parsePrice = (priceStr) => {
    if (priceStr.includes("APS")) return 0;
    const basePriceStr = priceStr.split("/")[0];
    const match = basePriceStr.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev[item.name];
      if (existing) {
        return {
          ...prev,
          [item.name]: { ...existing, quantity: existing.quantity + 1 },
        };
      }
      return {
        ...prev,
        [item.name]: { ...item, quantity: 1 },
      };
    });
  };

  const removeFromCart = (itemName) => {
    setCart((prev) => {
      const existing = prev[itemName];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const copy = { ...prev };
        delete copy[itemName];
        return copy;
      }
      return {
        ...prev,
        [itemName]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((total, item) => total + item.quantity, 0);
  };

  const getCartSubtotal = () => {
    return Object.values(cart).reduce((total, item) => {
      const priceVal = parsePrice(item.price);
      return total + priceVal * item.quantity;
    }, 0);
  };

  const hasVariablePrices = () => {
    return Object.values(cart).some(item => item.price.includes("/") || item.price.includes("APS"));
  };




  const categories = staticCategories;
  const menuData = staticMenuData;

  const filteredItems = menuData[activeCategory] || [];

  return (
    <div className={`min-h-screen bg-brandDark text-white font-sans antialiased transition-all duration-300 ${getCartCount() > 0 ? "pb-28" : "pb-24"}`}>
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-brandDark/95 backdrop-blur-md border-b border-brandGreen/25 h-20">
        <div className="max-w-4xl mx-auto px-6 h-full flex justify-between items-center">
          {/* Logo on Left */}
          <Link href="/" className="flex items-center cursor-pointer">
            <img
              src="/logo_english.png"
              alt="Vellari Karama"
              className="h-10 md:h-12 w-auto object-contain mix-blend-screen"
            />
          </Link>

          {/* Actions on Right */}
          <div className="flex items-center gap-6">
            {/* Back Home Link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white transition-colors duration-300"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              BACK
            </Link>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center gap-2 text-sm font-bold text-brandGold hover:text-white transition-colors duration-300 cursor-pointer focus:outline-none"
            >
              <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
              <span>CART</span>
              {getCartCount() > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-brandGreen text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-brandGold/40 animate-bounce">
                  {getCartCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 pt-12">
        {/* Malayalam Title Logo Banner */}
        <div className="flex flex-col items-center mb-12">
          <img
            src="/logo_malayalam.png"
            alt="വെള്ളരി"
            className="h-20 md:h-24 w-auto object-contain mix-blend-screen mb-4 animate-fade-in"
          />
          <h1 className="text-3xl font-black text-brandGold tracking-wider uppercase text-center">MENU</h1>
          <div className="w-16 h-1 bg-brandGreen mt-3 rounded-full"></div>
        </div>

        {/* Category Tabs (Scrollable horizontally on small screens) */}
        <div className="flex overflow-x-auto gap-2 pb-4 mb-12 scrollbar-none justify-start md:justify-center -mx-6 px-6">
          <div className="flex gap-2">
            {categories
              .filter((cat) => !unavailableCategories.includes(cat.id))
              .map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all duration-300 border whitespace-nowrap ${
                    activeCategory === cat.id
                      ? "bg-brandGreen border-brandGold text-white shadow-md"
                      : "bg-transparent border-white/20 text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
          </div>
        </div>

        {/* Compact Minimalist Menu Items List (Clean compact rows, no cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          {filteredItems.map((item, index) => {
            const isSoldOut = unavailableItems.includes(item.name);
            return (
              <div
                key={index}
                className={`flex justify-between items-center py-2.5 border-b border-white/5 group hover:border-brandGreen/40 transition-colors ${
                  isSoldOut ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold bg-white/5 px-2 py-0.5 rounded text-gray-400 uppercase tracking-widest">
                    {item.section}
                  </span>
                  <span className={`text-xs font-bold text-white/90 transition-colors ${
                    isSoldOut ? "line-through text-white/50" : "group-hover:text-brandGold"
                  }`}>
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-3.5 ml-4 flex-shrink-0">
                  <span className={`text-xs font-black ${isSoldOut ? "text-white/40" : "text-brandGold"}`}>
                    {item.price}
                  </span>
                  {isSoldOut ? (
                    <span className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Sold Out
                    </span>
                  ) : cart[item.name] ? (
                    <div className="flex items-center gap-2 bg-brandGreen/40 border border-brandGold/35 rounded-full px-2 py-0.5 select-none">
                      <button
                        onClick={() => removeFromCart(item.name)}
                        className="text-xs font-black text-white hover:text-brandGold px-1.5 transition-colors focus:outline-none"
                      >
                        −
                      </button>
                      <span className="text-[11px] font-black text-white min-w-[12px] text-center">
                        {cart[item.name].quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className="text-xs font-black text-white hover:text-brandGold px-1.5 transition-colors focus:outline-none"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="text-[10px] font-black text-brandDark bg-brandGold hover:bg-brandGoldDark hover:scale-105 active:scale-95 px-2.5 py-0.5 rounded-full tracking-wider uppercase transition-all duration-200 focus:outline-none cursor-pointer"
                    >
                      ADD
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>


      {/* Floating View Cart Pill (Visible only when drawer is closed and cart has items) */}
      {!isCartOpen && getCartCount() > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex justify-between items-center px-6 py-4 bg-brandGreen hover:bg-brandGreenDark text-white rounded-full shadow-2xl border border-brandGold/40 transition-all duration-300 hover:scale-103 active:scale-97 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-brandGold">shopping_cart</span>
              <span className="text-xs font-black tracking-wider uppercase">VIEW CART ({getCartCount()})</span>
            </div>
            <span className="text-xs font-black text-brandGold">
              AED {getCartSubtotal().toFixed(2)}{hasVariablePrices() && "*"}
            </span>
          </button>
        </div>
      )}

      {/* Cart Side Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Drawer Panel */}
          <div className={`relative w-full max-w-md bg-brandDark border-l border-brandGreen/25 h-full flex flex-col shadow-2xl z-10 ${isAnimating ? "animate-fade-in" : ""}`}>
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brandGold text-[20px]">shopping_cart</span>
                <h3 className="text-sm font-black text-white tracking-widest uppercase">Your Cart</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable Body Container */}
            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
              
              {/* Cart Items List */}
              <div className="flex flex-col gap-4">
                {Object.values(cart).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <span className="material-symbols-outlined text-white/20 text-5xl mb-4">shopping_cart_off</span>
                    <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Your cart is empty</p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-xs font-black text-brandGold hover:underline cursor-pointer"
                    >
                      Browse Menu
                    </button>
                  </div>
                ) : (
                  Object.values(cart).map((item) => (
                    <div key={item.name} className="flex justify-between items-center py-3.5 border-b border-white/5">
                      <div className="flex flex-col gap-0.5 max-w-[60%]">
                        <span className="text-xs font-black text-white/90">{item.name}</span>
                        <span className="text-[10px] text-brandGold font-bold">{item.price} each</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                        <button
                          onClick={() => removeFromCart(item.name)}
                          className="text-xs font-black text-white/70 hover:text-white px-1.5 cursor-pointer focus:outline-none"
                        >
                          −
                        </button>
                        <span className="text-xs font-black text-white min-w-[12px] text-center">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="text-xs font-black text-white/70 hover:text-white px-1.5 cursor-pointer focus:outline-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Checkout Controls */}
              {Object.values(cart).length > 0 && (
                <div className="border-t border-white/10 pt-6 flex flex-col gap-4">
                  {/* Items Count & Subtotal */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/70 font-medium">Subtotal ({getCartCount()} items)</span>
                    <span className="text-base font-black text-brandGold">
                      AED {getCartSubtotal().toFixed(2)}{hasVariablePrices() && "*"}
                    </span>
                  </div>

                  {/* Phone Number Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-brandGold tracking-widest uppercase">
                      WhatsApp Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        if (e.target.value.trim() !== "") setPhoneError(false);
                      }}
                      onBlur={async () => {
                        const clean = customerPhone.trim().replace(/\s+/g, "");
                        if (!clean) return;
                        const { data } = await supabase
                          .from("customers")
                          .select("phone")
                          .eq("phone", clean)
                          .single();
                        setIsNewUser(!data);
                      }}
                      placeholder="e.g. +971568867131"
                      className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-base text-white placeholder-white/30 focus:outline-none focus:border-brandGold transition-colors ${
                        phoneError ? "border-red-500/80 bg-red-500/5 focus:border-red-500" : "border-white/10"
                      }`}
                    />
                    {phoneError && (
                      <span className="text-[10px] font-black text-red-400 tracking-wider">
                        Please enter your phone number to receive confirmation.
                      </span>
                    )}
                  </div>

                  {/* Order Type Toggle Selector */}
                  <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                    {[
                      { id: "delivery", label: "Delivery 🚗" },
                      { id: "takeaway", label: "Takeaway 🛍️" },
                      { id: "dine-in", label: "Dine-In 🍽️" }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          setOrderType(type.id);
                          if (type.id !== "delivery") setAddressError(false);
                        }}
                        className={`py-2 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                          orderType === type.id
                            ? "bg-brandGreen text-white shadow-md border border-brandGold/20"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Delivery Address Input */}
                  {orderType === "delivery" && (
                    <div className="flex flex-col gap-3">
                      {/* Geolocation Section */}
                      <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10 gap-3">
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="text-[9px] font-black text-brandGold tracking-widest uppercase">GPS LOCATION</span>
                          <span className="text-[9px] text-white/70 truncate font-mono">
                            {address ? address : (isNewUser ? "Location Required (Mandatory for new users)" : "No location pinned (Optional)")}
                          </span>
                        </div>
                        {address ? (
                          <button
                            type="button"
                            onClick={() => setAddress("")}
                            className="text-[9px] font-black text-red-400 hover:text-red-300 bg-white/5 border border-red-500/20 hover:border-red-500/40 rounded px-2 py-0.5 cursor-pointer transition-all flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-[10px]">close</span>
                            CLEAR
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleShareLocation}
                            disabled={isLocating}
                            className="text-[9px] font-black text-brandGold bg-white/5 border border-brandGold/35 hover:border-brandGold hover:bg-white/10 rounded px-2.5 py-1 flex items-center gap-1 hover:scale-102 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[10px]">
                              my_location
                            </span>
                            {isLocating ? "LOCATING..." : "PIN"}
                          </button>
                        )}
                      </div>

                      {/* Building Details */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-brandGold tracking-widest uppercase">
                          Building, Floor & Flat No. *
                        </label>
                        <input
                          type="text"
                          ref={addressDetailsRef}
                          defaultValue={addressDetails}
                          onChange={(e) => {
                            if (e.target.value.trim() !== "") setAddressError(false);
                          }}
                          onBlur={(e) => {
                            setAddressDetails(e.target.value);
                          }}
                          placeholder="e.g. Karama Court, Floor 2, Apt 204"
                          className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-base text-white placeholder-white/30 focus:outline-none focus:border-brandGold transition-colors ${
                            addressError ? "border-red-500/80 bg-red-500/5 focus:border-red-500" : "border-white/10"
                          }`}
                        />
                        {addressError && (
                          <span className="text-[10px] font-black text-red-400 tracking-wider">
                            Please enter your building details.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    disabled={isSubmitting}
                    onClick={async () => {
                      // 1. Phone number validation
                      if (!customerPhone.trim()) {
                        setPhoneError(true);
                        return;
                      }

                      // 2. GPS Pin & Delivery Radius validation for delivery
                      if (orderType === "delivery") {
                        if (isNewUser && !address) {
                          alert("GPS location pin is mandatory for new customers. Please click the GPS location 'PIN' button.");
                          return;
                        }

                        if (address) {
                          const coords = getCoordinatesFromAddress(address);
                          if (coords && deliveryRadius && deliveryRadius !== "unlimited" && deliveryRadius !== "0") {
                            const REST_LAT = 25.2483;
                            const REST_LNG = 55.3015;
                            const distance = getDistanceKm(REST_LAT, REST_LNG, coords.lat, coords.lng);
                            const maxRadius = parseFloat(deliveryRadius);

                            if (!isNaN(maxRadius) && distance > maxRadius) {
                              alert(`Sorry, your location is ${distance.toFixed(1)} km away. Our delivery limit is ${maxRadius} km.`);
                              return;
                            }
                          }
                        }
                      }

                      // 3. Address validation for delivery
                      const currentDetails = addressDetailsRef.current ? addressDetailsRef.current.value : addressDetails;
                      if (orderType === "delivery" && currentDetails.trim() === "") {
                        setAddressError(true);
                        return;
                      }
                      setAddressDetails(currentDetails);

                      setIsSubmitting(true);

                      try {
                        const formattedItems = Object.values(cart).map((item) => ({
                          name: item.name,
                          quantity: item.quantity
                        }));

                        const response = await fetch("/api/checkout", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            customerPhone,
                            items: formattedItems,
                            total: getCartSubtotal(),
                            orderType,
                            addressGps: address || null,
                            addressDetails: orderType === "delivery" ? currentDetails : null
                          })
                        });

                        const data = await response.json();

                        if (response.ok && data.success) {
                          localStorage.setItem("vellari_active_order_id", data.orderId);
                          // Clear cart state
                          setCart({});
                          // Redirect to tracking page
                          router.push(`/order/${data.orderId}`);
                        } else {
                          alert(data.error || "Failed to place order. Please try again.");
                          setIsSubmitting(false);
                        }
                      } catch (err) {
                        console.error("Checkout submission error:", err);
                        alert("Network error. Please check your internet connection and try again.");
                        setIsSubmitting(false);
                      }
                    }}
                    className={`w-full flex items-center justify-center gap-2.5 py-4 text-white text-xs font-black tracking-widest rounded-xl transition-all duration-300 shadow-lg hover:scale-101 active:scale-99 uppercase cursor-pointer ${
                      isSubmitting ? "bg-white/10 text-white/40 cursor-not-allowed" : "bg-brandGreen hover:bg-brandGreenDark"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">shopping_cart_checkout</span>
                    {isSubmitting ? "Placing Order..." : "Place Order Now"}
                  </button>
                  {hasVariablePrices() && (
                    <p className="text-[10px] text-white/40 text-center font-medium italic">
                      * Prices of combos/sizes marked with slashes or &quot;APS&quot; are estimated at base value. Exact bill will be confirmed on WhatsApp.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
