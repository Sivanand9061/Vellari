"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";

export default function StaffDashboard({ pinCode }) {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const audioContextRef = useRef(null);

  const STAFF_PIN = (pinCode || "8867").trim().replace(/['"]/g, "");

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("vellari_staff_auth");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customers(name, status)
        `)
        .in("status", ["pending_verification", "pending_accept", "accepted"])
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching orders:", error);
      } else {
        setActiveOrders(data || []);
      }
    };

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "maintenanceMode")
        .single();

      if (error) {
        console.error("Error fetching settings:", error);
      } else if (data) {
        setMaintenanceMode(data.value === true || data.value === "true");
      }
    };

    fetchOrders();
    fetchSettings();

    const playChime = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) {
        console.warn("Audio Context play blocked by browser policy.", e);
      }
    };

    const ordersSubscription = supabase
      .channel("active-orders-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            playChime();
          }
          fetchOrders();
        }
      )
      .subscribe();

    const settingsSubscription = supabase
      .channel("settings-channel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings", filter: "key=eq.maintenanceMode" },
        (payload) => {
          if (payload.new) {
            setMaintenanceMode(payload.new.value === true || payload.new.value === "true");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(settingsSubscription);
    };
  }, [isAuthenticated]);

  const handlePinSubmit = (e) => {
    e?.preventDefault();
    if (pin === STAFF_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
      sessionStorage.setItem("vellari_staff_auth", "true");
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } else {
      setPinError(true);
      setPin("");
    }
  };

  const handleKeypadPress = (num) => {
    setPinError(false);
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handleKeypadClear = () => {
    setPin("");
    setPinError(false);
  };



  const handleAcceptOrder = async (orderId, customerPhone, isNewCustomer) => {
    const { error: orderErr } = await supabase
      .from("orders")
      .update({ status: "accepted" })
      .eq("id", orderId);

    if (orderErr) {
      console.error("Error accepting order:", orderErr);
      return;
    }

    if (isNewCustomer) {
      const { error: custErr } = await supabase
        .from("customers")
        .update({ status: "verified" })
        .eq("phone", customerPhone);

      if (custErr) console.error("Error verifying customer:", custErr);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("id", orderId);

    if (error) console.error("Error completing order:", error);
  };

  const handleCancelOrder = async (orderId) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this order?");
    if (!confirmCancel) return;

    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);

    if (error) console.error("Error cancelling order:", error);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center text-white/50 text-xs tracking-widest font-black uppercase">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#006B2B]/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-xs w-full flex flex-col items-center gap-6 z-10 text-center">
          <img src="/logo_english.png" alt="Vellari Logo" className="h-10 w-auto object-contain mix-blend-screen mb-2" />
          
          <div className="flex flex-col gap-1.5">
            <h1 className="text-base font-black tracking-widest uppercase text-white/90">STAFF PORTAL</h1>
            <p className="text-[10px] font-bold text-white/40 tracking-wider">ENTER 4-DIGIT PIN CODE TO ACCESS</p>
          </div>

          <div className="flex justify-center gap-4 py-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                  pinError
                    ? "border-red-500 bg-red-500/30 animate-pulse"
                    : index < pin.length
                    ? "border-[#F5B041] bg-[#F5B041]"
                    : "border-white/10 bg-transparent"
                }`}
              ></div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeypadPress(num.toString())}
                className="aspect-square bg-white/5 border border-white/5 hover:bg-white/10 active:bg-white/20 transition-all rounded-2xl flex items-center justify-center text-xl font-bold active:scale-95 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleKeypadClear}
              className="aspect-square bg-red-500/10 border border-red-500/10 hover:bg-red-500/20 text-[10px] font-black tracking-widest rounded-2xl flex items-center justify-center text-red-400 active:scale-95 uppercase cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => handleKeypadPress("0")}
              className="aspect-square bg-white/5 border border-white/5 hover:bg-white/10 active:bg-white/20 transition-all rounded-2xl flex items-center justify-center text-xl font-bold active:scale-95 cursor-pointer"
            >
              0
            </button>
            <button
              onClick={() => handlePinSubmit()}
              className="aspect-square bg-[#006B2B] hover:bg-[#004D1F] text-[10px] font-black tracking-widest rounded-2xl flex items-center justify-center text-white active:scale-95 uppercase cursor-pointer"
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col font-sans">
      <header className="bg-[#111111] border-b border-white/5 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo_english.png" alt="Vellari" className="h-8 w-auto object-contain mix-blend-screen" />
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
          <span className="text-[10px] font-black tracking-widest uppercase text-white/50">LIVE ORDERS</span>
        </div>

        <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-5 py-2.5">
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">WEBSITE STATUS</span>
            <span className={`text-[11px] font-bold ${maintenanceMode ? "text-[#F5B041]" : "text-[#006B2B]"}`}>
              {maintenanceMode ? "PAUSED (Maintenance)" : "ONLINE (Accepting Orders)"}
            </span>
          </div>
          <span className={`w-2 h-2 rounded-full ${maintenanceMode ? "bg-[#F5B041]" : "bg-green-500 animate-pulse"}`}></span>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-6">
        {activeOrders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 select-none">
            <span className="material-symbols-outlined text-4xl text-white/10 mb-3">restaurant</span>
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">No Active Orders</h3>
            <p className="text-[10px] text-white/30 font-medium mt-1">When customers place orders, they will ring here instantly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOrders.map((order) => {
              const isNewCustomer =
                !order.customers || order.customers.status === "pending_verification";
              const isPendingConfirm = order.status === "pending_verification";

              return (
                <div
                  key={order.id}
                  className={`bg-white/2 border rounded-3xl p-6 flex flex-col justify-between gap-6 transition-all duration-300 relative overflow-hidden ${
                    isPendingConfirm
                      ? "border-red-500/30 bg-red-500/[0.01] shadow-[0_0_20px_0_rgba(239,68,68,0.05)] animate-pulse"
                      : "border-white/5"
                  }`}
                >
                  {isPendingConfirm && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
                      CALL VERIFICATION REQUIRED
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-black tracking-wide">
                          {order.order_type === "delivery" ? "🚀 Delivery" : order.order_type === "takeaway" ? "🛍️ Takeaway" : "🍽️ Dine-in"}
                        </h4>
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="text-xs text-[#F5B041] font-black hover:underline mt-1 block tracking-wider"
                        >
                          📞 {order.customer_phone}
                        </a>
                      </div>
                      <span className="text-[10px] text-white/30 font-medium">
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="h-px bg-white/5"></div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">ITEMS</span>
                      <ul className="flex flex-col gap-2">
                        {Array.isArray(order.items) &&
                          order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between text-xs font-semibold text-white/90">
                              <span>
                                <strong className="text-[#F5B041] font-black mr-2">{item.quantity}x</strong>
                                {item.name}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className="h-px bg-white/5"></div>

                    {order.order_type === "delivery" && (
                      <div className="flex flex-col gap-2 text-xs">
                        <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">ADDRESS</span>
                        <p className="text-white/80 font-bold leading-relaxed">{order.address_details}</p>
                        {order.address_gps && (
                          <a
                            href={order.address_gps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-[#006B2B] font-black hover:underline mt-1"
                          >
                            📍 View Pinned Location (Maps)
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mt-auto">
                    {order.status === "pending_verification" || order.status === "pending_accept" ? (
                      <button
                        onClick={() => handleAcceptOrder(order.id, order.customer_phone, isNewCustomer)}
                        className={`w-full py-3.5 text-xs font-black tracking-widest rounded-xl transition-all duration-300 shadow-md uppercase cursor-pointer hover:scale-102 active:scale-98 ${
                          isPendingConfirm
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-[#006B2B] hover:bg-[#004D1F] text-white"
                        }`}
                      >
                        {isPendingConfirm ? "📞 Verified & Accept" : "Accept Order"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCompleteOrder(order.id)}
                        className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black tracking-widest rounded-xl transition-all duration-300 uppercase cursor-pointer hover:scale-102 active:scale-98"
                      >
                        ✔ Mark Completed
                      </button>
                    )}

                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="w-full py-2 bg-transparent hover:bg-red-500/10 text-red-400 text-[10px] font-black tracking-widest rounded-xl transition-all uppercase cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
