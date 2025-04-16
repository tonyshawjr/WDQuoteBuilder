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
import { PlusCircle, ArrowUpRight, Filter, User, Calendar, FileText } from "lucide-react";
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
    // Set the initial selected user to "all" for admin, or current user for non-admin
    if (user) {
      setSelectedUser(isAdmin ? "all" : user.id);
    }
  }, [user, isAdmin]);
  
  // Helper function to calculate top salespeople based on revenue from won deals
  const getTopSalespeople = (quotes: Quote[], timeRange: "all" | "month") => {
    if (!Array.isArray(quotes) || !Array.isArray(users)) return [];
    
    // Filter quotes by time range if needed
    let filteredQuotes = [...quotes];
    
    if (timeRange === "month") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filteredQuotes = filteredQuotes.filter(quote => 
        new Date(quote.createdAt) >= thirtyDaysAgo
      );
    }
    
    // Only include quotes that have been won - these represent actual revenue
    filteredQuotes = filteredQuotes.filter(quote => quote.leadStatus === "Won");
    
    // Group by sales person
    const revenueByPerson: Record<string, number> = {};
    
    filteredQuotes.forEach(quote => {
      if (!quote.createdBy) return;
      
      if (!revenueByPerson[quote.createdBy]) {
        revenueByPerson[quote.createdBy] = 0;
      }
      
      // Add the total price of the won quote to the salesperson's revenue
      revenueByPerson[quote.createdBy] += quote.totalPrice || 0;
    });
    
    // Convert to array and sort by revenue (highest first)
    const sortedSales = Object.entries(revenueByPerson)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    
    // Return top 3 revenue generators
    return sortedSales.slice(0, 3);
  };
  
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
  const filteredQuotes = Array.isArray(quotes) ? quotes.filter((quote: Quote) => {
    // Admin with "all" selected sees all quotes
    if (isAdmin && selectedUser === "all") {
      return true;
    }
    
    if (!isAdmin) {
      // Regular users only see their own quotes
      return quote.createdBy === user?.username;
    }
    
    // Admin with specific user selected
    if (selectedUser === user?.id) {
      // If admin selected their own username
      return quote.createdBy === user?.username;
    }
    
    // For other users selected by admin
    const selectedUserName = Array.isArray(users) ? 
      users.find((u: UserType) => u.id === selectedUser)?.username : 
      '';
    return quote.createdBy === selectedUserName;
  }) : [];
  
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
  
  // Calculate value of quotes by status
  const totalValue = timeFilteredQuotes.reduce((sum: number, quote: Quote) => sum + (quote.totalPrice || 0), 0);
  const wonValue = timeFilteredQuotes
    .filter((quote: Quote) => quote.leadStatus === "Won")
    .reduce((sum: number, quote: Quote) => sum + (quote.totalPrice || 0), 0);
  const lostValue = timeFilteredQuotes
    .filter((quote: Quote) => quote.leadStatus === "Lost")
    .reduce((sum: number, quote: Quote) => sum + (quote.totalPrice || 0), 0);
  const pendingValue = timeFilteredQuotes
    .filter((quote: Quote) => quote.leadStatus !== "Won" && quote.leadStatus !== "Lost")
    .reduce((sum: number, quote: Quote) => sum + (quote.totalPrice || 0), 0);
  
  // Calculate the total pipeline value (excluding lost opportunities)
  const activePipelineValue = wonValue + pendingValue;
  
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
  monthlyData.sort((a: any, b: any) => {
    return monthNames.indexOf(a.name) - monthNames.indexOf(b.name);
  });
  
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col justify-between items-start mb-6">
          <div className="mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">Overview of your quotes and performance</p>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full">
            {isAdmin && (
              <Select 
                value={selectedUser === "all" ? "all" : selectedUser.toString()}
                onValueChange={(value) => setSelectedUser(value === "all" ? "all" : parseInt(value))}
              >
                <SelectTrigger className="flex-grow sm:flex-grow-0 h-9 text-sm sm:w-[160px]">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {Array.isArray(users) && users.map((u: UserType) => (
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
              <SelectTrigger className="flex-grow sm:flex-grow-0 h-9 text-sm sm:w-[160px]">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={() => navigate("/calculator")} className="flex-grow sm:flex-grow-0 h-9 text-sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                Total Quotes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 px-4">
              <div className="text-xl sm:text-2xl font-bold">{totalQuotes}</div>
              <p className="text-xs text-gray-500 mt-1">
                {timeFilter === "all" ? "All time" : timeFilter === "month" ? "Last 30 days" : "Last 7 days"}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 px-4">
              <div className="text-xl sm:text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">
                From all quotes
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                Closed Value
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 px-4">
              <div className="text-xl sm:text-2xl font-bold">${wonValue.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">
                From won quotes
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 px-4">
              <div className="text-xl sm:text-2xl font-bold">
                {totalQuotes > 0 ? Math.round((wonQuotes / totalQuotes) * 100) : 0}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {wonQuotes} won of {totalQuotes} total
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="quotes" className="mb-6">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="analytics">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="quotes" className="pt-4">
            <div className="bg-white shadow-lg rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary/90 to-primary px-6 py-5 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">Recent Quotes</h3>
                <Button 
                  variant="secondary" 
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={() => navigate("/calculator")}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Quote
                </Button>
              </div>
              
              {timeFilteredQuotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="bg-gray-100 rounded-full p-6 mb-4">
                    <FileText className="h-10 w-10 text-primary/70" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No quotes yet</h4>
                  <p className="text-gray-500 text-center mb-4 max-w-md">Start creating quotes for your clients to track opportunities and generate revenue</p>
                  <Button 
                    onClick={() => navigate("/calculator")}
                    size="lg"
                  >
                    Create your first quote
                  </Button>
                </div>
              ) : (
                <div>
                  {/* Desktop view */}
                  <div className="hidden md:block">
                    <div className="grid grid-cols-12 bg-gray-50 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="col-span-4">Client</div>
                      <div className="col-span-3">Created</div>
                      <div className="col-span-2">By</div>
                      <div className="col-span-2 text-right">Amount</div>
                      <div className="col-span-1 text-right">Status</div>
                    </div>
                    <div>
                      {timeFilteredQuotes.slice(0, 5).map((quote: Quote) => (
                        <div 
                          key={quote.id} 
                          className="grid grid-cols-12 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100"
                          onClick={() => navigate(`/quotes/${quote.id}`)}
                        >
                          <div className="col-span-4">
                            <div className="font-medium text-gray-900">{quote.clientName}</div>
                            <div className="text-sm text-gray-500 truncate">{quote.businessName || "Individual"}</div>
                          </div>
                          <div className="col-span-3 flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </div>
                          <div className="col-span-2 flex items-center text-sm text-gray-600">
                            <User className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                            {quote.createdBy}
                          </div>
                          <div className="col-span-2 text-right font-semibold">
                            ${quote.totalPrice?.toLocaleString()}
                          </div>
                          <div className="col-span-1 text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                      ))}
                    </div>
                  </div>
                  
                  {/* Mobile view - card style */}
                  <div className="md:hidden">
                    {timeFilteredQuotes.slice(0, 5).map((quote: Quote) => (
                      <div 
                        key={quote.id} 
                        className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/quotes/${quote.id}`)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{quote.clientName}</h4>
                            <p className="text-sm text-gray-500">{quote.businessName || "Individual"}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            quote.leadStatus === "Won" 
                              ? "bg-green-100 text-green-800" 
                              : quote.leadStatus === "Lost"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {quote.leadStatus}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </div>
                          <div className="font-semibold">${quote.totalPrice?.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {timeFilteredQuotes.length > 5 && (
                    <div className="bg-gray-50 px-6 py-4 text-center">
                      <Button 
                        variant="ghost"
                        onClick={() => {/* TODO: Implement view all quotes */}}
                        className="text-primary hover:text-primary/90 hover:bg-gray-100"
                      >
                        View all quotes
                        <ArrowUpRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="space-y-4">
                {isAdmin && (
                  <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-green-50 to-blue-50">
                    <CardHeader className="pb-0 py-3 px-4">
                      <div>
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Top Revenue Generators</CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-gray-600">Salespeople with highest closed revenue</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2 px-4 pb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-gray-700">This Month</h4>
                          <div className="space-y-3">
                            {getTopSalespeople(quotes, "month").length > 0 ? (
                              getTopSalespeople(quotes, "month").map((person, index) => (
                                <div key={index} className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm border border-gray-100">
                                  <div className="flex items-center">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                                    } mr-2`}>
                                      {index + 1}
                                    </span>
                                    <span className="font-medium text-sm">{person.name}</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-semibold text-indigo-600">${person.total.toLocaleString()}</span>
                                    <span className="text-xs text-gray-500">closed revenue</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-500 p-2">No closed revenue this month</div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-gray-700">All Time</h4>
                          <div className="space-y-3">
                            {getTopSalespeople(quotes, "all").length > 0 ? (
                              getTopSalespeople(quotes, "all").map((person, index) => (
                                <div key={index} className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm border border-gray-100">
                                  <div className="flex items-center">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                                    } mr-2`}>
                                      {index + 1}
                                    </span>
                                    <span className="font-medium text-sm">{person.name}</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-semibold text-indigo-600">${person.total.toLocaleString()}</span>
                                    <span className="text-xs text-gray-500">closed revenue</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-500 p-2">No closed revenue yet</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader className="pb-0 py-3 px-4">
                    <div>
                      <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Quote Status</CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-gray-600">Current pipeline overview</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="h-52 sm:h-60 pt-2 px-4">
                    {statusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value} quotes`, "Count"]}
                            contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 text-sm">No data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 shadow-sm">
                  <CardHeader className="pb-2 py-3 px-4">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Sales Performance</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-gray-600">Win rate & conversion metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs sm:text-sm font-medium text-gray-600">Win Rate</span>
                          <span className="text-xs sm:text-sm font-bold text-gray-900">
                            {totalQuotes > 0 ? Math.round((wonQuotes / totalQuotes) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${totalQuotes > 0 ? Math.round((wonQuotes / totalQuotes) * 100) : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {wonQuotes} won of {totalQuotes} total quotes
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs sm:text-sm font-medium text-gray-600">Lost Opportunities</span>
                          <span className="text-xs sm:text-sm font-bold text-gray-900">
                            {totalQuotes > 0 ? Math.round((lostQuotes / totalQuotes) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${totalQuotes > 0 ? Math.round((lostQuotes / totalQuotes) * 100) : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {lostQuotes} lost of {totalQuotes} total quotes
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs sm:text-sm font-medium text-gray-600">Pending Review</span>
                          <span className="text-xs sm:text-sm font-bold text-gray-900">
                            {totalQuotes > 0 ? Math.round((pendingQuotes / totalQuotes) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-400 h-2 rounded-full" 
                            style={{ width: `${totalQuotes > 0 ? Math.round((pendingQuotes / totalQuotes) * 100) : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {pendingQuotes} pending of {totalQuotes} total quotes
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50">
                  <CardHeader className="pb-0 py-3 px-4">
                    <div>
                      <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Financial Summary</CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-gray-600">Open vs. closed revenue</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 px-4">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Open Opportunities</h4>
                        <p className="text-lg sm:text-xl font-bold text-indigo-600">
                          ${pendingValue.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          From {pendingQuotes} pending quotes
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Closed Revenue</h4>
                        <p className="text-lg sm:text-xl font-bold text-green-600">
                          ${wonValue.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          From {wonQuotes} won quotes
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                      <h4 className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Total Pipeline Value</h4>
                      <div className="flex items-center">
                        <div className="flex-1 flex">
                          <div 
                            className="h-2.5 bg-green-500 rounded-l-full" 
                            style={{ width: `${activePipelineValue > 0 ? (wonValue / activePipelineValue) * 100 : 0}%` }}
                          ></div>
                          <div 
                            className="h-2.5 bg-yellow-400" 
                            style={{ width: `${activePipelineValue > 0 ? (pendingValue / activePipelineValue) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-base sm:text-lg font-bold ml-3 text-gray-800">
                          ${activePipelineValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap text-xs text-gray-500 mt-2">
                        <span className="flex items-center mr-4 mb-1">
                          <span className="w-2 h-2 inline-block bg-green-500 rounded-full mr-1"></span>
                          Closed: {activePipelineValue > 0 ? Math.round((wonValue / activePipelineValue) * 100) : 0}%
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 inline-block bg-yellow-400 rounded-full mr-1"></span>
                          Open: {activePipelineValue > 0 ? Math.round((pendingValue / activePipelineValue) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="overflow-hidden border-0 shadow-sm">
                  <CardHeader className="pb-2 py-3 px-4">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Monthly Performance</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-gray-600">Quote value trend over time</CardDescription>
                  </CardHeader>
                  <CardContent className="h-44 sm:h-56 px-2">
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                          <Tooltip 
                            formatter={(value) => [`$${value.toLocaleString()}`, "Value"]}
                            contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 text-sm">No data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}