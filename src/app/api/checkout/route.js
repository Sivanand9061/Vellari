import { supabase } from "@/utils/supabase";
import { NextResponse } from "next/server";
import { menuData } from "@/utils/menuData";

export async function POST(request) {
  try {
    const body = await request.json();
    const { customerPhone, items, total, orderType, addressGps, addressDetails } = body;

    if (!customerPhone || !items || !total || !orderType) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Server-side Total recalculation & validation for security
    let finalTotal = Number(total);
    try {
      // 1. Fetch CMS specials
      const { data: specialsSetting } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "landingPageSpecials")
        .single();
      const specialsList = (specialsSetting && Array.isArray(specialsSetting.value)) ? specialsSetting.value : [];

      // 2. Build master price map (normalized name -> numeric price)
      const priceMap = {};

      // Load static menu data
      Object.values(menuData).forEach((categoryItems) => {
        categoryItems.forEach((item) => {
          const cleanPriceStr = item.price.replace(/[^\d.]/g, "");
          const parsedPrice = parseFloat(cleanPriceStr);
          if (!isNaN(parsedPrice)) {
            priceMap[item.name.trim().toLowerCase()] = parsedPrice;
          }
        });
      });

      // Overwrite with dynamic specials data
      specialsList.forEach((special) => {
        const cleanPriceStr = String(special.price).replace(/[^\d.]/g, "");
        const parsedPrice = parseFloat(cleanPriceStr);
        if (!isNaN(parsedPrice)) {
          priceMap[special.name.trim().toLowerCase()] = parsedPrice;
        }
      });

      // Load custom menu items from DB settings
      const { data: customMenuItemsSetting } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "customMenuItems")
        .single();
      const customMenuItemsList = (customMenuItemsSetting && Array.isArray(customMenuItemsSetting.value)) ? customMenuItemsSetting.value : [];
      
      customMenuItemsList.forEach((item) => {
        const cleanPriceStr = String(item.price).replace(/[^\d.]/g, "");
        const parsedPrice = parseFloat(cleanPriceStr);
        if (!isNaN(parsedPrice)) {
          priceMap[item.name.trim().toLowerCase()] = parsedPrice;
        }
      });

      // 3. Compute expected total
      let expectedTotal = 0;
      let allItemsFound = true;
      for (const cartItem of items) {
        const itemNameLower = cartItem.name.trim().toLowerCase();
        const itemPrice = priceMap[itemNameLower];
        if (itemPrice === undefined) {
          allItemsFound = false;
          console.warn(`Price for item "${cartItem.name}" not found on server price map.`);
        } else {
          expectedTotal += itemPrice * Number(cartItem.quantity);
        }
      }

      // If all items were successfully matched, enforce the server price total!
      if (allItemsFound && expectedTotal > 0) {
        const diff = Math.abs(expectedTotal - Number(total));
        if (diff > 0.05) {
          console.warn(`Price tampering detected! Client total: ${total}, Server expected: ${expectedTotal}. Overriding total.`);
          finalTotal = expectedTotal;
        }
      }
    } catch (pricingError) {
      console.error("Pricing validation error:", pricingError);
    }

    // Clean phone number (remove spaces, etc.)
    const cleanPhone = customerPhone.trim().replace(/\s+/g, "");

    // Rate-Limiting: Check if this phone number has placed an order in the last 60 seconds
    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentOrders, error: limitError } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_phone", cleanPhone)
      .gt("created_at", sixtySecondsAgo)
      .limit(1);

    if (limitError) {
      console.error("Rate-limiting check error:", limitError);
    } else if (recentOrders && recentOrders.length > 0) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait 60 seconds before placing another order." },
        { status: 429 }
      );
    }

    // 1. Check if customer exists in database
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("status")
      .eq("phone", cleanPhone)
      .single();

    const isNewUser = fetchError || !customer;

    // GPS coordinate validation for new delivery users
    if (orderType === "delivery" && isNewUser && !addressGps) {
      return NextResponse.json(
        { success: false, error: "GPS location pin is mandatory for new users." },
        { status: 400 }
      );
    }

    // Enforce delivery radius if GPS coordinates are provided
    if (orderType === "delivery" && addressGps) {
      const parts = addressGps.split(",");
      if (parts.length === 2) {
        const custLat = parseFloat(parts[0]);
        const custLng = parseFloat(parts[1]);

        if (!isNaN(custLat) && !isNaN(custLng)) {
          // Fetch delivery radius setting
          const { data: radiusSetting } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "deliveryRadius")
            .single();

          const radiusValue = radiusSetting?.value;
          
          if (radiusValue && radiusValue !== "unlimited" && String(radiusValue) !== "0") {
            const maxRadius = parseFloat(radiusValue);
            if (!isNaN(maxRadius)) {
              // Vellari Restaurant (Karama, Dubai) Coordinates
              const REST_LAT = 25.2483;
              const REST_LNG = 55.3015;

              // Haversine formula
              const R = 6371; // Earth radius in km
              const dLat = (custLat - REST_LAT) * Math.PI / 180;
              const dLon = (custLng - REST_LNG) * Math.PI / 180;
              const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(REST_LAT * Math.PI / 180) * Math.cos(custLat * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distanceKm = R * c;

              if (distanceKm > maxRadius) {
                const limitDisplay = maxRadius < 1 ? `${Math.round(maxRadius * 1000)} meters` : `${maxRadius.toFixed(1)} km`;
                const distanceDisplay = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} meters` : `${distanceKm.toFixed(1)} km`;
                return NextResponse.json(
                  { 
                    success: false, 
                    error: `Out of delivery zone. Distance is ${distanceDisplay}, but our delivery limit is ${limitDisplay}.` 
                  },
                  { status: 400 }
                );
              }
            }
          }
        }
      }
    }

    let needsVerification = false;
    let orderStatus = "pending_accept";

    if (fetchError && fetchError.code === "PGRST116") {
      // PGRST116 is Supabase error for 'no rows returned'
      // Customer does not exist -> Create customer with 'pending_verification' status
      needsVerification = true;
      orderStatus = "pending_verification";

      const { error: insertCustError } = await supabase
        .from("customers")
        .insert({
          phone: cleanPhone,
          status: "pending_verification"
        });

      if (insertCustError) {
        console.error("Error creating new customer:", insertCustError);
        return NextResponse.json(
          { success: false, error: "Could not register customer." },
          { status: 500 }
        );
      }
    } else if (customer) {
      if (customer.status === "blocked") {
        return NextResponse.json(
          { success: false, error: "This phone number is blocked from placing orders." },
          { status: 403 }
        );
      } else if (customer.status === "pending_verification") {
        needsVerification = true;
        orderStatus = "pending_verification";
      }
      // If customer.status is 'verified', needsVerification = false, orderStatus = 'pending_accept'
    } else {
      console.error("Customer fetch error:", fetchError);
      return NextResponse.json(
        { success: false, error: "Database query failed." },
        { status: 500 }
      );
    }

    // 2. Insert Order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_phone: cleanPhone,
        items,
        total: finalTotal,
        order_type: orderType,
        address_gps: addressGps || null,
        address_details: addressDetails || null,
        status: orderStatus,
        is_ai_parsed: false
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Order insertion error:", orderError);
      return NextResponse.json(
        { success: false, error: "Could not create order." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      needsVerification
    });
  } catch (error) {
    console.error("Checkout API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
