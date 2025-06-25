
'use client';

import { BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketInsightsData, PricingModel } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Maximize, TrendingUp, BarChart3 as BarChartIcon } from 'lucide-react';

interface MarketInsightsProps {
  insights: MarketInsightsData;
}

const PIE_CHART_COLORS = {
    monthly: "hsl(var(--chart-1))",
    nightly: "hsl(var(--chart-2))",
    'lease-to-own': "hsl(var(--chart-3))",
};


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-xs bg-background/90 border rounded-md shadow-lg">
        <p className="font-bold">{label}</p>
        <p className="text-primary">{`Count: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const PieCustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-xs bg-background/90 border rounded-md shadow-lg">
        <p className="font-bold">{`${payload[0].name}: ${payload[0].value} (${payload[0].payload.percent}%)`}</p>
      </div>
    );
  }
  return null;
};

export function MarketInsights({ insights }: MarketInsightsProps) {

  return (
    <Card className="border-premium ring-1 ring-premium/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-premium">
          <BarChartIcon className="h-6 w-6"/> Market Insights (Premium)
        </CardTitle>
        <CardDescription>Exclusive data to help you optimize your listings and pricing strategy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center justify-center gap-1"><DollarSign className="h-4 w-4"/>Avg. Monthly Price</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">${(insights.avgPricePerSqftMonthly || 0).toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/sqft</span></p></CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center justify-center gap-1"><DollarSign className="h-4 w-4"/>Avg. Nightly Price</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">${(insights.avgPricePerSqftNightly || 0).toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/sqft</span></p></CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5"/>Most Popular Amenities</CardTitle>
                    <CardDescription className="text-xs">Based on frequency in all active listings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={insights.amenityPopularity} layout="vertical" margin={{ left: 20, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                tickLine={false} 
                                axisLine={false} 
                                width={100}
                                dx={-5}
                                style={{ fontSize: '12px' }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Supply by Pricing Model</CardTitle>
                        <CardDescription className="text-xs">Distribution of all active listings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                                <Pie data={insights.supplyByPricingModel} cx="50%" cy="50%" outerRadius={60} dataKey="value" nameKey="name" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                    return ( <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">{`${(percent * 100).toFixed(0)}%`}</text>);
                                }}>
                                    {insights.supplyByPricingModel.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[entry.name as keyof typeof PIE_CHART_COLORS]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<PieCustomTooltip />} />
                                <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Demand by Pricing Model</CardTitle>
                        <CardDescription className="text-xs">Based on all confirmed bookings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                                <Pie data={insights.demandByPricingModel} cx="50%" cy="50%" outerRadius={60} dataKey="value" nameKey="name" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                    return ( <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">{`${(percent * 100).toFixed(0)}%`}</text>);
                                }}>
                                     {insights.demandByPricingModel.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[entry.name as keyof typeof PIE_CHART_COLORS]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<PieCustomTooltip />} />
                                <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

    