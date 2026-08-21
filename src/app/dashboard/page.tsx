import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PlayCircle, Clock, BookOpen, Trophy } from "lucide-react";
import { MOCK_COURSES, MOCK_USER } from "@/lib/mock-data";
import Link from "next/link";

export default function DashboardOverviewPage() {
  const activeCourse = MOCK_COURSES[0]; // Simulating an active enrollment

  return (
    <div className="p-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {MOCK_USER.full_name.split(' ')[0]}</h1>
          <p className="text-muted-foreground">Here is what's happening with your learning journey.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Continue Learning Card */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-bold mb-4">Continue Learning</h2>
            <Card className="glass-card overflow-hidden border-primary/20">
              <div className="flex flex-col md:flex-row h-full">
                <div className="w-full md:w-1/3 relative h-48 md:h-auto">
                  <img src={activeCourse.thumbnail_url} alt={activeCourse.title} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <PlayCircle className="w-12 h-12 text-white" />
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-center">
                  <div className="mb-2 text-sm font-medium text-primary flex justify-between">
                    <span>{activeCourse.title}</span>
                    <span>65% Complete</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Understanding Order Types</h3>
                  <p className="text-sm text-muted-foreground mb-6 line-clamp-2">
                    Learn the difference between market and limit orders and when to use them effectively in your trading setup.
                  </p>
                  
                  <div className="mt-auto space-y-4">
                    <Progress value={65} className="h-2 bg-secondary" />
                    <Link href={`/dashboard/courses/${activeCourse.id}`}>
                      <Button className="w-full shadow-lg shadow-primary/20">
                        Resume Lesson
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold mb-4">Your Progress</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardContent className="p-4 flex flex-col items-center text-center justify-center min-h-[120px]">
                  <BookOpen className="w-6 h-6 text-primary mb-2" />
                  <span className="text-2xl font-bold">4</span>
                  <span className="text-xs text-muted-foreground mt-1">Courses Enrolled</span>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4 flex flex-col items-center text-center justify-center min-h-[120px]">
                  <Clock className="w-6 h-6 text-blue-500 mb-2" />
                  <span className="text-2xl font-bold">12h</span>
                  <span className="text-xs text-muted-foreground mt-1">Time Watched</span>
                </CardContent>
              </Card>
              <Card className="glass-card col-span-2">
                <CardContent className="p-4 flex flex-row items-center justify-between min-h-[80px]">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-500/20 p-3 rounded-full">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold">2 Certificates</span>
                      <span className="text-xs text-muted-foreground">Earned</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Recommended Courses */}
        <div>
          <h2 className="text-xl font-bold mb-4">Recommended For You</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_COURSES.slice(1, 4).map((course) => (
              <Card key={course.id} className="glass-card overflow-hidden group">
                <div className="h-32 w-full relative overflow-hidden">
                  <img src={course.thumbnail_url} alt={course.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                </div>
                <CardContent className="p-4">
                  <h4 className="font-bold mb-1 line-clamp-1">{course.title}</h4>
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{course.description}</p>
                  <Link href={`/courses/${course.slug}`}>
                    <Button variant="secondary" className="w-full text-xs h-8">View Course</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
