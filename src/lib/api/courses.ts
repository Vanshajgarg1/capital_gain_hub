import { supabase } from "@/lib/supabase";
import { Course, CreateCourseInput, UpdateCourseInput, Module, CreateModuleInput, UpdateModuleInput, Lesson, CreateLessonInput, UpdateLessonInput, Enrollment } from "@/types";

/**
 * Fetches all published and non-archived courses.
 */
export async function getPublishedCourses(): Promise<Course[] | null> {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching courses from Supabase:", error);
      return null;
    }

    if (!data) return [];

    return data as Course[];
  } catch (err) {
    console.error("Failed to fetch courses:", err);
    return null;
  }
}

/**
 * Fetches all courses regardless of status. Used by admin.
 */
export async function getAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Course[];
}

/**
 * Fetches a single published course by its slug, including its modules and lessons.
 */
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  try {
    const { data: course, error } = await supabase
      .from("courses")
      .select("*, modules(*, lessons(*))")
      .eq("slug", slug)
      .eq("is_published", true)
      .eq("is_archived", false)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching course ${slug} from Supabase:`, error.message, error.code, error.details);
      throw new Error(`Failed to fetch course: ${error.message}`);
    }

    if (!course) {
      return null;
    }

    // Sort modules and lessons based on order_index
    if (course.modules) {
      course.modules.sort((a: any, b: any) => a.order_index - b.order_index);
      course.modules.forEach((module: any) => {
        if (module.lessons) {
          module.lessons.sort((a: any, b: any) => a.order_index - b.order_index);
        }
      });
    }

    return course as Course;
  } catch (err) {
    console.error(`Failed to fetch course ${slug}:`, err);
    throw err;
  }
}

/**
 * Fetches a single course by its ID, including its modules and lessons. Used by admin.
 */
export async function getCourseById(id: string): Promise<Course> {
  const { data: course, error } = await supabase
    .from("courses")
    .select("*, modules(*, lessons(*))")
    .eq("id", id)
    .single();

  if (error) throw error;

  if (course.modules) {
    course.modules.sort((a: any, b: any) => a.order_index - b.order_index);
    course.modules.forEach((module: any) => {
      if (module.lessons) {
        module.lessons.sort((a: any, b: any) => a.order_index - b.order_index);
      }
    });
  }

  return course as Course;
}

/**
 * Fetches only modules for a given course ID without nested lessons. Used by admin modules list.
 */
export async function getModulesByCourseId(courseId: string): Promise<Module[]> {
  const { data: modules, error } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (error) throw error;

  return modules as Module[];
}

/**
 * Fetches only lessons for a given module ID. Used to prevent N+1 and over-fetching in admin pages.
 */
export async function getLessonsByModuleId(moduleId: string): Promise<Lesson[]> {
  const { data: lessons, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });

  if (error) throw error;

  return lessons as Lesson[];
}

export async function createCourse(courseData: CreateCourseInput): Promise<Course> {
  const { data, error } = await supabase
    .from("courses")
    .insert(courseData)
    .select()
    .single();

  if (error) throw error;
  return data as Course;
}

export async function updateCourse(id: string, courseData: UpdateCourseInput): Promise<Course> {
  const { data, error } = await supabase
    .from("courses")
    .update(courseData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Course;
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function createModule(moduleData: CreateModuleInput): Promise<Module> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch("/api/admin/modules", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(moduleData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to create module");
  }

  return res.json();
}

export async function updateModule(id: string, moduleData: UpdateModuleInput): Promise<Module> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`/api/admin/modules/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(moduleData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to update module");
  }

  return res.json();
}

export async function reorderModule(id: string, direction: 'up' | 'down'): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`/api/admin/modules/${id}/reorder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ direction }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to reorder module");
  }
}

export async function deleteModule(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`/api/admin/modules/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to delete module");
  }
}

export async function createLesson(lessonData: CreateLessonInput): Promise<Lesson> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch("/api/admin/lessons", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(lessonData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to create lesson");
  }

  return res.json();
}

export async function updateLesson(id: string, lessonData: UpdateLessonInput): Promise<Lesson> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`/api/admin/lessons/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(lessonData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to update lesson");
  }

  return res.json();
}

export async function deleteLesson(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`/api/admin/lessons/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to delete lesson");
  }
}

