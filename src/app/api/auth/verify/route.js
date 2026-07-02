import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { pin, type } = body;

    if (!pin || !type) {
      return NextResponse.json(
        { success: false, error: "PIN and Type are required." },
        { status: 400 }
      );
    }

    const cleanPin = pin.trim();

    const STAFF_PIN = (process.env.STAFF_PIN || "4545").trim().replace(/['"]/g, "");
    const ADMIN_PIN = (process.env.ADMIN_PIN || "5656").trim().replace(/['"]/g, "");

    let isValid = false;

    if (type === "staff") {
      isValid = cleanPin === STAFF_PIN;
    } else if (type === "admin") {
      isValid = cleanPin === ADMIN_PIN;
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid login type." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: isValid });
  } catch (error) {
    console.error("Auth verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
