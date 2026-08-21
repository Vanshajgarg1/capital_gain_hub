"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, GripVertical, Video, FileText, ChevronLeft, Save } from "lucide-react";
import Link from "next/link";

export default function CurriculumBuilderPage() {
  return (
    <div className="p-8 pb-32 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/courses">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Curriculum Builder</h1>
            <p className="text-muted-foreground mt-1">Structure your course modules and lessons.</p>
          </div>
        </div>
        <Button className="shadow-lg shadow-primary/20">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column - Course Details */}
        <div className="space-y-6">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input id="title" defaultValue="Trading Foundations" className="bg-background/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input id="price" type="number" defaultValue="49" className="bg-background/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <select id="level" className="flex h-10 w-full items-center justify-between rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm">
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Curriculum Builder */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Modules & Lessons</h3>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Module
            </Button>
          </div>

          <Accordion defaultValue={["module-1"]} className="w-full space-y-4">
            {/* Module 1 */}
            <AccordionItem value="module-1" className="glass-card rounded-xl border-border/50 overflow-hidden border">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab opacity-50 hover:opacity-100" />
                  <div className="text-left flex flex-col">
                    <span className="text-xs text-primary font-semibold uppercase tracking-wider">Module 1</span>
                    <span className="font-bold">Introduction to Financial Markets</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0 bg-background/30">
                <div className="space-y-2 pl-8 border-l-2 border-border/50 ml-6 mt-2">
                  <div className="flex items-center justify-between bg-background border border-border/50 p-3 rounded-md group">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-30 group-hover:opacity-100" />
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">What is the Stock Market?</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-xs">Edit</Button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-background border border-border/50 p-3 rounded-md group">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-30 group-hover:opacity-100" />
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Understanding Order Types</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-xs">Edit</Button>
                  </div>

                  <Button variant="ghost" size="sm" className="w-full mt-2 border border-dashed border-border/50 text-muted-foreground">
                    <Plus className="w-3 h-3 mr-2" /> Add Lesson
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 2 */}
            <AccordionItem value="module-2" className="glass-card rounded-xl border-border/50 overflow-hidden border">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab opacity-50 hover:opacity-100" />
                  <div className="text-left flex flex-col">
                    <span className="text-xs text-primary font-semibold uppercase tracking-wider">Module 2</span>
                    <span className="font-bold">Understanding Price Action</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0 bg-background/30">
                <div className="space-y-2 pl-8 border-l-2 border-border/50 ml-6 mt-2">
                  <Button variant="ghost" size="sm" className="w-full mt-2 border border-dashed border-border/50 text-muted-foreground">
                    <Plus className="w-3 h-3 mr-2" /> Add Lesson
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