export async function reorderLesson(id: string, direction: 'up' | 'down'): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`/api/admin/lessons/${id}/reorder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ direction }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to reorder lesson");
  }
}

// ==========================================
// Enrollment & Progress APIs
// ==========================================

export async function getEnrollment(courseId: string): Promise<Enrollment | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching enrollment:", error.message, error.code, error.details);
    return null;
  }
  return data as Enrollment | null;
}

// Client-side enrollment has been removed for security reasons.
// All enrollments must go through the secure /api/enroll endpoint.

export async function getMyEnrollments(): Promise<Enrollment[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from("enrollments")
    .select("*, course:courses(*)")
    .eq("user_id", session.user.id)
    .order("enrolled_at", { ascending: false });

  if (error) {
    console.error("Error fetching enrollments:", error);
    return [];
  }
  return data as Enrollment[];
}

export async function getCourseProgress(courseId: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // 1. Get all lesson IDs for this course
  const { data: modules, error: moduleError } = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", courseId);

  if (moduleError || !modules || modules.length === 0) return 0;
  
  const moduleIds = modules.map(m => m.id);

  const { data: lessons, error: lessonError } = await supabase
    .from("lessons")
    .select("id")
    .in("module_id", moduleIds);

  if (lessonError || !lessons || lessons.length === 0) return 0;

  const totalLessons = lessons.length;
  const lessonIds = lessons.map(l => l.id);

  // 2. Count how many of these lessons are completed by the user
  const { count, error: progressError } = await supabase
    .from("lesson_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_completed", true)
    .in("lesson_id", lessonIds);

  if (progressError) return 0;

  const completedLessons = count || 0;
  return Math.round((completedLessons / totalLessons) * 100);
}

export async function getCourseLessonProgress(courseId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. Get all lesson IDs for this course
  const { data: modules, error: moduleError } = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", courseId);

  if (moduleError || !modules || modules.length === 0) return [];
  
  const moduleIds = modules.map(m => m.id);

  const { data: lessons, error: lessonError } = await supabase
    .from("lessons")
    .select("id")
    .in("module_id", moduleIds);

  if (lessonError || !lessons || lessons.length === 0) return [];

  const lessonIds = lessons.map(l => l.id);

  // 2. Fetch the actual progress rows
  const { data: progress, error: progressError } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds);

  if (progressError) return [];

  return progress;
}

export async function upsertLessonProgress(
  lessonId: string, 
  progress: { is_completed?: boolean; completed_at?: string | null; last_watched_position?: number }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const payload = {
    user_id: user.id,
    lesson_id: lessonId,
    ...progress
  };
  
  console.log("Upserting lesson progress:", payload);

  const { data, error } = await supabase
    .from("lesson_progress")
    .upsert(payload, { onConflict: "user_id,lesson_id" })
    .select()
    .single();

  if (error) {
    console.error("Lesson Progress Upsert Error Details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
  return data;
}

export interface DetailedCourseProgress {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  course: Course;
  modules: {
    id: string;
    title: string;
    order_index: number;
    totalLessons: number;
    completedLessons: number;
    progressPercentage: number;
    lessons: {
      id: string;
      title: string;
      description?: string;
      duration?: number;
      order_index: number;
      isCompleted: boolean;
      isCurrent: boolean;
      isLocked: boolean;
    }[];
  }[];
}

export async function getDetailedCourseProgress(courseId: string): Promise<DetailedCourseProgress | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Fetch course details with modules and lessons
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*, modules(*, lessons(*))")
    .eq("id", courseId)
    .single();

  if (courseError || !course) return null;

  // sort modules and lessons
  let allLessons: any[] = [];
  if (course.modules) {
    course.modules.sort((a: any, b: any) => a.order_index - b.order_index);
    course.modules.forEach((module: any) => {
      if (module.lessons) {
        module.lessons.sort((a: any, b: any) => a.order_index - b.order_index);
        allLessons = allLessons.concat(module.lessons);
      }
    });
  }

  const totalLessons = allLessons.length;
  if (totalLessons === 0) {
    return {
      totalLessons: 0,
      completedLessons: 0,
      progressPercentage: 0,
      nextLessonId: null,
      nextLessonTitle: null,
      course: course as Course,
      modules: [],
    };
  }

  const lessonIds = allLessons.map(l => l.id);
  const { data: progressData, error: progressError } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds);

  const safeProgress = progressError ? [] : (progressData || []);
  const completedLessons = safeProgress.filter(p => p.is_completed).length;
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);

  let nextLessonId = null;
  let nextLessonTitle = null;
  let foundFirstIncomplete = false;

  const enrichedModules = (course.modules || []).map((module: any) => {
    let modCompletedLessons = 0;
    
    const enrichedLessons = (module.lessons || []).map((lesson: any) => {
      const isCompleted = safeProgress.some(p => p.lesson_id === lesson.id && p.is_completed);
      
      let isCurrent = false;
      let isLocked = false;

      if (isCompleted) {
        modCompletedLessons++;
      } else {
        if (!foundFirstIncomplete) {
          isCurrent = true;
          foundFirstIncomplete = true;
          nextLessonId = lesson.id;
          nextLessonTitle = lesson.title;
        } else {
          isLocked = true;
        }
      }

      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        order_index: lesson.order_index,
        isCompleted,
        isCurrent,
        isLocked,
      };
    });

    const modTotalLessons = enrichedLessons.length;
    const modProgressPercentage = modTotalLessons === 0 ? 0 : Math.round((modCompletedLessons / modTotalLessons) * 100);

    return {
      id: module.id,
      title: module.title,
      order_index: module.order_index,
      totalLessons: modTotalLessons,
      completedLessons: modCompletedLessons,
      progressPercentage: modProgressPercentage,
      lessons: enrichedLessons,
    };
  });

  if (!nextLessonId && allLessons.length > 0) {
     nextLessonId = allLessons[allLessons.length - 1].id;
     nextLessonTitle = "Course Completed";
  }

  return {
    totalLessons,
    completedLessons,
    progressPercentage,
    nextLessonId,
    nextLessonTitle,
    course: course as Course,
    modules: enrichedModules,
  };
}
