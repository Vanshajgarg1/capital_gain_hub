import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    // 1. AUTHENTICATE THE REQUEST
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2. VERIFY ADMIN ROLE
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "FORBIDDEN - Admin access required" }, { status: 403 });
    }

    // 3. FETCH TELEMETRY DATA SECURELY WITH SERVICE ROLE
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Run aggregate queries concurrently for performance
    const [
      studentsRes,
      coursesRes,
      enrollmentsRes,
      paymentsRes,
      recentSalesRes,
      historicalPaymentsRes
    ] = await Promise.all([
      // Total Students
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "STUDENT"),
      // Active Courses
      supabaseAdmin.from("courses").select("*", { count: "exact", head: true }).eq("is_published", true).eq("is_archived", false),
      // Enrollments
      supabaseAdmin.from("enrollments").select("*", { count: "exact", head: true }),
      // Total Revenue
      supabaseAdmin.from("payments").select("amount").eq("status", "SUCCESS"),
      // Recent Sales (Latest 10)
      supabaseAdmin.from("payments")
        .select(`
          id,
          amount,
          created_at,
          status,
          order:orders (
            user:profiles (
              full_name,
              avatar_url
            )
          )
        `)
        .eq("status", "SUCCESS")
        .order("created_at", { ascending: false })
        .limit(10),
      // Historical Payments for last 30 days
      supabaseAdmin.from("payments")
        .select("amount, created_at")
        .eq("status", "SUCCESS")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    if (studentsRes.error) throw studentsRes.error;
    if (coursesRes.error) throw coursesRes.error;
    if (enrollmentsRes.error) throw enrollmentsRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    if (recentSalesRes.error) throw recentSalesRes.error;
    if (historicalPaymentsRes.error) throw historicalPaymentsRes.error;

    // Calculate total revenue
    const totalRevenue = paymentsRes.data ? paymentsRes.data.reduce((sum, p) => sum + Number(p.amount), 0) : 0;

    // Build the 30-day historical chart data
    const chartData = [];
    const today = new Date();
    // Pre-fill the last 30 days with 0 revenue
    const dailyRevenue: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split("T")[0]; // YYYY-MM-DD
      dailyRevenue[dateString] = 0;
    }

    // Aggregate the fetched successful payments
    if (historicalPaymentsRes.data) {
      historicalPaymentsRes.data.forEach(p => {
        const dateString = new Date(p.created_at).toISOString().split("T")[0];
        if (dailyRevenue[dateString] !== undefined) {
          dailyRevenue[dateString] += Number(p.amount);
        }
      });
    }

    // Convert to array format for charting
    for (const [date, revenue] of Object.entries(dailyRevenue)) {
      chartData.push({ date, revenue });
    }

    return NextResponse.json({
      success: true,
      metrics: {
        students: studentsRes.count || 0,
        courses: coursesRes.count || 0,
        enrollments: enrollmentsRes.count || 0,
        revenue: totalRevenue
      },
      recentSales: recentSalesRes.data || [],
      chartData
    });

  } catch (err: any) {
    console.error("[TELEMETRY ERROR] Admin telemetry fetch exception:", err);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: err.message 
    }, { status: 500 });
  }
}
