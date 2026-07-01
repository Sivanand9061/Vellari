"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

export default function AdminDashboard() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Tabs: 'overview', 'orders', 'customers'
  const [activeTab, setActiveTab] = useState("overview");

  // State Data
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchPhone, setSearchPhone] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // AI Chat States
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      role: "assistant",
      content: "Hello Owner! I am your Vellari AI Business Analyst. Ask me anything about your sales, revenue, or customer trends."
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234";

  // Check auth on mount
  useEffect(() => {
    const savedAuth = sessionStorage.getItem("vellari_admin_auth");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
    setIsLoaded(true);
  }, []);

  // Fetch all orders & customers once authenticated
  const fetchData = async () => {
    // Fetch all historical orders (newest first)
    const { data: ordersData, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersErr) console.error("Error fetching admin orders:", ordersErr);
    else setOrders(ordersData || []);

    // Fetch all customers
    const { data: custData, error: custErr } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (custErr) console.error("Error fetching admin customers:", custErr);
    else setCustomers(custData || []);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // PIN submission
  const handlePinSubmit = (e) => {
    e?.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
      sessionStorage.setItem("vellari_admin_auth", "true");
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

  // Block/Unblock Customer
  const handleToggleBlock = async (phone, currentStatus) => {
    const nextStatus = currentStatus === "blocked" ? "verified" : "blocked";
    
    // Update local state first for instant UI response
    setCustomers((prev) =>
      prev.map((c) => (c.phone === phone ? { ...c, status: nextStatus } : c))
    );

    const { error } = await supabase
      .from("customers")
      .update({ status: nextStatus })
      .eq("phone", phone);

    if (error) {
      console.error("Error updating block status:", error);
      alert("Failed to update status. Please try again.");
      fetchData(); // Reload original data
    }
  };

  // AI Chat Broadcast query
  const handleAiQuery = async (e) => {
    e.preventDefault();
    if (!aiQuestion.trim() || isAiLoading) return;

    const userMsg = aiQuestion.trim();
    setAiQuestion("");
    setAiChatHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/admin/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg })
      });

      const data = await response.json();
      
      setAiChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || "Sorry, I could not analyze the data right now." }
      ]);
    } catch (err) {
      console.error("AI query error:", err);
      setAiChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "Error connecting to AI analyst. Please verify internet connection." }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Calculate Metrics (Only for completed orders, status 'completed')
  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalOrdersCount = orders.length;
  const verifiedCustomersCount = customers.filter((c) => c.status === "verified").length;

  // Filter Orders for Logs Table
  const filteredOrders = orders.filter((order) => {
    const matchPhone = order.customer_phone.includes(searchPhone.trim().replace(/\s+/g, ""));
    const matchStatus = statusFilter === "all" || order.status === statusFilter;
    const matchType = typeFilter === "all" || order.order_type === typeFilter;
    return matchPhone && matchStatus && matchType;
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center text-white/50 text-xs tracking-widest font-black uppercase">
        Loading...
      </div>
    );
  }

  // --- PIN ACCESS WALL ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#F5B041]/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-xs w-full flex flex-col items-center gap-6 z-10 text-center">
          <img src="/logo_english.png" alt="Vellari Logo" className="h-10 w-auto object-contain mix-blend-screen mb-2" />
          
          <div className="flex flex-col gap-1.5">
            <h1 className="text-base font-black tracking-widest uppercase text-[#F5B041]">OWNER DASHBOARD</h1>
            <p className="text-[10px] font-bold text-white/40 tracking-wider">ENTER 4-DIGIT ADMIN PIN TO ACCESS</p>
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
              className="aspect-square bg-[#F5B041] hover:bg-[#D49228] text-[10px] font-black tracking-widest rounded-2xl flex items-center justify-center text-black active:scale-95 uppercase cursor-pointer"
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN MAIN WORKSPACE ---
  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col font-sans">
      
      {/* Navbar Header */}
      <header className="bg-[#111111] border-b border-white/5 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo_english.png" alt="Vellari" className="h-8 w-auto object-contain mix-blend-screen" />
          <span className="text-[10px] font-black tracking-widest uppercase text-[#F5B041] bg-[#F5B041]/10 px-2.5 py-1 rounded-full">OWNER PANEL</span>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          {[
            { id: "overview", label: "Overview & AI" },
            { id: "orders", label: "Order Logs" },
            { id: "customers", label: "Customers" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#F5B041] text-black shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto flex flex-col gap-6">
        
        {/* TAB 1: OVERVIEW & AI */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6">
            
            {/* Top Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/2 border border-white/5 rounded-3xl p-6 flex flex-col gap-1.5">
                <span className="text-[9px] font-black text-white/40 tracking-widest uppercase">TOTAL REVENUE (COMPLETED)</span>
                <span className="text-2xl font-black text-[#006B2B]">AED {totalRevenue.toFixed(2)}</span>
              </div>
              <div className="bg-white/2 border border-white/5 rounded-3xl p-6 flex flex-col gap-1.5">
                <span className="text-[9px] font-black text-white/40 tracking-widest uppercase">TOTAL ORDERS RECORDED</span>
                <span className="text-2xl font-black text-white/90">{totalOrdersCount}</span>
              </div>
              <div className="bg-white/2 border border-white/5 rounded-3xl p-6 flex flex-col gap-1.5">
                <span className="text-[9px] font-black text-white/40 tracking-widest uppercase">VERIFIED CUSTOMERS</span>
                <span className="text-2xl font-black text-[#F5B041]">{verifiedCustomersCount}</span>
              </div>
            </div>

            {/* AI Assistant Chat Panel */}
            <div className="bg-white/2 border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                <span className="material-symbols-outlined text-[#F5B041] text-xl">smart_toy</span>
                <h3 className="text-xs font-black tracking-widest uppercase">Vellari AI Business Analyst</h3>
              </div>

              {/* Chat Messages */}
              <div className="h-64 overflow-y-auto bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                {aiChatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed font-semibold ${
                      msg.role === "assistant"
                        ? "bg-white/5 text-white/90 self-start border border-white/5"
                        : "bg-[#F5B041]/10 text-[#F5B041] self-end border border-[#F5B041]/20"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
                {isAiLoading && (
                  <div className="bg-white/5 text-white/40 self-start rounded-2xl px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase border border-white/5 animate-pulse">
                    AI is calculating metrics...
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleAiQuery} className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="e.g. What is the average bill? Or Who ordered the most?"
                  className="flex-1 bg-white/5 border border-white/5 focus:border-[#F5B041] focus:outline-none rounded-xl px-4 py-3 text-xs text-white placeholder-white/30"
                />
                <button
                  type="submit"
                  disabled={isAiLoading || !aiQuestion.trim()}
                  className="px-6 py-3 bg-[#F5B041] hover:bg-[#D49228] text-black text-[10px] font-black tracking-widest uppercase rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  Ask
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: ORDER HISTORY LOGS */}
        {activeTab === "orders" && (
          <div className="bg-white/2 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
              <span className="material-symbols-outlined text-white/50 text-xl">receipt_long</span>
              <h3 className="text-xs font-black tracking-widest uppercase">Historical Order Logs</h3>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black text-white/40 tracking-widest uppercase">Search Customer Phone</span>
                <input
                  type="text"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  placeholder="Type phone number..."
                  className="bg-white/5 border border-white/5 focus:border-[#F5B041] focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black text-white/40 tracking-widest uppercase">Filter Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white/5 border border-white/5 focus:border-[#F5B041] focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending_verification">Pending Verification</option>
                  <option value="pending_accept">Pending Accept</option>
                  <option value="accepted">Accepted (Preparing)</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black text-white/40 tracking-widest uppercase">Filter Order Type</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-white/5 border border-white/5 focus:border-[#F5B041] focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white"
                >
                  <option value="all">All Types</option>
                  <option value="delivery">Delivery</option>
                  <option value="takeaway">Takeaway</option>
                  <option value="dine-in">Dine-in</option>
                </select>
              </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto border border-white/5 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[9px] font-black tracking-widest uppercase text-white/40 border-b border-white/5">
                    <th className="p-4">Date</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Items</th>
                    <th className="p-4">Bill</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-white/30 font-medium">No orders matched the filters.</td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                        <td className="p-4 text-white/50">
                          {new Date(order.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="p-4 font-bold">{order.customer_phone}</td>
                        <td className="p-4 font-black uppercase tracking-wider text-[9px]">
                          {order.order_type}
                        </td>
                        <td className="p-4 font-medium leading-relaxed max-w-[200px] truncate">
                          {order.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")}
                        </td>
                        <td className="p-4 font-black text-[#F5B041]">AED {Number(order.total).toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase ${
                            order.status === "completed" ? "bg-[#006B2B]/15 text-[#006B2B]" :
                            order.status === "cancelled" ? "bg-red-500/15 text-red-400" :
                            "bg-[#F5B041]/15 text-[#F5B041]"
                          }`}>
                            {order.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOMER DIRECTORY & BLOCKLIST */}
        {activeTab === "customers" && (
          <div className="bg-white/2 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
              <span className="material-symbols-outlined text-white/50 text-xl">groups</span>
              <h3 className="text-xs font-black tracking-widest uppercase">Customer Directory & Blocklist</h3>
            </div>

            {/* Customers list table */}
            <div className="overflow-x-auto border border-white/5 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[9px] font-black tracking-widest uppercase text-white/40 border-b border-white/5">
                    <th className="p-4">Phone Number</th>
                    <th className="p-4">Date Registered</th>
                    <th className="p-4">Verification Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-white/30 font-medium">No customers registered yet.</td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c.phone} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                        <td className="p-4 font-black tracking-wider">{c.phone}</td>
                        <td className="p-4 text-white/50">
                          {new Date(c.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase ${
                            c.status === "verified" ? "bg-[#006B2B]/15 text-[#006B2B]" :
                            c.status === "blocked" ? "bg-red-500/15 text-red-400 animate-pulse" :
                            "bg-[#F5B041]/15 text-[#F5B041]"
                          }`}>
                            {c.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleToggleBlock(c.phone, c.status)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all cursor-pointer ${
                              c.status === "blocked"
                                ? "bg-[#006B2B] hover:bg-[#004D1F] text-white"
                                : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {c.status === "blocked" ? "Unblock Number" : "Block Customer"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
