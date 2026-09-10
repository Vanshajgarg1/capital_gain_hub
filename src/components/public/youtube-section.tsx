"use client";

import { useEffect, useState } from "react";
import { Video, PlayCircle, AlertCircle } from "lucide-react";

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
  viewCount: string;
  videoUrl: string;
}

export function YoutubeSection() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch("/api/youtube/videos");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        setVideos(data.videos || []);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVideos();
  }, []);

  const formatViewCount = (viewsStr: string) => {
    const views = parseInt(viewsStr, 10);
    if (isNaN(views)) return "0 views";
    if (views >= 1000000) return (views / 1000000).toFixed(1).replace(/\.0$/, '') + "M views";
    if (views >= 1000) return (views / 1000).toFixed(1).replace(/\.0$/, '') + "K views";
    return views + " views";
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'week', seconds: 604800 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 }
    ];

    for (const interval of intervals) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      if (count >= 1) {
        return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
      }
    }
    
    return "Just now";
  };

  const channelUrl = "https://youtube.com/@CAPITALGAINHUB-l7v"; // Update if different

  return (
    <section id="youtube" className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-secondary/50 backdrop-blur-md z-0" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-5 mix-blend-overlay" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-16">
          
          {/* Left Text Side */}
          <div className="flex-1 space-y-8 lg:sticky lg:top-32">
            <div className="inline-flex items-center rounded-full bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <Video className="w-5 h-5 mr-2" />
              Free Alpha
            </div>
            
            <h2 className="text-5xl lg:text-7xl font-extrabold tracking-tight mt-6 mb-6">
              Learn Free. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-600">Go Deeper.</span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
              Start your journey with our free YouTube content. When you&apos;re ready for a structured, step-by-step professional program, join the Hub.
            </p>
            
            <div className="pt-4">
              <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold h-14 px-8 shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all">
                <Video className="mr-2 h-5 w-5" />
                Watch on YouTube
              </a>
            </div>
          </div>
          
          {/* Right Video Cards Side */}
          <div className="flex-1 w-full flex flex-col gap-8 max-w-xl">
            
            {/* Loading State */}
            {isLoading && (
              <>
                {[1, 2].map((i) => (
                  <div key={i} className="glass-card rounded-3xl p-4 border border-white/5 bg-black/20 overflow-hidden animate-pulse">
                    <div className="aspect-video bg-white/5 rounded-2xl mb-6 relative overflow-hidden">
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                    </div>
                    <div className="px-2 pb-2">
                      <div className="h-6 bg-white/10 rounded w-3/4 mb-3" />
                      <div className="h-4 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <div className="glass-card rounded-3xl p-10 text-center border border-white/10 bg-black/40">
                <AlertCircle className="w-12 h-12 text-red-500/80 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Free content is temporarily unavailable.</h3>
                <p className="text-muted-foreground mb-6">Our automated feed is taking a break. You can still watch all our videos directly on YouTube.</p>
                <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-red-400 hover:text-red-300 font-semibold transition-colors">
                  Visit YouTube <PlayCircle className="w-4 h-4 ml-2" />
                </a>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && videos.length === 0 && (
              <div className="glass-card rounded-3xl p-10 text-center border border-white/10 bg-black/40">
                <Video className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No videos available right now.</h3>
                <p className="text-muted-foreground mb-6">Check back later or visit our channel for past content.</p>
                <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-red-400 hover:text-red-300 font-semibold transition-colors">
                  Visit YouTube <PlayCircle className="w-4 h-4 ml-2" />
                </a>
              </div>
            )}

            {/* Data Render */}
            {!isLoading && !error && videos.length > 0 && videos.map((video, idx) => (
              <a 
                key={video.id} 
                href={video.videoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block"
              >
                <div className={`glass-card rounded-3xl p-4 transition-all duration-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.1)] border border-white/5 hover:border-red-500/20 bg-black/40 ${idx === 0 ? 'scale-100' : 'opacity-90 hover:opacity-100'}`}>
                  <div className="aspect-video bg-black rounded-2xl relative overflow-hidden flex items-center justify-center">
                    <img 
                      src={video.thumbnail} 
                      className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-500 group-hover:scale-105" 
                      alt={video.title} 
                    />
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 relative z-10 backdrop-blur-md">
                      <PlayCircle className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                  <div className="mt-6 px-2 pb-2">
                    <h4 className="font-bold text-xl mb-2 group-hover:text-red-400 transition-colors line-clamp-2 leading-tight">
                      {video.title}
                    </h4>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span>{formatViewCount(video.viewCount)}</span>
                      <span className="mx-2">•</span>
                      <span>{formatRelativeTime(video.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
            
          </div>
        </div>
      </div>
    </section>
  );
}
