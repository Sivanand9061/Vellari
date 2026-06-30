import { get } from "@vercel/edge-config";
import { NextResponse } from "next/server";

export const runtime = "edge"; // Edge runtime for ultra-fast execution

export async function GET() {
  try {
    if (!process.env.EDGE_CONFIG) {
      // Fallback if environment variable is not set locally or on Vercel
      return NextResponse.json({ maintenanceMode: false });
    }
    const maintenanceMode = await get("maintenanceMode");
    return NextResponse.json({ maintenanceMode: !!maintenanceMode });
  } catch (error) {
    console.error("Edge Config fetch error:", error);
    return NextResponse.json({ maintenanceMode: false });
  }
}
