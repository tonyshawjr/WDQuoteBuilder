import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FeatureUsageData {
  featureName: string;
  count: number;
  totalRevenue: number;
}

interface FeatureUsageResponse {
  featureUsage: FeatureUsageData[];
  totalQuotes: number;
}

export default function FeatureUsageReport() {
  const [timeRange, setTimeRange] = useState<string>("all");
  const [chartMetric, setChartMetric] = useState<string>("count");
  
  // Fetch feature usage data
  const { data, isLoading, error } = useQuery<FeatureUsageResponse>({
    queryKey: ['/api/reports/feature-usage', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/reports/feature-usage?timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch feature usage data");
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
          <CardDescription>Failed to load feature usage data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for the chart
  const chartData = [...(data?.featureUsage || [])].sort((a, b) => 
    chartMetric === "count" 
      ? b.count - a.count 
      : b.totalRevenue - a.totalRevenue
  ).slice(0, 10); // Get top 10

  const colors = [
    "#F9B200", // Primary yellow 
    "#F59E0B", 
    "#F97316", 
    "#EA580C", 
    "#D97706",
    "#B45309", 
    "#92400E", 
    "#78350F", 
    "#633B2A", 
    "#4C2719"  
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Feature Usage Analysis</CardTitle>
              <CardDescription>
                Analysis of the most selected features {timeRange !== "all" && `in the ${timeRange}`}
              </CardDescription>
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
              <Select value={chartMetric} onValueChange={setChartMetric}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">By Selection Count</SelectItem>
                  <SelectItem value="revenue">By Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            {data && data.featureUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="featureName" width={90} />
                  <Tooltip 
                    formatter={(value: number) => {
                      if (chartMetric === "revenue") {
                        return [`$${value.toLocaleString()}`, "Revenue"];
                      }
                      return [value, "Times Selected"];
                    }} 
                    labelFormatter={(label) => `Feature: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey={chartMetric === "count" ? "count" : "totalRevenue"} 
                    name={chartMetric === "count" ? "Times Selected" : "Revenue ($)"}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No feature usage data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Most Popular Features</CardTitle>
          <CardDescription>
            Features ranked by selection frequency in quotes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4">Rank</th>
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-right py-3 px-4">Times Selected</th>
                  <th className="text-right py-3 px-4">% of Quotes</th>
                  <th className="text-right py-3 px-4">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data?.featureUsage && data.featureUsage.length > 0 ? (
                  [...data.featureUsage]
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                    .map((feature, index) => (
                      <tr key={index} className="border-b border-gray-800">
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{feature.featureName}</span>
                        </td>
                        <td className="py-3 px-4 text-right">{feature.count}</td>
                        <td className="py-3 px-4 text-right">
                          {data.totalQuotes ? ((feature.count / data.totalQuotes) * 100).toFixed(1) : "0"}%
                        </td>
                        <td className="py-3 px-4 text-right">${feature.totalRevenue.toLocaleString()}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No feature data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}