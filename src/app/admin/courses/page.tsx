"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Edit, Trash2, BookOpen, AlertCircle, Database, Layers, ShieldCheck, PlayCircle } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAllCourses, deleteCourse } from "@/lib/api/courses";
import { Course } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await getAllCourses();
      setCourses(data);
    } catch (err: any) {
      setError(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDeleteClick = (id: string) => {
    setCourseToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    try {
      setIsDeleting(true);
      const result = await deleteCourse(courseToDelete);

      if (result && result.archived) {
        setError("This program has related records and cannot be permanently deleted. It has been archived instead.");
        setCourses(courses.map(c => c.id === courseToDelete ? { ...c, is_archived: true, is_published: false } : c));
      } else {
        setCourses(courses.filter((c) => c.id !== courseToDelete));
      }

      setDeleteDialogOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to delete course");
    } finally {
      setIsDeleting(false);
      setCourseToDelete(null);
    }
  };

  const filteredCourses = courses.filter(
    (c) => c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Curriculum Matrix</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Program <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">Deployment</span></h1>
            <p className="text-xl text-muted-foreground font-medium">Manage course modules, structures, and access levels.</p>
          </div>
          <Link href="/admin/courses/new">
            <Button className="h-12 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all group overflow-hidden relative">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <span className="flex items-center gap-2 relative z-10">
                <Plus className="w-4 h-4" /> Initialize Program
              </span>
            </Button>
          </Link>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card border border-white/5 bg-black/40 rounded-[2rem] overflow-hidden shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-transparent" />
          
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.01]">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search program database..." 
                className="pl-12 bg-black/50 border-white/10 h-12 rounded-xl text-white focus:border-red-500 transition-colors" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button variant="outline" className="h-12 rounded-xl border-white/10 bg-black/50 text-white hover:bg-white/5 font-bold w-full md:w-auto">
                <Layers className="w-4 h-4 mr-2 text-muted-foreground" /> Filter Levels
              </Button>
              <Button variant="outline" className="h-12 rounded-xl border-white/10 bg-black/50 text-white hover:bg-white/5 font-bold w-full md:w-auto">
                <Database className="w-4 h-4 mr-2 text-muted-foreground" /> Status
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-black/50 border-b border-white/5">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="w-[400px] text-xs font-black uppercase tracking-widest text-muted-foreground py-6 px-6">Program Signature</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground py-6">Clearance Level</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground py-6">Capital Required</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-muted-foreground py-6">Network Status</TableHead>
                  <TableHead className="text-right text-xs font-black uppercase tracking-widest text-muted-foreground py-6 px-6">Directives</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-b border-white/5 hover:bg-transparent">
                    <TableCell colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-10 w-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin mb-4"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Accessing Database...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCourses.length === 0 ? (
                  <TableRow className="border-b border-white/5 hover:bg-transparent">
                    <TableCell colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Database className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-bold text-white mb-1">No Programs Found</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Database query returned zero results</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence>
                    {filteredCourses.map((course, idx) => (
                      <motion.tr 
                        key={course.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative group-hover:border-red-500/50 transition-colors">
                              <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <PlayCircle className="w-6 h-6 text-white" />
                              </div>
                            </div>
                            <div>
                              <p className="font-bold text-lg text-white leading-tight group-hover:text-red-400 transition-colors">{course.title}</p>
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                <span className="text-white/70">{course.duration}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span className="font-mono text-[9px]">ID: {course.id.substring(0, 8)}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white">
                            {course.level}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 font-black text-lg text-white">
                          ₹{course.price.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="py-4">
                          {course.is_archived ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" /> Archived
                            </span>
                          ) : course.is_published ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 text-muted-foreground border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">
                              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Draft
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-10 w-10 p-0 items-center justify-center rounded-xl hover:bg-white/10 text-white data-[state=open]:bg-white/10 transition-all cursor-pointer">
                              <MoreHorizontal className="h-5 w-5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-card border border-white/10 bg-black/90 backdrop-blur-xl w-56 p-2 rounded-xl shadow-2xl">
                              <div className="px-2 py-1.5 mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">
                                Program Directives
                              </div>
                              <Link href={`/admin/courses/${course.id}/edit`}>
                                <DropdownMenuItem className="cursor-pointer font-bold rounded-lg focus:bg-white/10 text-white focus:text-white py-2.5">
                                  <Edit className="h-4 w-4 mr-3 text-blue-400" /> Modify Parameters
                                </DropdownMenuItem>
                              </Link>
                              <Link href={`/admin/courses/${course.id}/curriculum`}>
                                <DropdownMenuItem className="cursor-pointer font-bold rounded-lg focus:bg-white/10 text-white focus:text-white py-2.5">
                                  <BookOpen className="h-4 w-4 mr-3 text-emerald-400" /> Structure Matrix
                                </DropdownMenuItem>
                              </Link>
                              <div className="my-1 border-t border-white/5" />
                              <DropdownMenuItem 
                                className="cursor-pointer font-bold rounded-lg focus:bg-red-500/20 text-red-500 focus:text-red-400 py-2.5 group"
                                onClick={() => handleDeleteClick(course.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-3 text-red-500 group-focus:text-red-400" /> Terminate Program
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass-card border border-white/10 bg-black/90 backdrop-blur-xl p-0 overflow-hidden max-w-md rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-900" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tighter text-white">Terminate Program</DialogTitle>
              <DialogDescription className="text-muted-foreground mt-2 font-medium">
                Are you sure you want to delete this program? This directive is irreversible and will permanently purge all associated structural data and matrices from the database.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-3 sm:justify-start">
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialogOpen(false)} 
                disabled={isDeleting}
                className="flex-1 h-12 rounded-xl border-white/10 bg-transparent hover:bg-white/5 text-white font-bold"
              >
                Abort
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete} 
                disabled={isDeleting}
                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)]"
              >
                {isDeleting ? "Purging..." : "Confirm Termination"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
