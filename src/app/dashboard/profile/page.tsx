"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { Star, MessageSquare, UserCircle, Shield, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

type Testimonial = {
  id: string;
  student_name: string;
  review_text: string;
  rating: number;
  course_id: string | null;
  is_published: boolean;
  user_id: string;
};

type Course = {
  id: string;
  title: string;
};

export default function StudentProfilePage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [testimonial, setTestimonial] = useState<Testimonial | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    review_text: "",
    rating: 5,
    course_id: "none",
  });

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [authLoading, user, profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [testimonialRes, coursesRes] = await Promise.all([
        supabase.from("testimonials").select("*").eq("user_id", user!.id).maybeSingle(),
        supabase.from("courses").select("id, title").order("title"),
      ]);

      if (coursesRes.data) setCourses(coursesRes.data);
      if (testimonialRes.data) {
        setTestimonial(testimonialRes.data);
        setFormData({
          review_text: testimonialRes.data.review_text,
          rating: testimonialRes.data.rating,
          course_id: testimonialRes.data.course_id || "none",
        });
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        student_name: profile.full_name,
        review_text: formData.review_text,
        rating: formData.rating,
        course_id: formData.course_id === "none" ? null : formData.course_id,
        user_id: user.id,
        is_published: false,
      };

      if (testimonial) {
        const { error } = await supabase
          .from("testimonials")
          .update(payload)
          .eq("id", testimonial.id);
        
        if (error) throw error;
        setMessage({ text: "Testimonial updated successfully!", type: "success" });
      } else {
        const { error } = await supabase
          .from("testimonials")
          .insert(payload);
          
        if (error) throw error;
        setMessage({ text: "Thank you! Your testimonial has been submitted and is awaiting approval.", type: "success" });
      }
      
      fetchData();
    } catch (err: any) {
      console.error("Error saving testimonial:", err);
      setMessage({ text: err.message || "Failed to save testimonial. If it's already published, you can no longer edit it.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse font-medium">Syncing profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-8 text-center text-muted-foreground font-medium glass-card rounded-2xl mx-8 mt-8">Profile not found. Please log in again.</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10 relative">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Profile Settings</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage your command center identity.</p>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-8 rounded-3xl border border-white/10 relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-primary group-hover:shadow-[0_0_20px_rgba(23,163,74,0.5)] transition-shadow" />
        
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <UserCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Account Identity</h2>
            <p className="text-muted-foreground text-sm">Your verified identity details.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Full Name</Label>
            <Input value={profile.full_name || ""} disabled className="bg-black/50 border-white/10 h-12 text-lg font-medium" />
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Identity is synced automatically.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Access Level</Label>
            <div className="flex items-center gap-3 h-12 px-4 rounded-xl border border-white/10 bg-black/50">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(23,163,74,0.8)] animate-pulse" />
              <span className="font-bold tracking-widest text-primary">{profile.role}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-8 rounded-3xl border border-white/10"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20">
            <MessageSquare className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Share Your Experience</h2>
            <p className="text-muted-foreground text-sm">Help others by sharing your learning journey.</p>
          </div>
        </div>
        
        <div>
          {testimonial?.is_published ? (
            <div className="bg-black/40 border border-emerald-500/30 p-8 rounded-2xl text-center space-y-4 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
              
              <div className="flex justify-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-500 fill-current drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                ))}
              </div>
              <p className="italic text-xl md:text-2xl font-medium leading-relaxed max-w-3xl mx-auto text-white/90">
                "{testimonial.review_text}"
              </p>
              
              <div className="pt-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-bold border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  Published & Live on Homepage
                </div>
                <p className="text-xs text-muted-foreground mt-4 font-medium uppercase tracking-wider">
                  Locked — Active on Global Network
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveTestimonial} className="space-y-8 max-w-2xl">
              <div className="space-y-3 bg-black/30 p-6 rounded-2xl border border-white/5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="p-2 rounded-xl focus:outline-none transition-all hover:scale-110 hover:bg-white/5 group"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${star <= formData.rating ? "text-yellow-500 fill-current drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" : "text-muted-foreground/30 group-hover:text-muted-foreground/50"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Related Program (Optional)</Label>
                <select 
                  className="flex h-14 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-base font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all appearance-none"
                  value={formData.course_id}
                  onChange={e => setFormData({...formData, course_id: e.target.value})}
                >
                  <option value="none">General Platform Experience</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Your Review</Label>
                <Textarea 
                  value={formData.review_text} 
                  onChange={e => setFormData({...formData, review_text: e.target.value})} 
                  placeholder="How has Capital Gain Hub shifted your edge in the markets?"
                  className="min-h-[160px] bg-black/50 border-white/10 rounded-xl text-base p-4 resize-y focus-visible:ring-primary"
                  required
                />
              </div>

              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl text-sm font-bold border ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}
                >
                  {message.text}
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4 border-t border-white/5">
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="h-14 px-8 text-base font-bold rounded-xl shadow-[0_0_20px_rgba(23,163,74,0.2)] hover:shadow-[0_0_30px_rgba(23,163,74,0.4)] transition-all bg-primary text-primary-foreground w-full sm:w-auto"
                >
                  {saving ? "Transmitting..." : testimonial ? "Update Review" : "Transmit Review"}
                </Button>
                {testimonial && !testimonial.is_published && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 rounded-lg text-sm font-bold border border-amber-500/20">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Pending Network Approval
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
