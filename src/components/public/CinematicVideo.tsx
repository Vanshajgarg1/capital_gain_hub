import { cn } from "@/lib/utils";

interface CinematicVideoProps {
  src?: string;
  fallbackImage?: string;
  className?: string;
  hoverScale?: boolean;
  overlay?: boolean;
}

export function CinematicVideo({
  src,
  fallbackImage,
  className,
  hoverScale = true,
  overlay = true,
}: CinematicVideoProps) {
  // Determine if this is a known slug that has a video
  // If the consumer passes src explicitly we use it, otherwise we could infer.
  // Actually, we should just expect `src` to be passed if available.
  
  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-black z-0 pointer-events-none", className)}>
      {src ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className={cn(
            "absolute inset-0 h-full w-full object-cover z-0 transition-transform duration-700 ease-out",
            hoverScale && "group-hover:scale-105"
          )}
          poster={fallbackImage}
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : fallbackImage ? (
        <img
          src={fallbackImage}
          alt="Course visual"
          className={cn(
            "absolute inset-0 h-full w-full object-cover z-0 transition-transform duration-700 ease-out",
            hoverScale && "group-hover:scale-105"
          )}
        />
      ) : null}

      {/* Cinematic Overlays */}
      {overlay && (
        <>
          {/* Dark transparent gradient & vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10 z-[1]" />
          <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] z-[1]" />
          
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px] opacity-10 z-[1]" />
          
          {/* Interactive glows on hover */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[50px] mix-blend-screen z-[1] transition-opacity duration-700 opacity-30 group-hover:opacity-100" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] mix-blend-screen z-[1] transition-opacity duration-700 opacity-20 group-hover:opacity-100" />
        </>
      )}
    </div>
  );
}
