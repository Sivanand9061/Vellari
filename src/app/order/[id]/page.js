"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    // 1. Fetch order details on mount
    const fetchOrder = async () => {
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (fetchError) {
        console.error("Error fetching order:", fetchError);
        setError("Order not found.");
      } else {
        setOrder(data);
      }
      setLoading(false);
    };

    fetchOrder();

    // 2. Subscribe to real-time updates for this specific order
    const orderSubscription = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          if (payload.new) {
            setOrder(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderSubscription);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center text-white/50 text-xs tracking-widest font-black uppercase">
        Loading Tracker...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-6 text-center gap-4 select-none font-sans">
        <span className="material-symbols-outlined text-4xl text-red-400">error</span>
        <h1 className="text-base font-black tracking-widest uppercase">Order Not Found</h1>
        <p className="text-xs text-white/50 max-w-xs leading-relaxed">
          The order ID does not exist or has expired. Please check the URL and try again.
        </p>
        <Link
          href="/menu"
          className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-[#006B2B] hover:bg-[#004D1F] text-white text-xs font-black tracking-widest uppercase rounded-xl transition-all"
        >
          Back to Menu
        </Link>
      </div>
    );
  }

  const isPendingVerification = order.status === "pending_verification";
  const isPendingAccept = order.status === "pending_accept";
  const isAccepted = order.status === "accepted";
  const isCompleted = order.status === "completed";
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-[#111111] text-white font-sans flex flex-col justify-between p-6 relative overflow-hidden select-none">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#006B2B]/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Top Header */}
      <header className="w-full max-w-xl mx-auto flex justify-between items-center z-10 py-2">
        <Link href="/menu" className="flex items-center cursor-pointer">
          <img src="/logo_english.png" alt="Vellari" className="h-8 w-auto object-contain mix-blend-screen" />
        </Link>
        <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">
          ID: {order.id.slice(0, 8)}
        </span>
      </header>

      {/* Main Status Container */}
      <div className="max-w-md w-full mx-auto bg-white/2 backdrop-blur-md border border-white/5 rounded-3xl p-6 md:p-8 text-center shadow-2xl flex flex-col gap-6 z-10 my-6">
        
        {/* Verification Alert Banner */}
        {isPendingVerification && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-center flex flex-col items-center gap-3.5 animate-pulse">
            <span className="material-symbols-outlined text-red-400 text-3xl">phone_in_talk</span>
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-black tracking-widest text-red-400 uppercase">Verification Required</h3>
              <p className="text-[10px] text-white/70 font-medium leading-relaxed mt-1">
                Since this is your first order with us, please call the restaurant to confirm your phone number and finalize the order.
              </p>
            </div>
            <a
              href="tel:+97148342856"
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black tracking-widest uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">call</span>
              Call Restaurant Now
            </a>
          </div>
        )}

        {/* Live Tracking Visual Steps */}
        <div className="flex flex-col items-center gap-4 py-2">
          {/* Status Illustration */}
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 relative">
            {isPendingVerification && (
              <span className="material-symbols-outlined text-[#F5B041] text-3xl animate-bounce">pending_actions</span>
            )}
            {isPendingAccept && (
              <span className="material-symbols-outlined text-[#F5B041] text-3xl animate-spin">hourglass_empty</span>
            )}
            {isAccepted && (
              <span className="material-symbols-outlined text-[#006B2B] text-3xl animate-float">soup_kitchen</span>
            )}
            {isCompleted && (
              <span className="material-symbols-outlined text-[#006B2B] text-3xl">celebration</span>
            )}
            {isCancelled && (
              <span className="material-symbols-outlined text-red-400 text-3xl">cancel</span>
            )}
          </div>

          {/* Status Text Description */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-base font-black tracking-wider uppercase text-white/90">
              {isPendingVerification && "Verifying Phone Number..."}
              {isPendingAccept && "Waiting for Confirmation..."}
              {isAccepted && "Cooking Your Food! 🍲"}
              {isCompleted && "Order Completed!"}
              {isCancelled && "Order Cancelled"}
            </h2>
            <p className="text-xs text-white/50 leading-relaxed font-medium max-w-xs">
              {isPendingVerification && "Your order has been recorded. Please make a quick call to confirm."}
              {isPendingAccept && "The kitchen is reviewing your order. We'll start preparing it in a second."}
              {isAccepted && "Our chefs are preparing your street eats fresh. Get ready to feast!"}
              {isCompleted && "Thank you for dining with Vellari! We hope to serve you again soon."}
              {isCancelled && "Your order was declined. If you have questions, please call us directly."}
            </p>
          </div>
        </div>

        <div className="h-px bg-white/5"></div>

        {/* Summary Card */}
        <div className="text-left flex flex-col gap-3 text-xs">
          <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">ORDER DETAILS</span>
          
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
            {/* Items list */}
            <ul className="flex flex-col gap-2 border-b border-white/5 pb-3">
              {Array.isArray(order.items) &&
                order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between font-bold text-white/90">
                    <span>
                      <strong className="text-[#F5B041] font-black mr-2">{item.quantity}x</strong>
                      {item.name}
                    </span>
                  </li>
                ))}
            </ul>

            {/* Subtotal */}
            <div className="flex justify-between items-center text-sm font-black tracking-wide">
              <span className="text-white/60">TOTAL BILL</span>
              <span className="text-[#F5B041]">AED {Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Address and Delivery Details */}
        {order.order_type === "delivery" && order.address_details && (
          <div className="text-left flex flex-col gap-2.5 text-xs">
            <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">DELIVERY ADDRESS</span>
            <p className="text-white/80 font-bold leading-relaxed">{order.address_details}</p>
          </div>
        )}
      </div>

      {/* Footer Support Info */}
      <footer className="w-full text-center z-10 py-4 flex flex-col gap-2">
        <p className="text-[10px] text-white/30 font-medium leading-relaxed">
          Need support? Call us: <a href="tel:+97148342856" className="text-white/50 font-bold hover:underline">+971 4 834 2856</a>
        </p>
        <p className="text-[10px] text-white/20 font-medium">© 2026 Vellari Karama. All rights reserved.</p>
      </footer>
    </div>
  );
}
