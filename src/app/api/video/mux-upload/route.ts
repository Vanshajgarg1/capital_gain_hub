import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { createClient } from "@supabase/supabase-js";



export async function POST(request: Request) {
  try {
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables for Mux upload");
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const mux = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
    });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify Admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const origin = request.headers.get("origin") || "*";

    console.log("[Mux Diagnostics]", {
      hasMuxTokenId: Boolean(process.env.MUX_TOKEN_ID),
      muxTokenIdLength: process.env.MUX_TOKEN_ID?.length,
      hasMuxTokenSecret: Boolean(process.env.MUX_TOKEN_SECRET),
      muxTokenSecretLength: process.env.MUX_TOKEN_SECRET?.length
    });

    // Create a Mux Direct Upload URL
    const upload = await mux.video.uploads.create({
      cors_origin: origin,
      new_asset_settings: {
        playback_policies: ["signed"],
        video_quality: "basic",
      },
    });

    return NextResponse.json({
      upload_url: upload.url,
      upload_id: upload.id,
    });
  } catch (error: any) {
    console.error("Mux upload creation error:", error);
    return NextResponse.json(
      { error: "Failed to create Mux upload URL" },
      { status: 500 }
    );
  }
}
