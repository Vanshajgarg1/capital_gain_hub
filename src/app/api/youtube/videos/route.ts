import { NextResponse } from "next/server";

export const revalidate = 900; // Cache for 15 minutes (900 seconds)

export async function GET() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID;

    console.log("[YouTube Config]", {
      hasApiKey: Boolean(apiKey),
      apiKeyLength: apiKey?.length ?? 0,
      hasChannelId: Boolean(channelId),
      channelIdLength: channelId?.length ?? 0,
    });

    if (!apiKey || !channelId) {
      console.error("YouTube API keys are not configured.");
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    // 1. Get the 'uploads' playlist ID for the channel
    const channelsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
      { next: { revalidate: 86400 } } // Channel details rarely change, cache for 24h
    );

    if (!channelsResponse.ok) {
      console.error("YouTube channels API failed", await channelsResponse.text());
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const channelsData = await channelsResponse.json();
    
    if (!channelsData.items || channelsData.items.length === 0) {
      console.error("YouTube channel not found");
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const uploadsPlaylistId = channelsData.items[0].contentDetails.relatedPlaylists.uploads;

    // 2. Fetch the latest videos from the uploads playlist
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=6&key=${apiKey}`,
      { next: { revalidate: 900 } }
    );

    if (!playlistResponse.ok) {
      console.error("YouTube playlistItems API failed", await playlistResponse.text());
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const playlistData = await playlistResponse.json();
    
    if (!playlistData.items || playlistData.items.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    // Extract video IDs
    const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(",");

    // 3. Fetch statistics for these videos
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`,
      { next: { revalidate: 900 } }
    );

    if (!videosResponse.ok) {
      console.error("YouTube videos API failed", await videosResponse.text());
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const videosData = await videosResponse.json();
    
    // Create a map of video stats for quick lookup
    const statsMap: Record<string, any> = {};
    if (videosData.items) {
      videosData.items.forEach((item: any) => {
        statsMap[item.id] = item.statistics;
      });
    }

    // 4. Format the final response
    const formattedVideos = playlistData.items.map((item: any) => {
      const snippet = item.snippet;
      const videoId = snippet.resourceId.videoId;
      const stats = statsMap[videoId] || {};
      
      // Get the highest resolution thumbnail available
      const thumbnail = snippet.thumbnails?.maxres?.url || 
                        snippet.thumbnails?.high?.url || 
                        snippet.thumbnails?.medium?.url || 
                        snippet.thumbnails?.default?.url || 
                        "";

      return {
        id: videoId,
        title: snippet.title,
        description: snippet.description,
        thumbnail: thumbnail,
        publishedAt: snippet.publishedAt,
        channelTitle: snippet.channelTitle,
        viewCount: stats.viewCount || "0",
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`
      };
    });

    return NextResponse.json({ videos: formattedVideos });
    
  } catch (error) {
    console.error("YouTube API integration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
