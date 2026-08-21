import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CreditCard, DollarSign, TrendingUp, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_COURSES, MOCK_PAYMENTS, MOCK_ENROLLMENTS } from "@/lib/mock-data";

export default function AdminDashboardPage() {
  const totalRevenue = MOCK_PAYMENTS.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-8 pb-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Platform performance and metrics.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline">Download Report</Button>
          <Button className="shadow-lg shadow-primary/20">New Campaign</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="glass-card border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{(totalRevenue * 100).toLocaleString("en-IN")}</div>
            <p className="text-xs flex items-center text-emerald-500 mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +14% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">14,245</div>
            <p className="text-xs flex items-center text-emerald-500 mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +284 this week
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Courses</CardTitle>
            <BookOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{MOCK_COURSES.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              across 4 categories
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enrollments</CardTitle>
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">19,030</div>
            <p className="text-xs flex items-center text-emerald-500 mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +12% conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="lg:col-span-4 glass-card border-border/50">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] flex items-center justify-center border-t border-border/50">
            {/* Chart Placeholder */}
            <div className="flex flex-col items-center text-muted-foreground">
              <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
              <p>Recharts integration goes here</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 glass-card border-border/50">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="border-t border-border/50 pt-6">
            <div className="space-y-6">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={`https://i.pravatar.cc/150?u=user${i}`} alt="Avatar" className="w-10 h-10 rounded-full bg-muted" />
                    <div>
                      <p className="font-medium leading-none mb-1">Student {i}</p>
                      <p className="text-xs text-muted-foreground">student{i}@example.com</p>
                    </div>
                  </div>
                  <div className="font-bold">
                    +₹39,900
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
