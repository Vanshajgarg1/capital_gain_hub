import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/lib/api/courses";
import CourseClientView from "./CourseClientView";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export default async function CourseDetailPage({ params }: CoursePageProps) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  return <CourseClientView course={course} />;
}
