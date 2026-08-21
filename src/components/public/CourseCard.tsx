import Image from "next/image";
import Link from "next/link";
import { Course } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, BarChart } from "lucide-react";

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20";
      case "Intermediate": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "Advanced": return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20";
      default: return "bg-primary/10 text-primary hover:bg-primary/20";
    }
  };

  return (
    <Card className={`group overflow-hidden border-border/50 bg-background/50 hover:border-primary/50 transition-all duration-300 ${course.is_featured ? 'ring-1 ring-primary shadow-lg shadow-primary/10' : ''}`}>
      <div className="relative h-48 w-full overflow-hidden">
        {/* Placeholder for Next Image, using a standard img tag with unoptimized prop for the prototype */}
        <img
          src={course.thumbnail_url}
          alt={course.title}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        {course.is_featured && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-primary text-primary-foreground shadow-lg">Recommended</Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-6">
        <Badge variant="secondary" className={`mb-4 border-none ${getLevelColor(course.level)}`}>
          {course.level}
        </Badge>
        <h3 className="text-xl font-bold mb-2 text-foreground line-clamp-1">{course.title}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-6">
          {course.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            <span>{course.modules?.length || 5} Modules</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{course.duration}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 flex items-center justify-between mt-auto">
        <div className="font-bold text-xl">
          ₹{course.price.toLocaleString("en-IN")}
        </div>
        <Link href={`/courses/${course.slug}`}>
          <Button variant={course.is_featured ? "default" : "outline"} className={course.is_featured ? "shadow-md shadow-primary/20" : ""}>
            View Course
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
