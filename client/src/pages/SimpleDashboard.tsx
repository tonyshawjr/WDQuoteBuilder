import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Quote } from "@shared/schema";
import { PlusCircle, FileText, Eye, BarChart } from "lucide-react";

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

export default function SimpleDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("quotes");
  
  // Fetch quotes
  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ['/api/quotes'],
  });

  // Redirect if not logged in
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    setLocation("/login");
    return null;
  }
  
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
                      {Object.entries(
                        quotes.reduce((acc, quote) => {
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
                            {Math.round((count / quotes.length) * 100)}%
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
                  {quotes.length === 0 ? (
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
                            {formatCurrency(quotes.reduce((sum, quote) => sum + (quote.totalPrice || 0), 0))}
                          </p>
                        </div>
                        <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                          <p className="text-xs sm:text-sm text-gray-500">Won Value</p>
                          <p className="text-lg sm:text-2xl font-bold mt-1 text-green-700">
                            {formatCurrency(
                              quotes
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
                              width: quotes.length 
                                ? `${Math.round((quotes.filter(q => q.leadStatus === "Won").length / quotes.length) * 100)}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                        <p className="text-right text-sm mt-1">
                          {quotes.length 
                            ? Math.round((quotes.filter(q => q.leadStatus === "Won").length / quotes.length) * 100) 
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