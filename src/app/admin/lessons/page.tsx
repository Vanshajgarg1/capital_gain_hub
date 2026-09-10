"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Trash2, AlertCircle, PlayCircle, Eye, EyeOff, Film, Layers, Clock, CheckCircle2, Video, Loader2, FolderTree, ArrowUp, ArrowDown, UploadCloud } from "lucide-react";
import { 
  getCourseById, 
  getAllCourses,
  getModulesByCourseId,
  getLessonsByModuleId,
  createLesson, 
  updateLesson, 
  deleteLesson,
  reorderLesson
} from "@/lib/api/courses";
import { Course, Module, Lesson } from "@/types";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
export default function AdminLessonsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form state
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_provider: "youtube",
    video_id: "",
    video_asset_id: "",
    duration: 0,
    order_index: 0,
    is_free_preview: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reorderingLessonId, setReorderingLessonId] = useState<string | null>(null);

  const [durationStatus, setDurationStatus] = useState<'IDLE' | 'DETECTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  
  // Mux upload states
  const [uploadState, setUploadState] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'ERROR'>('IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isUploadActive = uploadState === 'UPLOADING' || uploadState === 'PROCESSING';
  const isSaveDisabled = isSubmitting || isUploadActive || !formData.title.trim() || durationStatus === 'DETECTING' || (formData.video_provider === 'mux' && uploadState !== 'READY' && !formData.video_id);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchModules(selectedCourseId);
    } else {
      setModules([]);
      setSelectedModuleId("");
      setLessons([]);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedModuleId) {
      fetchLessons(selectedModuleId);
    } else {
      setLessons([]);
    }
  }, [selectedModuleId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await getAllCourses();
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to establish network connection");
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async (courseId: string) => {
    try {
      setDataLoading(true);
      const fetchedModules = await getModulesByCourseId(courseId);
      setModules(fetchedModules);
      // Auto-select first module if none selected or if selected module doesn't belong to this course
      const moduleExists = fetchedModules.find(m => m.id === selectedModuleId);
      if (!moduleExists && fetchedModules.length > 0) {
        setSelectedModuleId(fetchedModules[0].id);
      } else if (fetchedModules.length === 0) {
        setSelectedModuleId("");
        setLessons([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to decrypt structural matrix");
    } finally {
      setDataLoading(false);
    }
  };

  const fetchLessons = async (moduleId: string) => {
    try {
      setLessonsLoading(true);
      const fetchedLessons = await getLessonsByModuleId(moduleId);
      setLessons(fetchedLessons);
    } catch (err: any) {
      setError(err.message || "Failed to fetch lessons");
    } finally {
      setLessonsLoading(false);
    }
  };

  const currentLessons = lessons;

  const handleReorderLesson = async (lessonId: string, direction: 'up' | 'down') => {
    if (reorderingLessonId || !selectedModuleId) return;
    try {
      setError("");
      setReorderingLessonId(lessonId);
      await reorderLesson(lessonId, direction);
      await fetchLessons(selectedModuleId);
    } catch (err: any) {
      setError(err.message || "Failed to reorder lesson");
    } finally {
      setReorderingLessonId(null);
    }
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
          setFormData(prev => ({
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

  const handleCreate = async () => {
    if (!selectedModuleId) return;
    try {
      setIsSubmitting(true);
      setError("");

      const payload = {
        title: formData.title,
        description: formData.description,
        video_provider: formData.video_provider,
        video_id: formData.video_id,
        video_asset_id: formData.video_asset_id,
        duration: formData.duration,
        module_id: selectedModuleId,
        order_index: formData.order_index || (lessons.length > 0 ? Math.max(...lessons.map(l => l.order_index)) + 1 : 0),
        is_free_preview: formData.is_free_preview,
      };

      const createdLesson = await createLesson(payload);
      
      // Refresh the list immediately so the new lesson appears in the background
      await fetchLessons(selectedModuleId);

      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to commit node");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingLesson || !selectedModuleId) return;
    try {
      setIsSubmitting(true);
      await updateLesson(editingLesson.id, {
        title: formData.title,
        description: formData.description,
        video_provider: formData.video_provider,
        video_id: formData.video_id,
        video_asset_id: formData.video_asset_id,
        duration: formData.duration,
        order_index: formData.order_index,
        is_free_preview: formData.is_free_preview,
      });
      await fetchLessons(selectedModuleId);
      setIsEditModalOpen(false);
      setEditingLesson(null);
    } catch (err: any) {
      setError(err.message || "Failed to sync modifications");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingLesson || !selectedModuleId) return;
    try {
      setIsSubmitting(true);
      await deleteLesson(editingLesson.id);
      await fetchLessons(selectedModuleId);
      setIsDeleteModalOpen(false);
      setEditingLesson(null);
    } catch (err: any) {
      setError(err.message || "Failed to purge node");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      video_provider: "youtube",
      video_id: "",
      video_asset_id: "",
      duration: 0,
      order_index: currentLessons.length > 0 ? currentLessons[currentLessons.length - 1].order_index + 1 : 1,
      is_free_preview: false,
    });
  };

  const openCreateModal = () => {
    resetForm();
    setDurationStatus('IDLE');
    setUploadState('IDLE');
    setUploadProgress(0);
    setUploadError("");
    setIsCreateModalOpen(true);
  };

  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({ 
      title: lesson.title, 
      description: lesson.description || "",
      video_provider: lesson.video_provider || "youtube",
      video_id: lesson.video_id || "",
      video_asset_id: lesson.video_asset_id || "",
      duration: lesson.duration || 0,
      order_index: lesson.order_index,
      is_free_preview: lesson.is_free_preview || false,
    });
    setDurationStatus('IDLE');
    setUploadState('IDLE');
    setUploadProgress(0);
    setUploadError("");
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setIsDeleteModalOpen(true);
  };

  // Format seconds to mm:ss
  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-6 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 animate-pulse">Establishing Data Link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Data Node Matrix</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Lessons <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-400">Database</span></h1>
            <p className="text-xl text-muted-foreground font-medium">Manage payload streams and media nodes.</p>
          </div>
          <Button 
            onClick={openCreateModal}
            disabled={!selectedModuleId}
            className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all group overflow-hidden relative"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="flex items-center gap-2 relative z-10">
              <Plus className="w-4 h-4" /> Instantiate Node
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

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card border border-white/5 bg-black/40 rounded-[2rem] overflow-hidden mb-8 p-6 flex flex-col md:flex-row md:items-center gap-6 shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-transparent" />
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 md:flex-none">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-0.5">Target Program</label>
              <Select value={selectedCourseId} onValueChange={(val) => setSelectedCourseId(val || "")} disabled={loading}>
                <SelectTrigger className="w-full md:w-[250px] lg:w-[300px] h-10 bg-transparent border-0 px-0 text-white font-bold focus:ring-0 focus:border-0 shadow-none hover:bg-transparent data-[state=open]:text-emerald-500 transition-colors">
                  <SelectValue placeholder="Select stream..." />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10 text-white rounded-xl backdrop-blur-xl">
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id} className="focus:bg-emerald-500/20 focus:text-white cursor-pointer py-3 rounded-lg mx-1 my-1">
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="hidden md:block w-[1px] h-12 bg-white/10" />
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <FolderTree className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1 md:flex-none">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-0.5">Structural Block (Module)</label>
              <Select value={selectedModuleId} onValueChange={(val) => setSelectedModuleId(val || "")} disabled={loading || dataLoading || modules.length === 0}>
                <SelectTrigger className="w-full md:w-[250px] lg:w-[300px] h-10 bg-transparent border-0 px-0 text-white font-bold focus:ring-0 focus:border-0 shadow-none hover:bg-transparent data-[state=open]:text-emerald-500 transition-colors">
                  <SelectValue placeholder={modules.length === 0 ? "No blocks available" : "Select block..."} />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10 text-white rounded-xl backdrop-blur-xl">
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id} className="focus:bg-emerald-500/20 focus:text-white cursor-pointer py-3 rounded-lg mx-1 my-1">
                      {module.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
               <Video className="w-4 h-4 text-emerald-500" />
             </div>
             <h2 className="text-xl font-bold tracking-tight">Active Nodes</h2>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-black/60">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-24 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Index</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12 min-w-[200px]">Node Designation</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Asset Link</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Length</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Preview</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12 pr-6">Directives</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessonsLoading ? (
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col justify-center items-center gap-4">
                        <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 animate-pulse">Decrypting Matrix...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !selectedModuleId ? (
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <FolderTree className="w-12 h-12 text-white/10" />
                        <div>Require structural block selection to view nodes.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : currentLessons.length === 0 ? (
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <Video className="w-12 h-12 text-white/10" />
                        <div>No data nodes located within this block.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentLessons.map((lesson, index) => (
                    <TableRow key={lesson.id} className="border-white/5 hover:bg-emerald-500/5 transition-colors group">
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-white disabled:opacity-30 disabled:hover:text-muted-foreground"
                            onClick={() => handleReorderLesson(lesson.id, "up")}
                            disabled={index === 0 || reorderingLessonId !== null}
                          >
                            {reorderingLessonId === lesson.id ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> : <ArrowUp className="h-4 w-4" />}
                          </Button>
                          <div className="w-8 h-8 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono text-muted-foreground font-bold group-hover:text-emerald-500 transition-colors">
                            {lesson.order_index}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-white disabled:opacity-30 disabled:hover:text-muted-foreground"
                            onClick={() => handleReorderLesson(lesson.id, "down")}
                            disabled={index === currentLessons.length - 1 || reorderingLessonId !== null}
                          >
                            {reorderingLessonId === lesson.id ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> : <ArrowDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-white text-base py-4">
                        {lesson.title}
                      </TableCell>
                      <TableCell>
                        {lesson.video_id ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                              <PlayCircle className="w-3 h-3" />
                            </div>
                            <span className="capitalize text-xs font-bold tracking-wider text-muted-foreground group-hover:text-white transition-colors">{lesson.video_provider}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold uppercase tracking-widest text-red-500/50">Missing Asset</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground group-hover:text-white transition-colors">
                        {formatDuration(lesson.duration)}
                      </TableCell>
                      <TableCell className="text-center">
                        {lesson.is_free_preview ? (
                          <div className="w-6 h-6 rounded-full border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <Eye className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mx-auto text-muted-foreground opacity-50">
                            <EyeOff className="w-3 h-3" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
                            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-black/90 border-white/10 backdrop-blur-xl w-40 rounded-xl p-1">
                            <DropdownMenuItem className="cursor-pointer focus:bg-emerald-500/20 focus:text-emerald-400 py-3 rounded-lg" onClick={() => openEditModal(lesson)}>
                              <Edit className="h-4 w-4 mr-2" /> Modify Node
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer focus:bg-red-500/20 text-red-500 focus:text-red-400 py-3 rounded-lg"
                              onClick={() => openDeleteModal(lesson)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Purge Node
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>

      {/* Create/Edit Lesson Dialog */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setEditingLesson(null);
        }
      }}>
        <DialogContent className="glass-card border border-white/10 bg-black/95 backdrop-blur-2xl p-0 overflow-hidden max-w-2xl rounded-[2rem]">
          <div className={cn(
            "absolute top-0 left-0 w-full h-1 bg-gradient-to-r to-transparent",
            isEditModalOpen ? "from-cyan-500" : "from-emerald-500"
          )} />
          <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black tracking-tighter text-white flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
                  isEditModalOpen ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                )}>
                  {isEditModalOpen ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                {isEditModalOpen ? "Modify Data Node" : "Instantiate Node"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium">
                {isEditModalOpen ? "Update node parameters and assets." : "Create a new media payload in the matrix."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="sm:col-span-2 space-y-2">
                  <label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Node Designation</label>
                  <Input 
                    id="title" 
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Volume Analysis" 
                    className={cn(
                      "bg-black/50 border-white/10 h-14 rounded-xl text-lg font-bold text-white transition-colors",
                      isEditModalOpen ? "focus:border-cyan-500" : "focus:border-emerald-500"
                    )}
                    disabled={isUploadActive}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="order" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Matrix Index</label>
                  <Input 
                    id="order" 
                    type="number"
                    value={formData.order_index} 
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                    className={cn(
                      "bg-black/50 border-white/10 h-14 rounded-xl font-mono text-white transition-colors",
                      isEditModalOpen ? "focus:border-cyan-500" : "focus:border-emerald-500"
                    )}
                    disabled={isUploadActive}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Node Abstract</label>
                <textarea 
                  id="description" 
                  rows={3}
                  className={cn(
                    "flex w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none transition-colors resize-none",
                    isEditModalOpen ? "focus-visible:border-cyan-500" : "focus-visible:border-emerald-500",
                    isUploadActive && "opacity-50 cursor-not-allowed"
                  )}
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary payload for this node..."
                  disabled={isUploadActive}
                />
              </div>

              <div className="space-y-4 border border-white/5 bg-white/[0.02] p-6 rounded-2xl">
                 <div className="flex items-center gap-2 mb-2">
                   <Film className="w-4 h-4 text-emerald-500" />
                   <h3 className="text-lg font-black tracking-tighter">Media Source</h3>
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Network Provider</label>
                   <div className="relative">
                     <Select value={formData.video_provider} onValueChange={(val) => setFormData({ ...formData, video_provider: val || "youtube" })} disabled={isUploadActive}>
                       <SelectTrigger className={cn(
                         "h-12 bg-black/50 border-white/10 rounded-xl text-white font-bold transition-colors",
                         isEditModalOpen ? "focus:border-cyan-500 focus:ring-cyan-500/20" : "focus:border-emerald-500 focus:ring-emerald-500/20"
                       )}>
                         <SelectValue placeholder="Select provider" />
                       </SelectTrigger>
                       <SelectContent className="bg-black/90 border-white/10 text-white rounded-xl backdrop-blur-xl">
                         <SelectItem value="youtube" className="focus:bg-white/10 cursor-pointer">YouTube (Public)</SelectItem>
                         <SelectItem value="mux" className="focus:bg-white/10 cursor-pointer">Mux</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>

                    {formData.video_provider === "youtube" && (
                      <div className="space-y-2 pt-2">
                        <label htmlFor="video_id" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asset Signature / URL</label>
                        <Input 
                          id="video_id" 
                          value={formData.video_id} 
                          onChange={(e) => setFormData({ ...formData, video_id: e.target.value })}
                          placeholder="e.g. dQw4w9WgXcQ" 
                          className={cn(
                            "bg-black/50 border-white/10 h-12 rounded-xl text-white font-mono text-sm transition-colors",
                            isEditModalOpen ? "focus:border-cyan-500" : "focus:border-emerald-500"
                          )}
                          disabled={isUploadActive}
                        />
                      </div>
                    )}
                    {formData.video_provider === "mux" && (
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
                            {formData.video_id ? 'Replace Mux Asset' : 'Select Video File'}
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
                        {uploadState === 'READY' && <p className="text-emerald-500 text-xs font-bold">Video ready! Playback ID: {formData.video_id}</p>}
                        {formData.video_id && uploadState === 'IDLE' && <p className="text-muted-foreground text-xs font-bold">Current Playback ID: {formData.video_id}</p>}
                      </div>
                    )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Duration
                  </label>
                  <div className="bg-black/50 border border-white/10 h-12 rounded-xl px-4 flex items-center text-white font-mono text-sm opacity-70 cursor-not-allowed">
                    {durationStatus === 'DETECTING' ? (
                      <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Detecting duration...</span>
                    ) : durationStatus === 'ERROR' ? (
                      <span className="text-red-500/80">Could not determine video duration.</span>
                    ) : formData.duration > 0 ? (
                      formatDuration(formData.duration)
                    ) : (
                      <span className="text-muted-foreground">Auto-detected after video selection</span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col justify-center">
                  <label className={cn(
                      "flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors flex-1 mt-6",
                      formData.is_free_preview ? (isEditModalOpen ? "bg-cyan-500/10 border-cyan-500/30" : "bg-emerald-500/10 border-emerald-500/30") : "border-white/10 bg-black/50 hover:bg-white/5",
                      isUploadActive && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={formData.is_free_preview}
                        onChange={(e) => setFormData({ ...formData, is_free_preview: e.target.checked })}
                        disabled={isUploadActive}
                      />
                      <div className={cn(
                        "w-5 h-5 rounded-md border border-white/20 bg-black transition-colors flex items-center justify-center",
                        isEditModalOpen ? "peer-checked:bg-cyan-500 peer-checked:border-cyan-500" : "peer-checked:bg-emerald-500 peer-checked:border-emerald-500"
                      )}>
                        <CheckCircle2 className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity scale-50 peer-checked:scale-100" />
                      </div>
                    </div>
                    <div className="font-bold text-sm text-white">Public Preview Access</div>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-8 pt-6 border-t border-white/5 flex gap-3 sm:justify-end">
              <Button 
                variant="outline" 
                onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} 
                disabled={isSubmitting || isUploadActive}
                className="h-12 rounded-xl border-white/10 bg-transparent hover:bg-white/5 text-white font-bold"
              >
                Abort
              </Button>
              <Button 
                onClick={isEditModalOpen ? handleUpdate : handleCreate} 
                disabled={isSaveDisabled}
                className={cn(
                  "h-12 px-6 rounded-xl text-white font-bold transition-all disabled:opacity-50",
                  isEditModalOpen 
                    ? "bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]" 
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                )}
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Transmitting...</> : (isEditModalOpen ? "Update Node" : "Instantiate Node")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Lesson Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="glass-card border border-white/10 bg-black/95 backdrop-blur-2xl p-0 overflow-hidden max-w-md rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-900" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tighter text-white">
                Purge Data Node
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-2 font-medium leading-relaxed">
                  <>
                    Are you sure you want to delete this lesson?
                  </>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-3 sm:justify-start mt-8">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteModalOpen(false)} 
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-xl border-white/10 bg-transparent hover:bg-white/5 text-white font-bold"
              >
                Abort
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)]"
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Erasing...</> : "Confirm Purge"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
