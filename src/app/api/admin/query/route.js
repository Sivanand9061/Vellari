import { supabase } from "@/utils/supabase";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // Verify PIN from Authorization header
    const authHeader = request.headers.get("Authorization");
    const sentPin = authHeader ? authHeader.replace("Bearer ", "").trim() : "";
    const ADMIN_PIN = (process.env.ADMIN_PIN || "1234").trim().replace(/['"]/g, "");

    if (sentPin !== ADMIN_PIN) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Invalid Admin PIN." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { question, startDate, endDate } = body;

    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question is required." },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY || "";
    if (!geminiApiKey) {
      return NextResponse.json(
        { success: true, answer: "⚠️ Gemini API key is missing. Add GEMINI_API_KEY to your environment variables to enable the AI analyst." }
      );
    }

    // 1. Fetch orders and customers from Supabase (with dynamic date range filtering)
    let ordersQuery = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    let customersQuery = supabase
      .from("customers")
      .select("*");

    if (startDate && endDate) {
      ordersQuery = ordersQuery
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      customersQuery = customersQuery
        .gte("created_at", startDate)
        .lte("created_at", endDate);
    }

    const { data: orders, error: ordersError } = await ordersQuery;
    const { data: customers, error: customersError } = await customersQuery;

    if (ordersError || customersError) {
      console.error("Supabase error fetching admin stats:", ordersError || customersError);
      return NextResponse.json(
        { success: false, error: "Database query failed." },
        { status: 500 }
      );
    }

    // 2. Aggregate data to fit perfectly in prompt context
    const completedOrders = (orders || []).filter((o) => o.status === "completed");
    const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const itemCounts = {};
    (orders || []).forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          const name = it.name || "Unknown Item";
          itemCounts[name] = (itemCounts[name] || 0) + (it.quantity || 1);
        });
      }
    });

    const customerOrders = {};
    (orders || []).forEach((o) => {
      const phone = o.customer_phone;
      customerOrders[phone] = (customerOrders[phone] || 0) + 1;
    });

    const dailyStats = {};
    (orders || []).forEach((o) => {
      try {
        const dateStr = new Date(o.created_at).toISOString().split("T")[0];
        if (!dailyStats[dateStr]) {
          dailyStats[dateStr] = { count: 0, revenue: 0 };
        }
        dailyStats[dateStr].count += 1;
        if (o.status === "completed") {
          dailyStats[dateStr].revenue += Number(o.total);
        }
      } catch (e) {
        // Ignore date parsing anomalies
      }
    });

    const dataSummary = {
      totalRevenue,
      totalOrdersCount: (orders || []).length,
      completedOrdersCount: completedOrders.length,
      cancelledOrdersCount: (orders || []).filter((o) => o.status === "cancelled").length,
      totalCustomersCount: (customers || []).length,
      blockedCustomersCount: (customers || []).filter((c) => c.status === "blocked").length,
      mostPopularItems: Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => `${name}: ${count} units`),
      topCustomers: Object.entries(customerOrders)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([phone, count]) => `${phone}: ${count} orders`),
      dailyStatsPast30Days: Object.entries(dailyStats)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 30)
        .map(([date, stat]) => `${date}: ${stat.count} orders, AED ${stat.revenue.toFixed(2)} rev`),
      recentOrdersList: (orders || []).slice(0, 40).map((o) => ({
        date: o.created_at,
        type: o.order_type,
        total: Number(o.total).toFixed(2),
        status: o.status,
        items: o.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")
      }))
    };

    // 3. Construct Gemini Prompt
    const dateRangeString = startDate && endDate 
      ? `from ${new Date(startDate).toLocaleString()} to ${new Date(endDate).toLocaleString()}`
      : "all historical records";

    const systemPrompt = `You are a financial and operational AI analyst for Vellari Restaurant (a premium street-food restaurant in Karama, Dubai).
Your task is to analyze the provided restaurant dataset and answer the owner's question directly, clearly, and concisely.

Always format your response using professional, clean markdown. Avoid fluffy text or introductions. Provide calculations or lists directly.

The current dataset is filtered for the timeframe: ${dateRangeString}.

Here is the current restaurant dataset:
---
Total Revenue (Completed): AED ${dataSummary.totalRevenue.toFixed(2)}
Total Orders: ${dataSummary.totalOrdersCount} (Completed: ${dataSummary.completedOrdersCount}, Cancelled: ${dataSummary.cancelledOrdersCount})
Total Customers: ${dataSummary.totalCustomersCount} (Blocked: ${dataSummary.blockedCustomersCount})

Top 10 Most Popular Items:
${dataSummary.mostPopularItems.join("\n")}

Top 5 Most Frequent Customers:
${dataSummary.topCustomers.join("\n")}

Daily Stats (Date: Count, Revenue):
${dataSummary.dailyStatsPast30Days.join("\n")}

Last 40 Orders Logs:
${JSON.stringify(dataSummary.recentOrdersList, null, 2)}
---`;

    // 4. Send request to Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: systemPrompt },
                { text: `Question: ${question}` }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Gemini API call failed:", errBody);
      return NextResponse.json(
        { success: false, error: "Failed to connect to Gemini AI." },
        { status: 502 }
      );
    }

    const resData = await response.json();
    const aiAnswer = resData?.candidates?.[0]?.content?.parts?.[0]?.text || "No response received from AI.";

    return NextResponse.json({
      success: true,
      answer: aiAnswer
    });
  } catch (error) {
    console.error("AI query route error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
