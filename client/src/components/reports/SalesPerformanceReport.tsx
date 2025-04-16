import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SalesPersonPerformance {
  username: string;
  name: string;
  totalQuotes: number;
  totalRevenue: number;
  wonQuotes: number;
  wonRevenue: number;
  lostQuotes: number;
  lostRevenue: number;
  pendingQuotes: number;
  potentialRevenue: number;
  averageQuoteSize: number;
  averageWonSize: number;
  conversionRate: number;
}

interface TeamTotals {
  totalQuotes: number;
  totalRevenue: number;
  wonQuotes: number;
  wonRevenue: number;
  lostQuotes: number;
  pendingQuotes: number;
  averageQuoteSize: number;
  conversionRate: number;
}

interface SalesPerformanceResponse {
  salesPerformance: SalesPersonPerformance[];
  teamTotals: TeamTotals;
  monthlyPerformanceChart: Record<string, any>[];
  timeRange: string;
}

export default function SalesPerformanceReport() {
  const [timeRange, setTimeRange] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("wonRevenue");
  const [chartMetric, setChartMetric] = useState<string>("revenue");
  
  // Fetch sales performance data
  const { data, isLoading, error } = useQuery<SalesPerformanceResponse>({
    queryKey: ['/api/reports/sales-performance', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/reports/sales-performance?timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch sales performance data");
      }
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load sales performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.salesPerformance || data.salesPerformance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
          <CardDescription>There is no sales performance data to display</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Start creating quotes to see performance metrics.</p>
        </CardContent>
      </Card>
    );
  }

  // Sort the sales performance data
  const sortedSalesPerformance = [...data.salesPerformance].sort((a, b) => {
    if (sortField === "conversionRate") {
      return b.conversionRate - a.conversionRate;
    } else if (sortField === "averageWonSize") {
      // Use provided or calculate if needed
      const aAvgWon = a.averageWonSize || (a.wonQuotes > 0 ? a.wonRevenue / a.wonQuotes : 0);
      const bAvgWon = b.averageWonSize || (b.wonQuotes > 0 ? b.wonRevenue / b.wonQuotes : 0);
      return bAvgWon - aAvgWon;
    } else if (sortField === "lostRevenue") {
      return (b.lostRevenue || 0) - (a.lostRevenue || 0);
    } else if (sortField === "potentialRevenue") {
      const aPotential = a.potentialRevenue || (a.totalRevenue - a.wonRevenue - (a.lostRevenue || 0));
      const bPotential = b.potentialRevenue || (b.totalRevenue - b.wonRevenue - (b.lostRevenue || 0));
      return bPotential - aPotential;
    } else if (sortField === "wonRevenue") {
      return b.wonRevenue - a.wonRevenue;
    } else {
      // Default to wonRevenue (if sortField not recognized)
      return b.wonRevenue - a.wonRevenue;
    }
  });

  // Prepare data for the bar chart
  const barChartData = sortedSalesPerformance.slice(0, 10).map(person => ({
    name: person.name,
    totalRevenue: person.totalRevenue,
    wonRevenue: person.wonRevenue,
    lostRevenue: person.lostRevenue || 0, // Add lost revenue
    potentialRevenue: person.potentialRevenue || (person.totalRevenue - person.wonRevenue - (person.lostRevenue || 0)), // Calculate potential
    totalQuotes: person.totalQuotes,
    wonQuotes: person.wonQuotes,
    averageQuoteSize: person.averageQuoteSize,
    averageWonSize: person.averageWonSize || (person.wonQuotes > 0 ? person.wonRevenue / person.wonQuotes : 0), // Calculate if not provided
    conversionRate: person.conversionRate * 100
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Colors for the charts
  const colors = {
    wonRevenue: "#10b981",         // Green for won revenue
    lostRevenue: "#ef4444",        // Red for lost revenue
    potentialRevenue: "#F9B200",   // Yellow for potential revenue
    averageWonSize: "#f97316",     // Orange for average size
    conversionRate: "#8b5cf6"      // Purple for conversion rate
  };

  // Prepare monthly performance chart data
  const monthlyChartData = data.monthlyPerformanceChart;
  
  // Create a set of all users in monthly data for the chart
  const allUsers = new Set<string>();
  monthlyChartData.forEach(month => {
    Object.keys(month).forEach(key => {
      if (key !== 'month' && key.includes('_')) {
        const [username] = key.split('_');
        allUsers.add(username);
      }
    });
  });

  // Prepare monthly chart lines
  const monthlyChartLines = Array.from(allUsers).map(username => {
    const user = data.salesPerformance.find(p => p.username === username);
    const userDisplayName = user ? user.name : username;
    
    return {
      dataKey: chartMetric === 'revenue' ? `${username}_revenue` : `${username}_quotes`,
      name: userDisplayName,
      stroke: colors[Object.keys(colors)[Math.floor(Math.random() * Object.keys(colors).length)] as keyof typeof colors],
      type: "monotone"
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Sales Team Performance</h2>
          <p className="text-gray-500">
            Analysis of your sales team's performance {timeRange !== "all" && `in the ${timeRange}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="past30days">Past 30 days</SelectItem>
              <SelectItem value="past90days">Past 90 days</SelectItem>
              <SelectItem value="pastyear">Past year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#282828]">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Won Revenue</p>
              <p className="text-3xl font-bold text-green-500">{formatCurrency(data.teamTotals.wonRevenue)}</p>
              <p className="text-sm text-gray-400 mt-1">
                From {data.teamTotals.wonQuotes} won quotes
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#282828]">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Potential Revenue</p>
              <p className="text-3xl font-bold text-yellow-500">{formatCurrency(data.teamTotals.totalRevenue - data.teamTotals.wonRevenue)}</p>
              <p className="text-sm text-gray-400 mt-1">
                From {data.teamTotals.pendingQuotes} pending quotes
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#282828]">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-purple-500">
                {(data.teamTotals.conversionRate * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Won: {data.teamTotals.wonQuotes} / Lost: {data.teamTotals.lostQuotes}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#282828]">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Avg. Won Deal Size</p>
              <p className="text-3xl font-bold text-orange-500">
                {formatCurrency(data.teamTotals.wonQuotes > 0 
                  ? data.teamTotals.wonRevenue / data.teamTotals.wonQuotes 
                  : 0)}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Total Quotes: {data.teamTotals.totalQuotes}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance-ranking" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance-ranking">Performance Ranking</TabsTrigger>
          <TabsTrigger value="monthly-trends">Monthly Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance-ranking">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Sales Performance Ranking</CardTitle>
                  <CardDescription>
                    Sales team members ranked by actual won revenue
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sortField} onValueChange={setSortField}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wonRevenue">Won Revenue</SelectItem>
                      <SelectItem value="lostRevenue">Lost Revenue</SelectItem>
                      <SelectItem value="potentialRevenue">Potential Revenue</SelectItem>
                      <SelectItem value="conversionRate">Conversion Rate</SelectItem>
                      <SelectItem value="averageWonSize">Average Won Deal Size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      tickFormatter={
                        sortField === "conversionRate" 
                          ? (value) => `${value}%` 
                          : sortField.includes("Revenue") || sortField === "averageQuoteSize"
                            ? (value) => `$${(value/1000).toFixed(0)}k`
                            : (value) => value
                      }
                    />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip 
                      formatter={(value: any) => {
                        if (sortField === "conversionRate") {
                          return [`${value.toFixed(1)}%`, "Conversion Rate"];
                        } else if (sortField.includes("Revenue") || sortField.includes("Size")) {
                          let label;
                          if (sortField === "wonRevenue") label = "Won Revenue";
                          else if (sortField === "lostRevenue") label = "Lost Revenue";
                          else if (sortField === "potentialRevenue") label = "Potential Revenue";
                          else if (sortField === "averageWonSize") label = "Avg. Won Deal Size";
                          else label = "Revenue";
                          
                          return [formatCurrency(value), label];
                        } else {
                          return [value, "Count"];
                        }
                      }}
                      labelFormatter={(label) => `Sales Person: ${label}`}
                    />
                    <Legend />
                    <Bar 
                      dataKey={sortField} 
                      name={
                        sortField === "conversionRate" 
                          ? "Conversion Rate" 
                          : sortField === "wonRevenue"
                            ? "Won Revenue"
                            : sortField === "lostRevenue"
                              ? "Lost Revenue"
                              : sortField === "potentialRevenue"
                                ? "Potential Revenue"
                                : sortField === "averageWonSize"
                                  ? "Average Won Deal Size"
                                  : "Revenue"
                      }
                      fill={colors[sortField as keyof typeof colors] || "#F9B200"}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Detailed Sales Team Stats</CardTitle>
              <CardDescription>
                Comprehensive metrics for each sales team member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4">Sales Person</th>
                      <th className="text-right py-3 px-4">Total Quotes</th>
                      <th className="text-right py-3 px-4">Won Revenue</th>
                      <th className="text-right py-3 px-4">Lost Revenue</th>
                      <th className="text-right py-3 px-4">Potential Rev.</th>
                      <th className="text-right py-3 px-4">Avg. Won Size</th>
                      <th className="text-right py-3 px-4">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSalesPerformance.map((person, index) => {
                      const potentialRevenue = person.potentialRevenue || 
                        (person.totalRevenue - person.wonRevenue - (person.lostRevenue || 0));
                      const averageWonSize = person.averageWonSize || 
                        (person.wonQuotes > 0 ? person.wonRevenue / person.wonQuotes : 0);
                        
                      return (
                        <tr key={index} className="border-b border-gray-800">
                          <td className="py-3 px-4 font-medium">{person.name}</td>
                          <td className="py-3 px-4 text-right">{person.totalQuotes}</td>
                          <td className="py-3 px-4 text-right text-green-500">{formatCurrency(person.wonRevenue)}</td>
                          <td className="py-3 px-4 text-right text-red-500">{formatCurrency(person.lostRevenue || 0)}</td>
                          <td className="py-3 px-4 text-right text-yellow-500">{formatCurrency(potentialRevenue)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(averageWonSize)}</td>
                          <td className="py-3 px-4 text-right">{(person.conversionRate * 100).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly-trends">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Monthly Performance Trends</CardTitle>
                  <CardDescription>
                    View performance trends over time by sales person
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={chartMetric} onValueChange={setChartMetric}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Metric" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="quotes">Quote Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] w-full">
                {monthlyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis 
                        tickFormatter={
                          chartMetric === 'revenue' 
                            ? (value) => `$${(value/1000).toFixed(0)}k` 
                            : (value) => value
                        } 
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => {
                          const userName = name.split(' (')[0];
                          if (chartMetric === 'revenue') {
                            return [formatCurrency(value), userName];
                          }
                          return [value, userName];
                        }}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend />
                      {monthlyChartLines.map((line, index) => (
                        <Line
                          key={line.dataKey}
                          type={line.type as any}
                          dataKey={line.dataKey}
                          name={line.name}
                          stroke={line.stroke}
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No monthly data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Won Revenue Distribution</CardTitle>
                <CardDescription>
                  Percentage of won revenue by sales person
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sortedSalesPerformance.map((person, index) => ({
                          name: person.name,
                          value: person.wonRevenue,
                          fill: Object.values(colors)[index % Object.values(colors).length]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {sortedSalesPerformance.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={Object.values(colors)[index % Object.values(colors).length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatCurrency(value as number)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rates Comparison</CardTitle>
                <CardDescription>
                  Comparison of conversion rates across sales team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sortedSalesPerformance.map(person => ({
                        name: person.name,
                        rate: person.conversionRate * 100
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end"
                        height={80}
                        tick={{fontSize: 12}}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value.toFixed(1)}%`, "Conversion Rate"]}
                      />
                      <Bar 
                        dataKey="rate" 
                        name="Conversion Rate"
                        fill="#F9B200"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}