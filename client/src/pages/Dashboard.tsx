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
import { Quote, User as UserType, ProjectType } from "@shared/schema";
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
  
  // Fetch project types for quote display
  const { data: projectTypes = [], isLoading: isLoadingProjectTypes } = useQuery({
    queryKey: ["/api/project-types"],
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
    const usernameToDisplayName: Record<string, string> = {};
    
    filteredQuotes.forEach(quote => {
      if (!quote.createdBy) return;
      
      if (!revenueByPerson[quote.createdBy]) {
        revenueByPerson[quote.createdBy] = 0;
        
        // Store the display name for this username
        const user = users.find(u => u.username === quote.createdBy);
        if (user && user.firstName && user.lastName) {
          usernameToDisplayName[quote.createdBy] = `${user.firstName} ${user.lastName}`;
        } else {
          usernameToDisplayName[quote.createdBy] = quote.createdBy;
        }
      }
      
      // Add the total price of the won quote to the salesperson's revenue
      revenueByPerson[quote.createdBy] += quote.totalPrice || 0;
    });
    
    // Convert to array and sort by revenue (highest first)
    const sortedSales = Object.entries(revenueByPerson)
      .map(([username, total]) => ({ 
        name: usernameToDisplayName[username] || username, 
        total 
      }))
      .sort((a, b) => b.total - a.total);
    
    // Return top 3 revenue generators
    return sortedSales.slice(0, 3);
  };
  
  // Helper function to get project type name by ID
  const getProjectTypeName = (projectTypeId: number | null) => {
    if (!projectTypeId) return "Not specified";
    const projectType = Array.isArray(projectTypes) 
      ? projectTypes.find((pt: ProjectType) => pt.id === projectTypeId)
      : null;
    return projectType ? projectType.name : "Unknown Project";
  };
  
  if (isLoadingQuotes || isLoadingUsers || isLoadingProjectTypes) {
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Hello, {user?.firstName || 'there'}! 👋
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Welcome to your dashboard. Here's an overview of your quotes and performance.</p>
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
                      {`${u.firstName || ''} ${u.lastName || ''}`}
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
            <div className="bg-card shadow-lg rounded-xl overflow-hidden">
              <div className="px-6 py-4 flex justify-between items-center border-b border-border">
                <h3 className="text-lg font-semibold">Recent Quotes</h3>
                <Button 
                  variant="secondary" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
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
                    <table className="w-full border-collapse">
                      <tbody>
                        {timeFilteredQuotes.slice(0, 5).map((quote: Quote) => (
                          <tr 
                            key={quote.id} 
                            className="cursor-pointer hover:bg-muted/50 transition-colors border-b border-border"
                            onClick={() => navigate(`/quotes/${quote.id}`)}
                          >
                            <td className="py-4 px-4">
                              <div className="font-medium">{quote.clientName}</div>
                              <div className="text-sm text-muted-foreground truncate">{quote.businessName || "Individual"}</div>
                            </td>
                            
                            <td className="py-4">
                              <div className="text-sm">
                                {getProjectTypeName(quote.projectTypeId)}
                              </div>
                            </td>
                            
                            <td className="py-4 text-sm text-muted-foreground">
                              {new Date(quote.createdAt).toLocaleDateString()}
                            </td>
                            
                            <td className="py-4 text-sm text-muted-foreground">
                              {Array.isArray(users) 
                                ? users.find(u => u.username === quote.createdBy)
                                    ? `${users.find(u => u.username === quote.createdBy)?.firstName || ''} ${users.find(u => u.username === quote.createdBy)?.lastName || ''}`
                                    : quote.createdBy
                                : quote.createdBy
                              }
                            </td>
                            
                            <td className="py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                quote.leadStatus === "Won" 
                                  ? "bg-green-500 text-white" 
                                  : quote.leadStatus === "Lost"
                                    ? "bg-red-500 text-white"
                                    : "bg-yellow-400 text-primary-foreground"
                              }`}>
                                <span className="h-2 w-2 rounded-full mr-1.5 bg-current opacity-70"></span>
                                {quote.leadStatus || "In Progress"}
                              </span>
                            </td>
                            
                            <td className="py-4 font-semibold">
                              ${quote.totalPrice?.toLocaleString()}
                            </td>
                            
                            <td className="py-4 text-sm text-muted-foreground pr-4">
                              {new Date(quote.updatedAt || quote.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile view - card style */}
                  <div className="md:hidden">
                    {timeFilteredQuotes.slice(0, 5).map((quote: Quote) => (
                      <div 
                        key={quote.id} 
                        className="p-4 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/quotes/${quote.id}`)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{quote.clientName}</h4>
                            <p className="text-sm text-muted-foreground">{quote.businessName || "Individual"}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            quote.leadStatus === "Won" 
                              ? "bg-green-500 text-white" 
                              : quote.leadStatus === "Lost"
                                ? "bg-red-500 text-white"
                                : "bg-yellow-400 text-primary-foreground"
                          }`}>
                            <span className="h-2 w-2 rounded-full mr-1 bg-current opacity-70"></span>
                            {quote.leadStatus || "In Progress"}
                          </span>
                        </div>
                        
                        <div className="flex items-center mt-2 bg-muted rounded-md px-2 py-1.5">
                          <div className="text-xs font-medium text-muted-foreground">
                            {getProjectTypeName(quote.projectTypeId)}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 text-muted-foreground mr-1" />
                              {new Date(quote.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <User className="h-3 w-3 text-muted-foreground mr-1" />
                              {Array.isArray(users) 
                                ? users.find(u => u.username === quote.createdBy)
                                    ? `${users.find(u => u.username === quote.createdBy)?.firstName || ''} ${users.find(u => u.username === quote.createdBy)?.lastName || ''}`
                                    : quote.createdBy
                                : quote.createdBy
                              }
                            </div>
                          </div>
                          <div className="font-semibold text-sm">${quote.totalPrice?.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {timeFilteredQuotes.length > 5 && (
                    <div className="bg-muted/30 px-6 py-4 text-center">
                      <Button 
                        variant="ghost"
                        onClick={() => navigate("/quotes")}
                        className="text-primary hover:text-primary/90 hover:bg-muted"
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
                  <Card className="overflow-hidden border-0 shadow-sm bg-[#282828] ring-1 ring-gray-800">
                    <CardHeader className="pb-0 py-3 px-4">
                      <div>
                        <CardTitle className="text-base sm:text-lg font-semibold text-white">Top Revenue Generators</CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-gray-400">Salespeople with highest closed revenue</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2 px-4 pb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-gray-300">This Month</h4>
                          <div className="space-y-3">
                            {getTopSalespeople(quotes, "month").length > 0 ? (
                              getTopSalespeople(quotes, "month").map((person, index) => (
                                <div key={index} className="flex items-center justify-between bg-[#1F1F1F] p-2 rounded-md shadow-sm border border-gray-800">
                                  <div className="flex items-center">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                                      index === 0 ? 'bg-[#F9B200]' : index === 1 ? 'bg-gray-500' : 'bg-amber-700'
                                    } mr-2`}>
                                      {index + 1}
                                    </span>
                                    <span className="font-medium text-sm text-gray-200">{person.name}</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-semibold text-[#F9B200]">${person.total.toLocaleString()}</span>
                                    <span className="text-xs text-gray-400">closed revenue</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-400 p-2">No closed revenue this month</div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-gray-300">All Time</h4>
                          <div className="space-y-3">
                            {getTopSalespeople(quotes, "all").length > 0 ? (
                              getTopSalespeople(quotes, "all").map((person, index) => (
                                <div key={index} className="flex items-center justify-between bg-[#1F1F1F] p-2 rounded-md shadow-sm border border-gray-800">
                                  <div className="flex items-center">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                                      index === 0 ? 'bg-[#F9B200]' : index === 1 ? 'bg-gray-500' : 'bg-amber-700'
                                    } mr-2`}>
                                      {index + 1}
                                    </span>
                                    <span className="font-medium text-sm text-gray-200">{person.name}</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-semibold text-[#F9B200]">${person.total.toLocaleString()}</span>
                                    <span className="text-xs text-gray-400">closed revenue</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-400 p-2">No closed revenue yet</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card className="overflow-hidden border-0 shadow-sm bg-[#282828] ring-1 ring-gray-800">
                  <CardHeader className="pb-0 py-3 px-4">
                    <div>
                      <CardTitle className="text-base sm:text-lg font-semibold text-white">Quote Status</CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-gray-400">Current pipeline overview</CardDescription>
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
                            contentStyle={{ 
                              borderRadius: '8px', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                              backgroundColor: '#1F1F1F',
                              color: 'white',
                              border: '1px solid #333' 
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400 text-sm">No data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 shadow-sm bg-[#282828] ring-1 ring-gray-800">
                  <CardHeader className="pb-2 py-3 px-4">
                    <CardTitle className="text-base sm:text-lg font-semibold text-white">Sales Performance</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-gray-400">Win rate & conversion metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs sm:text-sm font-medium text-gray-300">Win Rate</span>
                          <span className="text-xs sm:text-sm font-bold text-white">
                            {totalQuotes > 0 ? Math.round((wonQuotes / totalQuotes) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${totalQuotes > 0 ? Math.round((wonQuotes / totalQuotes) * 100) : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {wonQuotes} won of {totalQuotes} total quotes
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs sm:text-sm font-medium text-gray-300">Lost Opportunities</span>
                          <span className="text-xs sm:text-sm font-bold text-white">
                            {totalQuotes > 0 ? Math.round((lostQuotes / totalQuotes) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${totalQuotes > 0 ? Math.round((lostQuotes / totalQuotes) * 100) : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {lostQuotes} lost of {totalQuotes} total quotes
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs sm:text-sm font-medium text-gray-300">Pending Review</span>
                          <span className="text-xs sm:text-sm font-bold text-white">
                            {totalQuotes > 0 ? Math.round((pendingQuotes / totalQuotes) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-[#F9B200] h-2 rounded-full" 
                            style={{ width: `${totalQuotes > 0 ? Math.round((pendingQuotes / totalQuotes) * 100) : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {pendingQuotes} pending of {totalQuotes} total quotes
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="overflow-hidden border-0 shadow-sm bg-[#282828] ring-1 ring-gray-800">
                  <CardHeader className="pb-0 py-3 px-4">
                    <div>
                      <CardTitle className="text-base sm:text-lg font-semibold text-white">Financial Summary</CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-gray-400">Open vs. closed revenue</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 px-4">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-[#1F1F1F] rounded-lg p-3 shadow-sm border border-gray-800">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-300 mb-1">Open Opportunities</h4>
                        <p className="text-lg sm:text-xl font-bold text-[#F9B200]">
                          ${pendingValue.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          From {pendingQuotes} pending quotes
                        </p>
                      </div>
                      
                      <div className="bg-[#1F1F1F] rounded-lg p-3 shadow-sm border border-gray-800">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-300 mb-1">Closed Revenue</h4>
                        <p className="text-lg sm:text-xl font-bold text-green-500">
                          ${wonValue.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          From {wonQuotes} won quotes
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-[#1F1F1F] rounded-lg p-3 shadow-sm border border-gray-800">
                      <h4 className="text-xs sm:text-sm font-medium text-gray-300 mb-2">Total Pipeline Value</h4>
                      <div className="flex items-center">
                        <div className="flex-1 flex">
                          <div 
                            className="h-2.5 bg-green-500 rounded-l-full" 
                            style={{ width: `${activePipelineValue > 0 ? (wonValue / activePipelineValue) * 100 : 0}%` }}
                          ></div>
                          <div 
                            className="h-2.5 bg-[#F9B200]" 
                            style={{ width: `${activePipelineValue > 0 ? (pendingValue / activePipelineValue) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-base sm:text-lg font-bold ml-3 text-white">
                          ${activePipelineValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap text-xs text-gray-400 mt-2">
                        <span className="flex items-center mr-4 mb-1">
                          <span className="w-2 h-2 inline-block bg-green-500 rounded-full mr-1"></span>
                          Closed: {activePipelineValue > 0 ? Math.round((wonValue / activePipelineValue) * 100) : 0}%
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 inline-block bg-[#F9B200] rounded-full mr-1"></span>
                          Open: {activePipelineValue > 0 ? Math.round((pendingValue / activePipelineValue) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="overflow-hidden border-0 shadow-sm bg-[#282828] ring-1 ring-gray-800">
                  <CardHeader className="pb-2 py-3 px-4">
                    <CardTitle className="text-base sm:text-lg font-semibold text-white">Monthly Performance</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-gray-400">Quote value trend over time</CardDescription>
                  </CardHeader>
                  <CardContent className="h-44 sm:h-56 px-2">
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis 
                            dataKey="name" 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fontSize: 11, fill: "#9CA3AF" }} 
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fontSize: 11, fill: "#9CA3AF" }} 
                          />
                          <Tooltip 
                            formatter={(value) => [`$${value.toLocaleString()}`, "Value"]}
                            contentStyle={{ 
                              borderRadius: '8px', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                              backgroundColor: '#1F1F1F',
                              color: 'white',
                              border: '1px solid #333' 
                            }}
                          />
                          <Bar dataKey="value" fill="#F9B200" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400 text-sm">No data available</p>
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