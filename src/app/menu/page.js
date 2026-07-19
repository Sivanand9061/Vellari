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
  const phoneInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const drawerRef = useRef(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Dynamic (DB-managed) menu additions
  const [customCategories, setCustomCategories] = useState([]);
  const [customMenuItems, setCustomMenuItems] = useState([]);

  // Merged category/item lists (static + custom)
  const categories = [...staticCategories, ...customCategories];
  const menuData = {
    ...staticMenuData,
    ...customCategories.reduce((acc, cat) => {
      acc[cat.id] = customMenuItems
        .filter((i) => i.categoryId === cat.id)
        .map((i) => ({ name: i.name, price: i.price, section: i.section || cat.name }));
      return acc;
    }, {}),
  };

  useEffect(() => {
    if (isCartOpen) {
      setIsAnimating(true);
      // Freeze background scroll without position:fixed (which breaks iOS keyboard scroll)
      const scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => {
        clearTimeout(timer);
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
        setKeyboardOffset(0);
      };
    }
  }, [isCartOpen]);

  // visualViewport: track keyboard height and pin drawer above it
  useEffect(() => {
    if (!isCartOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(offset > 0 ? offset : 0);
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, [isCartOpen]);

  // Handle BottomNav custom events to toggle cart
  useEffect(() => {
    const handleToggleCart = () => {
      setIsCartOpen((prev) => !prev);
    };
    window.addEventListener("vellari_toggle_cart", handleToggleCart);
    return () => {
      window.removeEventListener("vellari_toggle_cart", handleToggleCart);
    };
  }, []);

  // Handle openCart parameter on URL query
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openCart") === "true") {
        setIsCartOpen(true);
      }
    }
  }, []);

  // Realtime updates for active order & settings
  useEffect(() => {
    // 1. Fetch system settings
    const fetchSettings = async () => {
      const { data: itemsData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "unavailableItems")
        .single();
      if (itemsData && Array.isArray(itemsData.value)) {
        setUnavailableItems(itemsData.value);
      }

      const { data: catsData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "unavailableCategories")
        .single();
      if (catsData && Array.isArray(catsData.value)) {
        setUnavailableCategories(catsData.value);
      }

      const { data: radiusData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "deliveryRadius")
        .single();
      if (radiusData) {
        setDeliveryRadius(String(radiusData.value));
      }

      const { data: customCatsData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "customCategories")
        .single();
      if (customCatsData && Array.isArray(customCatsData.value)) {
        setCustomCategories(customCatsData.value);
      }

      const { data: customItemsData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "customMenuItems")
        .single();
      if (customItemsData && Array.isArray(customItemsData.value)) {
        setCustomMenuItems(customItemsData.value);
      }
    };

    fetchSettings();

    // 2. Realtime listener for settings table
    const settingsChannel = supabase
      .channel("menu-settings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        (payload) => {
          if (payload.new) {
            const { key, value } = payload.new;
            if (key === "unavailableItems" && Array.isArray(value)) {
              setUnavailableItems(value);
            } else if (key === "unavailableCategories" && Array.isArray(value)) {
              setUnavailableCategories(value);
            } else if (key === "deliveryRadius") {
              setDeliveryRadius(String(value));
            } else if (key === "customCategories" && Array.isArray(value)) {
              setCustomCategories(value);
            } else if (key === "customMenuItems" && Array.isArray(value)) {
              setCustomMenuItems(value);
            }
          }
        }
      )
      .subscribe();

    // 3. Monitor active order recovery
    const savedId = localStorage.getItem("vellari_active_order_id");
    if (savedId) {
      setActiveOrderId(savedId);

      const orderChannel = supabase
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
        supabase.removeChannel(orderChannel);
        supabase.removeChannel(settingsChannel);
      };
    }

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, []);

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
      if (savedAddressDetails) {
        setAddressDetails(savedAddressDetails);
        addressDetailsRef.current = savedAddressDetails;
      }
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
      
      // Dispatch custom event to notify BottomNav
      window.dispatchEvent(new Event("vellari_cart_updated"));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [cart, orderType, address, addressDetails, customerPhone, isLoaded]);

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  // Cart operations
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev[item.name];
      const updated = { ...prev };
      if (existing) {
        updated[item.name] = { ...existing, quantity: existing.quantity + 1 };
      } else {
        updated[item.name] = {
          name: item.name,
          price: item.price,
          quantity: 1,
        };
      }
      return updated;
    });
  };

  const removeFromCart = (name) => {
    setCart((prev) => {
      const existing = prev[name];
      if (!existing) return prev;
      const updated = { ...prev };
      if (existing.quantity > 1) {
        updated[name] = { ...existing, quantity: existing.quantity - 1 };
      } else {
        delete updated[name];
      }
      return updated;
    });
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((acc, curr) => acc + curr.quantity, 0);
  };

  const getCartSubtotal = () => {
    return Object.values(cart).reduce((acc, curr) => {
      const priceStr = curr.price.replace(/[^\d.]/g, "");
      const priceNum = parseFloat(priceStr);
      return acc + (isNaN(priceNum) ? 0 : priceNum * curr.quantity);
    }, 0);
  };

  const hasVariablePrices = () => {
    return Object.values(cart).some((item) => item.price.includes("/"));
  };


  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setAddress(`${latitude},${longitude}`);
        setIsLocating(false);
      },
      (error) => {
        console.error("Location error:", error);
        alert("Could not retrieve GPS location. Please check your browser permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Distance computation helpers
  const getCoordinatesFromAddress = (addr) => {
    if (!addr) return null;
    const parts = addr.split(",");
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  };

  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filteredItems = menuData[activeCategory] || [];

  return (
    <div className="min-h-screen bg-[#fffcf2] text-[#036835] font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#fffcf2]/95 backdrop-blur-md border-b border-[#e5dbb2]/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center">
            <span
              className="text-[#036835] font-black text-xl tracking-tight uppercase"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Vellari
            </span>
          </Link>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative inline-flex items-center gap-1.5 text-xs font-black text-[#036835] hover:opacity-75 transition-opacity duration-300 cursor-pointer focus:outline-none"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
          <span>CART</span>
          {getCartCount() > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-[#036835] text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#fffcf2]">
              {getCartCount()}
            </span>
          )}
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-5 pt-8">
        {/* Title Logo Banner */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo_malayalam.png"
            alt="വെള്ളരി"
            className="h-14 w-auto object-contain mb-2 opacity-90"
            style={{ filter: "brightness(0) saturate(100%) invert(26%) sepia(91%) saturate(542%) hue-rotate(97deg) brightness(91%) contrast(98%)" }}
          />
          <h1
            className="text-lg font-black text-[#036835] tracking-widest uppercase text-center"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            MENU
          </h1>
          <div className="w-8 h-0.5 bg-[#036835]/30 mt-1.5 rounded-full"></div>
        </div>

        {/* Category Tabs */}
        <div className="flex overflow-x-auto gap-1.5 pb-3 mb-6 scrollbar-none -mx-5 px-5">
          <div className="flex gap-1.5">
            {categories
              .filter((cat) => !unavailableCategories.includes(cat.id))
              .map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase transition-all duration-300 border whitespace-nowrap cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-[#036835] border-transparent text-white shadow-sm"
                      : "bg-transparent border-[#036835]/15 text-[#036835]/70 hover:bg-[#036835]/5"
                  }`}
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {cat.name}
                </button>
              ))}
          </div>
        </div>

        {/* Compact Grid Layout */}
        <div className="grid grid-cols-1 gap-2.5 mb-24">
          {filteredItems.map((item, index) => {
            const isSoldOut = unavailableItems.includes(item.name);
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-3.5 rounded-2xl bg-[#fffcf2] border border-[#e5dbb2]/45 shadow-[0px_4px_12px_rgba(21,103,52,0.02)] hover:border-[#036835]/20 hover:shadow-[0px_6px_16px_rgba(21,103,52,0.06)] transition-all duration-300 ${
                  isSoldOut ? "opacity-60" : ""
                }`}
              >
                <div className="flex-1 min-w-0 mr-3 text-left">
                  <span
                    className="text-[7px] font-black text-[#036835]/40 uppercase tracking-widest block mb-0.5"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {item.section}
                  </span>
                  <p
                    className="text-[#036835] font-bold text-xs uppercase truncate"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {item.name}
                  </p>
                  <p
                    className="text-[#036835]/85 font-black text-xs mt-0.5"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    AED {item.price.replace(/[^\d.]/g, "")}
                  </p>
                </div>

                <div className="shrink-0">
                  {isSoldOut ? (
                    <span
                      className="text-[8px] text-red-600 font-bold uppercase tracking-widest px-2.5 py-1 bg-red-500/10 rounded-lg"
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      Sold Out
                    </span>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="w-7 h-7 bg-[#036835] hover:bg-[#0f4d27] text-white rounded-lg flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer shadow-md"
                    >
                      <span className="material-symbols-outlined text-[15px] font-bold">add</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating View Cart Pill */}
      {!isCartOpen && getCartCount() > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs px-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex justify-between items-center px-5 py-3.5 bg-[#036835] hover:bg-[#0f4d27] text-white rounded-xl shadow-2xl transition-all duration-300 hover:scale-102 active:scale-98 cursor-pointer border border-[#fffcf2]/10"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
              <span className="text-[10px] font-black tracking-widest uppercase" style={{ fontFamily: "Montserrat, sans-serif" }}>
                VIEW CART ({getCartCount()})
              </span>
            </div>
            <span className="text-xs font-black" style={{ fontFamily: "Montserrat, sans-serif" }}>
              AED {getCartSubtotal().toFixed(2)}{hasVariablePrices() && "*"}
            </span>
          </button>
        </div>
      )}

      {/* Cart Bottom Sheet Slide Up Panel */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Bottom Sheet Drawer — pinned above keyboard via visualViewport */}
          <div
            ref={drawerRef}
            className={`fixed left-0 right-0 mx-auto w-full max-w-md bg-[#fffcf2] border-t border-[#e5dbb2]/65 rounded-t-3xl flex flex-col shadow-2xl z-10 ${
              isAnimating ? "animate-scaleUp" : ""
            }`}
            style={{
              bottom: keyboardOffset,
              maxHeight: `calc(85dvh - ${keyboardOffset}px)`,
              transition: "bottom 0.15s ease, max-height 0.15s ease",
            }}
          >
            {/* Grab Handle */}
            <div className="w-full flex justify-center py-2 shrink-0">
              <div className="w-12 h-1 bg-[#036835]/15 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-5 pb-3.5 border-b border-[#e5dbb2]/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#036835] text-[18px]">shopping_cart</span>
                <h3 className="text-xs font-black text-[#036835] tracking-widest uppercase" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Your Order
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-[#036835]/60 hover:text-[#036835] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[19px]">close</span>
              </button>
            </div>

            {/* Scrollable Body Container */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5"
            >
              
              {/* Cart Items List */}
              <div className="flex flex-col gap-2">
                {Object.values(cart).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <span className="material-symbols-outlined text-[#036835]/15 text-4xl mb-2">shopping_cart_off</span>
                    <p className="text-[10px] text-[#036835]/50 font-bold uppercase tracking-widest" style={{ fontFamily: "Montserrat, sans-serif" }}>
                      Your cart is empty
                    </p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="mt-2 text-xs font-black text-[#036835] hover:underline cursor-pointer"
                    >
                      Browse Menu
                    </button>
                  </div>
                ) : (
                  Object.values(cart).map((item) => (
                    <div
                      key={item.name}
                      className="flex justify-between items-center py-3 border-b border-[#e5dbb2]/30"
                    >
                      <div className="flex flex-col text-left max-w-[60%]">
                        <span className="text-xs font-bold text-[#036835] uppercase truncate" style={{ fontFamily: "Montserrat, sans-serif" }}>
                          {item.name}
                        </span>
                        <span className="text-[9px] text-[#036835]/60 font-semibold" style={{ fontFamily: "Montserrat, sans-serif" }}>
                          AED {item.price.replace(/[^\d.]/g, "")} each
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-[#036835]/5 border border-[#036835]/10 rounded-xl px-2.5 py-1">
                        <button
                          onClick={() => removeFromCart(item.name)}
                          className="text-xs font-black text-[#036835]/70 hover:text-[#036835] px-1 cursor-pointer focus:outline-none"
                        >
                          −
                        </button>
                        <span className="text-xs font-black text-[#036835] min-w-[10px] text-center" style={{ fontFamily: "Montserrat, sans-serif" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          className="text-xs font-black text-[#036835]/70 hover:text-[#036835] px-1 cursor-pointer focus:outline-none"
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
                <div className="border-t border-[#e5dbb2]/30 pt-4 flex flex-col gap-4">
                  {/* Items Count & Subtotal */}
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#036835]/60 font-bold uppercase tracking-wider" style={{ fontFamily: "Montserrat, sans-serif" }}>
                      Subtotal ({getCartCount()} items)
                    </span>
                    <span className="text-sm font-black text-[#036835]" style={{ fontFamily: "Montserrat, sans-serif" }}>
                      AED {getCartSubtotal().toFixed(2)}{hasVariablePrices() && "*"}
                    </span>
                  </div>

                  {/* Phone Number Input */}
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[8px] font-black text-[#036835]/60 tracking-widest uppercase" style={{ fontFamily: "Montserrat, sans-serif" }}>
                      WhatsApp Phone Number *
                    </label>
                     <input
                      type="tel"
                      ref={phoneInputRef}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      onChange={() => {
                        setPhoneError(false);
                      }}
                      placeholder="e.g. +971568867131"
                      className={`w-full bg-[#fffcf2] border rounded-xl px-3 py-2 text-base text-[#036835] placeholder-[#036835]/30 focus:outline-none focus:border-[#036835] transition-colors ${
                        phoneError ? "border-red-500 bg-red-500/5 focus:border-red-500" : "border-[#e5dbb2]"
                      }`}
                    />
                    {phoneError && (
                      <span className="text-[8px] font-black text-red-500 tracking-wider" style={{ fontFamily: "Montserrat, sans-serif" }}>
                        Please enter your phone number to receive confirmation.
                      </span>
                    )}
                  </div>

                  {/* Order Type Toggle Selector */}
                  <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#036835]/5 rounded-xl border border-[#036835]/10">
                    {[
                      { id: "delivery", label: "Delivery 🚗" },
                      { id: "takeaway", label: "Takeaway 🛍️" },
                      { id: "dine-in", label: "Dine-In 🍽️" },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          setOrderType(type.id);
                          if (type.id !== "delivery") setAddressError(false);
                        }}
                        className={`py-1.5 rounded-lg text-[8px] font-black tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                          orderType === type.id
                            ? "bg-[#036835] text-white shadow-sm"
                            : "text-[#036835]/60 hover:bg-[#036835]/5"
                        }`}
                        style={{ fontFamily: "Montserrat, sans-serif" }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Delivery Address Input */}
                  {orderType === "delivery" && (
                    <div className="flex flex-col gap-2.5 text-left">
                      {/* Geolocation Section */}
                      <div className="flex items-center justify-between p-2.5 bg-[#036835]/5 rounded-xl border border-[#036835]/10 gap-3">
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="text-[8px] font-black text-[#036835]/50 tracking-widest uppercase" style={{ fontFamily: "Montserrat, sans-serif" }}>
                            GPS LOCATION
                          </span>
                          <span className="text-[9px] text-[#036835] truncate font-mono">
                            {address ? address : (isNewUser ? "Location Required (Mandatory for new users)" : "No location pinned (Optional)")}
                          </span>
                        </div>
                        {address ? (
                          <button
                            type="button"
                            onClick={() => setAddress("")}
                            className="text-[8px] font-black text-red-500 hover:text-red-600 bg-red-500/5 border border-red-500/20 rounded px-2 py-0.5 cursor-pointer transition-all flex items-center gap-0.5"
                            style={{ fontFamily: "Montserrat, sans-serif" }}
                          >
                            <span className="material-symbols-outlined text-[9px]">close</span>
                            CLEAR
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleShareLocation}
                            disabled={isLocating}
                            className="text-[8px] font-black text-[#036835] bg-white border border-[#036835]/25 hover:border-[#036835] rounded px-2 py-0.5 flex items-center gap-1 hover:scale-102 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                            style={{ fontFamily: "Montserrat, sans-serif" }}
                          >
                            <span className="material-symbols-outlined text-[9px]">my_location</span>
                            {isLocating ? "LOCATING..." : "PIN"}
                          </button>
                        )}
                      </div>

                      {/* Building Details */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black text-[#036835]/60 tracking-widest uppercase" style={{ fontFamily: "Montserrat, sans-serif" }}>
                          Building, Floor & Flat No. *
                        </label>
                        <input
                          type="text"
                          ref={addressDetailsRef}
                          defaultValue={addressDetails}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck="false"
                          onChange={(e) => {
                            if (e.target.value.trim() !== "") setAddressError(false);
                          }}
                          onBlur={(e) => {
                            setAddressDetails(e.target.value);
                          }}
                          placeholder="e.g. Karama Court, Floor 2, Apt 204"
                          className={`w-full bg-[#fffcf2] border rounded-xl px-3 py-2 text-base text-[#036835] placeholder-[#036835]/30 focus:outline-none focus:border-[#036835] transition-colors ${
                            addressError ? "border-red-500 bg-red-500/5 focus:border-red-500" : "border-[#e5dbb2]"
                          }`}
                        />
                        {addressError && (
                          <span className="text-[8px] font-black text-red-500 tracking-wider" style={{ fontFamily: "Montserrat, sans-serif" }}>
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
                      const currentPhone = phoneInputRef.current ? phoneInputRef.current.value : customerPhone;
                      if (!currentPhone.trim()) {
                        setPhoneError(true);
                        return;
                      }

                      setIsSubmitting(true);

                      // Check if new user
                      let isNew = false;
                      const cleanPhone = currentPhone.trim().replace(/\s+/g, "");
                      if (cleanPhone) {
                        try {
                          const { data } = await supabase
                            .from("customers")
                            .select("phone")
                            .eq("phone", cleanPhone)
                            .single();
                          isNew = !data;
                        } catch (e) {
                          isNew = true; // Fallback to safe check
                        }
                      }

                      // 2. GPS Pin & Delivery Radius validation for delivery
                      if (orderType === "delivery") {
                        if (isNew && !address) {
                          alert("GPS location pin is mandatory for new customers. Please click the GPS location 'PIN' button.");
                          setIsSubmitting(false);
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
                              const limitDisplay = maxRadius < 1 ? `${Math.round(maxRadius * 1000)} meters` : `${maxRadius.toFixed(1)} km`;
                              const distanceDisplay = distance < 1 ? `${Math.round(distance * 1000)} meters` : `${distance.toFixed(1)} km`;
                              alert(`Sorry, your location is ${distanceDisplay} away. Our delivery limit is ${limitDisplay}.`);
                              setIsSubmitting(false);
                              return;
                            }
                          }
                        }

                        if (!addressDetails.trim()) {
                          setAddressError(true);
                          setIsSubmitting(false);
                          return;
                        }
                      }

                      // 3. Address validation for delivery
                      const currentDetails = addressDetailsRef.current ? addressDetailsRef.current.value : addressDetails;
                      if (orderType === "delivery" && currentDetails.trim() === "") {
                        setAddressError(true);
                        setIsSubmitting(false);
                        return;
                      }
                      setAddressDetails(currentDetails);

                      setIsSubmitting(true);

                      try {
                        const formattedItems = Object.values(cart).map((item) => ({
                          name: item.name,
                          quantity: item.quantity,
                        }));

                        const response = await fetch("/api/checkout", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            customerPhone: currentPhone,
                            items: formattedItems,
                            total: getCartSubtotal(),
                            orderType,
                            addressGps: address || null,
                            addressDetails: orderType === "delivery" ? currentDetails : null,
                          }),
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
                      } catch (error) {
                        console.error("Checkout submission error:", error);
                        alert("Checkout error. Please try again.");
                        setIsSubmitting(false);
                      }
                    }}
                    className="w-full py-3.5 bg-[#036835] hover:bg-[#0f4d27] disabled:bg-[#036835]/50 text-white text-[10px] font-black tracking-widest uppercase rounded-xl transition-all shadow-md active:scale-97 cursor-pointer mt-1"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {isSubmitting ? "PLACING ORDER..." : "PLACE ORDER"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#fffcf2] text-[#036835] font-sans flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden select-none">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6 z-10">
        <img
          src="/logo_malayalam.png"
          alt="വെള്ളരി"
          className="h-16 w-auto object-contain mb-2 opacity-90 animate-pulse"
          style={{ filter: "brightness(0) saturate(100%) invert(26%) sepia(91%) saturate(542%) hue-rotate(97deg) brightness(91%) contrast(98%)" }}
        />
        <h2
          className="text-lg font-black tracking-wider uppercase text-[#036835]"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Cooking Up Upgrades 🍲
        </h2>
        <p className="text-xs text-[#036835]/70 leading-relaxed font-medium">
          Our online system is temporarily resting. We are upgrading to serve you better!
        </p>
      </div>
    </div>
  );
}
