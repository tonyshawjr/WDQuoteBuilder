import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Quote, User } from "@shared/schema";
import { PlusCircle, FileText, BarChart, Eye, Users } from "lucide-react";

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
};

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "Won": return "bg-green-500 text-white";
    case "Lost": return "bg-red-500 text-white";
    case "In Progress": return "bg-blue-500 text-white";
    case "On Hold": return "bg-gray-500 text-white";
    case "Proposal Sent": return "bg-purple-500 text-white";
    default: return "bg-yellow-400 text-gray-900";
  }
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("quotes");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Fetch quotes
  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ['/api/quotes'],
  });
  
  // Fetch users (admin only)
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user?.isAdmin,
  });

  // Redirect if not logged in
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    setLocation("/login");
    return null;
  }
  
  // Filter quotes by selected user if admin has chosen a specific user
  const filteredQuotes = useMemo(() => {
    if (!user?.isAdmin || !selectedUserId) {
      return quotes;
    }
    return quotes.filter(quote => quote.createdBy === selectedUserId);
  }, [quotes, user, selectedUserId]);
  
  // Calculate status counts for reporting
  const statusCounts = useMemo(() => {
    return filteredQuotes.reduce((acc: Record<string, number>, quote: Quote) => {
      const status = quote.leadStatus || "In Progress";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [filteredQuotes]);
  
  // Calculate financial metrics
  const totalValue = useMemo(() => {
    return filteredQuotes.reduce((sum: number, quote: Quote) => sum + (quote.totalPrice || 0), 0);
  }, [filteredQuotes]);
  
  const wonValue = useMemo(() => {
    return filteredQuotes
      .filter((quote: Quote) => quote.leadStatus === "Won")
      .reduce((sum: number, quote: Quote) => sum + (quote.totalPrice || 0), 0);
  }, [filteredQuotes]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button onClick={() => setLocation("/calculator")} className="self-start sm:self-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            <span className="sm:inline">Create New Quote</span>
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6 sm:w-auto sm:inline-flex">
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="quotes">
            <Card>
              <CardHeader className="px-4 py-4 sm:px-6">
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Quote List
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {quotesLoading ? (
                  <div className="py-8 text-center text-gray-500">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    Loading quotes...
                  </div>
                ) : quotes.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-lg font-medium mb-2">No quotes found</h3>
                    <p className="mb-4">Create your first quote with the calculator</p>
                    <Button onClick={() => setLocation("/calculator")} size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Quote
                    </Button>
                  </div>
                ) : (
                  <div>
                    {/* Mobile quote list cards - only visible on small screens */}
                    <div className="md:hidden space-y-4">
                      {quotes.map(quote => (
                        <div 
                          key={quote.id} 
                          className="bg-white border border-gray-100 rounded-lg shadow-sm p-4"
                          onClick={() => setLocation(`/quotes/${quote.id}`)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-medium text-base">{quote.clientName}</h3>
                              <p className="text-sm text-gray-500">{quote.businessName || "Individual Client"}</p>
                            </div>
                            <Badge className={getStatusColor(quote.leadStatus)}>
                              {quote.leadStatus || "In Progress"}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-end">
                            <div className="text-sm text-gray-500">
                              {formatDate(quote.createdAt || null)}
                            </div>
                            <div className="font-bold">{formatCurrency(quote.totalPrice || 0)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Desktop table - hidden on small screens */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Business</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quotes.map(quote => (
                            <TableRow key={quote.id}>
                              <TableCell className="font-medium">{quote.clientName}</TableCell>
                              <TableCell>{quote.businessName || "-"}</TableCell>
                              <TableCell>{formatCurrency(quote.totalPrice || 0)}</TableCell>
                              <TableCell>{formatDate(quote.createdAt || null)}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(quote.leadStatus)}>
                                  {quote.leadStatus || "In Progress"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setLocation(`/quotes/${quote.id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="px-4 py-4 sm:px-6">
                  <CardTitle className="flex items-center text-lg">
                    <BarChart className="h-5 w-5 mr-2" />
                    Sales Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {quotes.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <p>No data available yet</p>
                      <p className="text-sm mt-2">Create quotes to see your sales pipeline</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Badge className={getStatusColor(status)}>{status}</Badge>
                            <span className="ml-2 text-sm">
                              {count} <span className="hidden sm:inline">quotes</span>
                            </span>
                          </div>
                          <span className="font-medium">
                            {Math.round((count / filteredQuotes.length) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="px-4 py-4 sm:px-6">
                  <CardTitle className="text-lg">Financial Summary</CardTitle>
                  {user?.isAdmin && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <Select
                          value={selectedUserId || "all"}
                          onValueChange={(value) => setSelectedUserId(value === "all" ? null : value)}
                        >
                          <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue placeholder="All team members" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All team members</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id.toString()}>
                                {u.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {filteredQuotes.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <p>No financial data available</p>
                      <p className="text-sm mt-2">Create quotes to see financial metrics</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                          <p className="text-xs sm:text-sm text-gray-500">Total Pipeline</p>
                          <p className="text-lg sm:text-2xl font-bold mt-1">{formatCurrency(totalValue)}</p>
                        </div>
                        <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                          <p className="text-xs sm:text-sm text-gray-500">Won Value</p>
                          <p className="text-lg sm:text-2xl font-bold mt-1 text-green-700">{formatCurrency(wonValue)}</p>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <p className="text-sm font-medium text-gray-500 mb-2">Conversion Rate</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ 
                              width: filteredQuotes.length 
                                ? `${Math.round((statusCounts["Won"] || 0) / filteredQuotes.length * 100)}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                        <p className="text-right text-sm mt-1">
                          {filteredQuotes.length 
                            ? Math.round((statusCounts["Won"] || 0) / filteredQuotes.length * 100) 
                            : 0}%
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}