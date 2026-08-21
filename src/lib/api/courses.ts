import { supabase } from "@/lib/supabase";
import { Course } from "@/types";
import { MOCK_COURSES } from "@/lib/mock-data";

/**
 * Fetches all published and non-archived courses.
 * Falls back to MOCK_COURSES if the database is empty or fails.
 */
export async function getPublishedCourses(): Promise<Course[]> {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching courses from Supabase:", error);
      return MOCK_COURSES.filter(c => c.is_published);
    }

    if (!data || data.length === 0) {
      return MOCK_COURSES.filter(c => c.is_published);
    }

    return data as Course[];
  } catch (err) {
    console.error("Failed to fetch courses:", err);
    return MOCK_COURSES.filter(c => c.is_published);
  }
}

/**
 * Fetches a single published course by its slug, including its modules and lessons.
 * Falls back to MOCK_COURSES if not found or if query fails.
 */
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  try {
    const { data: course, error } = await supabase
      .from("courses")
      .select("*, modules(*, lessons(*))")
      .eq("slug", slug)
      .eq("is_published", true)
      .eq("is_archived", false)
      .single();

    if (error || !course) {
      console.error(`Error fetching course ${slug} from Supabase:`, error?.message || "Not found");
      const fallback = MOCK_COURSES.find((c) => c.slug === slug && c.is_published);
      return fallback || null;
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
    const fallback = MOCK_COURSES.find((c) => c.slug === slug && c.is_published);
    return fallback || null;
  }
}
