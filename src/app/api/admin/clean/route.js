import { supabase } from "@/utils/supabase";
import { NextResponse } from "next/server";

export async function GET(request) {
  return handleCleanup(request);
}

export async function POST(request) {
  return handleCleanup(request);
}

async function handleCleanup(request) {
  try {
    // 1. Resolve PIN
    let sentPin = "";
    
    // Check search params (for GET requests)
    const { searchParams } = new URL(request.url);
    const queryPin = searchParams.get("pin");
    if (queryPin) {
      sentPin = queryPin.trim();
    } else {
      // Check Authorization header (for POST requests)
      const authHeader = request.headers.get("Authorization") || "";
      sentPin = authHeader.replace("Bearer ", "").trim();
    }

    const ADMIN_PIN = (process.env.ADMIN_PIN || "5656").trim().replace(/['"]/g, "");

    if (sentPin !== ADMIN_PIN) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Invalid Admin PIN." },
        { status: 401 }
      );
    }

    // 2. Delete test orders (by address or phone prefix)
    const { data: deletedOrders, error: orderErr } = await supabase
      .from("orders")
      .delete()
      .or("address_details.eq.Apt 101, Load Test Run,customer_phone.like.+97156%")
      .select();

    if (orderErr) {
      console.error("Error deleting test orders:", orderErr);
      return NextResponse.json(
        { success: false, error: "Database error deleting orders: " + orderErr.message },
        { status: 500 }
      );
    }

    // 3. Delete test customers (those starting with +97156)
    const { data: deletedCusts, error: custErr } = await supabase
      .from("customers")
      .delete()
      .like("phone", "+97156%")
      .select();

    if (custErr) {
      console.error("Error deleting test customers:", custErr);
      return NextResponse.json(
        { success: false, error: "Database error deleting customers: " + custErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedOrdersCount: deletedOrders?.length || 0,
      deletedCustomersCount: deletedCusts?.length || 0
    });
  } catch (error) {
    console.error("Cleanup endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
