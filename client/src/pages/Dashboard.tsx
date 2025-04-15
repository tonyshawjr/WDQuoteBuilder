import { useState } from "react";
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
import { PlusCircle, FileText, BarChart, Eye } from "lucide-react";

export default function Dashboard() {
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
  
  // Group quotes by status for reporting
  const statusCounts = quotes.reduce((acc: Record<string, number>, quote) => {
    const status = quote.leadStatus || "In Progress";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  const totalValue = quotes.reduce((sum, quote) => sum + (quote.totalPrice || 0), 0);
  const wonValue = quotes
    .filter(quote => quote.leadStatus === "Won")
    .reduce((sum, quote) => sum + (quote.totalPrice || 0), 0);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Format date 
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };
  
  // Get badge color based on status
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Won": return "bg-green-100 text-green-800";
      case "Lost": return "bg-red-100 text-red-800";
      case "Proposal Sent": return "bg-blue-100 text-blue-800";
      case "On Hold": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button onClick={() => setLocation("/calculator")}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Quote
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="quotes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Quote List
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quotesLoading ? (
                  <div className="py-8 text-center text-gray-500">Loading quotes...</div>
                ) : quotes.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    No quotes found. Create your first quote with the calculator.
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
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart className="h-5 w-5 mr-2" />
                    Sales Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Badge className={getStatusColor(status)}>{status}</Badge>
                          <span className="ml-2">{count} quotes</span>
                        </div>
                        <span className="font-medium">
                          {Math.round((count / quotes.length) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Total Pipeline Value</p>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(totalValue)}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Won Business Value</p>
                        <p className="text-2xl font-bold mt-1 text-green-700">{formatCurrency(wonValue)}</p>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <p className="text-sm font-medium text-gray-500 mb-2">Conversion Rate</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ 
                            width: quotes.length 
                              ? `${Math.round((statusCounts["Won"] || 0) / quotes.length * 100)}%` 
                              : '0%' 
                          }}
                        />
                      </div>
                      <p className="text-right text-sm mt-1">
                        {quotes.length 
                          ? Math.round((statusCounts["Won"] || 0) / quotes.length * 100) 
                          : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}