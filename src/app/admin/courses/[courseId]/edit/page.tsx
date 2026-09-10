"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Save, AlertCircle, Database, Layers, Tag, Image as ImageIcon, Clock, CheckCircle2, Link as LinkIcon, DollarSign, Loader2, Archive } from "lucide-react";
import Link from "next/link";
import { getCourseById, updateCourse } from "@/lib/api/courses";
import { UpdateCourseInput } from "@/types";
import { motion } from "framer-motion";

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState<UpdateCourseInput>({});

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const course = await getCourseById(courseId);
        setFormData({
          title: course.title,
          slug: course.slug,
          description: course.description,
          thumbnail_url: course.thumbnail_url,
          price: course.price,
          level: course.level,
          duration: course.duration,
          is_published: course.is_published,
          is_featured: course.is_featured,
          is_archived: course.is_archived,
          overview_heading: course.overview_heading || "",
          overview_description: course.overview_description || "",
          learning_outcomes: course.learning_outcomes || [],
          features: course.features || [],
          instructor_details: course.instructor_details || { name: "", role: "", bio: "", avatar_url: "" },
        });
      } catch (err: any) {
        setError("Failed to load program data stream");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    
    setFormData({ ...formData, title, slug });
  };

  const handleArrayChange = (field: "learning_outcomes" | "features", index: number, value: string) => {
    const newArray = [...(formData[field] || [])];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field: "learning_outcomes" | "features") => {
    setFormData({ ...formData, [field]: [...(formData[field] || []), ""] });
  };

  const removeArrayItem = (field: "learning_outcomes" | "features", index: number) => {
    const newArray = [...(formData[field] || [])];
    newArray.splice(index, 1);
    setFormData({ ...formData, [field]: newArray });
  };

  const moveArrayItem = (field: "learning_outcomes" | "features", index: number, direction: 'up' | 'down') => {
    const newArray = [...(formData[field] || [])];
    if (direction === 'up' && index > 0) {
      [newArray[index - 1], newArray[index]] = [newArray[index], newArray[index - 1]];
    } else if (direction === 'down' && index < newArray.length - 1) {
      [newArray[index + 1], newArray[index]] = [newArray[index], newArray[index + 1]];
    }
    setFormData({ ...formData, [field]: newArray });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await updateCourse(courseId, formData);
      setSuccess("Program parameters updated successfully.");
      // clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      if (err.code === '23505') { 
        setError("A program with this signature already exists.");
      } else {
        setError(err.message || "Failed to transmit updates");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-red-500 border-t-transparent animate-spin mb-6 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 animate-pulse">Establishing Data Link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[150px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-10 relative z-10">
        <form onSubmit={handleSubmit}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="flex items-start gap-4">
              <Link href="/admin/courses">
                <Button type="button" variant="ghost" className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all p-0 flex items-center justify-center shrink-0">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Parameter Configuration</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Modify <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">Program</span></h1>
                <p className="text-xl text-muted-foreground font-medium">Update deployment variables and constraints.</p>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={saving} 
              className="h-12 px-8 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all group overflow-hidden relative"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <span className="flex items-center gap-2 relative z-10">
                {saving ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Transmitting...</>
                ) : (
                  <><Save className="w-5 h-5 mr-2" /> Transmit Updates</>
                )}
              </span>
            </Button>
          </motion.div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 mb-8 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl flex items-center gap-3 mb-8 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-bold">{success}</span>
              </div>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-8"
          >
            <Card className="glass-card border border-white/5 bg-black/40 rounded-[2rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-transparent" />
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tighter">Core Parameters</h2>
                </div>

                <div className="space-y-4 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Tag className="w-3 h-3" /> Program Designation
                      </Label>
                      <Input 
                        id="title" 
                        required
                        placeholder="e.g. Advanced Options Trading"
                        className="bg-black/50 border-white/10 h-14 rounded-xl text-lg font-bold text-white focus:border-red-500 transition-colors" 
                        value={formData.title || ""}
                        onChange={handleTitleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <LinkIcon className="w-3 h-3" /> URL Signature (Slug)
                      </Label>
                      <Input 
                        id="slug" 
                        required
                        placeholder="e.g. advanced-options-trading"
                        className="bg-black/50 border-white/10 h-14 rounded-xl font-mono text-sm text-white focus:border-red-500 transition-colors" 
                        value={formData.slug || ""}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Overview (Description)</Label>
                    <textarea 
                      id="description" 
                      required
                      rows={4}
                      placeholder="Detail the exact methodologies and strategic edge this program provides..."
                      className="flex w-full rounded-xl border border-white/10 bg-black/50 px-4 py-4 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-red-500 transition-colors resize-y min-h-[120px]"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="thumbnail_url" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="w-3 h-3" /> Cover Asset URL
                    </Label>
                    <div className="flex gap-4">
                      <Input 
                        id="thumbnail_url" 
                        required
                        type="url"
                        placeholder="https://..."
                        className="bg-black/50 border-white/10 h-14 rounded-xl text-white focus:border-red-500 transition-colors flex-1 font-mono text-sm" 
                        value={formData.thumbnail_url || ""}
                        onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                      />
                      {formData.thumbnail_url && (
                        <div className="w-14 h-14 rounded-xl border border-white/10 overflow-hidden bg-white/5 shrink-0">
                          <img src={formData.thumbnail_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'; }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-3 h-3" /> Capital Required (₹)
                    </Label>
                    <Input 
                      id="price" 
                      type="number" 
                      required
                      min="0"
                      step="0.01"
                      className="bg-black/50 border-white/10 h-14 rounded-xl text-lg font-bold text-white focus:border-emerald-500 transition-colors" 
                      value={formData.price || 0}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Layers className="w-3 h-3" /> Clearance Level
                    </Label>
                    <div className="relative">
                      <select 
                        id="level" 
                        className="flex h-14 w-full items-center justify-between rounded-xl border border-white/10 bg-black/50 px-4 text-sm font-bold text-white focus:border-red-500 transition-colors appearance-none cursor-pointer"
                        value={formData.level || "Beginner"}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      >
                        <option value="Beginner" className="bg-black text-white">Beginner</option>
                        <option value="Intermediate" className="bg-black text-white">Intermediate</option>
                        <option value="Advanced" className="bg-black text-white">Advanced</option>
                        <option value="Beginner → Advanced" className="bg-black text-white">Beginner → Advanced</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronLeft className="w-4 h-4 text-muted-foreground -rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Time Investment
                    </Label>
                    <Input 
                      id="duration" 
                      required
                      placeholder="e.g. 12 Hours"
                      className="bg-black/50 border-white/10 h-14 rounded-xl font-bold text-white focus:border-red-500 transition-colors" 
                      value={formData.duration || ""}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/5 flex-wrap">
                  <Label 
                    htmlFor="is_published" 
                    className="flex items-center gap-4 cursor-pointer p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors flex-1 min-w-[200px]"
                  >
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        id="is_published" 
                        className="peer sr-only"
                        checked={formData.is_published || false}
                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      />
                      <div className="w-6 h-6 rounded-md border border-white/20 bg-black peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity scale-50 peer-checked:scale-100" />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-white mb-0.5">Activate Program</div>
                      <div className="text-xs text-muted-foreground">Make visible on the public network.</div>
                    </div>
                  </Label>

                  <Label 
                    htmlFor="is_featured" 
                    className="flex items-center gap-4 cursor-pointer p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors flex-1 min-w-[200px]"
                  >
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        id="is_featured" 
                        className="peer sr-only"
                        checked={formData.is_featured || false}
                        onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      />
                      <div className="w-6 h-6 rounded-md border border-white/20 bg-black peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-colors flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity scale-50 peer-checked:scale-100" />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-white mb-0.5">Prioritize (Featured)</div>
                      <div className="text-xs text-muted-foreground">Pin to top of command center.</div>
                    </div>
                  </Label>
                  
                  <Label 
                    htmlFor="is_archived" 
                    className="flex items-center gap-4 cursor-pointer p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-red-500/5 transition-colors flex-1 min-w-[200px]"
                  >
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        id="is_archived" 
                        className="peer sr-only"
                        checked={formData.is_archived || false}
                        onChange={(e) => setFormData({ ...formData, is_archived: e.target.checked })}
                      />
                      <div className="w-6 h-6 rounded-md border border-white/20 bg-black peer-checked:bg-red-500 peer-checked:border-red-500 transition-colors flex items-center justify-center">
                        <Archive className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity scale-50 peer-checked:scale-100" />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-red-500 mb-0.5">Archive Program</div>
                      <div className="text-xs text-red-400/70">Remove from active listings globally.</div>
                    </div>
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border border-white/5 bg-black/40 rounded-[2rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-transparent" />
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tighter">Curriculum & Overview</h2>
                </div>

                <div className="space-y-4 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                  <div className="space-y-2">
                    <Label htmlFor="overview_heading" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      Overview Heading
                    </Label>
                    <Input 
                      id="overview_heading" 
                      placeholder="e.g. System Architecture"
                      className="bg-black/50 border-white/10 h-14 rounded-xl font-bold text-white focus:border-cyan-500 transition-colors" 
                      value={formData.overview_heading || ""}
                      onChange={(e) => setFormData({ ...formData, overview_heading: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="overview_description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Overview Description</Label>
                    <textarea 
                      id="overview_description" 
                      rows={3}
                      placeholder="Optional description under the heading..."
                      className="flex w-full rounded-xl border border-white/10 bg-black/50 px-4 py-4 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-cyan-500 transition-colors resize-y min-h-[100px]"
                      value={formData.overview_description || ""}
                      onChange={(e) => setFormData({ ...formData, overview_description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4 bg-white/[0.02] p-6 rounded-2xl border border-white/5 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Learning Outcomes (Bullet Points)</Label>
                    <Button type="button" size="sm" variant="outline" onClick={() => addArrayItem("learning_outcomes")} className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-xs">
                      + Add Item
                    </Button>
                  </div>
                  
                  {formData.learning_outcomes?.map((outcome, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input 
                        value={outcome}
                        onChange={(e) => handleArrayChange("learning_outcomes", idx, e.target.value)}
                        placeholder="e.g. Master market mechanics..."
                        className="bg-black/50 border-white/10 h-12 rounded-xl text-sm text-white focus:border-cyan-500 flex-1" 
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => moveArrayItem("learning_outcomes", idx, "up")} disabled={idx === 0} className="h-10 w-10 shrink-0">↑</Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => moveArrayItem("learning_outcomes", idx, "down")} disabled={idx === formData.learning_outcomes!.length - 1} className="h-10 w-10 shrink-0">↓</Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem("learning_outcomes", idx)} className="h-10 w-10 text-red-500 shrink-0">×</Button>
                    </div>
                  ))}
                  {(!formData.learning_outcomes || formData.learning_outcomes.length === 0) && (
                    <div className="text-sm text-muted-foreground p-4 text-center border border-dashed border-white/10 rounded-xl">No outcomes added.</div>
                  )}
                </div>

                <div className="space-y-4 bg-white/[0.02] p-6 rounded-2xl border border-white/5 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Course Features (Right Sidebar)</Label>
                    <Button type="button" size="sm" variant="outline" onClick={() => addArrayItem("features")} className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-xs">
                      + Add Feature
                    </Button>
                  </div>
                  
                  {formData.features?.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input 
                        value={feature}
                        onChange={(e) => handleArrayChange("features", idx, e.target.value)}
                        placeholder="e.g. Lifetime Access"
                        className="bg-black/50 border-white/10 h-12 rounded-xl text-sm text-white focus:border-cyan-500 flex-1" 
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => moveArrayItem("features", idx, "up")} disabled={idx === 0} className="h-10 w-10 shrink-0">↑</Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => moveArrayItem("features", idx, "down")} disabled={idx === formData.features!.length - 1} className="h-10 w-10 shrink-0">↓</Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem("features", idx)} className="h-10 w-10 text-red-500 shrink-0">×</Button>
                    </div>
                  ))}
                  {(!formData.features || formData.features.length === 0) && (
                    <div className="text-sm text-muted-foreground p-4 text-center border border-dashed border-white/10 rounded-xl">No features added.</div>
                  )}
                </div>

                <div className="space-y-4 bg-white/[0.02] p-6 rounded-2xl border border-white/5 mt-6">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Instructor Details (Right Sidebar)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      placeholder="Instructor Name (e.g. Capital Gain Hub)"
                      className="bg-black/50 border-white/10 h-12 rounded-xl text-sm text-white focus:border-cyan-500" 
                      value={formData.instructor_details?.name || ""}
                      onChange={(e) => setFormData({ ...formData, instructor_details: { ...formData.instructor_details, name: e.target.value } })}
                    />
                    <Input 
                      placeholder="Instructor Role (e.g. Master Trader)"
                      className="bg-black/50 border-white/10 h-12 rounded-xl text-sm text-white focus:border-cyan-500" 
                      value={formData.instructor_details?.role || ""}
                      onChange={(e) => setFormData({ ...formData, instructor_details: { ...formData.instructor_details, role: e.target.value } })}
                    />
                    <Input 
                      placeholder="Avatar URL"
                      className="bg-black/50 border-white/10 h-12 rounded-xl text-sm text-white focus:border-cyan-500 md:col-span-2" 
                      value={formData.instructor_details?.avatar_url || ""}
                      onChange={(e) => setFormData({ ...formData, instructor_details: { ...formData.instructor_details, avatar_url: e.target.value } })}
                    />
                    <textarea 
                      placeholder="Short Bio / Description..."
                      rows={3}
                      className="flex w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-cyan-500 transition-colors resize-y md:col-span-2"
                      value={formData.instructor_details?.bio || ""}
                      onChange={(e) => setFormData({ ...formData, instructor_details: { ...formData.instructor_details, bio: e.target.value } })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
