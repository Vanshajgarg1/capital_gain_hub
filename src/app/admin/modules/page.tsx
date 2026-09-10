"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Trash2, AlertCircle, Layers, FolderTree, Database, Loader2 } from "lucide-react";
import { getAllCourses, getCourseById, getModulesByCourseId, createModule, updateModule, deleteModule } from "@/lib/api/courses";
import { Course, Module } from "@/types";
import { motion } from "framer-motion";

export default function AdminModulesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [error, setError] = useState("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form state
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState({ title: "", order_index: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchModules(selectedCourseId);
    } else {
      setModules([]);
    }
  }, [selectedCourseId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await getAllCourses();
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async (courseId: string) => {
    try {
      setModulesLoading(true);
      const modulesData = await getModulesByCourseId(courseId);
      setModules(modulesData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load structural blocks");
    } finally {
      setModulesLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedCourseId) return;
    try {
      setIsSubmitting(true);
      await createModule({
        course_id: selectedCourseId,
        title: formData.title,
        order_index: formData.order_index,
      });
      await fetchModules(selectedCourseId);
      setIsCreateModalOpen(false);
      setFormData({ title: "", order_index: 0 });
    } catch (err: any) {
      setError(err.message || "Failed to instantiate module block");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingModule || !selectedCourseId) return;
    try {
      setIsSubmitting(true);
      await updateModule(editingModule.id, {
        title: formData.title,
        order_index: formData.order_index,
      });
      await fetchModules(selectedCourseId);
      setIsEditModalOpen(false);
      setEditingModule(null);
    } catch (err: any) {
      setError(err.message || "Failed to sync modifications");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingModule || !selectedCourseId) return;
    try {
      setIsSubmitting(true);
      await deleteModule(editingModule.id);
      await fetchModules(selectedCourseId);
      setIsDeleteModalOpen(false);
      setEditingModule(null);
    } catch (err: any) {
      setError(err.message || "Failed to purge structural block");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ title: "", order_index: (modules.length > 0 ? modules[modules.length - 1].order_index + 1 : 1) });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (module: Module) => {
    setEditingModule(module);
    setFormData({ title: module.title, order_index: module.order_index });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (module: Module) => {
    setEditingModule(module);
    setIsDeleteModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-6 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 animate-pulse">Initializing Module Matrix...</p>
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
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Structural Hierarchy</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Modules <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-400">Database</span></h1>
            <p className="text-xl text-muted-foreground font-medium">Manage and organize high-level curriculum nodes.</p>
          </div>
          <Button 
            onClick={openCreateModal}
            disabled={!selectedCourseId}
            className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all group overflow-hidden relative"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="flex items-center gap-2 relative z-10">
              <Plus className="w-4 h-4" /> Instantiate Module
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
          className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden mb-8 p-6 flex flex-col sm:flex-row sm:items-center gap-6 shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FolderTree className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-0.5">Target Program</label>
              <div className="text-sm font-bold text-white">Select data stream</div>
            </div>
          </div>
          <Select value={selectedCourseId} onValueChange={(val) => setSelectedCourseId(val || "")} disabled={loading}>
            <SelectTrigger className="w-full sm:w-[400px] h-12 bg-black/50 border-white/10 rounded-xl text-white font-medium focus:border-emerald-500 focus:ring-0 transition-colors">
              <SelectValue placeholder="Select a structural matrix..." />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/10 text-white rounded-xl backdrop-blur-xl">
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id} className="focus:bg-emerald-500/20 focus:text-white cursor-pointer py-3 rounded-lg mx-1 my-1">
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
          <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.01]">
             <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
               <Database className="w-4 h-4 text-white" />
             </div>
             <h2 className="text-xl font-bold tracking-tight">Active Nodes</h2>
          </div>
          
          <Table>
            <TableHeader className="bg-black/60">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="w-24 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Index</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Module Designation</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12 pr-6">Directives</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modulesLoading ? (
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableCell colSpan={3} className="text-center py-12">
                    <div className="flex flex-col justify-center items-center gap-4">
                      <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 animate-pulse">Syncing Matrix...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : modules.length === 0 ? (
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableCell colSpan={3} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Layers className="w-12 h-12 text-white/10" />
                      <div>
                        {selectedCourseId ? "No modules found in this matrix." : "Please select a target program to view data blocks."}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                modules.map((module) => (
                  <TableRow key={module.id} className="border-white/5 hover:bg-emerald-500/5 transition-colors group">
                    <TableCell className="text-center">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-xs font-mono text-muted-foreground font-bold group-hover:text-emerald-500 transition-colors">
                        {module.order_index}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-white text-base py-4">
                      {module.title}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
                          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black/90 border-white/10 backdrop-blur-xl w-40 rounded-xl p-1">
                          <DropdownMenuItem className="cursor-pointer focus:bg-emerald-500/20 focus:text-emerald-400 py-3 rounded-lg" onClick={() => openEditModal(module)}>
                            <Edit className="h-4 w-4 mr-2" /> Modify Block
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer focus:bg-red-500/20 text-red-500 focus:text-red-400 py-3 rounded-lg"
                            onClick={() => openDeleteModal(module)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Purge Block
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </motion.div>
      </div>

      {/* Create Module Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="glass-card border border-white/10 bg-black/95 backdrop-blur-2xl p-0 overflow-hidden max-w-md rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black tracking-tighter text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 text-emerald-500" />
                </div>
                Instantiate Module
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium">
                Create a new structural block in the selected matrix.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Block Designation</label>
                <Input 
                  id="title" 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Core Foundations" 
                  className="bg-black/50 border-white/10 h-14 rounded-xl text-lg font-bold text-white focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="order" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Matrix Index (Order)</label>
                <Input 
                  id="order" 
                  type="number"
                  value={formData.order_index} 
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  className="bg-black/50 border-white/10 h-14 rounded-xl font-mono text-white focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
            <DialogFooter className="mt-8 flex gap-3 sm:justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateModalOpen(false)} 
                disabled={isSubmitting}
                className="h-12 rounded-xl border-white/10 bg-transparent hover:bg-white/5 text-white font-bold"
              >
                Abort
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!formData.title || isSubmitting}
                className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</> : "Commit Block"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Module Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="glass-card border border-white/10 bg-black/95 backdrop-blur-2xl p-0 overflow-hidden max-w-md rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-transparent" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black tracking-tighter text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <Edit className="w-4 h-4 text-cyan-500" />
                </div>
                Modify Module
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium">
                Update structural parameters for this node.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <label htmlFor="edit-title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Block Designation</label>
                <Input 
                  id="edit-title" 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-black/50 border-white/10 h-14 rounded-xl text-lg font-bold text-white focus:border-cyan-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-order" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Matrix Index (Order)</label>
                <Input 
                  id="edit-order" 
                  type="number"
                  value={formData.order_index} 
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  className="bg-black/50 border-white/10 h-14 rounded-xl font-mono text-white focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>
            <DialogFooter className="mt-8 flex gap-3 sm:justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)} 
                disabled={isSubmitting}
                className="h-12 rounded-xl border-white/10 bg-transparent hover:bg-white/5 text-white font-bold"
              >
                Abort
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={!formData.title || isSubmitting}
                className="h-12 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</> : "Apply Changes"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Module Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="glass-card border border-white/10 bg-black/95 backdrop-blur-2xl p-0 overflow-hidden max-w-md rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-900" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tighter text-white">
                Purge Module
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-2 font-medium leading-relaxed">
                Are you sure you want to erase <span className="text-white font-bold">"{editingModule?.title}"</span>? 
                This directive is irreversible and will permanently delete all nested lesson nodes.
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
