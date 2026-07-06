import { supabase } from "@/utils/supabase";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const pin = authHeader.replace("Bearer ", "").trim();
    const ADMIN_PIN = (process.env.ADMIN_PIN || "5656").trim().replace(/['"]/g, "");

    if (pin !== ADMIN_PIN) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Invalid Admin PIN." },
        { status: 401 }
      );
    }

    // 1. Delete test orders
    const { data: deletedOrders, error: orderErr } = await supabase
      .from("orders")
      .delete()
      .eq("address_details", "Apt 101, Load Test Run")
      .select();

    if (orderErr) {
      console.error("Error deleting test orders:", orderErr);
      return NextResponse.json(
        { success: false, error: "Database error deleting orders: " + orderErr.message },
        { status: 500 }
      );
    }

    // 2. Delete test customers (those starting with +97156 and having name as null)
    const { data: deletedCusts, error: custErr } = await supabase
      .from("customers")
      .delete()
      .like("phone", "+97156%")
      .is("name", null)
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
