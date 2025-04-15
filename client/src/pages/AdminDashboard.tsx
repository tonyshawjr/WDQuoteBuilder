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
  SelectValue,
} from "@/components/ui/select";
import { Quote, User } from "@shared/schema";
import { PlusCircle, FileText, Eye, BarChart, Users } from "lucide-react";

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
    case "Won": return "bg-green-100 text-green-800";
    case "Lost": return "bg-red-100 text-red-800";
    case "Proposal Sent": return "bg-blue-100 text-blue-800";
    case "On Hold": return "bg-yellow-100 text-yellow-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("quotes");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Fetch quotes
  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ['/api/quotes'],
  });
  
  // Fetch users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user?.isAdmin,
  });

  // Filter quotes based on selected user
  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    
    if (!selectedUserId) {
      return quotes;
    }
    
    // Convert both to string for proper comparison
    return quotes.filter(quote => 
      quote.createdBy && quote.createdBy.toString() === selectedUserId.toString()
    );
  }, [quotes, selectedUserId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center space-x-2 self-start">
              <Users className="h-4 w-4 text-gray-500" />
              <Select
                value={selectedUserId || "all"}
                onValueChange={(value) => setSelectedUserId(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All team members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All team members</SelectItem>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setLocation("/calculator")} className="self-start sm:self-auto">
              <PlusCircle className="h-4 w-4 mr-2" />
              <span className="sm:inline">Create New Quote</span>
            </Button>
          </div>
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
                ) : filteredQuotes.length === 0 ? (
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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Business</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Created By</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredQuotes.map(quote => (
                          <TableRow key={quote.id}>
                            <TableCell className="font-medium">{quote.clientName}</TableCell>
                            <TableCell>{quote.businessName || "-"}</TableCell>
                            <TableCell>{formatCurrency(quote.totalPrice || 0)}</TableCell>
                            <TableCell>{formatDate(quote.createdAt || null)}</TableCell>
                            <TableCell>
                              {users.find(u => u.id.toString() === quote.createdBy)?.username || quote.createdBy}
                            </TableCell>
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
                  {filteredQuotes.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <p>No data available yet</p>
                      <p className="text-sm mt-2">Create quotes to see your sales pipeline</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(
                        filteredQuotes.reduce((acc, quote) => {
                          const status = quote.leadStatus || "In Progress";
                          acc[status] = (acc[status] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([status, count]) => (
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
                          <p className="text-lg sm:text-2xl font-bold mt-1">
                            {formatCurrency(filteredQuotes.reduce((sum, quote) => sum + (quote.totalPrice || 0), 0))}
                          </p>
                        </div>
                        <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                          <p className="text-xs sm:text-sm text-gray-500">Won Value</p>
                          <p className="text-lg sm:text-2xl font-bold mt-1 text-green-700">
                            {formatCurrency(
                              filteredQuotes
                                .filter(quote => quote.leadStatus === "Won")
                                .reduce((sum, quote) => sum + (quote.totalPrice || 0), 0)
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <p className="text-sm font-medium text-gray-500 mb-2">Conversion Rate</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ 
                              width: filteredQuotes.length 
                                ? `${Math.round((filteredQuotes.filter(q => q.leadStatus === "Won").length / filteredQuotes.length) * 100)}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                        <p className="text-right text-sm mt-1">
                          {filteredQuotes.length 
                            ? Math.round((filteredQuotes.filter(q => q.leadStatus === "Won").length / filteredQuotes.length) * 100) 
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