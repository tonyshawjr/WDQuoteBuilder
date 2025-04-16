import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuoteMetricsResponse {
  // Average quote size
  averageQuoteSize: number;
  
  // Chart data for quote sizes over time
  quoteSizesByMonth: Array<{
    month: string;
    averageSize: number;
    count: number;
  }>;
  
  // Quote status distribution
  quoteStatusDistribution: Array<{
    status: string;
    count: number;
    value: number;
  }>;
  
  // Quote size distribution
  quoteSizeDistribution: {
    small: number; // < $1,000
    medium: number; // $1,000 - $5,000
    large: number; // $5,000 - $10,000
    enterprise: number; // > $10,000
  };
  
  // Total quotes and revenue
  totalQuotes: number;
  totalRevenue: number;
  
  // Conversion metrics
  conversionRate: number;
  wonRevenue: number;
  potentialRevenue: number;
}

export default function QuoteMetricsReport() {
  const [timeRange, setTimeRange] = useState<string>("all");
  
  // Fetch quote metrics data
  const { data, isLoading, error } = useQuery<QuoteMetricsResponse>({
    queryKey: ['/api/reports/quote-metrics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/reports/quote-metrics?timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch quote metrics data");
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
          <CardDescription>Failed to load quote metrics data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  const statusColors = {
    "Won": "#22c55e",
    "Lost": "#ef4444",
    "In Progress": "#3b82f6",
    "On Hold": "#9ca3af",
    "Proposal Sent": "#a855f7"
  };

  const sizePieData = data ? [
    { name: "Small ($0-$5.5k)", value: data.quoteSizeDistribution.small, color: "#f59e0b" },
    { name: "Medium ($5.5k-$10.5k)", value: data.quoteSizeDistribution.medium, color: "#f97316" },
    { name: "Large ($10.5k-$25.5k)", value: data.quoteSizeDistribution.large, color: "#ea580c" },
    { name: "Enterprise (>$25.5k)", value: data.quoteSizeDistribution.enterprise, color: "#c2410c" }
  ] : [];

  const statusPieData = data?.quoteStatusDistribution || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-6">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quote Overview</CardTitle>
            <CardDescription>Summary of quote performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Total Quotes</p>
                <p className="text-3xl font-bold">{data?.totalQuotes || 0}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-3xl font-bold">{formatCurrency(data?.totalRevenue || 0)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Average Quote Size</p>
                <p className="text-3xl font-bold">{formatCurrency(data?.averageQuoteSize || 0)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-3xl font-bold">{data ? Math.round(data.conversionRate * 100) : 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quote Status Distribution</CardTitle>
            <CardDescription>Breakdown of quotes by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {data && statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      nameKey="status"
                      label={({ status, count, percent }) => `${status}: ${count} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {statusPieData.map((entry, index) => {
                        const color = statusColors[entry.status as keyof typeof statusColors] || "#777777";
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [value, props.payload.status]}
                      labelFormatter={() => "Quote Count"}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No status data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Average Quote Size Trend</CardTitle>
          <CardDescription>Average quote size over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {data && data.quoteSizesByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.quoteSizesByMonth}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis 
                    tickFormatter={(tick) => `$${(tick/1000).toFixed(0)}k`} 
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${formatCurrency(value)}`, "Average Quote Size"]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="averageSize"
                    stroke="#F9B200"
                    name="Average Quote Size"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6, stroke: "#F9B200", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No trend data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quote Value Distribution</CardTitle>
            <CardDescription>Breakdown of quotes by size</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {data && sizePieData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sizePieData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      width={150}
                    />
                    <Tooltip
                      formatter={(value) => [value, "Quote Count"]}
                    />
                    <Bar dataKey="value" name="Number of Quotes">
                      {sizePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No size distribution data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Opportunity Pipeline</CardTitle>
            <CardDescription>Value of deals in pipeline vs. won revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-center p-4 bg-[#1F1F1F] rounded-md">
                  <p className="text-sm text-gray-500">Won Revenue</p>
                  <p className="text-2xl font-bold text-green-500">{formatCurrency(data?.wonRevenue || 0)}</p>
                </div>
                <div className="space-y-2 text-center p-4 bg-[#1F1F1F] rounded-md">
                  <p className="text-sm text-gray-500">Potential Revenue</p>
                  <p className="text-2xl font-bold text-blue-500">{formatCurrency(data?.potentialRevenue || 0)}</p>
                </div>
              </div>
              
              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-sm">
                  <span>Revenue Progress</span>
                  <span>
                    {data
                      ? ((data.wonRevenue / (data.wonRevenue + data.potentialRevenue)) * 100).toFixed(1)
                      : "0"}%
                  </span>
                </div>
                <div className="h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
                  {data && (data.wonRevenue + data.potentialRevenue > 0) ? (
                    <div 
                      className="h-full bg-green-500" 
                      style={{ width: `${(data.wonRevenue / (data.wonRevenue + data.potentialRevenue)) * 100}%` }}
                    ></div>
                  ) : (
                    <div className="h-full bg-gray-800" style={{ width: '0%' }}></div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Monthly Quote Volume</CardTitle>
          <CardDescription>Number of quotes created each month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {data && data.quoteSizesByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.quoteSizesByMonth}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [value, "Quotes Created"]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    name="Number of Quotes" 
                    stroke="#F9B200" 
                    fill="#F9B200" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No monthly volume data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}