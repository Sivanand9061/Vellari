import { NextResponse } from "next/server";

export const runtime = "edge"; // Edge runtime for ultra-fast execution

export async function GET() {
  try {
    const url = process.env.EDGE_CONFIG;
    if (!url) {
      // Fallback if environment variable is not set
      return NextResponse.json({ maintenanceMode: false });
    }

    // Fetch directly from the Edge Config URL
    const response = await fetch(url, {
      next: { revalidate: 0 }, // Ensure it doesn't cache the result
    });

    if (!response.ok) {
      return NextResponse.json({ maintenanceMode: false });
    }

    const data = await response.json();
    return NextResponse.json({ maintenanceMode: !!data.maintenanceMode });
  } catch (error) {
    console.error("Direct Edge Config fetch error:", error);
    return NextResponse.json({ maintenanceMode: false });
  }
}
