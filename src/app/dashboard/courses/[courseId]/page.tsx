import { notFound } from "next/navigation";
import { getCourseById } from "@/lib/api/courses";
import LearningClientView from "./LearningClientView";

interface CoursePlayerProps {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePlayerPage({ params }: CoursePlayerProps) {
  const { courseId } = await params;
  
  try {
    const course = await getCourseById(courseId);
    
    if (!course) {
      notFound();
    }
    
    return <LearningClientView course={course} />;
  } catch (error) {
    console.error("Error fetching course for player:", error);
    notFound();
  }
}
