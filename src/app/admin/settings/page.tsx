"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Settings, Shield, Server, Bell, Globe, Lock, Cpu, Radio, Network } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">System Configuration</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Core <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-400">Settings</span></h1>
            <p className="text-xl text-muted-foreground font-medium">Manage global platform parameters and environment variables.</p>
          </div>
          <Button 
            className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all group overflow-hidden relative"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="flex items-center gap-2 relative z-10">
              <Save className="w-4 h-4" /> Persist Configuration
            </span>
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings Area */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }}
              className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-transparent" />
              <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.01]">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-cyan-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight leading-none mb-1">Global Parameters</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Platform identity and localization</p>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Platform Designation</label>
                    <Input 
                      defaultValue="Capital Gain Hub" 
                      className="bg-black/50 border-white/10 h-12 rounded-xl text-white focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Support Communications (Email)</label>
                    <Input 
                      defaultValue="support@capitalgainhub.com" 
                      className="bg-black/50 border-white/10 h-12 rounded-xl text-white font-mono focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Global Meta Description</label>
                  <textarea 
                    rows={3}
                    className="flex w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-cyan-500 transition-colors resize-none"
                    defaultValue="Premium fintech education platform for advanced market dynamics."
                  />
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
              <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.01]">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Server className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight leading-none mb-1">Integration Nodes</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">External API bindings</p>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">Razorpay Payment Gateway</h4>
                        <p className="text-[10px] font-mono text-muted-foreground mt-1">Status: Active</p>
                      </div>
                    </div>
                    <Button variant="outline" className="h-10 rounded-lg border-white/10 bg-black/50 hover:bg-white/5 text-white font-bold text-xs uppercase tracking-widest">
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }}
              className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-transparent" />
              <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" /> System Status
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Database Sync</span>
                    <span className="flex items-center gap-2 text-[10px] font-mono text-emerald-500">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      ONLINE
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Auth Provider</span>
                    <span className="flex items-center gap-2 text-[10px] font-mono text-emerald-500">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      ONLINE
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Storage Matrix</span>
                    <span className="flex items-center gap-2 text-[10px] font-mono text-emerald-500">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      ONLINE
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4 }}
              className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-transparent" />
              <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-500" /> Platform Maintenance
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-6">
                  Engage maintenance protocol to restrict operative access during system upgrades.
                </p>
                <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <span className="font-bold text-sm text-white">Maintenance Mode</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
