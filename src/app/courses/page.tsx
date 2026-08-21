import { CourseCard } from "@/components/public/CourseCard";
import { getPublishedCourses } from "@/lib/api/courses";

export const metadata = {
  title: "Courses | Capital Gain Hub",
  description: "Browse our premium trading courses.",
};

export default async function CoursesPage() {
  const courses = await getPublishedCourses();

  return (
    <div className="pt-24 pb-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Programs</h1>
          <p className="text-lg text-muted-foreground">
            Structured trading education designed to take you from a complete beginner to a confident market participant.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.length > 0 ? (
            courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))
          ) : (
            <div className="col-span-full py-16 text-center glass-card rounded-2xl">
              <p className="text-muted-foreground text-lg">No courses available at the moment. Check back soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
