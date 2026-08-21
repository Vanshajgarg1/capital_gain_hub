import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourseBySlug } from "@/lib/api/courses";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, User, PlayCircle, Lock } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export default async function CourseDetailPage({ params }: CoursePageProps) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  return (
    <div className="pb-32">
      {/* Course Hero */}
      <div className="bg-secondary/30 border-b border-border/50 pt-32 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            
            <div className="flex-1 space-y-6">
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none">
                {course.level}
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {course.title}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                {course.description}
              </p>
              
              <div className="flex items-center gap-6 text-muted-foreground pt-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{course.modules?.length || 0} Modules</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span>{course.student_count?.toLocaleString()} Enrolled</span>
                </div>
              </div>
            </div>

            {/* Pricing/Enrollment Card */}
            <div className="w-full lg:w-[400px]">
              <Card className="glass-card shadow-2xl p-2 border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] -z-10" />
                <div className="relative aspect-video rounded-xl overflow-hidden mb-6">
                  <img src={course.thumbnail_url} alt={course.title} className="object-cover w-full h-full" />
                </div>
                <CardContent className="space-y-6 pb-4">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-extrabold">₹{course.price.toLocaleString("en-IN")}</span>
                    <span className="text-muted-foreground mb-1">/ lifetime</span>
                  </div>
                  <Link href="/login" className="block w-full">
                    <Button size="lg" className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20">
                      Enroll Now
                    </Button>
                  </Link>
                  <p className="text-center text-xs text-muted-foreground">
                    30-Day Money-Back Guarantee
                  </p>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div className="container mx-auto px-4 md:px-6 pt-24">
        <div className="grid lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-12">
            
            {/* What you'll learn */}
            <section>
              <h2 className="text-3xl font-bold mb-8">What You'll Learn</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "Master market mechanics and foundational concepts.",
                  "Develop a disciplined trading psychology.",
                  "Execute strategies with defined risk management.",
                  "Read charts without relying on lagging indicators."
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 bg-primary/20 p-1 rounded-full text-primary shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Course Curriculum */}
            <section>
              <h2 className="text-3xl font-bold mb-8">Course Curriculum</h2>
              {course.modules && course.modules.length > 0 ? (
                <Accordion defaultValue={course.modules.map(m => m.id)} className="w-full space-y-4">
                  {course.modules.map((module, mIdx) => (
                    <AccordionItem key={module.id} value={module.id} className="glass-card rounded-xl border-border/50 overflow-hidden">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-start text-left">
                          <span className="text-sm font-semibold text-primary mb-1">Module {mIdx + 1}</span>
                          <span className="text-lg font-bold">{module.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-6 px-6">
                        <div className="space-y-3">
                          {module.lessons?.map((lesson, lIdx) => (
                            <div key={lesson.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="text-muted-foreground w-6 text-right font-medium">
                                  {lIdx + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{lesson.title}</p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                    <Clock className="w-3 h-3" />
                                    {Math.floor(lesson.duration / 60)} mins
                                  </p>
                                </div>
                              </div>
                              <div>
                                {lesson.is_free_preview ? (
                                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold">
                                    <PlayCircle className="w-3 h-3 mr-1.5" /> Preview
                                  </Button>
                                ) : (
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="p-8 text-center glass-card rounded-xl">
                  <p className="text-muted-foreground">Curriculum details are being updated.</p>
                </div>
              )}
            </section>
          </div>

          <div className="lg:col-span-1">
            {/* Instructor Sidebar */}
            <div className="sticky top-28 space-y-8">
              <div className="glass-card p-6 rounded-2xl">
                <h3 className="font-bold text-xl mb-6">Your Instructor</h3>
                <div className="flex items-center gap-4 mb-4">
                  <img src="https://i.pravatar.cc/150?u=instructor" alt="Instructor" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                  <div>
                    <h4 className="font-bold text-lg">Capital Gain Hub</h4>
                    <p className="text-sm text-primary">Professional Trader</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  With years of experience navigating the financial markets, we compress our knowledge into actionable frameworks to save you years of trial and error.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
