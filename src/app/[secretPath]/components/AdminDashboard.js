"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { categories, menuData } from "@/utils/menuData";

export default function AdminDashboard() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  // Tabs: 'overview', 'orders', 'customers'
  const [activeTab, setActiveTab] = useState("overview");

  // Date Helpers for Owner Filters
  const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const getYesterdayRange = () => {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const getLast7DaysRange = () => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const [datePreset, setDatePreset] = useState("today"); // 'today', 'yesterday', 'week', 'custom'
  const [startDate, setStartDate] = useState(() => getTodayRange().start);
  const [endDate, setEndDate] = useState(() => getTodayRange().end);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

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
  const [deliveryRadius, setDeliveryRadius] = useState("unlimited");

  // Delete Confirmation Modal States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [dontAskDeleteAgain, setDontAskDeleteAgain] = useState(false);
  const [skipConfirmInFuture, setSkipConfirmInFuture] = useState(false);

  // Bulk selection states
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [selectedCustomerPhones, setSelectedCustomerPhones] = useState([]);
  const [unavailableItems, setUnavailableItems] = useState([]);
  const [unavailableCategories, setUnavailableCategories] = useState([]);
  const [adminItemSearch, setAdminItemSearch] = useState("");
  const [adminActiveCategory, setAdminActiveCategory] = useState("combo");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vellari_skip_delete_confirm");
      if (saved === "true") {
        setSkipConfirmInFuture(true);
      }
    }
  }, []);

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

    // Fetch maintenance mode setting
    const { data: settingsData, error: settingsErr } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "maintenanceMode")
      .single();

    if (settingsErr) {
      console.error("Error fetching settings:", settingsErr);
    } else if (settingsData) {
      setMaintenanceMode(settingsData.value === true || settingsData.value === "true");
    }

    // Fetch delivery radius setting
    const { data: radiusData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "deliveryRadius")
      .single();

    if (radiusData) {
      setDeliveryRadius(String(radiusData.value));
    }

    // Fetch unavailable items setting
    const { data: itemsData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "unavailableItems")
      .single();
    if (itemsData && Array.isArray(itemsData.value)) {
      setUnavailableItems(itemsData.value);
    }

    // Fetch unavailable categories setting
    const { data: catsData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "unavailableCategories")
      .single();
    if (catsData && Array.isArray(catsData.value)) {
      setUnavailableCategories(catsData.value);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();

      // Subscribe to settings updates in real-time
      const settingsSubscription = supabase
        .channel("admin-settings-channel")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "settings" },
          (payload) => {
            if (payload.new) {
              if (payload.new.key === "maintenanceMode") {
                setMaintenanceMode(payload.new.value === true || payload.new.value === "true");
              }
              if (payload.new.key === "deliveryRadius") {
                setDeliveryRadius(String(payload.new.value));
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(settingsSubscription);
      };
    }
  }, [isAuthenticated]);

  const handlePinSubmit = async (e) => {
    e?.preventDefault();
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, type: "admin" })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setPinError(false);
        sessionStorage.setItem("vellari_admin_auth", "true");
        sessionStorage.setItem("vellari_admin_pin", pin);
      } else {
        setPinError(true);
        setPin("");
      }
    } catch (err) {
      console.error("Login verification error:", err);
      alert("Verification server error. Please try again.");
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

  // Toggle Maintenance Mode
  const handleToggleMaintenance = async () => {
    const nextState = !maintenanceMode;
    setMaintenanceMode(nextState);

    const { error } = await supabase
      .from("settings")
      .update({ value: nextState })
      .eq("key", "maintenanceMode");

    if (error) {
      console.error("Error saving maintenance mode setting:", error);
      alert("Failed to update status. Please check connection.");
      setMaintenanceMode(!nextState); // Rollback
    }
  };

  // Change Delivery Radius
  const handleRadiusChange = async (newRadius) => {
    setDeliveryRadius(newRadius);
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "deliveryRadius", value: newRadius });

    if (error) {
      console.error("Error saving delivery radius setting:", error);
      alert("Failed to update delivery radius.");
      fetchData(); // Rollback to actual setting
    }
  };

  // Delete Order triggering sleek confirmation modal or instant deletion
  const handleDeleteOrder = (orderId) => {
    if (skipConfirmInFuture) {
      executeOrderDeletion(orderId);
    } else {
      setOrderToDelete(orderId);
      setDeleteConfirmOpen(true);
    }
  };

  const executeOrderDeletion = async (orderId) => {
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) {
      console.error("Error deleting order:", error);
      alert("Failed to delete order: " + error.message);
    } else {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (dontAskDeleteAgain) {
        localStorage.setItem("vellari_skip_delete_confirm", "true");
        setSkipConfirmInFuture(true);
      }
    }
    setDeleteConfirmOpen(false);
    setOrderToDelete(null);
  };

  // Bulk Deletion handlers
  const handleBulkDeleteOrders = async () => {
    if (!selectedOrderIds.length) return;
    if (!window.confirm(`Are you sure you want to permanently delete all ${selectedOrderIds.length} selected orders? This cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .from("orders")
      .delete()
      .in("id", selectedOrderIds);

    if (error) {
      console.error("Error bulk deleting orders:", error);
      alert("Failed to delete orders: " + error.message);
    } else {
      alert("Selected orders deleted successfully.");
      setOrders((prev) => prev.filter((o) => !selectedOrderIds.includes(o.id)));
      setSelectedOrderIds([]);
    }
  };

  const handleBulkDeleteCustomers = async () => {
    if (!selectedCustomerPhones.length) return;
    if (!window.confirm(`Are you sure you want to permanently delete all ${selectedCustomerPhones.length} selected customer records? This will set associated historical orders to NULL.`)) {
      return;
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .in("phone", selectedCustomerPhones);

    if (error) {
      console.error("Error bulk deleting customers:", error);
      alert("Failed to delete customers: " + error.message);
    } else {
      alert("Selected customers deleted successfully.");
      setCustomers((prev) => prev.filter((c) => !selectedCustomerPhones.includes(c.phone)));
      setSelectedCustomerPhones([]);
    }
  };

  const handleToggleItemAvailability = async (itemName) => {
    const updated = unavailableItems.includes(itemName)
      ? unavailableItems.filter((name) => name !== itemName)
      : [...unavailableItems, itemName];

    setUnavailableItems(updated);

    const { error } = await supabase
      .from("settings")
      .upsert({ key: "unavailableItems", value: updated });

    if (error) {
      console.error("Error updating unavailable items setting:", error);
      alert("Failed to save changes: " + error.message);
    }
  };

  const handleToggleCategoryAvailability = async (categoryId) => {
    const updated = unavailableCategories.includes(categoryId)
      ? unavailableCategories.filter((id) => id !== categoryId)
      : [...unavailableCategories, categoryId];

    setUnavailableCategories(updated);

    const { error } = await supabase
      .from("settings")
      .upsert({ key: "unavailableCategories", value: updated });

    if (error) {
      console.error("Error updating unavailable categories setting:", error);
      alert("Failed to save changes: " + error.message);
    }
  };

  // Date Preset Actions
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === "today") {
      const range = getTodayRange();
      setStartDate(range.start);
      setEndDate(range.end);
    } else if (preset === "yesterday") {
      const range = getYesterdayRange();
      setStartDate(range.start);
      setEndDate(range.end);
    } else if (preset === "week") {
      const range = getLast7DaysRange();
      setStartDate(range.start);
      setEndDate(range.end);
    } else if (preset === "custom") {
      setShowDatePicker(true);
    }
  };

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);

    setStartDate(start.toISOString());
    setEndDate(end.toISOString());
    setDatePreset("custom");
    setShowDatePicker(false);
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
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("vellari_admin_pin") || ""}`
        },
        body: JSON.stringify({ question: userMsg, startDate, endDate })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setAiChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: data.answer }
        ]);
      } else {
        setAiChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ Error: ${data.error || "Could not analyze the data right now."}` }
        ]);
      }
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

  // Calculate Metrics filtered by the selected date range
  const filteredOrdersByDate = orders.filter((o) => {
    const time = new Date(o.created_at).getTime();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return time >= start && time <= end;
  });

  const filteredCustomersByDate = customers.filter((c) => {
    const time = new Date(c.created_at).getTime();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return time >= start && time <= end;
  });

  const completedOrders = filteredOrdersByDate.filter((o) => o.status === "completed");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalOrdersCount = filteredOrdersByDate.length;
  const verifiedCustomersCount = filteredCustomersByDate.filter((c) => c.status === "verified").length;

  // Filter Orders for Logs Table
  const filteredOrders = filteredOrdersByDate.filter((order) => {
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

        {/* Dynamic Maintenance Toggle */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl px-5 py-2">
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">WEBSITE STATUS</span>
            <span className={`text-[11px] font-bold ${maintenanceMode ? "text-[#F5B041]" : "text-[#006B2B]"}`}>
              {maintenanceMode ? "PAUSED (Maintenance)" : "ONLINE (Accepting Orders)"}
            </span>
          </div>
          <button
            onClick={handleToggleMaintenance}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
              maintenanceMode ? "bg-[#F5B041]" : "bg-[#006B2B]"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                maintenanceMode ? "translate-x-6" : "translate-x-0"
              }`}
            ></div>
          </button>
        </div>

        {/* Delivery Radius Selector (Toggle + Slider: 100m to 5km) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 bg-white/2 border border-white/5 rounded-2xl px-5 py-2.5">
          <div className="flex justify-between items-center gap-4 w-full sm:w-auto">
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">DELIVERY LIMIT</span>
              <span className="text-[11px] font-bold text-white/95 mt-0.5 whitespace-nowrap">
                {deliveryRadius === "unlimited" || deliveryRadius === "0" 
                  ? "Unlimited" 
                  : (parseFloat(deliveryRadius) < 1 
                      ? `${Math.round(parseFloat(deliveryRadius) * 1000)} meters` 
                      : `${parseFloat(deliveryRadius).toFixed(1)} km`)}
              </span>
            </div>
            
            {/* Toggle Switch to Enable/Disable Limit */}
            <button
              onClick={() => {
                if (deliveryRadius === "unlimited" || deliveryRadius === "0") {
                  handleRadiusChange("3.0");
                } else {
                  handleRadiusChange("unlimited");
                }
              }}
              className={`w-9 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                deliveryRadius !== "unlimited" && deliveryRadius !== "0" ? "bg-[#F5B041]" : "bg-white/10"
              }`}
            >
              <div
                className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${
                  deliveryRadius !== "unlimited" && deliveryRadius !== "0" ? "translate-x-4" : "translate-x-0"
                }`}
              ></div>
            </button>
          </div>

          {/* Range Slider (Shown only when limit is enabled) */}
          {deliveryRadius !== "unlimited" && deliveryRadius !== "0" && (
            <div className="flex items-center gap-3 w-full sm:w-44">
              <span className="text-[9px] font-bold text-white/30">100m</span>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={parseFloat(deliveryRadius) || 3.0}
                onChange={(e) => handleRadiusChange(e.target.value)}
                className="flex-1 accent-[#F5B041] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[9px] font-bold text-white/30">5km</span>
            </div>
          )}
        </div>

        {/* Tab Controls */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          {[
            { id: "overview", label: "Overview & AI" },
            { id: "orders", label: "Order Logs" },
            { id: "customers", label: "Customers" },
            { id: "menu", label: "Menu Toggle" }
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
        
        {/* iOS-Style Date Preset Filter Bar (Only shown on Overview & Orders tabs) */}
        {(activeTab === "overview" || activeTab === "orders") && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/2 border border-white/5 rounded-3xl p-4 md:px-6 md:py-4">
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black text-white/40 tracking-widest uppercase">ANALYTICS TIMEFRAME</span>
              <span className="text-xs font-bold text-white/85 mt-0.5">
                {new Date(startDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                {startDate.split("T")[0] !== endDate.split("T")[0] && (
                  <> - {new Date(endDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</>
                )}
              </span>
            </div>

            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto">
              {[
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "week", label: "Last 7 Days" },
                { id: "custom", label: "Custom Range 📅" }
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetChange(preset.id)}
                  className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-[9px] font-black tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                    datePreset === preset.id
                      ? "bg-[#F5B041] text-black shadow-md"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
              <div className="h-64 overflow-y-auto bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col gap-3 scrollbar-none">
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

            {/* Bulk Deletion Action Bar */}
            {selectedOrderIds.length > 0 && (
              <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-3 animate-fadeIn">
                <span className="text-[10px] font-black tracking-widest text-red-400 uppercase">
                  {selectedOrderIds.length} Order{selectedOrderIds.length > 1 ? "s" : ""} Selected
                </span>
                <button
                  onClick={handleBulkDeleteOrders}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-2 text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer shadow-md hover:scale-102 active:scale-98"
                >
                  Delete Selected
                </button>
              </div>
            )}

            {/* Logs Table */}
            <div className="overflow-x-auto border border-white/5 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[9px] font-black tracking-widest uppercase text-white/40 border-b border-white/5">
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds(filteredOrders.map(o => o.id));
                          } else {
                            setSelectedOrderIds([]);
                          }
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-[#111111] text-[#F5B041] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Items</th>
                    <th className="p-4">Bill</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-white/30 font-medium">No orders matched the filters.</td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                        <td className="p-4 w-10">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(prev => [...prev, order.id]);
                              } else {
                                setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-[#111111] text-[#F5B041] focus:ring-0 cursor-pointer"
                          />
                        </td>
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
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg px-2.5 py-1 transition-all cursor-pointer font-bold"
                          >
                            Delete
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

        {/* TAB 3: CUSTOMER DIRECTORY & BLOCKLIST */}
        {activeTab === "customers" && (
          <div className="bg-white/2 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
              <span className="material-symbols-outlined text-white/50 text-xl">groups</span>
              <h3 className="text-xs font-black tracking-widest uppercase">Customer Directory & Blocklist</h3>
            </div>

             {/* Bulk Deletion Action Bar */}
            {selectedCustomerPhones.length > 0 && (
              <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-3 animate-fadeIn mb-4">
                <span className="text-[10px] font-black tracking-widest text-red-400 uppercase">
                  {selectedCustomerPhones.length} Customer{selectedCustomerPhones.length > 1 ? "s" : ""} Selected
                </span>
                <button
                  onClick={handleBulkDeleteCustomers}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-2 text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer shadow-md hover:scale-102 active:scale-98"
                >
                  Delete Selected Customers
                </button>
              </div>
            )}

            {/* Customers list table */}
            <div className="overflow-x-auto border border-white/5 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[9px] font-black tracking-widest uppercase text-white/40 border-b border-white/5">
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={customers.length > 0 && selectedCustomerPhones.length === customers.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomerPhones(customers.map(c => c.phone));
                          } else {
                            setSelectedCustomerPhones([]);
                          }
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-[#111111] text-[#F5B041] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">Phone Number</th>
                    <th className="p-4">Date Registered</th>
                    <th className="p-4">Verification Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-white/30 font-medium">No customers registered yet.</td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c.phone} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                        <td className="p-4 w-10">
                          <input
                            type="checkbox"
                            checked={selectedCustomerPhones.includes(c.phone)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomerPhones(prev => [...prev, c.phone]);
                              } else {
                                setSelectedCustomerPhones(prev => prev.filter(ph => ph !== c.phone));
                              }
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-[#111111] text-[#F5B041] focus:ring-0 cursor-pointer"
                          />
                        </td>
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

        {/* TAB 4: MENU ITEMS & CATEGORY AVAILABILITY */}
        {activeTab === "menu" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
            
            {/* Category Toggles Panel (left, 5 cols) */}
            <div className="lg:col-span-5 bg-white/2 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
              <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                <span className="material-symbols-outlined text-[#F5B041] text-xl">category</span>
                <h3 className="text-xs font-black tracking-widest uppercase">Category Availability</h3>
              </div>
              
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-none">
                {categories.map((cat) => {
                  const isHidden = unavailableCategories.includes(cat.id);
                  return (
                    <div 
                      key={cat.id} 
                      className={`flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl px-4 py-3.5 transition-all ${
                        isHidden ? "opacity-60 border-red-500/10" : ""
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-white/90">{cat.name}</span>
                        <span className={`text-[8px] font-black uppercase mt-1 tracking-wider ${
                          isHidden ? "text-red-400" : "text-[#006B2B]"
                        }`}>
                          {isHidden ? "Hidden from Menu" : "Visible"}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleToggleCategoryAvailability(cat.id)}
                        className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none cursor-pointer ${
                          !isHidden ? "bg-[#006B2B]" : "bg-white/10"
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${
                            !isHidden ? "translate-x-5" : "translate-x-0"
                          }`}
                        ></div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Item Toggles Panel (right, 7 cols) */}
            <div className="lg:col-span-7 bg-white/2 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#F5B041] text-xl">restaurant_menu</span>
                  <h3 className="text-xs font-black tracking-widest uppercase">Menu Items Toggle</h3>
                </div>
                
                {/* Item Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search menu item..."
                    onChange={(e) => setAdminItemSearch(e.target.value)}
                    value={adminItemSearch}
                    className="bg-white/5 border border-white/5 focus:border-[#F5B041] focus:outline-none rounded-xl pl-8 pr-4 py-1.5 text-xs text-white placeholder-white/30 w-full sm:w-48"
                  />
                  <span className="material-symbols-outlined absolute left-2.5 top-1.5 text-white/30 text-base">search</span>
                </div>
              </div>

              {/* Category Filter for items list (only if not searching) */}
              {!adminItemSearch && (
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none -mx-4 px-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setAdminActiveCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase transition-all duration-200 border whitespace-nowrap ${
                        adminActiveCategory === cat.id
                          ? "bg-[#F5B041] border-[#F5B041] text-black shadow-md"
                          : "bg-transparent border-white/10 text-white/60 hover:bg-white/5"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Items List */}
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-none">
                {(() => {
                  let itemsToRender = [];
                  if (adminItemSearch) {
                    const searchLower = adminItemSearch.toLowerCase();
                    Object.keys(menuData).forEach((catId) => {
                      menuData[catId].forEach((item) => {
                        if (item.name.toLowerCase().includes(searchLower)) {
                          itemsToRender.push({ ...item, categoryId: catId });
                        }
                      });
                    });
                  } else {
                    itemsToRender = (menuData[adminActiveCategory] || []).map(item => ({
                      ...item,
                      categoryId: adminActiveCategory
                    }));
                  }

                  if (itemsToRender.length === 0) {
                    return (
                      <div className="p-8 text-center text-white/30 font-medium text-xs">
                        No items matched your criteria.
                      </div>
                    );
                  }

                  return itemsToRender.map((item, idx) => {
                    const isSoldOut = unavailableItems.includes(item.name);
                    const isCatHidden = unavailableCategories.includes(item.categoryId);
                    return (
                      <div
                        key={`${item.name}-${idx}`}
                        className={`flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl px-4 py-3 transition-all ${
                          isSoldOut ? "opacity-60 border-red-500/10" : ""
                        }`}
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white/90">{item.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] font-black text-[#F5B041] tracking-wider uppercase">
                              {item.price}
                            </span>
                            <span className="text-white/20 text-[8px]">•</span>
                            <span className="text-[8px] font-medium text-white/40 uppercase tracking-widest">
                              {categories.find(c => c.id === item.categoryId)?.name}
                            </span>
                            {isCatHidden && (
                              <>
                                <span className="text-white/20 text-[8px]">•</span>
                                <span className="text-[8px] font-black text-red-400 uppercase tracking-wider">
                                  Category Hidden
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleItemAvailability(item.name)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all cursor-pointer ${
                            isSoldOut
                              ? "bg-red-500 hover:bg-red-600 text-white"
                              : "bg-[#006B2B]/10 hover:bg-[#006B2B]/20 text-[#006B2B] border border-[#006B2B]/20"
                          }`}
                        >
                          {isSoldOut ? "Mark Available" : "Mark Sold Out"}
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* iOS-Style Custom Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-[#161616] border border-white/10 rounded-3xl w-full max-w-sm p-6 md:p-8 shadow-2xl flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-xs font-black tracking-widest text-[#F5B041] uppercase">SELECT DATE RANGE</h3>
              <button 
                onClick={() => setShowDatePicker(false)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleCustomDateSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-white/40 tracking-widest uppercase">Start Date</label>
                <input
                  type="date"
                  required
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#F5B041] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-white/40 tracking-widest uppercase">End Date</label>
                <input
                  type="date"
                  required
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#F5B041] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#F5B041] hover:bg-[#D49228] text-black text-[10px] font-black tracking-widest uppercase rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  Apply Date Range
                </button>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  className="w-full py-2 bg-transparent text-white/40 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sleek Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-[#161616] border border-white/10 rounded-3xl max-w-sm w-full p-6 flex flex-col gap-5 shadow-2xl relative animate-scaleUp">
            
            <div className="flex items-center gap-3">
              <div className="bg-red-500/10 text-red-500 rounded-full p-2.5 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">delete_forever</span>
              </div>
              <div className="flex flex-col text-left">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Confirm Deletion</h4>
                <p className="text-[10px] text-white/50 mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-white/80 text-left leading-relaxed">
              Are you sure you want to permanently delete this order from the database?
            </p>

            {/* Don't ask again checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer py-1 select-none">
              <input
                type="checkbox"
                checked={dontAskDeleteAgain}
                onChange={(e) => setDontAskDeleteAgain(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#F5B041] focus:ring-0 cursor-pointer"
              />
              <span className="text-[10px] font-bold text-white/60 tracking-wide uppercase hover:text-white transition-colors">
                Don't ask me again
              </span>
            </label>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setOrderToDelete(null);
                }}
                className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white rounded-xl py-2.5 text-xs font-black tracking-wider uppercase transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={() => executeOrderDeletion(orderToDelete)}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-xl py-2.5 text-xs font-black tracking-wider uppercase transition-all cursor-pointer text-center"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
