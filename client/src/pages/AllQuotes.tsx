import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Calendar,
  ArrowUpDown,
  Search,
  Filter,
  X,
  User,
  FileText
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

import type { ProjectType, Quote as QuoteType, User as UserType } from "@shared/schema";

export default function AllQuotes() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isLoadingAuth = !user;
  const isAdmin = user?.isAdmin;
  
  // Query parameters and filters
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<"all" | number>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "In Progress" | "Proposal Sent" | "On Hold" | "Won" | "Lost">("all");
  const [selectedProjectType, setSelectedProjectType] = useState<"all" | number>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week">("all");
  const [sortField, setSortField] = useState<"createdAt" | "updatedAt" | "totalPrice" | "clientName">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Fetch data
  const { data: quotes, isLoading: isLoadingQuotes } = useQuery({
    queryKey: ["/api/quotes"],
  });
  
  const { data: projectTypes, isLoading: isLoadingProjectTypes } = useQuery({
    queryKey: ["/api/project-types"],
  });
  
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });
  
  // Helper function to get project type name by ID
  const getProjectTypeName = (projectTypeId: number | null) => {
    if (!projectTypeId) return "Not specified";
    const projectType = Array.isArray(projectTypes) 
      ? projectTypes.find((pt: ProjectType) => pt.id === projectTypeId)
      : null;
    return projectType ? projectType.name : "Unknown Project";
  };
  
  // Filter and sort quotes
  const filteredQuotes = useMemo(() => {
    if (!Array.isArray(quotes)) return [];
    
    return quotes.filter((quote: QuoteType) => {
      // Filter by search term
      const searchMatch = 
        search === "" || 
        quote.clientName.toLowerCase().includes(search.toLowerCase()) ||
        (quote.businessName && quote.businessName.toLowerCase().includes(search.toLowerCase())) ||
        (quote.email && quote.email.toLowerCase().includes(search.toLowerCase()));
      
      // Filter by user
      let userMatch = true;
      
      if (!isAdmin) {
        // Regular users only see their own quotes
        userMatch = quote.createdBy === user?.username;
      } else if (selectedUser !== "all") {
        // Admin with specific user selected
        const selectedUserName = Array.isArray(users) ? 
          users.find((u: UserType) => u.id === selectedUser)?.username : 
          '';
        userMatch = quote.createdBy === selectedUserName;
      }
      
      // Filter by status
      const statusMatch = selectedStatus === "all" || quote.leadStatus === selectedStatus;
      
      // Filter by project type
      const projectTypeMatch = selectedProjectType === "all" || quote.projectTypeId === selectedProjectType;
      
      // Filter by time
      let timeMatch = true;
      if (timeFilter !== "all") {
        const quoteDate = new Date(quote.createdAt);
        const now = new Date();
        
        if (timeFilter === "month") {
          // Last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          timeMatch = quoteDate >= thirtyDaysAgo;
        } else if (timeFilter === "week") {
          // Last 7 days
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          timeMatch = quoteDate >= sevenDaysAgo;
        }
      }
      
      return searchMatch && userMatch && statusMatch && projectTypeMatch && timeMatch;
    }).sort((a: QuoteType, b: QuoteType) => {
      // Sort quotes
      if (sortField === "clientName") {
        return sortDirection === "asc" 
          ? a.clientName.localeCompare(b.clientName)
          : b.clientName.localeCompare(a.clientName);
      } else if (sortField === "totalPrice") {
        const aPrice = a.totalPrice || 0;
        const bPrice = b.totalPrice || 0;
        return sortDirection === "asc" ? aPrice - bPrice : bPrice - aPrice;
      } else {
        // Sort by date fields
        const aDate = new Date(a[sortField]).getTime();
        const bDate = new Date(b[sortField]).getTime();
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
      }
    });
  }, [quotes, search, selectedUser, selectedStatus, selectedProjectType, timeFilter, sortField, sortDirection, users, isAdmin, user]);
  
  // Count filters applied
  const filterCount = useMemo(() => {
    let count = 0;
    if (search !== "") count++;
    if (selectedUser !== "all") count++;
    if (selectedStatus !== "all") count++;
    if (selectedProjectType !== "all") count++;
    if (timeFilter !== "all") count++;
    return count;
  }, [search, selectedUser, selectedStatus, selectedProjectType, timeFilter]);
  
  // Handle clearing filters
  const clearFilters = () => {
    setSearch("");
    setSelectedUser(isAdmin ? "all" : user?.id || "all");
    setSelectedStatus("all");
    setSelectedProjectType("all");
    setTimeFilter("all");
  };
  
  // Handle sort toggle
  const toggleSort = (field: "createdAt" | "updatedAt" | "totalPrice" | "clientName") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to descending when changing sort field
    }
  };
  
  if (isLoadingAuth || isLoadingQuotes || isLoadingProjectTypes || isLoadingUsers) {
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
  
  const noQuotesFound = filteredQuotes.length === 0;
  
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col justify-between items-start mb-6">
          <div className="mb-4 flex items-center justify-between w-full">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">All Quotes</h1>
              <p className="text-sm text-gray-600">View and manage all your quotes</p>
            </div>
            
            <Button onClick={() => navigate("/calculator")} className="flex-grow-0 h-9 text-sm">
              Create Quote
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full mb-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by client, business or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
              {search && (
                <button 
                  className="absolute right-2.5 top-2.5" 
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex-grow-0 sm:flex-grow-0 h-9 text-sm"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters {filterCount > 0 && <Badge className="ml-1 text-xs" variant="secondary">{filterCount}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div className="font-medium text-sm">Filter Options</div>
                  
                  <div className="grid gap-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-3">
                        <label className="text-xs font-medium mb-1 block">Status</label>
                        <Select 
                          value={selectedStatus}
                          onValueChange={(value: "all" | "In Progress" | "Proposal Sent" | "On Hold" | "Won" | "Lost") => setSelectedStatus(value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                            <SelectItem value="Won">Won</SelectItem>
                            <SelectItem value="Lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3">
                          <label className="text-xs font-medium mb-1 block">Sales Rep</label>
                          <Select 
                            value={selectedUser === "all" ? "all" : selectedUser.toString()}
                            onValueChange={(value) => setSelectedUser(value === "all" ? "all" : parseInt(value))}
                          >
                            <SelectTrigger className="h-8 text-xs">
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
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-3">
                        <label className="text-xs font-medium mb-1 block">Project Type</label>
                        <Select 
                          value={selectedProjectType === "all" ? "all" : selectedProjectType.toString()}
                          onValueChange={(value) => setSelectedProjectType(value === "all" ? "all" : parseInt(value))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Project Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Project Types</SelectItem>
                            {Array.isArray(projectTypes) && projectTypes.map((pt: ProjectType) => (
                              <SelectItem key={pt.id} value={pt.id.toString()}>
                                {pt.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-3">
                        <label className="text-xs font-medium mb-1 block">Time Period</label>
                        <Select
                          value={timeFilter}
                          onValueChange={(value: "all" | "month" | "week") => setTimeFilter(value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Time Period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="month">Last 30 Days</SelectItem>
                            <SelectItem value="week">Last 7 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <Button 
                      variant="outline" 
                      className="text-xs h-8"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </Button>
                    <Button className="text-xs h-8" onClick={() => document.body.click()}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {filterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 mb-4">
              {selectedStatus !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Status: {selectedStatus}
                  <button onClick={() => setSelectedStatus("all")}>
                    <X className="h-3 w-3 ml-1" />
                  </button>
                </Badge>
              )}
              
              {selectedUser !== "all" && isAdmin && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Rep: {Array.isArray(users) ? 
                    users.find((u: UserType) => u.id === selectedUser)?.firstName + ' ' + 
                    users.find((u: UserType) => u.id === selectedUser)?.lastName :
                    'Unknown'}
                  <button onClick={() => setSelectedUser("all")}>
                    <X className="h-3 w-3 ml-1" />
                  </button>
                </Badge>
              )}
              
              {selectedProjectType !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Project: {getProjectTypeName(selectedProjectType as number)}
                  <button onClick={() => setSelectedProjectType("all")}>
                    <X className="h-3 w-3 ml-1" />
                  </button>
                </Badge>
              )}
              
              {timeFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  Time: {timeFilter === "month" ? "Last 30 days" : "Last 7 days"}
                  <button onClick={() => setTimeFilter("all")}>
                    <X className="h-3 w-3 ml-1" />
                  </button>
                </Badge>
              )}
              
              {filterCount > 1 && (
                <Button 
                  variant="ghost" 
                  className="h-7 text-xs px-2 py-1" 
                  onClick={clearFilters}
                >
                  Clear All
                </Button>
              )}
            </div>
          )}
        </div>
        
        <Card className="overflow-hidden shadow-sm border-0">
          {noQuotesFound ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="bg-gray-100 rounded-full p-6 mb-4">
                <FileText className="h-10 w-10 text-primary/70" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h4>
              <p className="text-gray-500 text-center mb-4 max-w-md">
                {search ? 
                  "Try adjusting your search or filters to find what you're looking for" : 
                  "Start creating quotes for your clients to track opportunities and generate revenue"}
              </p>
              {!search ? (
                <Button 
                  onClick={() => navigate("/calculator")}
                  size="lg"
                >
                  Create your first quote
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={clearFilters}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <CardContent className="p-0">
              {/* Desktop view */}
              <div className="hidden md:block">
                <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] bg-gray-800 px-6 py-3 text-xs font-medium text-gray-200 uppercase tracking-wider">
                  <button 
                    className="col-span-3 flex items-center hover:text-white"
                    onClick={() => toggleSort("clientName")}
                  >
                    Client 
                    <ArrowUpDown className={`h-3 w-3 ml-1 ${sortField === "clientName" ? "opacity-100" : "opacity-50"}`} />
                  </button>
                  <div className="col-span-3">Project Type</div>
                  <button 
                    className="col-span-2 flex items-center hover:text-white"
                    onClick={() => toggleSort("createdAt")}
                  >
                    Created 
                    <ArrowUpDown className={`h-3 w-3 ml-1 ${sortField === "createdAt" ? "opacity-100" : "opacity-50"}`} />
                  </button>
                  <div className="col-span-2">Rep</div>
                  <div className="col-span-2">Status</div>
                  <button 
                    className="col-span-2 flex items-center hover:text-white justify-end"
                    onClick={() => toggleSort("totalPrice")}
                  >
                    Value 
                    <ArrowUpDown className={`h-3 w-3 ml-1 ${sortField === "totalPrice" ? "opacity-100" : "opacity-50"}`} />
                  </button>
                  <button 
                    className="col-span-2 flex items-center hover:text-white"
                    onClick={() => toggleSort("updatedAt")}
                  >
                    Updated 
                    <ArrowUpDown className={`h-3 w-3 ml-1 ${sortField === "updatedAt" ? "opacity-100" : "opacity-50"}`} />
                  </button>
                </div>
                <div>
                  {filteredQuotes.map((quote: QuoteType) => (
                    <div 
                      key={quote.id} 
                      className="grid grid-cols-[repeat(16,minmax(0,1fr))] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100"
                      onClick={() => navigate(`/quotes/${quote.id}`)}
                    >
                      <div className="col-span-3">
                        <div className="font-medium text-gray-900">{quote.clientName}</div>
                        <div className="text-sm text-gray-500 truncate">{quote.businessName || "Individual"}</div>
                      </div>
                      
                      <div className="col-span-3 flex items-center">
                        <div className="text-sm text-gray-700">
                          {getProjectTypeName(quote.projectTypeId)}
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex items-center text-sm text-gray-600">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </div>
                      
                      <div className="col-span-2 flex items-center text-sm text-gray-600">
                        {Array.isArray(users) 
                          ? users.find(u => u.username === quote.createdBy)
                              ? `${users.find(u => u.username === quote.createdBy)?.firstName || ''} ${users.find(u => u.username === quote.createdBy)?.lastName || ''}`
                              : quote.createdBy
                          : quote.createdBy
                        }
                      </div>
                      
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          quote.leadStatus === "Won" 
                            ? "bg-green-500 text-white" 
                            : quote.leadStatus === "Lost"
                              ? "bg-red-500 text-white"
                              : quote.leadStatus === "In Progress"
                                ? "bg-blue-500 text-white"
                                : quote.leadStatus === "On Hold"
                                  ? "bg-gray-500 text-white"
                                  : quote.leadStatus === "Proposal Sent"
                                    ? "bg-purple-500 text-white"
                                    : "bg-yellow-400 text-gray-900"
                        }`}>
                          <span className="h-2 w-2 rounded-full mr-1.5 bg-current opacity-70"></span>
                          {quote.leadStatus}
                        </span>
                      </div>
                      
                      <div className="col-span-2 font-semibold text-gray-900 text-right">
                        ${quote.totalPrice?.toLocaleString()}
                      </div>
                      
                      <div className="col-span-2 text-sm text-gray-600">
                        {new Date(quote.updatedAt || quote.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Mobile view - card style */}
              <div className="md:hidden">
                {filteredQuotes.map((quote: QuoteType) => (
                  <div 
                    key={quote.id} 
                    className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/quotes/${quote.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{quote.clientName}</h4>
                        <p className="text-sm text-gray-500">{quote.businessName || "Individual"}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        quote.leadStatus === "Won" 
                          ? "bg-green-500 text-white" 
                          : quote.leadStatus === "Lost"
                            ? "bg-red-500 text-white"
                            : quote.leadStatus === "In Progress"
                              ? "bg-blue-500 text-white"
                              : quote.leadStatus === "On Hold"
                                ? "bg-gray-500 text-white"
                                : quote.leadStatus === "Proposal Sent"
                                  ? "bg-purple-500 text-white"
                                  : "bg-yellow-400 text-gray-900"
                      }`}>
                        <span className="h-2 w-2 rounded-full mr-1 bg-current opacity-70"></span>
                        {quote.leadStatus}
                      </span>
                    </div>
                    
                    <div className="flex items-center mt-2 bg-gray-50 rounded-md px-2 py-1.5">
                      <div className="text-xs font-medium text-gray-600">
                        {getProjectTypeName(quote.projectTypeId)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                          {new Date(quote.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <User className="h-3 w-3 text-gray-400 mr-1" />
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
            </CardContent>
          )}
        </Card>
      </main>
    </>
  );
}