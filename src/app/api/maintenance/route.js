import { NextResponse } from "next/server";

export const runtime = "edge"; // Edge runtime for ultra-fast execution
export const dynamic = "force-dynamic"; // Do not statically optimize or cache this route

export async function GET() {
  try {
    const url = process.env.EDGE_CONFIG;
    if (!url) {
      // Fallback if environment variable is not set
      return NextResponse.json({ maintenanceMode: false });
    }

    // Fetch directly from the Edge Config URL, bypassing any caching
    const response = await fetch(url, {
      cache: "no-store", // Do not cache this fetch request
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json({ maintenanceMode: false });
    }

    const data = await response.json();
    
    // Support both root key-value pairs and nested items wrapper formats
    const maintenanceMode = data.maintenanceMode !== undefined
      ? data.maintenanceMode
      : (data.items?.maintenanceMode || false);

    return NextResponse.json({ maintenanceMode: !!maintenanceMode });
  } catch (error) {
    console.error("Direct Edge Config fetch error:", error);
    return NextResponse.json({ maintenanceMode: false });
  }
}
