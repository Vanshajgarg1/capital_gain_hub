"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, MoreVertical, Edit, Trash2, GripVertical, AlertCircle, PlayCircle, Eye, EyeOff, LayoutGrid, MoveUp, MoveDown, BookOpen, Layers, Clock, Tag, ChevronLeft, ChevronUp, ChevronDown, Video, UploadCloud, CheckCircle2, Settings, Save, PlaySquare, Film, Hash, Loader2 } from "lucide-react";
import Link from "next/link";
import { 
  getCourseById, 
  createModule, 
  updateModule, 
  deleteModule, 
  reorderModule,
  createLesson, 
  updateLesson, 
  deleteLesson 
} from "@/lib/api/courses";
import { supabase } from "@/lib/supabase";
import { Course, Module, Lesson, CreateModuleInput, CreateLessonInput, UpdateLessonInput, UpdateModuleInput } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CurriculumBuilderPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Module Dialog State
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleSaving, setModuleSaving] = useState(false);

  // Lesson Dialog State
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string>("");
  const [lessonData, setLessonData] = useState({
    title: "",
    description: "",
    video_provider: "youtube",
    video_id: "",
    video_asset_id: "",
    duration: 0,
    is_free_preview: false,
  });
  const [lessonSaving, setLessonSaving] = useState(false);

  // Mux upload states
  const [uploadState, setUploadState] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'ERROR'>('IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isUploadActive = uploadState === 'UPLOADING' || uploadState === 'PROCESSING';


  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'module' | 'lesson', id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reorder State
  const [reorderingModuleId, setReorderingModuleId] = useState<string | null>(null);

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const data = await getCourseById(courseId);
      setCourse(data);
    } catch (err: any) {
      setError(err.message || "Failed to load structural matrix");
    } finally {
      setLoading(false);
    }
  };

  const openModuleDialog = (module?: Module) => {
    if (module) {
      setEditingModule(module);
      setModuleTitle(module.title);
    } else {
      setEditingModule(null);
      setModuleTitle("");
    }
    setModuleDialogOpen(true);
  };

  const saveModule = async () => {
    if (!course || !moduleTitle.trim()) return;
    try {
      setModuleSaving(true);
      if (editingModule) {
        await updateModule(editingModule.id, { title: moduleTitle });
      } else {
        const order_index = course.modules?.length ? Math.max(...course.modules.map(m => m.order_index)) + 1 : 0;
        await createModule({ course_id: course.id, title: moduleTitle, order_index });
      }
      setModuleDialogOpen(false);
      loadCourse(); // Reload to get fresh data
    } catch (err: any) {
      setError(err.message || "Failed to save matrix block");
    } finally {
      setModuleSaving(false);
    }
  };

  const moveModule = async (moduleId: string, direction: 'up' | 'down') => {
    if (!course || !course.modules || reorderingModuleId) return;
    try {
      setReorderingModuleId(moduleId);
      setError("");
      await reorderModule(moduleId, direction);
      await loadCourse();
    } catch (err: any) {
      setError(err.message || "Failed to reorder module");
    } finally {
      setReorderingModuleId(null);
    }
  };

  const openLessonDialog = (moduleId: string, lesson?: Lesson) => {
    setActiveModuleId(moduleId);

    if (lesson) {
      setEditingLesson(lesson);
      setLessonData({
        title: lesson.title,
        description: lesson.description || "",
        video_provider: lesson.video_provider || "youtube",
        video_id: lesson.video_id || "",
        video_asset_id: lesson.video_asset_id || "",
        duration: lesson.duration || 0,
        is_free_preview: lesson.is_free_preview || false,
      });
    } else {
      setEditingLesson(null);
      setLessonData({
        title: "",
        description: "",
        video_provider: "youtube",
        video_id: "",
        video_asset_id: "",
        duration: 0,
        is_free_preview: false,
      });
    }
    setUploadState('IDLE');
    setUploadProgress(0);
    setUploadError("");
    setLessonDialogOpen(true);
  };

  const handleMuxUpload = async (file: File) => {
    try {
      setUploadState('UPLOADING');
      setUploadProgress(0);
      setUploadError("");

      // 1. Get Direct Upload URL
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch('/api/video/mux-upload', { 
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { upload_url, upload_id } = await res.json();

      // 2. Upload file via XHR to track progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', upload_url, true);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error('Upload failed'));
        };
        xhr.onerror = () => reject(new Error('Upload network error'));
        xhr.send(file);
      });

      setUploadState('PROCESSING');

      // 3. Poll for readiness
      const poll = async () => {
        const pollRes = await fetch(`/api/video/mux-poll?uploadId=${upload_id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const pollData = await pollRes.json();
        
        if (pollData.status === 'ready' && pollData.asset_id && pollData.playback_id) {
          setUploadState('READY');
          setLessonData(prev => ({
            ...prev,
            video_id: pollData.playback_id,
            video_asset_id: pollData.asset_id,
            duration: Math.round(pollData.duration)
          }));
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        } else if (pollData.status === 'errored') {
          setUploadState('ERROR');
          setUploadError('Processing failed');
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        }
      };

      pollingIntervalRef.current = setInterval(poll, 2000);

    } catch (err: any) {
      setUploadState('ERROR');
      setUploadError(err.message || 'An error occurred during upload');
    }
  };

  const saveLesson = async () => {
    if (!activeModuleId || !lessonData.title.trim()) return;
    try {
      setLessonSaving(true);
      if (editingLesson) {
        await updateLesson(editingLesson.id, lessonData);
      } else {
        const module = course?.modules?.find(m => m.id === activeModuleId);
        const order_index = module?.lessons?.length ? Math.max(...module.lessons.map(l => l.order_index)) + 1 : 0;
        await createLesson({
          module_id: activeModuleId,
          ...lessonData,
          order_index
        });
      }
      setLessonDialogOpen(false);
      loadCourse();
    } catch (err: any) {
      setError(err.message || "Failed to commit node");
    } finally {
      setLessonSaving(false);
    }
  };


  const moveLesson = async (moduleId: string, index: number, direction: 'up' | 'down') => {
    if (!course || !course.modules) return;
    const module = course.modules.find(m => m.id === moduleId);
    if (!module || !module.lessons) return;
    
    const newLessons = [...module.lessons];
    if (direction === 'up' && index > 0) {
      const temp = newLessons[index].order_index;
      newLessons[index].order_index = newLessons[index - 1].order_index;
      newLessons[index - 1].order_index = temp;
      
      await updateLesson(newLessons[index].id, { order_index: newLessons[index].order_index });
      await updateLesson(newLessons[index - 1].id, { order_index: newLessons[index - 1].order_index });
    } else if (direction === 'down' && index < newLessons.length - 1) {
      const temp = newLessons[index].order_index;
      newLessons[index].order_index = newLessons[index + 1].order_index;
      newLessons[index + 1].order_index = temp;
      
      await updateLesson(newLessons[index].id, { order_index: newLessons[index].order_index });
      await updateLesson(newLessons[index + 1].id, { order_index: newLessons[index + 1].order_index });
    }
    loadCourse();
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      if (itemToDelete.type === 'module') {
        await deleteModule(itemToDelete.id);
      } else {
        await deleteLesson(itemToDelete.id);
      }
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      loadCourse();
    } catch (err: any) {
      setError(err.message || "Failed to purge node");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-6 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 animate-pulse">Loading Structural Matrix...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="glass-card p-12 text-center rounded-[2rem] border border-white/5 bg-black/40 text-white max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Matrix Not Found</h2>
          <p className="text-muted-foreground text-sm">The requested structural array could not be located in the database.</p>
          <Link href="/admin/courses">
            <Button className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white">Return to Directory</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isSaveDisabled = lessonSaving || !lessonData.title.trim() || isUploadActive;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none -z-0 -translate-x-1/2 translate-y-1/2" />
      
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex items-start gap-4">
            <Link href="/admin/courses">
              <Button type="button" variant="ghost" className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all p-0 flex items-center justify-center shrink-0">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Structural Matrix</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Configure <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-400">Curriculum</span></h1>
              <p className="text-xl text-muted-foreground font-medium">Build and organize data nodes for: <span className="text-white">{course.title}</span></p>
            </div>
          </div>
          <Button 
            onClick={() => openModuleDialog()} 
            className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all group overflow-hidden relative"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="flex items-center gap-2 relative z-10">
              <Plus className="w-4 h-4" /> Add Module
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

        {(!course.modules || course.modules.length === 0) ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-16 text-center rounded-[2rem] border border-white/5 bg-black/40 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <Layers className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Matrix Empty</h3>
            <p className="text-muted-foreground font-medium mb-8 max-w-sm mx-auto">This program currently has no active modules or lessons.</p>
            <Button 
              onClick={() => openModuleDialog()} 
              variant="outline"
              className="h-12 px-8 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-emerald-500/50 transition-all font-bold"
            >
              <Plus className="w-4 h-4 mr-2 text-emerald-500" /> Initialize First Module
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
              <Accordion className="space-y-4" defaultValue={course.modules.map(m => m.id)}>
              <AnimatePresence>
                {course.modules.map((module, mIndex) => (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: mIndex * 0.05 }}
                  >
                    <AccordionItem value={module.id} className="glass-card rounded-[1.5rem] border border-white/5 bg-black/40 overflow-hidden group">
                      <div className="grid grid-cols-[1fr_auto] items-center w-full pr-4 border-b border-white/5 bg-white/[0.01]">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline text-left [&[data-state=open]>div>svg]:rotate-180">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                              <span className="font-mono text-sm font-bold text-emerald-500">{mIndex + 1}</span>
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Module Block</span>
                              <span className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{module.title}</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 ml-2" />
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white" 
                            disabled={mIndex === 0 || !!reorderingModuleId}
                            onClick={() => moveModule(module.id, 'up')}
                          >
                            {reorderingModuleId === module.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronUp className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white" 
                            disabled={mIndex === course.modules!.length - 1 || !!reorderingModuleId}
                            onClick={() => moveModule(module.id, 'down')}
                          >
                            {reorderingModuleId === module.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <div className="w-[1px] h-4 bg-white/10 mx-1" />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white"
                            onClick={() => openModuleDialog(module)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-red-500/70 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => {
                              setItemToDelete({ type: 'module', id: module.id });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <AccordionContent className="p-6 pt-4 bg-black/20 pb-6">
                        <div className="space-y-3">
                          {module.lessons?.map((lesson, lIndex) => (
                            <div key={lesson.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-xl group/lesson hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground group-hover/lesson:text-white transition-colors">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white group-hover/lesson:text-emerald-400 transition-colors leading-tight">
                                      {lIndex + 1}. {lesson.title}
                                    </span>
                                    {lesson.is_free_preview && (
                                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-emerald-500/30">Preview</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <span className="flex items-center gap-1"><PlaySquare className="w-3 h-3" /> {lesson.video_provider}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(lesson.duration / 60)}:{String(lesson.duration % 60).padStart(2, '0')}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover/lesson:opacity-100 transition-opacity ml-12 sm:ml-0 bg-black/40 sm:bg-transparent rounded-lg p-1 sm:p-0 border border-white/5 sm:border-none">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white" 
                                  disabled={lIndex === 0}
                                  onClick={() => moveLesson(module.id, lIndex, 'up')}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white" 
                                  disabled={lIndex === module.lessons!.length - 1}
                                  onClick={() => moveLesson(module.id, lIndex, 'down')}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                                <div className="w-[1px] h-4 bg-white/10 mx-1 hidden sm:block" />
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white" 
                                  onClick={() => openLessonDialog(module.id, lesson)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-lg text-red-500/70 hover:text-red-400 hover:bg-red-500/10"
                                  onClick={() => {
                                    setItemToDelete({ type: 'lesson', id: lesson.id });
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button 
                            variant="outline" 
                            className="w-full h-12 mt-2 border border-dashed border-white/20 text-muted-foreground hover:text-white hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-xl transition-all"
                            onClick={() => openLessonDialog(module.id)}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Append Lesson Node
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Accordion>
          </div>
        )}
      </div>

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent className="glass-card border border-white/10 bg-black/90 backdrop-blur-xl p-0 overflow-hidden max-w-md rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black tracking-tighter text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-emerald-500" />
                </div>
                {editingModule ? "Modify Module" : "New Module Node"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="moduleTitle" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Block Designation</Label>
                <Input 
                  id="moduleTitle" 
                  value={moduleTitle} 
                  onChange={(e) => setModuleTitle(e.target.value)} 
                  placeholder="e.g. Phase 1: Market Foundations" 
                  className="bg-black/50 border-white/10 h-14 rounded-xl text-lg font-bold text-white focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
            <DialogFooter className="mt-8 flex gap-3 sm:justify-end">
              <Button 
                variant="outline" 
                onClick={() => setModuleDialogOpen(false)} 
                disabled={moduleSaving}
                className="h-12 rounded-xl border-white/10 bg-transparent hover:bg-white/5 text-white font-bold"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveModule} 
                disabled={moduleSaving || !moduleTitle.trim()}
                className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {moduleSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Commit Block"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="glass-card border border-white/10 bg-black/95 backdrop-blur-2xl p-0 overflow-hidden max-w-2xl rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
          <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black tracking-tighter text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <PlaySquare className="w-4 h-4 text-emerald-500" />
                </div>
                {editingLesson ? "Modify Lesson Data" : "Initialize Lesson Node"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="lessonTitle" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Tag className="w-3 h-3" /> Data Node Title
                </Label>
                <Input 
                  id="lessonTitle" 
                  value={lessonData.title} 
                  onChange={(e) => setLessonData({ ...lessonData, title: e.target.value })} 
                  placeholder="e.g. Candlestick Anatomy" 
                  className="bg-black/50 border-white/10 h-14 rounded-xl text-lg font-bold text-white focus:border-emerald-500 transition-colors"
                  disabled={isUploadActive}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lessonDescription" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Hash className="w-3 h-3" /> Brief Overview
                </Label>
                <textarea 
                  id="lessonDescription" 
                  rows={3}
                  value={lessonData.description} 
                  onChange={(e) => setLessonData({ ...lessonData, description: e.target.value })} 
                  placeholder="Key takeaways from this node..."
                  className="flex w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-emerald-500 transition-colors resize-none"
                  disabled={isUploadActive}
                />
              </div>
              
              <div className="space-y-4 border border-white/5 bg-white/[0.02] p-6 rounded-2xl">
                 <div className="flex items-center gap-2 mb-2">
                   <Film className="w-4 h-4 text-emerald-500" />
                   <h3 className="text-lg font-black tracking-tighter">Media Source</h3>
                 </div>
                 
                 <div className="space-y-2">
                   <Label htmlFor="provider" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Provider Network</Label>
                   <div className="relative">
                     <select 
                       id="provider" 
                       className="flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-black/50 px-4 text-sm font-bold text-white focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
                       value={lessonData.video_provider}
                       onChange={(e) => setLessonData({ ...lessonData, video_provider: e.target.value })}
                       disabled={isUploadActive}
                     >
                       <option value="youtube" className="bg-black text-white">YouTube</option>
                       <option value="mux" className="bg-black text-white">Mux</option>
                       <option value="youtube" className="bg-black text-white">YouTube</option>
                       <option value="other" className="bg-black text-white">Other Protocol</option>
                     </select>
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                   </div>
                 </div>

                    {lessonData.video_provider === "youtube" && (
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="videoId" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asset ID / URL</Label>
                        <Input 
                          id="videoId" 
                          value={lessonData.video_id} 
                          onChange={(e) => setLessonData({ ...lessonData, video_id: e.target.value })} 
                          placeholder="e.g. dQw4w9WgXcQ" 
                          className="bg-black/50 border-white/10 h-12 rounded-xl text-white font-mono text-sm focus:border-emerald-500"
                          disabled={isUploadActive}
                        />
                      </div>
                    )}
                    {lessonData.video_provider === "mux" && (
                      <div className="space-y-4 pt-2">
                        <input
                          type="file"
                          accept="video/mp4,video/quicktime,video/x-m4v,video/*"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMuxUpload(file);
                          }}
                        />
                        {uploadState === 'IDLE' || uploadState === 'READY' || uploadState === 'ERROR' ? (
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-12 bg-black/50 border-white/10 hover:bg-white/5 rounded-xl font-bold flex gap-2 items-center text-white"
                          >
                            <UploadCloud className="w-4 h-4" />
                            {lessonData.video_id ? 'Replace Mux Asset' : 'Select Video File'}
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                              <span>{uploadState === 'UPLOADING' ? 'Uploading...' : 'Processing...'}</span>
                              <span>{uploadState === 'UPLOADING' ? `${uploadProgress}%` : <Loader2 className="w-3 h-3 animate-spin" />}</span>
                            </div>
                            <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className="h-full bg-emerald-500 transition-all duration-300" 
                                style={{ width: uploadState === 'UPLOADING' ? `${uploadProgress}%` : '100%' }}
                              />
                            </div>
                          </div>
                        )}
                        {uploadError && <p className="text-red-500 text-xs font-bold">{uploadError}</p>}
                        {uploadState === 'READY' && <p className="text-emerald-500 text-xs font-bold">Video ready! Playback ID: {lessonData.video_id}</p>}
                        {lessonData.video_id && uploadState === 'IDLE' && <p className="text-muted-foreground text-xs font-bold">Current Playback ID: {lessonData.video_id}</p>}
                      </div>
                    )}
              </div>

              <div className="grid grid-cols-2 gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Length (Sec)
                  </Label>
                  <Input 
                    id="duration" 
                    type="number"
                    min="0"
                    value={lessonData.duration} 
                    onChange={(e) => setLessonData({ ...lessonData, duration: parseInt(e.target.value) || 0 })} 
                    className="bg-black/50 border-white/10 h-12 rounded-xl text-white font-mono focus:border-emerald-500 transition-colors"
                    disabled={isUploadActive}
                  />
                </div>
                
                <div className="flex flex-col justify-center">
                  <Label 
                    htmlFor="is_free" 
                    className={cn(
                      "flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors flex-1 mt-6",
                      lessonData.is_free_preview ? "bg-emerald-500/10 border-emerald-500/30" : "border-white/10 bg-black/50 hover:bg-white/5",
                      isUploadActive && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        id="is_free" 
                        className="peer sr-only"
                        checked={lessonData.is_free_preview}
                        onChange={(e) => setLessonData({ ...lessonData, is_free_preview: e.target.checked })}
                        disabled={isUploadActive}
                      />
                      <div className="w-5 h-5 rounded-md border border-white/20 bg-black peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity scale-50 peer-checked:scale-100" />
                      </div>
                    </div>
                    <div className="font-bold text-sm text-white">Public Preview</div>
                  </Label>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-8 pt-6 border-t border-white/5 flex gap-3 sm:justify-end">
              <Button 
                variant="outline" 
                onClick={() => setLessonDialogOpen(false)} 
                disabled={lessonSaving || isUploadActive}
                className="h-12 rounded-xl border-white/10 bg-transparent hover:bg-white/5 text-white font-bold"
              >
                Abort
              </Button>
              <Button 
                onClick={saveLesson} 
                disabled={isSaveDisabled}
                className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {lessonSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</> : "Sync Data Node"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass-card border border-white/10 bg-black/90 backdrop-blur-xl p-0 overflow-hidden max-w-md rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-900" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tighter text-white">
                Purge {itemToDelete?.type === 'module' ? 'Module' : 'Data Node'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-2 font-medium">
                Are you sure you want to permanently erase this {itemToDelete?.type}? This directive is irreversible.
                {itemToDelete?.type === 'module' && " All nested data nodes will also be purged."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-3 sm:justify-start">
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialogOpen(false)} 
                disabled={isDeleting}
                className="flex-1 h-12 rounded-xl border-white/10 bg-transparent hover:bg-white/5 text-white font-bold"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete} 
                disabled={isDeleting}
                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)]"
              >
                {isDeleting ? "Erasing..." : "Confirm Purge"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
