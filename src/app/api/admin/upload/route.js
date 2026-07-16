import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    // 1. Verify PIN from Authorization Header
    const authHeader = request.headers.get("Authorization");
    const sentPin = authHeader ? authHeader.replace("Bearer ", "").trim() : "";
    const ADMIN_PIN = (process.env.ADMIN_PIN || "5656").trim().replace(/['"]/g, "");

    if (sentPin !== ADMIN_PIN) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Invalid Admin PIN." },
        { status: 401 }
      );
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const file = formData.get("file");
    const filePath = formData.get("filePath");

    if (!file || !filePath) {
      return NextResponse.json(
        { success: false, error: "File and filePath are required." },
        { status: 400 }
      );
    }

    // 3. Initialize secure Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: "Supabase environment configuration is missing." },
        { status: 500 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, supabaseKey);

    // 4. Upload file
    const fileBuffer = await file.arrayBuffer();
    const { data, error } = await adminSupabase.storage
      .from("assets")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true
      });

    if (error) {
      console.error("Storage upload error:", error);
      
      // If bucket doesn't exist, try to create it programmatically on the server
      if (error.message.includes("not found") || error.message.includes("does not exist") || error.message.includes("Bucket not found")) {
        console.log("Bucket 'assets' not found. Attempting to create it from backend...");
        const { error: createErr } = await adminSupabase.storage.createBucket("assets", { public: true });
        if (createErr) {
          return NextResponse.json(
            { success: false, error: `Failed to create bucket: ${createErr.message}` },
            { status: 500 }
          );
        }
        
        // Retry upload
        const { data: retryData, error: retryErr } = await adminSupabase.storage
          .from("assets")
          .upload(filePath, fileBuffer, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: true
          });
          
        if (retryErr) {
          return NextResponse.json(
            { success: false, error: retryErr.message },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }

    // 5. Get Public URL
    const { data: publicUrlData } = adminSupabase.storage.from("assets").getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      publicUrl: publicUrlData.publicUrl
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
