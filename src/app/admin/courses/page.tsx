import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Edit, Trash2, BookOpen } from "lucide-react";
import { MOCK_COURSES } from "@/lib/mock-data";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function AdminCoursesPage() {
  return (
    <div className="p-8 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-1">Manage your courses, modules, and pricing.</p>
        </div>
        <Link href="/admin/courses/new">
          <Button className="shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </Link>
      </div>

      <div className="glass-card border-border/50 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search courses..." className="pl-9 bg-background/50 border-border/50" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">All Levels</Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">Status</Button>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50">
              <TableHead className="w-[400px]">Course</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_COURSES.map((course) => (
              <TableRow key={course.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img src={course.thumbnail_url} alt={course.title} className="w-12 h-12 rounded object-cover" />
                    <div>
                      <p className="font-semibold text-foreground line-clamp-1">{course.title}</p>
                      <p className="text-xs text-muted-foreground">{course.duration} • {course.modules?.length || 0} Modules</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium px-2 py-1 bg-secondary rounded-md">
                    {course.level}
                  </span>
                </TableCell>
                <TableCell className="font-medium">₹{course.price.toLocaleString("en-IN")}</TableCell>
                <TableCell>{course.student_count?.toLocaleString()}</TableCell>
                <TableCell>
                  {course.is_published ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none hover:bg-emerald-500/20">Published</Badge>
                  ) : (
                    <Badge variant="secondary" className="border-none">Draft</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-card border-border/50">
                      <DropdownMenuItem className="cursor-pointer">
                        <Edit className="h-4 w-4 mr-2 text-muted-foreground" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" /> Manage Curriculum
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
