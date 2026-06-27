"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("combos-specials");
  const [cart, setCart] = useState({});
  const [orderType, setOrderType] = useState("delivery");
  const [address, setAddress] = useState("");
  const [addressDetails, setAddressDetails] = useState("");
  const [addressError, setAddressError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

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


  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("vellari_cart");
      const savedOrderType = localStorage.getItem("vellari_order_type");
      const savedAddress = localStorage.getItem("vellari_address");
      const savedAddressDetails = localStorage.getItem("vellari_address_details");

      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedOrderType) setOrderType(savedOrderType);
      if (savedAddress) setAddress(savedAddress);
      if (savedAddressDetails) setAddressDetails(savedAddressDetails);
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
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [cart, orderType, address, addressDetails, isLoaded]);

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

  const getWhatsAppLink = () => {
    let message = "Hi Vellari! I would like to place an order:\n\n";
    
    Object.values(cart).forEach((item) => {
      message += `* ${item.quantity}x ${item.name} (${item.price} each)\n`;
    });
    
    message += `\nTotal Estimated Bill: AED ${getCartSubtotal().toFixed(2)}${hasVariablePrices() ? "*" : ""}\n`;
    
    const typeLabel = orderType === "delivery" ? "Delivery 🚗" : orderType === "takeaway" ? "Takeaway 🛍️" : "Dine-In 🍽️";
    message += `Order Type: ${typeLabel}\n`;
    
    if (orderType === "delivery") {
      message += `Address: ${addressDetails}\n`;
      if (address) {
        message += `Location Pin: ${address}\n`;
      }
    }
    
    message += "\nPlease confirm my order and let me know the preparation time. Thank you!";
    
    return `https://api.whatsapp.com/send?phone=971568867131&text=${encodeURIComponent(message)}`;
  };


  const categories = [
    { id: "combos-specials", name: "Combos & Specials" },
    { id: "breakfast-breads", name: "Breakfast & Breads" },
    { id: "chicken-beef-charcole", name: "Chicken, Beef & Charcoal" },
    { id: "curries-indian", name: "Curries & Indian" },
    { id: "chinese-burgers", name: "Chinese & Burgers" },
    { id: "drinks-soups", name: "Drinks & Soups" },
  ];

  const menuData = {
    "combos-specials": [
      // COMBO
      { name: "Chi. Noodles + Chi. Manchurian / Chi. Chilli", price: "AED 15.00", section: "Combo" },
      { name: "Fried Rice + Chicken Chilli", price: "AED 20.50", section: "Combo" },
      { name: "Fried Rice + Chicken Manchurian", price: "AED 17.50", section: "Combo" },
      { name: "Chi. Kurma + Poratta", price: "AED 11.00", section: "Combo" },
      { name: "Chicken Curry + Chappathi / Poratta", price: "AED 8.00", section: "Combo" },
      { name: "Chicken Fry + Chappathi / Poratta / Dosa", price: "AED 10.00", section: "Combo" },
      { name: "Chicken Roast + Chappathi / Poratta / Dosa", price: "AED 10.00", section: "Combo" },
      { name: "Combo Ghee Rice + Chicken Fry", price: "AED 12.00", section: "Combo" },
      { name: "Egg Roast + Paratha", price: "AED 6.00", section: "Combo" },
      { name: "Ghee Rice + Chicken / Beef / Fish Curry", price: "AED 10 / 12 / 12", section: "Combo" },
      { name: "Puttum Beefum", price: "AED 16.00", section: "Combo" },
      { name: "Veg Kurma + Chappathi / Dosa / Poratta", price: "AED 6.00", section: "Combo" },
      // SPECIAL
      { name: "Erachi Chor Beef", price: "AED 12.00", section: "Special" },
      { name: "Erachi Chor Chicken", price: "AED 10.00", section: "Special" },
      { name: "Ayala Mulakittathu", price: "AED 8.00", section: "Special" },
      { name: "Chicken Chukka", price: "AED 10.00", section: "Special" },
      { name: "Chicken Kondattam", price: "AED 16.00", section: "Special" },
      { name: "Chicken Mandi", price: "AED 12.00", section: "Special" },
      { name: "Chicken Stew", price: "AED 10.00", section: "Special" },
      { name: "Fish Mulakittathu", price: "AED 8.00", section: "Special" },
      { name: "Fish Pollichathu", price: "AED 15.00", section: "Special" },
      { name: "Fish Tawa Fry", price: "AED 15.00", section: "Special" },
      { name: "Kanji Set", price: "AED 8.00", section: "Special" },
      { name: "Kappa", price: "AED 5.00", section: "Special" },
      { name: "Kappa Biriyani", price: "AED 12.00", section: "Special" },
      { name: "Kapparotti Chicken", price: "AED 15.00", section: "Special" },
      { name: "Kizhi Poratta Beef", price: "AED 15.00", section: "Special" },
      { name: "Kizhi Poratta Chicken", price: "AED 12.00", section: "Special" },
      { name: "Kothu Paratha Beef", price: "AED 12.00", section: "Special" },
      { name: "Kothu Poratta", price: "AED 10.00", section: "Special" },
      { name: "Majboos", price: "AED 10.00", section: "Special" },
      { name: "Kappayum + Beefum", price: "AED 12.00", section: "Special" },
    ],
    "breakfast-breads": [
      // BREAKFAST
      { name: "Appam", price: "AED 1.25", section: "Breakfast" },
      { name: "Appam Egg Curry", price: "AED 5.00", section: "Breakfast" },
      { name: "Appam Egg Roast", price: "AED 6.00", section: "Breakfast" },
      { name: "Baji", price: "AED 3.00", section: "Breakfast" },
      { name: "Dosa", price: "AED 1.00", section: "Breakfast" },
      { name: "Dosa Set (2 Pcs)", price: "AED 3.00", section: "Breakfast" },
      { name: "Egg Curry", price: "AED 3.00", section: "Breakfast" },
      { name: "Egg Dosa", price: "AED 6.00", section: "Breakfast" },
      { name: "Egg Roast Breakfast", price: "AED 3.00", section: "Breakfast" },
      { name: "Ghee Dosa", price: "AED 5.00", section: "Breakfast" },
      { name: "Green Pease Curry", price: "AED 3.00", section: "Breakfast" },
      { name: "Idiyappam", price: "AED 1.00", section: "Breakfast" },
      { name: "Idly Set (2 Pcs)", price: "AED 3.00", section: "Breakfast" },
      { name: "Kadala Curry", price: "AED 3.00", section: "Breakfast" },
      { name: "Masala Dosa", price: "AED 5.00", section: "Breakfast" },
      { name: "Nadan Chicken Curry", price: "AED 5.00", section: "Breakfast" },
      { name: "Onion Uthappam", price: "AED 6.00", section: "Breakfast" },
      { name: "Plain Dosa", price: "AED 4.00", section: "Breakfast" },
      { name: "Poratta Chicken Curry", price: "AED 7.00", section: "Breakfast" },
      { name: "Poratta Egg Roast", price: "AED 5.00", section: "Breakfast" },
      { name: "Puri", price: "AED 1.00", section: "Breakfast" },
      { name: "Puri Bhaji", price: "AED 4.00", section: "Breakfast" },
      { name: "Puttu", price: "AED 3.00", section: "Breakfast" },
      { name: "Puttu Green Pease Curry", price: "AED 5.00", section: "Breakfast" },
      { name: "Puttu Kadala Curry", price: "AED 5.00", section: "Breakfast" },
      { name: "Puttum Cherupayarum", price: "AED 5.00", section: "Breakfast" },
      { name: "Upmav", price: "AED 3.00", section: "Breakfast" },
      { name: "Vada Set (2 Pcs)", price: "AED 4.00", section: "Breakfast" },
      { name: "Veg Kurma Breakfast", price: "AED 3.00", section: "Breakfast" },
      { name: "Vellappam", price: "AED 1.50", section: "Breakfast" },
      { name: "Idly Single", price: "AED 1.00", section: "Breakfast" },
      { name: "Dosa Single", price: "AED 1.00", section: "Breakfast" },
      // BREAD ITEMS
      { name: "Butter Chappathi", price: "AED 1.50", section: "Breads" },
      { name: "Chappathi", price: "AED 1.00", section: "Breads" },
      { name: "Poratta", price: "AED 1.00", section: "Breads" },
    ],
    "chicken-beef-charcole": [
      // BEEF ITEMS
      { name: "Beef Curry", price: "AED 8.00", section: "Beef" },
      { name: "Beef Fry", price: "AED 12.00", section: "Beef" },
      { name: "Beef Fry Large", price: "AED 15.00", section: "Beef" },
      { name: "Beef Roast", price: "AED 12.00", section: "Beef" },
      // CHICKEN
      { name: "Butter Chicken", price: "AED 16.00", section: "Chicken" },
      { name: "Chicken Curry", price: "AED 10.00", section: "Chicken" },
      { name: "Chicken Fry", price: "AED 10.00", section: "Chicken" },
      { name: "Chicken Roast", price: "AED 10.00", section: "Chicken" },
      { name: "Chicken Roast Full", price: "AED 15.00", section: "Chicken" },
      { name: "Nadan Chicken Curry", price: "AED 5.00", section: "Chicken" },
      // CHARCOAL
      { name: "Charcoal Chicken Normal", price: "AED 32 / 18", section: "Charcoal" },
      { name: "Charcoal Chicken Peri Peri", price: "AED 34 / 20", section: "Charcoal" },
      { name: "Charcoal Chicken Green Chilli", price: "AED 34 / 20", section: "Charcoal" },
      { name: "Charcoal Pepper Chicken", price: "AED 36 / 20", section: "Charcoal" },
      { name: "Charcoal Mix Chicken", price: "AED 36 / 20", section: "Charcoal" },
    ],
    "curries-indian": [
      // CURRY
      { name: "Aloo Bhaji", price: "AED 3.00", section: "Curry" },
      { name: "Beef Nadan Curry", price: "AED 15.00", section: "Curry" },
      { name: "Cherupayar", price: "AED 3.00", section: "Curry" },
      { name: "Dal Curry", price: "AED 8.00", section: "Curry" },
      { name: "Egg Curry Night", price: "AED 5.00", section: "Curry" },
      { name: "Egg Masala", price: "AED 3.00", section: "Curry" },
      { name: "Egg Roast Night", price: "AED 6.00", section: "Curry" },
      { name: "Mix Veg Large", price: "AED 10.00", section: "Curry" },
      { name: "Mix Veg Small", price: "AED 5.00", section: "Curry" },
      { name: "Veg Kurma", price: "AED 6.00", section: "Curry" },
      // NORTH INDIAN
      { name: "Aloo Gobi", price: "AED 10.00", section: "North Indian" },
      { name: "Aloo Palak", price: "AED 6.00", section: "North Indian" },
      { name: "Bindi Masala", price: "AED 8.00", section: "North Indian" },
      { name: "Chena Masala", price: "AED 8.00", section: "North Indian" },
      { name: "Chi. Hyderabadi Curry", price: "AED 14.00", section: "North Indian" },
      { name: "Chicken Kabab", price: "AED 8.00", section: "North Indian" },
      { name: "Chicken Kadai", price: "AED 16.00", section: "North Indian" },
      { name: "Chicken Lababder", price: "AED 16.00", section: "North Indian" },
      { name: "Chicken Masala", price: "AED 12.00", section: "North Indian" },
      { name: "Curd Rice", price: "AED 8.00", section: "North Indian" },
      { name: "Dal Fry", price: "AED 10.00", section: "North Indian" },
      { name: "Dal Kichadi", price: "AED 10.00", section: "North Indian" },
      { name: "Dal Tadka", price: "AED 11.00", section: "North Indian" },
      { name: "Green Pease Masala", price: "AED 10.00", section: "North Indian" },
      // NORTH INDIAN RICE & VEG
      { name: "Jeera Rice", price: "AED 8.00", section: "Veg & Rice" },
      { name: "Lemon Rice", price: "AED 8.00", section: "Veg & Rice" },
      { name: "Mushroom Masala", price: "AED 11.00", section: "Veg & Rice" },
      { name: "Mutter Mushroom", price: "AED 11.00", section: "Veg & Rice" },
      { name: "Mutter Paneer Masala", price: "AED 12.00", section: "Veg & Rice" },
      { name: "Palak Chicken", price: "AED 16.00", section: "Veg & Rice" },
      { name: "Palak Paneer", price: "AED 12.00", section: "Veg & Rice" },
      { name: "Paneer Butter Masala", price: "AED 12.00", section: "Veg & Rice" },
      { name: "Paneer Kadai", price: "AED 12.00", section: "Veg & Rice" },
      { name: "Veg Kadai", price: "AED 12.00", section: "Veg & Rice" },
      { name: "Veg Pulav", price: "AED 10.00", section: "Veg & Rice" },
      { name: "Tomato Rice", price: "AED 8.00", section: "Veg & Rice" },
      { name: "Paneer Lababdar", price: "AED 12.00", section: "Veg & Rice" },
    ],
    "chinese-burgers": [
      // CHINESE
      { name: "Chicken Lollipop", price: "AED 10.00", section: "Chinese" },
      { name: "Chicken 65", price: "AED 12.00", section: "Chinese" },
      { name: "Chicken Fried Rice", price: "AED 12.00", section: "Chinese" },
      { name: "Chicken Manchurian", price: "AED 14.00", section: "Chinese" },
      { name: "Chicken Noodles", price: "AED 12.00", section: "Chinese" },
      { name: "Chicken Schezwan Noodles", price: "AED 13.00", section: "Chinese" },
      { name: "Chilli Chicken", price: "AED 14.00", section: "Chinese" },
      { name: "Chilly Chicken", price: "AED 14.00", section: "Chinese" },
      { name: "Egg Fried Rice", price: "AED 11.00", section: "Chinese" },
      { name: "Egg Noodles", price: "AED 11.00", section: "Chinese" },
      { name: "Extra Noodles", price: "AED 4.00", section: "Chinese" },
      { name: "Gobi Manchurian", price: "AED 11.00", section: "Chinese" },
      { name: "Mix Noodles", price: "AED 18.00", section: "Chinese" },
      { name: "Paneer Chilli", price: "AED 12.00", section: "Chinese" },
      { name: "Schezwan Fried Rice Chicken", price: "AED 13.00", section: "Chinese" },
      { name: "Shezwan Fried Rice Egg", price: "AED 12.00", section: "Chinese" },
      { name: "Shezwan Fried Rice Veg", price: "AED 11.00", section: "Chinese" },
      { name: "Triple Fried Rice", price: "AED 18.00", section: "Chinese" },
      { name: "Veg Fried Rice", price: "AED 10.00", section: "Chinese" },
      { name: "Veg Manchurian", price: "AED 11.00", section: "Chinese" },
      { name: "Veg Noodles", price: "AED 10.00", section: "Chinese" },
      // BURGER
      { name: "Beef Burger", price: "AED 10.00", section: "Burger" },
      { name: "Chicken Burger", price: "AED 8.00", section: "Burger" },
      { name: "French Fries", price: "AED 5.00", section: "Burger" },
      { name: "Zinger Burger", price: "AED 12.00", section: "Burger" },
      { name: "Veg Burger", price: "AED 8.00", section: "Burger" },
      { name: "Double Chicken Burger", price: "AED 13.00", section: "Burger" },
      { name: "Double Beef Burger", price: "AED 16.00", section: "Burger" },
    ],
    "drinks-soups": [
      // FRESH JUICES
      { name: "Apple Juice", price: "AED 8/10/12", section: "Juices" },
      { name: "Avocado Juice", price: "AED 8/10/12", section: "Juices" },
      { name: "Lemon Juice", price: "AED 5.00", section: "Juices" },
      { name: "Lemon Mint Juice", price: "AED 5.00", section: "Juices" },
      { name: "Mango Juice", price: "AED 8/10/12", section: "Juices" },
      { name: "Orange Juice", price: "AED 10/12", section: "Juices" },
      { name: "Pineapple Juice", price: "AED 8/10/12", section: "Juices" },
      { name: "Fresh Lime Soda", price: "AED 6.00", section: "Juices" },
      { name: "Lemon Soda Mix", price: "AED 7.00", section: "Juices" },
      { name: "Lemon Soda Salt", price: "AED 7.00", section: "Juices" },
      { name: "Lemon Soda Sweet", price: "AED 7.00", section: "Juices" },
      // MIX JUICE
      { name: "Avocado + Mango Juice", price: "AED 10.00", section: "Mix Juice" },
      { name: "Orange + Pineapple Juice", price: "AED 12.00", section: "Mix Juice" },
      // SOFT DRINKS
      { name: "Club Soda Can 300 Ml", price: "AED 1.50", section: "Soft Drinks" },
      { name: "Coca Cola 355 Ml", price: "AED 4.00", section: "Soft Drinks" },
      { name: "Dew Can 330 Ml", price: "AED 4.00", section: "Soft Drinks" },
      { name: "Fanta Can 320 Ml", price: "AED 4.00", section: "Soft Drinks" },
      { name: "Pepsi Can 320 Ml", price: "AED 4.00", section: "Soft Drinks" },
      { name: "Soda", price: "AED 1.50", section: "Soft Drinks" },
      { name: "Sprite Can 330 Ml", price: "AED 4.00", section: "Soft Drinks" },
      { name: "Water Big", price: "AED 2.50", section: "Soft Drinks" },
      { name: "Water Small", price: "AED 1.50", section: "Soft Drinks" },
      // EGG ITEMS
      { name: "Double Omelette", price: "AED 4.00", section: "Eggs" },
      { name: "Egg Bhurji", price: "AED 6.00", section: "Eggs" },
      { name: "Single Omelette", price: "AED 2.00", section: "Eggs" },
      // FISH ITEMS
      { name: "Ayala Fry", price: "APS", section: "Fish" },
      { name: "Fish Fry", price: "APS", section: "Fish" },
      { name: "Fish Masala", price: "APS", section: "Fish" },
      { name: "Fish Nadan Curry", price: "APS", section: "Fish" },
      // LUNCH
      { name: "Biriyani - Veg/Egg/Chicken", price: "AED 8/8/10", section: "Lunch" },
      { name: "Ghee Rice", price: "AED 6.00", section: "Lunch" },
      { name: "Kerala Meals", price: "AED 8.00", section: "Lunch" },
      { name: "Plain Rice", price: "AED 3.00", section: "Lunch" },
      { name: "Pothi Biriyani Chicken/Beef", price: "AED 14/16", section: "Lunch" },
      { name: "Pothi Choru", price: "AED 12.00", section: "Lunch" },
      // SANDWICH
      { name: "Cheese Sandwich", price: "AED 3.00", section: "Sandwiches" },
      { name: "Chicken Sandwich", price: "AED 6.00", section: "Sandwiches" },
      { name: "Club Sandwich", price: "AED 12.00", section: "Sandwiches" },
      { name: "Egg Sandwich", price: "AED 5.00", section: "Sandwiches" },
      { name: "Veg Sandwich", price: "AED 4.00", section: "Sandwiches" },
      { name: "Zinger Sandwich", price: "AED 8.00", section: "Sandwiches" },
      // SOUP
      { name: "Chicken Soup", price: "AED 10.00", section: "Soups" },
      { name: "Veg Hot & Sour Soup", price: "AED 8.00", section: "Soups" },
      { name: "Chicken Manchow Soup", price: "AED 10.00", section: "Soups" },
      { name: "Veg Soup", price: "AED 8.00", section: "Soups" },
      { name: "Veg Manchow Soup", price: "AED 8.00", section: "Soups" },
      { name: "Chicken Hot & Sour Soup", price: "AED 10.00", section: "Soups" },
    ],
  };

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
            {categories.map((cat) => (
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
          {filteredItems.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2.5 border-b border-white/5 group hover:border-brandGreen/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold bg-white/5 px-2 py-0.5 rounded text-gray-400 uppercase tracking-widest">
                  {item.section}
                </span>
                <span className="text-xs font-bold text-white/90 group-hover:text-brandGold transition-colors">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3.5 ml-4 flex-shrink-0">
                <span className="text-xs font-black text-brandGold">
                  {item.price}
                </span>
                {cart[item.name] ? (
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
          ))}
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
          <div className="relative w-full max-w-md bg-brandDark border-l border-brandGreen/25 h-full flex flex-col shadow-2xl z-10 animate-fade-in-up">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/10">
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

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
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

            {/* Drawer Footer (Checkout Controls) */}
            {Object.values(cart).length > 0 && (
              <div className="p-6 border-t border-white/10 bg-white/2 flex flex-col gap-4 overflow-y-auto max-h-[60%]">
                {/* Items Count & Subtotal */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/70 font-medium">Subtotal ({getCartCount()} items)</span>
                  <span className="text-base font-black text-brandGold">
                    AED {getCartSubtotal().toFixed(2)}{hasVariablePrices() && "*"}
                  </span>
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
                          {address ? address : "No location pinned (Optional)"}
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
                        value={addressDetails}
                        onChange={(e) => {
                          setAddressDetails(e.target.value);
                          if (e.target.value.trim() !== "") setAddressError(false);
                        }}
                        placeholder="e.g. Karama Court, Floor 2, Apt 204"
                        className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-brandGold transition-colors ${
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
                  onClick={() => {
                    if (orderType === "delivery" && addressDetails.trim() === "") {
                      setAddressError(true);
                      return;
                    }
                    window.open(getWhatsAppLink(), "_self");
                  }}
                  className="w-full flex items-center justify-center gap-2.5 py-4 bg-whatsappGreen hover:bg-whatsappGreenDark text-white text-xs font-black tracking-widest rounded-xl transition-all duration-300 shadow-lg hover:scale-101 active:scale-99 uppercase cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.638 1.97 14.162.947 11.53.947c-5.445 0-9.87 4.373-9.874 9.8.001 2.012.528 3.98 1.527 5.717l-.991 3.616 3.755-.972zm10.902-6.53c-.299-.149-1.771-.862-2.046-.962-.275-.1-.475-.149-.675.15-.2.299-.774.962-.949 1.162-.175.199-.349.224-.648.075-1.125-.563-1.895-1.036-2.656-2.336-.2-.349.2-.324.573-1.073.06-.12.03-.224-.015-.324-.045-.1-.475-1.123-.65-1.547-.17-.41-.358-.353-.49-.36-.125-.006-.27-.008-.413-.008-.143 0-.377.054-.574.271-.197.216-.753.727-.753 1.773s.77 2.059.877 2.203c.107.143 1.513 2.288 3.664 3.203.512.219.91.35 1.22.447.515.162.983.139 1.353.084.413-.06 1.771-.715 2.021-1.407.25-.693.25-1.288.175-1.408-.075-.12-.275-.2-.574-.349z" />
                  </svg>
                  SEND ORDER TO WHATSAPP
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
      )}

      {/* Sticky WhatsApp Floating Button (Fallback when cart is empty) */}
      {getCartCount() === 0 && (
        <a
          href="https://api.whatsapp.com/send?phone=971568867131"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-whatsappGreen text-white text-xs font-black tracking-wider rounded-full shadow-2xl hover:bg-whatsappGreenDark hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 cursor-pointer"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.638 1.97 14.162.947 11.53.947c-5.445 0-9.87 4.373-9.874 9.8.001 2.012.528 3.98 1.527 5.717l-.991 3.616 3.755-.972zm10.902-6.53c-.299-.149-1.771-.862-2.046-.962-.275-.1-.475-.149-.675.15-.2.299-.774.962-.949 1.162-.175.199-.349.224-.648.075-1.125-.563-1.895-1.036-2.656-2.336-.2-.349.2-.324.573-1.073.06-.12.03-.224-.015-.324-.045-.1-.475-1.123-.65-1.547-.17-.41-.358-.353-.49-.36-.125-.006-.27-.008-.413-.008-.143 0-.377.054-.574.271-.197.216-.753.727-.753 1.773s.77 2.059.877 2.203c.107.143 1.513 2.288 3.664 3.203.512.219.91.35 1.22.447.515.162.983.139 1.353.084.413-.06 1.771-.715 2.021-1.407.25-.693.25-1.288.175-1.408-.075-.12-.275-.2-.574-.349z" />
          </svg>
          PLACE ORDER NOW
        </a>
      )}
    </div>
  );
}
