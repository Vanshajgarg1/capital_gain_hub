"use client";

import { useEffect, useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, AlertCircle, User as UserIcon, BookOpen, Clock, Activity, Calendar, Users, Database, Shield, Zap, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { User, Enrollment, Course, LessonProgress } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Extended types for UI
type EnrichedStudent = User & {
  enrollments: Enrollment[];
  progress: LessonProgress[];
  overallProgress: number; // 0-100
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<EnrichedStudent[]>([]);
  const [courses, setCourses] = useState<Record<string, { title: string; thumbnail_url: string; total_lessons: number }>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedStudent, setSelectedStudent] = useState<EnrichedStudent | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch courses and their total lessons count for progress calculation
      const { data: coursesData, error: coursesErr } = await supabase
        .from("courses")
        .select("id, title, thumbnail_url, modules(lessons(id))");

      if (coursesErr) throw new Error("Failed to decrypt program directory: " + coursesErr.message);

      const courseMap: Record<string, { title: string; thumbnail_url: string; total_lessons: number }> = {};
      
      coursesData?.forEach((c: any) => {
        let total = 0;
        if (c.modules) {
          c.modules.forEach((m: any) => {
            if (m.lessons) total += m.lessons.length;
          });
        }
        courseMap[c.id] = { title: c.title, thumbnail_url: c.thumbnail_url, total_lessons: total };
      });
      setCourses(courseMap);

      // 2. Fetch profiles
      const { data: profilesData, error: profilesErr } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesErr) throw new Error("Failed to query user registry: " + profilesErr.message);

      // 3. Fetch enrollments
      const { data: enrollmentsData, error: enrollmentsErr } = await supabase
        .from("enrollments")
        .select("*");

      if (enrollmentsErr) {
        console.warn("Telemetry interference. Enrollments unavailable.", enrollmentsErr.message);
      }
      
      const safeEnrollments = enrollmentsData || [];

      // 4. Fetch progress (Catch known 42501 error gracefully)
      const { data: progressData, error: progressErr } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("is_completed", true);

      if (progressErr) {
        console.warn("Permission denied. Progress tracking inactive.", progressErr.message);
      }
      
      const safeProgress = progressData || [];

      // Combine Data
      const enrichedStudents: EnrichedStudent[] = (profilesData || []).map((profile: User) => {
        const studentEnrollments = safeEnrollments.filter((e) => e.user_id === profile.id);
        const studentProgress = safeProgress.filter((p) => p.user_id === profile.id);

        let totalEnrolledLessons = 0;
        let totalCompleted = 0;

        studentEnrollments.forEach((enrollment) => {
          const courseInfo = courseMap[enrollment.course_id];
          if (courseInfo) {
            totalEnrolledLessons += courseInfo.total_lessons;
          }
        });
        
        totalCompleted = studentProgress.length;
        const overallProgress = totalEnrolledLessons > 0 ? Math.round((totalCompleted / totalEnrolledLessons) * 100) : 0;

        return {
          ...profile,
          enrollments: studentEnrollments,
          progress: studentProgress,
          overallProgress: Math.min(overallProgress, 100)
        };
      });

      setStudents(enrichedStudents);
    } catch (err: any) {
      setError(err.message || "Critical system failure during data retrieval.");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const lowerQ = searchQuery.toLowerCase();
    return students.filter(
      (s) => s.full_name?.toLowerCase().includes(lowerQ) || s.email?.toLowerCase().includes(lowerQ)
    );
  }, [students, searchQuery]);

  const openStudentDetails = (student: EnrichedStudent) => {
    setSelectedStudent(student);
    setIsSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-6 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 animate-pulse">Scanning User Registry...</p>
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
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Global Roster</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-400">Directory</span></h1>
            <p className="text-xl text-muted-foreground font-medium">Monitor active personnel and track progression telemetry.</p>
          </div>
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
          className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden mb-8 p-6 shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-transparent" />
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Query by designation or communication frequency (email)..." 
              className="pl-12 bg-black/50 border-white/10 h-14 rounded-xl text-white focus:border-emerald-500 transition-colors placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                 <Users className="w-4 h-4 text-emerald-500" />
               </div>
               <h2 className="text-xl font-bold tracking-tight">Active Operatives</h2>
             </div>
             <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
               {filteredStudents.length} Results
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-black/60">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12 pl-6">Operative Profile</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Clearance</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Phone</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Initial Login</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Active Streams</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12 pr-6">Completion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <UserIcon className="w-12 h-12 text-white/10" />
                        <div>No operatives matching the specified query.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student, index) => (
                    <TableRow 
                      key={student.id} 
                      className="border-white/5 hover:bg-emerald-500/5 transition-colors cursor-pointer group"
                      onClick={() => openStudentDetails(student)}
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 bg-black border border-white/10 group-hover:border-emerald-500/50 transition-colors">
                            <AvatarImage src={student.avatar_url || ""} />
                            <AvatarFallback className="bg-transparent text-emerald-500 font-bold font-mono">
                              {student.full_name?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {student.full_name || "Unknown Operative"}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">{student.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[9px] uppercase tracking-widest font-black border",
                            student.role === "ADMIN" 
                              ? "bg-red-500/10 text-red-500 border-red-500/30" 
                              : "bg-white/5 text-muted-foreground border-white/10"
                          )}
                        >
                          {student.role || "STUDENT"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono group-hover:text-white transition-colors">
                        {student.phone || "Not provided"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono group-hover:text-white transition-colors">
                        {new Date(student.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-sm font-bold text-white group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 group-hover:text-emerald-500 transition-colors">
                          {student.enrollments.length}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-3">
                          <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-1000 relative",
                                student.overallProgress === 100 ? "bg-emerald-500" : "bg-emerald-500/70"
                              )}
                              style={{ width: `${student.overallProgress}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </div>
                          </div>
                          <span className={cn(
                            "text-xs font-mono font-bold w-9 text-right",
                            student.overallProgress === 100 ? "text-emerald-500" : "text-muted-foreground group-hover:text-white"
                          )}>
                            {student.overallProgress}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md w-full glass-card border-l border-white/10 bg-black/95 backdrop-blur-2xl overflow-y-auto p-0">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-transparent" />
          
          {selectedStudent && (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="p-8 pb-6 border-b border-white/5 bg-white/[0.01]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Student Details</SheetTitle>
                  <SheetDescription>View student profile and enrollment data.</SheetDescription>
                </SheetHeader>
                
                <div className="flex items-start gap-5">
                  <Avatar className="h-16 w-16 bg-black border-2 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <AvatarImage src={selectedStudent.avatar_url || ""} />
                    <AvatarFallback className="text-emerald-500 text-xl font-bold font-mono">
                      {selectedStudent.full_name?.charAt(0).toUpperCase() || <UserIcon className="w-8 h-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="pt-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
                      Operative Profile
                    </div>
                    <h2 className="text-2xl font-black tracking-tighter text-white leading-none mb-2">
                      {selectedStudent.full_name || "Unknown User"}
                    </h2>
                    <p className="text-muted-foreground text-sm font-mono mb-3">
                      {selectedStudent.email}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[9px] uppercase tracking-widest font-black border",
                          selectedStudent.role === "ADMIN" 
                            ? "bg-red-500/10 text-red-500 border-red-500/30" 
                            : "bg-white/5 text-muted-foreground border-white/10"
                        )}
                      >
                        {selectedStudent.role || "STUDENT"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-sm border border-white/10">
                        <Phone className="w-3 h-3" />
                        {selectedStudent.phone || "Not provided"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-sm border border-white/10">
                        <Calendar className="w-3 h-3" />
                        Init: {new Date(selectedStudent.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8 flex-1 bg-black/40">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Database className="w-5 h-5 text-emerald-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl font-black text-white mb-1">{selectedStudent.enrollments.length}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Streams</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Activity className="w-5 h-5 text-cyan-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl font-black text-white mb-1">{selectedStudent.overallProgress}%</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mean Efficiency</div>
                  </div>
                </div>

                {/* Courses List */}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-500" /> Authorized Access
                  </h3>
                  
                  {selectedStudent.enrollments.length === 0 ? (
                    <div className="bg-white/[0.02] border border-white/5 border-dashed rounded-2xl p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
                      <Shield className="w-8 h-8 text-white/10" />
                      <div>Operative possesses zero program authorizations.</div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {selectedStudent.enrollments.map((enrollment) => {
                        const course = courses[enrollment.course_id];
                        return (
                          <div key={enrollment.id} className="bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/5 rounded-2xl p-4 flex items-center gap-4 group">
                            <div className="w-16 h-16 rounded-xl bg-black border border-white/10 overflow-hidden flex-shrink-0 relative">
                              {course?.thumbnail_url ? (
                                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen className="w-6 h-6 opacity-30 text-white" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white truncate text-sm group-hover:text-emerald-400 transition-colors">
                                {course?.title || "Classified Program"}
                              </h4>
                              <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1.5 mb-3">
                                <Clock className="w-3 h-3 mr-1" />
                                Auth: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${selectedStudent.overallProgress}%` }}
                                  />
                                </div>
                                <span className="text-[9px] text-muted-foreground font-mono font-bold tracking-widest">
                                  {course ? `${Math.round((selectedStudent.overallProgress / 100) * course.total_lessons)}/${course.total_lessons}` : '0/0'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
