import { CourseCard } from "@/components/public/CourseCard";
import { getPublishedCourses } from "@/lib/api/courses";
import { ScrollReveal } from "@/components/ui/animations/ScrollReveal";

export const metadata = {
  title: "Courses | Capital Gain Hub",
  description: "Browse our premium trading courses.",
};

export default async function CoursesPage() {
  const courses = await getPublishedCourses();

  return (
    <div className="pt-32 pb-32 relative overflow-hidden">
      {/* Background Ambient Glow & Texture */}
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <ScrollReveal className="max-w-4xl mx-auto text-center mb-20">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Programs</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Structured trading education designed to take you from a complete beginner to a confident market participant. Master the markets with our premium curriculum.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {courses === null ? (
            <div className="col-span-full py-32 text-center glass-card rounded-3xl border border-red-500/10 bg-red-500/5">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold text-red-500 mb-3">Courses are temporarily unavailable</h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">Please try again later. Our team has been notified.</p>
            </div>
          ) : courses.length > 0 ? (
            courses.map((course, index) => (
              <ScrollReveal key={course.id} delay={index * 0.1}>
                <CourseCard course={course} />
              </ScrollReveal>
            ))
          ) : (
            <div className="col-span-full py-32 text-center glass-card rounded-3xl border border-white/5 bg-black/40">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🚧</span>
              </div>
              <h3 className="text-2xl font-bold mb-3">No courses available yet.</h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">We are currently updating our curriculum. Check back soon for our latest premium offerings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
