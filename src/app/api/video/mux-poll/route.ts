import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { createClient } from "@supabase/supabase-js";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json({ error: "Missing uploadId" }, { status: 400 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const upload = await mux.video.uploads.retrieve(uploadId);

    if (upload.status === "asset_created" && upload.asset_id) {
      const asset = await mux.video.assets.retrieve(upload.asset_id);
      
      return NextResponse.json({
        status: asset.status,
        asset_id: asset.id,
        playback_id: asset.playback_ids?.[0]?.id || null,
        duration: asset.duration || 0,
      });
    }

    return NextResponse.json({
      status: upload.status,
    });
  } catch (error: any) {
    console.error("Mux poll error:", error);
    return NextResponse.json(
      { error: "Failed to poll Mux status" },
      { status: 500 }
    );
  }
}
