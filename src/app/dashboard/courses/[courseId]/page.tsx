import { MOCK_COURSES } from "@/lib/mock-data";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, CheckCircle2, Lock, PlayCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface CoursePlayerProps {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePlayerPage({ params }: CoursePlayerProps) {
  const { courseId } = await params;
  
  // Use MOCK_COURSES[0] as default if courseId is just "c_1" or similar
  const course = MOCK_COURSES.find(c => c.id === courseId) || MOCK_COURSES[0];

  if (!course) {
    notFound();
  }

  // Find the first lesson to play
  const firstModule = course.modules?.[0];
  const activeLesson = firstModule?.lessons?.[0];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar for mobile only */}
        <div className="lg:hidden p-4 border-b border-border/50 bg-background flex items-center justify-between">
          <h2 className="font-bold truncate max-w-[200px]">{course.title}</h2>
          <Button variant="outline" size="sm">Curriculum</Button>
        </div>
        
        {/* Video Player Area */}
        <div className="bg-black aspect-video w-full relative flex items-center justify-center">
          {/* Fake Video Player Placeholder */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
            <PlayCircle className="w-20 h-20 text-white/50 mb-4" />
            <p className="text-white/70 font-medium text-lg">Video Player Placeholder</p>
            <p className="text-white/40 text-sm mt-2">Bunny Stream / Mux integration goes here</p>
          </div>
        </div>

        {/* Lesson Details */}
        <div className="p-6 md:p-8 max-w-4xl w-full mx-auto space-y-8 flex-1">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{activeLesson?.title || "Lesson Title"}</h1>
            <p className="text-muted-foreground">{activeLesson?.description || "Lesson description goes here."}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-y border-border/50">
            <Button variant="outline" className="w-full sm:w-auto">
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous Lesson
            </Button>
            
            <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Complete
            </Button>
            
            <Button className="w-full sm:w-auto">
               Next Lesson <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Resources
            </h3>
            <div className="glass-card p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-medium">Lesson Notes (PDF)</p>
                <p className="text-xs text-muted-foreground">Download the summary notes for this lesson.</p>
              </div>
              <Button variant="secondary" size="sm">Download</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Curriculum */}
      <div className="w-full lg:w-96 border-l border-border/50 bg-background/50 h-[calc(100vh-80px)] lg:h-screen lg:sticky lg:top-0 hidden lg:flex flex-col">
        <div className="p-4 border-b border-border/50">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <h2 className="font-bold text-lg leading-tight mb-2">{course.title}</h2>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-[10%]"></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">10% Complete</p>
        </div>

        <ScrollArea className="flex-1 p-4">
          <Accordion defaultValue={course.modules?.map(m => m.id)} className="w-full">
            {course.modules?.map((module, mIdx) => (
              <AccordionItem key={module.id} value={module.id} className="border-none mb-4">
                <AccordionTrigger className="px-3 py-3 hover:bg-muted/50 rounded-lg hover:no-underline mb-2 transition-colors">
                  <div className="flex flex-col items-start text-left">
                    <span className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Module {mIdx + 1}</span>
                    <span className="text-sm font-bold">{module.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-2">
                  <div className="space-y-1 pl-2 border-l-2 border-border/50 ml-2">
                    {module.lessons?.map((lesson, lIdx) => {
                      const isCurrent = lesson.id === activeLesson?.id;
                      return (
                        <button
                          key={lesson.id}
                          className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors relative ${
                            isCurrent ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {isCurrent && (
                            <div className="absolute left-[-11px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary ring-4 ring-background" />
                          )}
                          <div className="mt-0.5">
                            {!lesson.is_free_preview && !isCurrent ? (
                              <Lock className="w-4 h-4 opacity-50" />
                            ) : (
                              <PlayCircle className={`w-4 h-4 ${isCurrent ? 'text-primary' : 'opacity-70'}`} />
                            )}
                          </div>
                          <div className="flex-1">
                            <span className={`text-sm block leading-tight ${isCurrent ? 'font-bold' : 'font-medium'}`}>
                              {lIdx + 1}. {lesson.title}
                            </span>
                            <span className="text-xs opacity-70 mt-1 block">
                              {Math.floor(lesson.duration / 60)} mins
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </div>
    </div>
  );
}
