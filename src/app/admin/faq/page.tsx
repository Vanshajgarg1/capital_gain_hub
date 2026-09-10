"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Edit, Trash2, CheckCircle2, XCircle, AlertCircle, HelpCircle, Search
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

type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  order_index: number;
  is_published: boolean;
  created_at: string;
};

export default function AdminFAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
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
    question: "",
    answer: "",
    category: "",
    order_index: 0,
    is_published: true,
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFaqs(data || []);
    } catch (err: any) {
      console.error("Error fetching FAQs:", err);
      setError(err.message || "Failed to load FAQs.");
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setFormData({ question: "", answer: "", category: "", order_index: 0, is_published: true });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (f: FAQ) => {
    setFormData({
      question: f.question,
      answer: f.answer,
      category: f.category || "",
      order_index: f.order_index,
      is_published: f.is_published,
    });
    setEditingId(f.id);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) return;
    
    setFormLoading(true);
    try {
      const payload = {
        question: formData.question,
        answer: formData.answer,
        category: formData.category || null,
        order_index: formData.order_index,
        is_published: formData.is_published,
      };

      if (editingId) {
        const { error } = await supabase.from("faqs").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faqs").insert(payload);
        if (error) throw error;
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save FAQ.");
    } finally {
      setFormLoading(false);
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("faqs").update({ is_published: !currentStatus }).eq("id", id);
      if (error) throw error;
      setFaqs(prev => prev.map(f => f.id === id ? { ...f, is_published: !currentStatus } : f));
    } catch (err: any) {
      console.error("Publish error:", err);
      alert("Failed to update status.");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from("faqs").delete().eq("id", deletingId);
      if (error) throw error;
      setIsDeleteDialogOpen(false);
      setFaqs(prev => prev.filter(f => f.id !== deletingId));
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Failed to delete FAQ.");
    } finally {
      setFormLoading(false);
      setDeletingId(null);
    }
  };

  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(search.toLowerCase()) || 
    f.answer.toLowerCase().includes(search.toLowerCase()) ||
    (f.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 relative">
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Knowledge Base</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage global frequently asked questions.</p>
        </div>
        <Button onClick={openAddDialog} className="shadow-[0_0_20px_rgba(23,163,74,0.2)] bg-primary text-primary-foreground font-bold h-12 px-6 rounded-xl hover:scale-105 transition-transform">
          <Plus className="w-5 h-5 mr-2" />
          Add Entry
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
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">FAQ Database</h2>
              <p className="text-muted-foreground text-sm">Control the answers provided to students globally.</p>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search knowledge base..." 
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
                  <div className="w-12 h-12 rounded-xl bg-white/5"></div>
                  <div className="flex-1 space-y-4">
                    <div className="h-5 w-1/4 bg-white/5 rounded-md"></div>
                    <div className="h-4 w-3/4 bg-white/5 rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="p-20 text-center text-muted-foreground flex flex-col items-center">
              <HelpCircle className="w-16 h-16 mb-6 opacity-20" />
              <p className="text-xl font-bold text-white">No FAQ entries found.</p>
              <p className="text-base mt-2">Adjust your search or add a new entry.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredFaqs.map((f) => (
                <div key={f.id} className="p-6 md:p-8 flex flex-col sm:flex-row gap-8 hover:bg-white/5 transition-colors group">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="font-bold text-xl tracking-tight leading-tight">{f.question}</h3>
                    </div>
                    <p className="text-muted-foreground text-base leading-relaxed mb-6 whitespace-pre-wrap">{f.answer}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider">
                      {f.category ? (
                        <span className="bg-primary/10 text-primary px-3 py-1.5 rounded border border-primary/20">
                          {f.category}
                        </span>
                      ) : (
                        <span className="bg-white/5 text-muted-foreground px-3 py-1.5 rounded border border-white/5">
                          Uncategorized
                        </span>
                      )}
                      <span className="text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        Sequence index: {f.order_index}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end justify-center shrink-0">
                    <Button 
                      variant="outline" 
                      onClick={() => togglePublish(f.id, f.is_published)}
                      className={cn(
                        "w-full sm:w-32 h-10 font-bold border",
                        f.is_published 
                          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/50" 
                          : "border-white/10 text-muted-foreground bg-black/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {f.is_published ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                      {f.is_published ? "Live" : "Hidden"}
                    </Button>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button variant="outline" className="flex-1 sm:flex-none h-10 w-12 border-white/10 bg-black/50 hover:bg-white/10 hover:border-white/20" onClick={() => openEditDialog(f)}>
                        <Edit className="w-4 h-4 text-white" />
                      </Button>
                      <Button variant="outline" className="flex-1 sm:flex-none h-10 w-12 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40" onClick={() => { setDeletingId(f.id); setIsDeleteDialogOpen(true); }}>
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
            <DialogTitle className="text-2xl font-bold tracking-tight">{editingId ? "Edit FAQ Entry" : "New FAQ Entry"}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              {editingId ? "Update the database record below." : "Create a new frequently asked question for the global network."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Inquiry</Label>
              <Input 
                value={formData.question} 
                onChange={e => setFormData({...formData, question: e.target.value})} 
                placeholder="e.g. What is the refund policy?"
                className="bg-black/50 border-white/10 h-12 text-base focus-visible:ring-primary"
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Response</Label>
              <Textarea 
                value={formData.answer} 
                onChange={e => setFormData({...formData, answer: e.target.value})} 
                placeholder="You can request a refund within 30 days..."
                className="min-h-[120px] bg-black/50 border-white/10 text-base focus-visible:ring-primary resize-y"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Category (Optional)</Label>
                <Input 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  placeholder="e.g. Payments"
                  className="bg-black/50 border-white/10 h-12 text-base focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Sequence Index</Label>
                <Input 
                  type="number"
                  value={formData.order_index} 
                  onChange={e => setFormData({...formData, order_index: parseInt(e.target.value) || 0})} 
                  className="bg-black/50 border-white/10 h-12 text-base focus-visible:ring-primary text-center font-bold text-xl"
                  required
                />
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
              <Label htmlFor="is_published" className="cursor-pointer font-bold text-sm">Deploy immediately to live site</Label>
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
              Are you sure you want to permanently delete this FAQ entry? This action cannot be undone.
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
