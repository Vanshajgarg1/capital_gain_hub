"use client";

import { VisualConstructor } from "@/components/admin/cms/VisualConstructor";

export default function AdminWebsitePage() {
  return (
    <div className="min-h-screen bg-black text-white relative pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none z-0 translate-x-1/2 -translate-y-1/2" />
      
      <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-10 relative z-10">
        <div className="pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Public Interface Control</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Website <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-400">CMS</span></h1>
            <p className="text-xl text-muted-foreground font-medium">Manage landing page matrix and public-facing assets.</p>
          </div>
        </div>

        <VisualConstructor />
      </div>
    </div>
  );
}
