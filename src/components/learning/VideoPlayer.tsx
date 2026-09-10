"use client";

import { useEffect, useRef, useState, memo } from "react";
import { PlayCircle } from "lucide-react";
import MuxPlayer from "@mux/mux-player-react";
import { supabase } from "@/lib/supabase";
interface VideoPlayerProps {
  provider?: string;
  videoId?: string;
  lessonId?: string;
  courseId?: string;
  initialTime?: number;
  onProgress?: (currentTime: number) => void;
  onEnded?: () => void;
}

export const VideoPlayer = memo(function VideoPlayer({ 
  provider = "unknown", 
  videoId, 
  lessonId,
  courseId,
  initialTime = 0, 
  onProgress, 
  onEnded 
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [muxToken, setMuxToken] = useState<string | null>(null);
  const [muxError, setMuxError] = useState<string | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fakeTimeRef = useRef(initialTime);
  
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onEndedRef.current = onEnded;
  }, [onProgress, onEnded]);

  useEffect(() => {
    if (provider === "mux" && videoId) {
      const fetchToken = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (session) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }

          const res = await fetch("/api/video/mux-token", {
            method: "POST",
            headers,
            body: JSON.stringify({ playbackId: videoId, lessonId, courseId }),
          });
          const data = await res.json();
          if (data.token) {
            setMuxToken(data.token);
          } else {
            setMuxError(data.error || "Failed to load video");
          }
        } catch (err) {
          setMuxError("Failed to fetch playback token");
        }
      };
      fetchToken();
    }
  }, [provider, videoId, lessonId, courseId]);


  useEffect(() => {
    // Clear any existing intervals when the lesson changes
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    if (provider === "youtube") {
      // Simulate progress events for youtube/placeholder
      progressIntervalRef.current = setInterval(() => {
        if (isPlaying) {
          fakeTimeRef.current += 10;
          if (onProgressRef.current) onProgressRef.current(fakeTimeRef.current);
        }
      }, 10000);
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [provider, videoId, isPlaying]);




  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-zinc-900 flex flex-col items-center justify-center text-white">
        <PlayCircle className="w-16 h-16 opacity-30 mb-4" />
        <p>No video ID provided.</p>
      </div>
    );
  }



  if (provider === "youtube") {
    let ytId = videoId;
    if (videoId.includes("youtube.com") || videoId.includes("youtu.be")) {
      const match = videoId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
      if (match && match[1]) {
        ytId = match[1];
      } else {
        ytId = "";
      }
    }

    if (!ytId) {
      return (
        <div className="w-full aspect-video bg-zinc-900 flex flex-col items-center justify-center text-white">
          <PlayCircle className="w-16 h-16 opacity-30 mb-4" />
          <p>Invalid YouTube video ID or URL.</p>
        </div>
      );
    }

    return (
      <div 
        className="w-full aspect-video relative bg-black group cursor-pointer"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?start=${initialTime}&autoplay=0`}
          title="YouTube video player"
          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        <div className={`absolute inset-0 flex items-center justify-center transition-colors ${isPlaying ? 'bg-transparent' : 'bg-black/40'}`}>
          {!isPlaying && <PlayCircle className="w-20 h-20 text-white/80" />}
          {isPlaying && <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded text-xs text-white">Tracking Progress...</div>}
        </div>
      </div>
    );
  }

  if (provider === "mux") {
    if (muxError) {
      return (
        <div className="w-full aspect-video bg-zinc-900 flex flex-col items-center justify-center text-white">
          <PlayCircle className="w-16 h-16 opacity-30 mb-4" />
          <p className="text-red-500 font-bold">{muxError}</p>
        </div>
      );
    }
    
    if (!muxToken) {
      return (
        <div className="w-full aspect-video bg-zinc-900 flex flex-col items-center justify-center text-white">
          <p className="animate-pulse">Loading secure player...</p>
        </div>
      );
    }

    return (
      <div className="w-full aspect-video relative bg-black">
        <MuxPlayer
          playbackId={videoId}
          tokens={{ playback: muxToken }}
          startTime={initialTime}
          onTimeUpdate={(e) => {
            const time = (e.target as HTMLMediaElement).currentTime;
            if (onProgress) onProgress(time);
          }}
          onEnded={() => {
            if (onEnded) onEnded();
          }}
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-zinc-900 flex flex-col items-center justify-center text-white">
      <PlayCircle className="w-16 h-16 opacity-30 mb-4" />
      <p>Video provider unavailable.</p>
    </div>
  );
});
