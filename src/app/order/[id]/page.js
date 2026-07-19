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
      <div className="min-h-screen bg-[#fffcf2] flex items-center justify-center text-[#036835]/60 text-xs tracking-widest font-black uppercase font-sans">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin">sync</span>
          <span>Loading Tracker...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#fffcf2] text-[#036835] flex flex-col items-center justify-center p-6 text-center gap-4 select-none font-sans">
        <span className="material-symbols-outlined text-3xl text-red-500">error</span>
        <h1 className="text-sm font-black tracking-widest uppercase" style={{ fontFamily: "Montserrat, sans-serif" }}>Order Not Found</h1>
        <p className="text-xs text-[#036835]/70 max-w-xs leading-relaxed font-medium">
          The order ID does not exist or has expired. Please check the URL and try again.
        </p>
        <Link
          href="/menu"
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#036835] hover:bg-[#0f4d27] text-white text-[10px] font-black tracking-widest uppercase rounded-xl transition-all shadow-md"
          style={{ fontFamily: "Montserrat, sans-serif" }}
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
    <div className="min-h-screen bg-[#fffcf2] text-[#036835] font-sans flex flex-col justify-between p-5 relative overflow-hidden select-none pb-24">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#036835]/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Top Header */}
      <header className="w-full max-w-md mx-auto flex justify-between items-center z-10 py-1">
        <Link href="/menu" className="flex items-center cursor-pointer">
          <span
            className="text-[#036835] font-black text-lg tracking-tight uppercase"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Vellari
          </span>
        </Link>
        <span
          className="text-[9px] font-black text-[#036835]/40 tracking-widest uppercase"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          ID: {order.id.slice(0, 8)}
        </span>
      </header>

      {/* Main Status Container */}
      <div className="max-w-md w-full mx-auto bg-[#fffcf2] border border-[#e5dbb2]/60 rounded-3xl p-5 md:p-6 text-center shadow-[0px_6px_24px_rgba(21,103,52,0.03)] flex flex-col gap-5 z-10 my-4">
        
        {/* Verification Alert Banner */}
        {isPendingVerification && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center flex flex-col items-center gap-2 animate-pulse">
            <span className="material-symbols-outlined text-red-500 text-2xl">phone_in_talk</span>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-[10px] font-black tracking-widest text-red-600 uppercase" style={{ fontFamily: "Montserrat, sans-serif" }}>Verification Required</h3>
              <p className="text-[9px] text-[#036835]/80 font-semibold leading-relaxed mt-0.5">
                Since this is your first order, please call us to confirm your phone number and finalize the order.
              </p>
            </div>
            <a
              href="tel:+97148342856"
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black tracking-widest uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 mt-1"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              <span className="material-symbols-outlined text-xs">call</span>
              Call Restaurant Now
            </a>
          </div>
        )}

        {/* Live Tracking Visual Steps */}
        <div className="flex flex-col items-center gap-3.5 py-1">
          {/* Status Illustration */}
          <div className="w-16 h-16 rounded-full bg-[#036835]/5 flex items-center justify-center border border-[#036835]/10 relative">
            {isPendingVerification && (
              <span className="material-symbols-outlined text-[#036835]/85 text-2xl animate-bounce">pending_actions</span>
            )}
            {isPendingAccept && (
              <span className="material-symbols-outlined text-[#036835]/85 text-2xl animate-spin">hourglass_empty</span>
            )}
            {isAccepted && (
              <span className="material-symbols-outlined text-[#036835] text-2xl animate-pulse">soup_kitchen</span>
            )}
            {isCompleted && (
              <span className="material-symbols-outlined text-[#036835] text-2xl">celebration</span>
            )}
            {isCancelled && (
              <span className="material-symbols-outlined text-red-500 text-2xl">cancel</span>
            )}
          </div>

          {/* Status Text Description */}
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-black tracking-wider uppercase text-[#036835]" style={{ fontFamily: "Montserrat, sans-serif" }}>
              {isPendingVerification && "Verifying Phone Number..."}
              {isPendingAccept && "Waiting for Confirmation..."}
              {isAccepted && "Cooking Your Food! 🍲"}
              {isCompleted && "Order Completed!"}
              {isCancelled && "Order Cancelled"}
            </h2>
            <p className="text-[10px] text-[#036835]/60 leading-normal font-medium max-w-xs px-2">
              {isPendingVerification && "Your order has been recorded. Please make a quick call to confirm."}
              {isPendingAccept && "The kitchen is reviewing your order. We'll start preparing it in a second."}
              {isAccepted && "Our chefs are preparing your street eats fresh. Get ready to feast!"}
              {isCompleted && "Thank you for dining with Vellari! We hope to serve you again soon."}
              {isCancelled && "Your order was declined. If you have questions, please call us directly."}
            </p>
          </div>
        </div>

        <div className="h-px bg-[#e5dbb2]/30"></div>

        {/* Summary Card */}
        <div className="text-left flex flex-col gap-2 text-xs">
          <span className="text-[8px] font-black tracking-widest text-[#036835]/40 uppercase" style={{ fontFamily: "Montserrat, sans-serif" }}>
            ORDER DETAILS
          </span>
          
          <div className="bg-white/40 border border-[#e5dbb2]/45 rounded-2xl p-3 flex flex-col gap-2.5">
            {/* Items list */}
            <ul className="flex flex-col gap-1.5 border-b border-[#e5dbb2]/30 pb-2.5">
              {Array.isArray(order.items) &&
                order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between font-bold text-[#036835] text-xs">
                    <span>
                      <strong className="text-[#036835]/85 font-black mr-2">{item.quantity}x</strong>
                      {item.name}
                    </span>
                  </li>
                ))}
            </ul>

            {/* Total */}
            <div className="flex justify-between items-center text-xs font-black tracking-wide" style={{ fontFamily: "Montserrat, sans-serif" }}>
              <span className="text-[#036835]/60">TOTAL BILL</span>
              <span className="text-[#036835] text-sm">AED {Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Address and Delivery Details */}
        {order.order_type === "delivery" && order.address_details && (
          <div className="text-left flex flex-col gap-1.5 text-xs">
            <span className="text-[8px] font-black tracking-widest text-[#036835]/40 uppercase" style={{ fontFamily: "Montserrat, sans-serif" }}>
              DELIVERY ADDRESS
            </span>
            <p className="text-[#036835]/80 font-bold leading-normal text-xs">{order.address_details}</p>
          </div>
        )}
      </div>

      {/* Footer Support Info */}
      <footer className="w-full text-center z-10 py-2 flex flex-col gap-1">
        <p className="text-[9px] text-[#036835]/40 font-bold leading-relaxed" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Need support? Call us: <a href="tel:+97148342856" className="text-[#036835]/60 font-black hover:underline">+971 4 834 2856</a>
        </p>
        <p className="text-[9px] text-[#036835]/30 font-medium">© 2026 Vellari Karama. All rights reserved.</p>
      </footer>
    </div>
  );
}
