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

    // Temporarily fetch recent records to inspect database state
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: customers } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      orders,
      customers
    });
  } catch (error) {
    console.error("Cleanup endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
