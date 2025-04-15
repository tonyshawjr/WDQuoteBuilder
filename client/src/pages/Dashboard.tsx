import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";
import { PlusCircle, ArrowUpRight, Filter, User, Calendar } from "lucide-react";
import { Quote, User as UserType } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const [selectedUser, setSelectedUser] = useState<number | "all">(0);
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week">("all");
  
  // Fetch all quotes
  const { data: quotes = [], isLoading: isLoadingQuotes } = useQuery({
    queryKey: ["/api/quotes"],
  });
  
  // Fetch users for admin filtering
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });
  
  useEffect(() => {
    // Set the initial selected user to the current user
    if (user) {
      setSelectedUser(user.id);
    }
  }, [user]);
  
  if (isLoadingQuotes || isLoadingUsers) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </>
    );
  }
  
  // Filter quotes based on selected user
  const filteredQuotes = quotes.filter((quote: Quote) => {
    if (!isAdmin) {
      // Regular users only see their own quotes
      return quote.createdBy === user?.username;
    }
    
    // Admin with "all" selected sees all quotes
    if (selectedUser === "all") {
      return true;
    }
    
    // Admin with specific user selected
    const selectedUserName = users.find((u: UserType) => u.id === selectedUser)?.username;
    return quote.createdBy === selectedUserName;
  });
  
  // Further filter by time
  const timeFilteredQuotes = filteredQuotes.filter((quote: Quote) => {
    if (timeFilter === "all") return true;
    
    const quoteDate = new Date(quote.createdAt);
    const now = new Date();
    
    if (timeFilter === "month") {
      // Last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return quoteDate >= thirtyDaysAgo;
    }
    
    if (timeFilter === "week") {
      // Last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return quoteDate >= sevenDaysAgo;
    }
    
    return true;
  });
  
  // Calculate stats for the dashboard
  const totalQuotes = timeFilteredQuotes.length;
  const pendingQuotes = timeFilteredQuotes.filter((quote: Quote) => quote.leadStatus === "Pending").length;
  const wonQuotes = timeFilteredQuotes.filter((quote: Quote) => quote.leadStatus === "Won").length;
  const lostQuotes = timeFilteredQuotes.filter((quote: Quote) => quote.leadStatus === "Lost").length;
  
  // Calculate total value of quotes
  const totalValue = timeFilteredQuotes.reduce((sum, quote: Quote) => sum + (quote.totalPrice || 0), 0);
  const wonValue = timeFilteredQuotes
    .filter((quote: Quote) => quote.leadStatus === "Won")
    .reduce((sum, quote: Quote) => sum + (quote.totalPrice || 0), 0);
  
  // Data for pie chart
  const statusData = [
    { name: "Pending", value: pendingQuotes, color: "#FFB547" },
    { name: "Won", value: wonQuotes, color: "#2E7D32" },
    { name: "Lost", value: lostQuotes, color: "#D32F2F" },
  ].filter(item => item.value > 0);
  
  // Data for bar chart - group by month
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const monthlyData = timeFilteredQuotes.reduce((acc: any[], quote: Quote) => {
    const date = new Date(quote.createdAt);
    const month = date.getMonth();
    const monthName = monthNames[month];
    
    const existingMonth = acc.find(item => item.name === monthName);
    if (existingMonth) {
      existingMonth.value += quote.totalPrice || 0;
    } else {
      acc.push({ name: monthName, value: quote.totalPrice || 0 });
    }
    
    return acc;
  }, []);
  
  // Sort months chronologically
  monthlyData.sort((a, b) => {
    return monthNames.indexOf(a.name) - monthNames.indexOf(b.name);
  });
  
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Overview of your quotes and performance</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
            {isAdmin && (
              <Select 
                value={selectedUser === "all" ? "all" : selectedUser.toString()}
                onValueChange={(value) => setSelectedUser(value === "all" ? "all" : parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((u: UserType) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select
              value={timeFilter}
              onValueChange={(value: "all" | "month" | "week") => setTimeFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={() => navigate("/calculator")}>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Quotes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuotes}</div>
              <p className="text-xs text-gray-500 mt-1">
                {timeFilter === "all" ? "All time" : timeFilter === "month" ? "Last 30 days" : "Last 7 days"}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">
                From all quotes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Closed Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${wonValue.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">
                From won quotes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalQuotes > 0 ? Math.round((wonQuotes / totalQuotes) * 100) : 0}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {wonQuotes} won of {totalQuotes} total
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="quotes" className="mb-8">
          <TabsList>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="quotes" className="pt-6">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Quotes</h3>
              </div>
              
              {timeFilteredQuotes.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No quotes found</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate("/calculator")}
                  >
                    Create your first quote
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {timeFilteredQuotes.slice(0, 5).map((quote: Quote) => (
                    <div key={quote.id} className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/quotes/${quote.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{quote.clientName}</h4>
                          <p className="text-sm text-gray-500">{quote.businessName || "No business name"}</p>
                          <div className="flex items-center mt-1">
                            <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500">
                              {new Date(quote.createdAt).toLocaleDateString()}
                            </span>
                            
                            <User className="h-3 w-3 text-gray-400 ml-3 mr-1" />
                            <span className="text-xs text-gray-500">
                              {quote.createdBy}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <span className="font-medium">${quote.totalPrice?.toLocaleString()}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full mt-1 ${
                            quote.leadStatus === "Won" 
                              ? "bg-green-100 text-green-800" 
                              : quote.leadStatus === "Lost"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {quote.leadStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {timeFilteredQuotes.length > 5 && (
                    <div className="px-6 py-3 text-center">
                      <Button 
                        variant="ghost"
                        className="text-sm"
                        onClick={() => {/* TODO: Implement view all quotes */}}
                      >
                        View all quotes
                        <ArrowUpRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quote Status Distribution</CardTitle>
                  <CardDescription>Breakdown of quotes by status</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={1}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value} quotes`, "Count"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Quote Value by Month</CardTitle>
                  <CardDescription>Total quote value over time</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [`$${value.toLocaleString()}`, "Value"]}
                        />
                        <Bar dataKey="value" fill="#4f46e5" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}