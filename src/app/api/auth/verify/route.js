import { NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";

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

    // IP-based Rate Limiting (using settings table to log failed attempts globally)
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const now = Date.now();
    const FIFTEEN_MINUTES = 15 * 60 * 1000;

    let failedAttempts = [];
    try {
      const { data: attemptsRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "failed_auth_attempts")
        .single();
      if (attemptsRow && Array.isArray(attemptsRow.value)) {
        // Filter out attempts older than 15 minutes
        failedAttempts = attemptsRow.value.filter(attempt => (now - attempt.time) < FIFTEEN_MINUTES);
      }
    } catch (e) {
      console.warn("Failed to read failed_auth_attempts, starting fresh:", e);
    }

    const ipFailures = failedAttempts.filter(attempt => attempt.ip === ip).length;
    if (ipFailures >= 5) {
      return NextResponse.json(
        { success: false, error: "Too many failed attempts. Locked out for 15 minutes." },
        { status: 429 }
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

    // Update failed attempts database log
    if (isValid) {
      // Clear failed attempts for this IP upon successful login
      const remainingAttempts = failedAttempts.filter(attempt => attempt.ip !== ip);
      await supabase
        .from("settings")
        .upsert({ key: "failed_auth_attempts", value: remainingAttempts });
    } else {
      // Record failed attempt
      failedAttempts.push({ ip, time: now });
      await supabase
        .from("settings")
        .upsert({ key: "failed_auth_attempts", value: failedAttempts });
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
