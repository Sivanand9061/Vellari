"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase";

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview"); // overview, settings, cms
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  
  // Settings States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [deliveryRadius, setDeliveryRadius] = useState("5000"); // in meters
  
  // CMS States
  const [cmsConfig, setCmsConfig] = useState({
    parentBrandText: "KL 10 RESTAURANT",
    heroHeadingLine1: "Authentic Kerala",
    heroHeadingLine2: "Street Eats",
    englishLogoUrl: "/logo_english.png",
    malayalamLogoUrl: "/logo_malayalam.png",
    heroSlides: [
      { img: "/img/biryani.png", alt: "Chicken Dum Biryani" },
      { img: "/img/poratta.png", alt: "London Poratta Special" },
      { img: "/img/noodles.png", alt: "Prawns Noodles" },
    ],
  });
  
  const [cmsSpecials, setCmsSpecials] = useState([]);
  const [cmsVideos, setCmsVideos] = useState([]);
  
  // UX States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLog, setActionLog] = useState("");
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });

      const { data: completedOrders } = await supabase
        .from("orders")
        .select("total")
        .eq("status", "completed");

      const revenue = (completedOrders || []).reduce((acc, curr) => acc + Number(curr.total), 0);

      const { count: customersCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

      const avg = ordersCount && revenue ? (revenue / (completedOrders?.length || 1)) : 0;

      setStats({
        totalOrders: ordersCount || 0,
        totalRevenue: revenue,
        totalCustomers: customersCount || 0,
        avgOrderValue: avg,
      });

      // 2. Fetch Recent Orders
      const { data: recent } = await supabase
        .from("orders")
        .select("id, total, status, created_at, customer_phone")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecentOrders(recent || []);

      // 3. Fetch Settings
      const { data: maintData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "maintenanceMode")
        .single();
      if (maintData) {
        setMaintenanceMode(maintData.value === true || maintData.value === "true");
      }

      const { data: radiusData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "deliveryRadius")
        .single();
      if (radiusData) {
        setDeliveryRadius(String(radiusData.value));
      }

      // 4. Fetch CMS Config
      const { data: configData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "landingPageConfig")
        .single();
      if (configData && configData.value) {
        setCmsConfig(prev => ({ ...prev, ...configData.value }));
      }

      // 5. Fetch Specials
      const { data: specialsData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "landingPageSpecials")
        .single();
      if (specialsData && Array.isArray(specialsData.value)) {
        setCmsSpecials(specialsData.value);
      } else {
        // Use default specials as starting point if DB is clean
        setCmsSpecials([
          { name: "Chicken Stew", price: "17.00", tag: "Kerala Special", image: "/img/chicken_stew.png" },
          { name: "Chicken Pothichoru", price: "14.00", tag: "Banana Leaf Feast", image: "/img/chicken_pothichoru.png" },
          { name: "Chicken Fry Dum Biriyani", price: "19.00", tag: "Karama Best", image: "/img/biryani.png" },
        ]);
      }

      // 6. Fetch Videos
      const { data: videosData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "landingPageVideos")
        .single();
      if (videosData && Array.isArray(videosData.value)) {
        setCmsVideos(videosData.value);
      } else {
        setCmsVideos([
          { title: "Flaky Malabar Parotta", thumbnail: "/img/making_parotta.png", embedUrl: "https://www.youtube.com/embed/v24g7c3s_Xk" },
          { title: "Meter Chai Stretching", thumbnail: "/img/making_chai.png", embedUrl: "https://www.youtube.com/embed/5U9N1wF35bU" },
        ]);
      }

    } catch (err) {
      console.error("Error loading superadmin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  // Save Settings Handlers
  const handleToggleMaintenance = async (checked) => {
    setMaintenanceMode(checked);
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "maintenanceMode", value: checked });
    if (error) {
      console.error("Failed to save maintenanceMode setting", error);
      alert("Failed to toggle maintenance mode");
    } else {
      logAction(`Maintenance mode toggled to: ${checked}`);
    }
  };

  const handleSaveRadius = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "deliveryRadius", value: Number(deliveryRadius) });
    setSaving(false);
    if (error) {
      alert("Failed to save delivery radius");
    } else {
      logAction(`Delivery radius updated to ${deliveryRadius} meters`);
      alert("Radius saved successfully!");
    }
  };

  // CMS Editor Helpers
  const handleSaveCmsConfig = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "landingPageConfig", value: cmsConfig });
    setSaving(false);
    if (error) {
      alert("Failed to save landing page config");
    } else {
      logAction("Saved general branding & Hero CMS configurations.");
      alert("CMS configuration saved successfully!");
    }
  };

  const handleSaveSpecials = async (updatedSpecials) => {
    const list = updatedSpecials || cmsSpecials;
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "landingPageSpecials", value: list });
    setSaving(false);
    if (error) {
      alert("Failed to save Specials content");
    } else {
      logAction("Saved updated Chef's Specials menu CMS list.");
    }
  };

  const handleSaveVideos = async (updatedVideos) => {
    const list = updatedVideos || cmsVideos;
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "landingPageVideos", value: list });
    setSaving(false);
    if (error) {
      alert("Failed to save Cooking Videos content");
    } else {
      logAction("Saved updated 'The Making' videos CMS list.");
    }
  };

  const logAction = (msg) => {
    const time = new Date().toLocaleTimeString();
    setActionLog(prev => `[${time}] ${msg}\n${prev}`);
  };

  // Purge/Clean Mock data
  const triggerPurge = async () => {
    if (purgeConfirmText !== "PURGE") {
      alert("Please type PURGE to confirm.");
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch("/api/admin/clean?pin=5656", { method: "GET" });
      const data = await res.json();
      if (data.success) {
        logAction(`SUCCESS: Cleared load-test data. Records deleted: ${JSON.stringify(data.deleted)}`);
        alert("Load-test database records successfully cleared!");
        fetchDashboardData();
      } else {
        logAction(`FAILED: Purge operation returned error: ${data.error}`);
        alert(`Purge failed: ${data.error}`);
      }
    } catch (err) {
      logAction(`ERROR: Purge call crashed: ${err.message}`);
      alert(`Purge crashed: ${err.message}`);
    } finally {
      setSaving(false);
      setShowPurgeModal(false);
      setPurgeConfirmText("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-[#156734] animate-spin">sync</span>
          <span className="text-sm font-semibold tracking-wider">LOADING SUPERADMIN DATA...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#156734] flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-2xl font-bold">shield_person</span>
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-base font-black tracking-wider uppercase text-white leading-none">Vellari SuperAdmin</h1>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Control Hub & CMS</span>
          </div>
        </div>

        <Link
          href="/"
          className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold transition-all"
        >
          View Website
        </Link>
      </header>

      {/* Navigation tabs */}
      <div className="flex bg-[#161616] px-6 border-b border-[#2a2a2a]">
        {[
          { id: "overview", label: "Overview & Diagnostics", icon: "dashboard" },
          { id: "settings", label: "System Config", icon: "settings" },
          { id: "cms", label: "Homepage CMS", icon: "edit_document" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4.5 border-b-2 text-xs font-black tracking-wider uppercase transition-all focus:outline-none cursor-pointer ${
              activeTab === tab.id
                ? "border-[#156734] text-white bg-white/2"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 p-6 max-w-6xl w-full mx-auto flex flex-col gap-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {[
                { title: "Total Orders", value: stats.totalOrders, icon: "receipt_long", color: "text-[#156734]" },
                { title: "Completed Revenue", value: `AED ${stats.totalRevenue.toFixed(2)}`, icon: "payments", color: "text-emerald-400" },
                { title: "Verified Customers", value: stats.totalCustomers, icon: "people", color: "text-cyan-400" },
                { title: "Average Order Value", value: `AED ${stats.avgOrderValue.toFixed(2)}`, icon: "calculate", color: "text-amber-400" },
              ].map((card, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] p-5 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{card.title}</span>
                    <span className="text-xl font-black mt-2 text-white">{card.value}</span>
                  </div>
                  <span className={`material-symbols-outlined text-3xl ${card.color}`}>{card.icon}</span>
                </div>
              ))}
            </div>

            {/* Quick Actions & Recent Logs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Database diagnostics controls */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl flex flex-col gap-4 text-left">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Database Diagnostics</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  Perform maintenance cleanup actions to optimize the PostgreSQL database or clean mock entries.
                </p>
                <div className="w-full h-px bg-[#2a2a2a] my-1"></div>
                <button
                  onClick={() => setShowPurgeModal(true)}
                  className="w-full py-3.5 bg-red-600/95 hover:bg-red-700 text-white text-xs font-bold tracking-widest uppercase rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                  PURGE LOAD TEST DATA
                </button>
              </div>

              {/* Recent Orders Log Stream */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl flex flex-col gap-4 md:col-span-2 text-left">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Recent System Activity</h3>
                <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto scrollbar-none">
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-500 font-medium">No recent orders logged.</div>
                  ) : (
                    recentOrders.map((ord) => (
                      <div key={ord.id} className="flex items-center justify-between p-3 bg-[#222] border border-[#2a2a2a] rounded-xl text-xs">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-gray-300">Order: {ord.id.slice(0, 8)}...</span>
                          <span className="text-[10px] text-gray-500">Phone: {ord.customer_phone}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-gray-300">AED {Number(ord.total).toFixed(2)}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            ord.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            ord.status === "cancelled" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Action Log stream */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl text-left flex flex-col gap-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Live Execution Terminal</h3>
              <textarea
                readOnly
                value={actionLog || "Terminal is listening. Run actions to see live output log stream..."}
                className="w-full h-32 bg-black border border-[#2a2a2a] rounded-xl p-3.5 text-xs font-mono text-[#156734] focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* SYSTEM CONFIG TAB */}
        {activeTab === "settings" && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-8 rounded-3xl flex flex-col gap-6 text-left animate-fade-in">
            <h2 className="text-base font-black uppercase tracking-wider text-white border-b border-[#2a2a2a] pb-4">Global Restaurant Configuration</h2>

            {/* Maintenance Mode Switch */}
            <div className="flex items-center justify-between p-4 bg-[#222] border border-[#2a2a2a] rounded-2xl">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase tracking-wider text-white">Global Maintenance Mode</span>
                <span className="text-[10px] text-gray-400 leading-normal font-medium max-w-md">
                  Enabling maintenance mode blocks checkouts and displays a custom upgrade splash screen to all regular visitors.
                </span>
              </div>
              <button
                onClick={() => handleToggleMaintenance(!maintenanceMode)}
                className={`w-14 h-8 rounded-full transition-all duration-300 relative focus:outline-none cursor-pointer border ${
                  maintenanceMode ? "bg-[#156734] border-[#156734]" : "bg-zinc-700 border-zinc-700"
                }`}
              >
                <span className={`absolute top-0.5 w-6.5 h-6.5 bg-white rounded-full transition-all duration-300 shadow-sm ${
                  maintenanceMode ? "left-6.5" : "left-0.5"
                }`} />
              </button>
            </div>

            {/* Delivery Limit Slider */}
            <div className="flex flex-col gap-4 p-5 bg-[#222] border border-[#2a2a2a] rounded-2xl">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase tracking-wider text-white">Delivery Radius Boundary Limit</span>
                <span className="text-[10px] text-gray-400 leading-normal font-medium">
                  Configure the maximum validation distance in meters for orders. Customers residing beyond this range cannot place delivery orders.
                </span>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(e.target.value)}
                  className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#156734]"
                />
                <span className="w-24 text-right text-xs font-black text-white shrink-0 bg-black/40 border border-[#2a2a2a] py-2 px-3 rounded-lg">
                  {Number(deliveryRadius) < 1000 ? `${deliveryRadius} m` : `${(Number(deliveryRadius)/1000).toFixed(1)} km`}
                </span>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveRadius}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#156734] hover:bg-[#0f4d27] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow active:scale-97 disabled:opacity-50 cursor-pointer"
                >
                  Save Radius
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HOMEPAGE CMS TAB */}
        {activeTab === "cms" && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            
            {/* General Branding Config */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl flex flex-col gap-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white border-b border-[#2a2a2a] pb-3">Branding & Hero Titles</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Parent Brand Header</label>
                  <input
                    type="text"
                    value={cmsConfig.parentBrandText}
                    onChange={(e) => setCmsConfig({ ...cmsConfig, parentBrandText: e.target.value })}
                    className="bg-[#222] border border-[#2a2a2a] text-xs p-3 rounded-xl focus:outline-none focus:border-[#156734] font-medium"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Malayalam Logo URL</label>
                  <input
                    type="text"
                    value={cmsConfig.malayalamLogoUrl}
                    onChange={(e) => setCmsConfig({ ...cmsConfig, malayalamLogoUrl: e.target.value })}
                    className="bg-[#222] border border-[#2a2a2a] text-xs p-3 rounded-xl focus:outline-none focus:border-[#156734] font-medium"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hero Heading Line 1</label>
                  <input
                    type="text"
                    value={cmsConfig.heroHeadingLine1}
                    onChange={(e) => setCmsConfig({ ...cmsConfig, heroHeadingLine1: e.target.value })}
                    className="bg-[#222] border border-[#2a2a2a] text-xs p-3 rounded-xl focus:outline-none focus:border-[#156734] font-medium"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hero Heading Line 2</label>
                  <input
                    type="text"
                    value={cmsConfig.heroHeadingLine2}
                    onChange={(e) => setCmsConfig({ ...cmsConfig, heroHeadingLine2: e.target.value })}
                    className="bg-[#222] border border-[#2a2a2a] text-xs p-3 rounded-xl focus:outline-none focus:border-[#156734] font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveCmsConfig}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#156734] hover:bg-[#0f4d27] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow active:scale-97 disabled:opacity-50 cursor-pointer"
                >
                  Save Branding Config
                </button>
              </div>
            </div>

            {/* Chef's Specials CMS list editor */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl flex flex-col gap-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white border-b border-[#2a2a2a] pb-3">Chef's Specials list</h3>
              
              <div className="flex flex-col gap-3">
                {cmsSpecials.map((dish, i) => (
                  <div key={i} className="flex flex-col md:flex-row items-center gap-3 p-3 bg-[#222] rounded-xl border border-[#2a2a2a]">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase">Item Name</span>
                        <input
                          type="text"
                          value={dish.name}
                          onChange={(e) => {
                            const temp = [...cmsSpecials];
                            temp[i].name = e.target.value;
                            setCmsSpecials(temp);
                          }}
                          className="bg-black/40 border border-[#2a2a2a] p-2 text-xs rounded-lg font-medium text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase">Price (AED)</span>
                        <input
                          type="text"
                          value={dish.price}
                          onChange={(e) => {
                            const temp = [...cmsSpecials];
                            temp[i].price = e.target.value;
                            setCmsSpecials(temp);
                          }}
                          className="bg-black/40 border border-[#2a2a2a] p-2 text-xs rounded-lg font-medium text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase">Tag Label</span>
                        <input
                          type="text"
                          value={dish.tag}
                          onChange={(e) => {
                            const temp = [...cmsSpecials];
                            temp[i].tag = e.target.value;
                            setCmsSpecials(temp);
                          }}
                          className="bg-black/40 border border-[#2a2a2a] p-2 text-xs rounded-lg font-medium text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase">Image Asset Path</span>
                        <input
                          type="text"
                          value={dish.image}
                          onChange={(e) => {
                            const temp = [...cmsSpecials];
                            temp[i].image = e.target.value;
                            setCmsSpecials(temp);
                          }}
                          className="bg-black/40 border border-[#2a2a2a] p-2 text-xs rounded-lg font-medium text-white"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const temp = cmsSpecials.filter((_, idx) => idx !== i);
                        setCmsSpecials(temp);
                        handleSaveSpecials(temp);
                      }}
                      className="p-2 border border-red-500/20 bg-red-500/10 hover:bg-red-700 hover:text-white hover:border-red-700 rounded-lg text-red-400 transition-all shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-3">
                <button
                  onClick={() => {
                    const temp = [...cmsSpecials, { name: "New Special Item", price: "10.00", tag: "Special Pick", image: "/img/biryani.png" }];
                    setCmsSpecials(temp);
                  }}
                  className="px-4 py-2 border border-[#156734] hover:bg-[#156734]/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Add New Special
                </button>
                
                <button
                  onClick={() => handleSaveSpecials()}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#156734] hover:bg-[#0f4d27] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow active:scale-97 disabled:opacity-50 cursor-pointer"
                >
                  Save Specials List
                </button>
              </div>
            </div>

            {/* Video Section CMS list editor */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl flex flex-col gap-4 mb-12">
              <h3 className="text-sm font-black uppercase tracking-wider text-white border-b border-[#2a2a2a] pb-3">The Making Cooking Videos</h3>
              
              <div className="flex flex-col gap-3">
                {cmsVideos.map((vid, i) => (
                  <div key={i} className="flex flex-col md:flex-row items-center gap-3 p-3 bg-[#222] rounded-xl border border-[#2a2a2a]">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2.5 w-full">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase">Video Title</span>
                        <input
                          type="text"
                          value={vid.title}
                          onChange={(e) => {
                            const temp = [...cmsVideos];
                            temp[i].title = e.target.value;
                            setCmsVideos(temp);
                          }}
                          className="bg-black/40 border border-[#2a2a2a] p-2 text-xs rounded-lg font-medium text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase">Thumbnail URL</span>
                        <input
                          type="text"
                          value={vid.thumbnail}
                          onChange={(e) => {
                            const temp = [...cmsVideos];
                            temp[i].thumbnail = e.target.value;
                            setCmsVideos(temp);
                          }}
                          className="bg-black/40 border border-[#2a2a2a] p-2 text-xs rounded-lg font-medium text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase">YouTube Embed link</span>
                        <input
                          type="text"
                          value={vid.embedUrl}
                          onChange={(e) => {
                            const temp = [...cmsVideos];
                            temp[i].embedUrl = e.target.value;
                            setCmsVideos(temp);
                          }}
                          className="bg-black/40 border border-[#2a2a2a] p-2 text-xs rounded-lg font-medium text-white"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const temp = cmsVideos.filter((_, idx) => idx !== i);
                        setCmsVideos(temp);
                        handleSaveVideos(temp);
                      }}
                      className="p-2 border border-red-500/20 bg-red-500/10 hover:bg-red-700 hover:text-white hover:border-red-700 rounded-lg text-red-400 transition-all shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-3">
                <button
                  onClick={() => {
                    const temp = [...cmsVideos, { title: "New Cooking Video", thumbnail: "/img/making_chai.png", embedUrl: "https://www.youtube.com/embed/5U9N1wF35bU" }];
                    setCmsVideos(temp);
                  }}
                  className="px-4 py-2 border border-[#156734] hover:bg-[#156734]/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Add New Video
                </button>
                
                <button
                  onClick={() => handleSaveVideos()}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#156734] hover:bg-[#0f4d27] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow active:scale-97 disabled:opacity-50 cursor-pointer"
                >
                  Save Videos List
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMATION PURGE DIALOG */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-3xl shadow-2xl flex flex-col gap-4 text-left">
            <h3 className="text-base font-black text-red-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined">warning</span>
              DATABASE PURGE WARNING
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              This action will permanently delete all mock orders, load-test address logs, and verification runs from the system.
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                Type <span className="text-red-500 font-black">PURGE</span> to execute:
              </label>
              <input
                type="text"
                placeholder="Type here..."
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                className="w-full bg-black border border-[#2a2a2a] p-3 text-xs rounded-xl focus:outline-none focus:border-red-600 font-mono tracking-widest text-center"
              />
            </div>
            
            <div className="flex justify-end gap-3.5 mt-2">
              <button
                onClick={() => {
                  setShowPurgeModal(false);
                  setPurgeConfirmText("");
                }}
                className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={triggerPurge}
                disabled={purgeConfirmText !== "PURGE" || saving}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-97 cursor-pointer"
              >
                Execute Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
