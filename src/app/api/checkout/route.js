import { supabase } from "@/utils/supabase";
import { NextResponse } from "next/server";

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

    // Clean phone number (remove spaces, etc.)
    const cleanPhone = customerPhone.trim().replace(/\s+/g, "");

    // 1. Check if customer exists in database
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("status")
      .eq("phone", cleanPhone)
      .single();

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
        total,
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
