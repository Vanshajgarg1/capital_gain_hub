"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Edit, Trash2, CheckCircle2, XCircle, AlertCircle, MessageSquare, Star, Search
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Course = {
  id: string;
  title: string;
};

type Testimonial = {
  id: string;
  student_name: string;
  review_text: string;
  rating: number;
  course_id: string | null;
  is_published: boolean;
  created_at: string;
  course?: Course | null;
};

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    student_name: "",
    review_text: "",
    rating: 5,
    course_id: "none",
    is_published: false,
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [testimonialsResponse, coursesResponse] = await Promise.all([
        supabase.from("testimonials").select(`
          *,
          course:courses(id, title)
        `).order("created_at", { ascending: false }),
        supabase.from("courses").select("id, title").order("title")
      ]);

      if (testimonialsResponse.error) throw testimonialsResponse.error;
      if (coursesResponse.error) throw coursesResponse.error;

      const formattedTestimonials = (testimonialsResponse.data || []).map((t: any) => ({
        ...t,
        course: t.course ? (Array.isArray(t.course) ? t.course[0] : t.course) : null
      }));

      setTestimonials(formattedTestimonials);
      setCourses(coursesResponse.data || []);
    } catch (err: any) {
      console.error("Error fetching testimonials:");
      setError(err.message || "Failed to load testimonials.");
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setFormData({ student_name: "", review_text: "", rating: 5, course_id: "none", is_published: true });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (t: Testimonial) => {
    setFormData({
      student_name: t.student_name,
      review_text: t.review_text,
      rating: t.rating,
      course_id: t.course_id || "none",
      is_published: t.is_published,
    });
    setEditingId(t.id);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_name.trim() || !formData.review_text.trim()) return;
    
    setFormLoading(true);
    try {
      const payload = {
        student_name: formData.student_name,
        review_text: formData.review_text,
        rating: formData.rating,
        course_id: formData.course_id === "none" ? null : formData.course_id,
        is_published: formData.is_published,
      };

      if (editingId) {
        const { error } = await supabase.from("testimonials").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert(payload);
        if (error) throw error;
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save testimonial.");
    } finally {
      setFormLoading(false);
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("testimonials").update({ is_published: !currentStatus }).eq("id", id);
      if (error) throw error;
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, is_published: !currentStatus } : t));
    } catch (err: any) {
      console.error("Publish error:", err);
      alert("Failed to update status.");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from("testimonials").delete().eq("id", deletingId);
      if (error) throw error;
      setIsDeleteDialogOpen(false);
      setTestimonials(prev => prev.filter(t => t.id !== deletingId));
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Failed to delete testimonial.");
    } finally {
      setFormLoading(false);
      setDeletingId(null);
    }
  };

  const filteredTestimonials = testimonials.filter(t => 
    t.student_name.toLowerCase().includes(search.toLowerCase()) || 
    t.review_text.toLowerCase().includes(search.toLowerCase()) ||
    (t.course?.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Testimonials</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage student reviews and social proof.</p>
        </div>
        <Button onClick={openAddDialog} className="shadow-[0_0_20px_rgba(23,163,74,0.2)] bg-primary text-primary-foreground font-bold h-12 px-6 rounded-xl hover:scale-105 transition-transform">
          <Plus className="w-5 h-5 mr-2" />
          Add Testimonial
        </Button>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-3xl border border-white/10 overflow-hidden relative"
      >
        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-white/5 bg-black/40">
          <div className="flex items-center gap-4">
            <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Review Database</h2>
              <p className="text-muted-foreground text-sm">Control the visibility of student feedback.</p>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search reviews..." 
              className="pl-12 h-12 bg-black/50 border-white/10 rounded-xl focus-visible:ring-primary text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="p-0">
          {error ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
              <p className="text-red-400 font-bold text-lg">{error}</p>
              <Button variant="outline" className="mt-6 border-red-500/20 hover:bg-red-500/10 text-red-400" onClick={fetchData}>Retry Connection</Button>
            </div>
          ) : loading ? (
            <div className="divide-y divide-white/5">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-8 flex items-start gap-6 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-white/5"></div>
                  <div className="flex-1 space-y-4">
                    <div className="h-5 w-1/4 bg-white/5 rounded-md"></div>
                    <div className="h-4 w-3/4 bg-white/5 rounded-md"></div>
                    <div className="h-4 w-1/2 bg-white/5 rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTestimonials.length === 0 ? (
            <div className="p-20 text-center text-muted-foreground flex flex-col items-center">
              <MessageSquare className="w-16 h-16 mb-6 opacity-20" />
              <p className="text-xl font-bold text-white">No testimonials found.</p>
              <p className="text-base mt-2">Adjust your search or add a new one.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTestimonials.map((t) => (
                <div key={t.id} className="p-6 md:p-8 flex flex-col sm:flex-row gap-8 hover:bg-white/5 transition-colors group">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-xl tracking-tight">{t.student_name}</h3>
                        {!t.is_published && (
                          <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">Pending</span>
                        )}
                      </div>
                      <div className="flex items-center text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < t.rating ? 'fill-current' : 'text-muted-foreground/20'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-base leading-relaxed mb-4">"{t.review_text}"</p>
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
                      {t.course && (
                        <span className="bg-primary/10 text-primary px-3 py-1.5 rounded border border-primary/20">
                          {t.course.title}
                        </span>
                      )}
                      <span className="text-muted-foreground bg-white/5 px-3 py-1.5 rounded border border-white/5">
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end justify-center shrink-0">
                    <Button 
                      variant="outline" 
                      onClick={() => togglePublish(t.id, t.is_published)}
                      className={cn(
                        "w-full sm:w-32 h-10 font-bold border",
                        t.is_published 
                          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/50" 
                          : "border-white/10 text-muted-foreground bg-black/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {t.is_published ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                      {t.is_published ? "Live" : "Hidden"}
                    </Button>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button variant="outline" className="flex-1 sm:flex-none h-10 w-12 border-white/10 bg-black/50 hover:bg-white/10 hover:border-white/20" onClick={() => openEditDialog(t)}>
                        <Edit className="w-4 h-4 text-white" />
                      </Button>
                      <Button variant="outline" className="flex-1 sm:flex-none h-10 w-12 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40" onClick={() => { setDeletingId(t.id); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* CREATE/EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-black/95 backdrop-blur-3xl border-white/10 shadow-2xl p-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-cyan-400 to-blue-500" />
          <DialogHeader className="p-6 md:p-8 bg-white/5 border-b border-white/5">
            <DialogTitle className="text-2xl font-bold tracking-tight">{editingId ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              {editingId ? "Update the review details below." : "Create a new student review manually."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Student Name</Label>
              <Input 
                value={formData.student_name} 
                onChange={e => setFormData({...formData, student_name: e.target.value})} 
                placeholder="e.g. Rahul Sharma"
                className="bg-black/50 border-white/10 h-12 text-base focus-visible:ring-primary"
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Review Text</Label>
              <Textarea 
                value={formData.review_text} 
                onChange={e => setFormData({...formData, review_text: e.target.value})} 
                placeholder="This course changed my life..."
                className="min-h-[120px] bg-black/50 border-white/10 text-base focus-visible:ring-primary resize-y"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Rating (1-5)</Label>
                <Input 
                  type="number"
                  min="1" max="5"
                  value={formData.rating} 
                  onChange={e => setFormData({...formData, rating: parseInt(e.target.value) || 5})} 
                  className="bg-black/50 border-white/10 h-12 text-base focus-visible:ring-primary text-center font-bold text-xl"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Linked Course</Label>
                <select 
                  className="flex h-12 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 appearance-none transition-all"
                  value={formData.course_id}
                  onChange={e => setFormData({...formData, course_id: e.target.value})}
                >
                  <option value="none">General Review</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              <input 
                type="checkbox" 
                id="is_published" 
                checked={formData.is_published}
                onChange={e => setFormData({...formData, is_published: e.target.checked})}
                className="w-5 h-5 rounded border-white/20 bg-black/50 text-primary focus:ring-primary focus:ring-offset-black"
              />
              <Label htmlFor="is_published" className="cursor-pointer font-bold text-sm">Publish immediately to live site</Label>
            </div>
            <DialogFooter className="mt-8 pt-4 gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={formLoading} className="h-12 px-6 rounded-xl border-white/10 hover:bg-white/5 text-base">
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold shadow-[0_0_20px_rgba(23,163,74,0.3)] hover:shadow-[0_0_30px_rgba(23,163,74,0.5)] transition-all text-base">
                {formLoading ? "Transmitting..." : "Save Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[450px] bg-black/95 backdrop-blur-3xl border-red-500/20 shadow-2xl p-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-2xl font-bold tracking-tight text-red-500 flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              Terminate Record
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base mt-2">
              Are you sure you want to permanently delete this testimonial? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-8 pt-4 gap-3">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={formLoading} className="flex-1 h-12 rounded-xl border-white/10 hover:bg-white/5 font-bold">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formLoading} className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all">
              {formLoading ? "Deleting..." : "Confirm Deletion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
