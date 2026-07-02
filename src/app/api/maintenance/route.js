import { supabase } from "@/utils/supabase";
import { NextResponse } from "next/server";

export const runtime = "edge"; // Edge runtime for ultra-fast execution
export const dynamic = "force-dynamic"; // Do not statically optimize or cache this route

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "maintenanceMode")
      .single();

    if (error || !data) {
      console.error("Database query failed for settings:", error);
      return NextResponse.json({ maintenanceMode: false });
    }

    const maintenanceMode = data.value === true || data.value === "true";
    return NextResponse.json({ maintenanceMode });
  } catch (error) {
    console.error("Maintenance check error:", error);
    return NextResponse.json({ maintenanceMode: false });
  }
}
