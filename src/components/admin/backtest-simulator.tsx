
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, Pause, RotateCcw, SkipForward, DollarSign, Users, TrendingUp, TrendingDown, Percent, Target, FileJson } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SimulationDataPoint = {
  month: number;
  users: number;
  revenue: number;
  costs: number;
  profit: number;
};

const defaultValues = {
  initialUsers: 100,
  userGrowthRate: 5, // % per month
  churnRate: 1, // % per month
  monthlyActiveUsers: 80, // % of total users
  conversionRate: 2, // % of MAU
  productPrice: 5, // $/month subscription
  cogs: 0.50, // Cost of goods sold per new user acquisition
  operatingExpenses: 500, // $/month
  taxRate: 25, // %
  revenueGrowthTarget: 0, // Not used in this version
};

const presets = {
  default: { ...defaultValues, name: "Default" },
  aggressive: {
    ...defaultValues,
    name: "Aggressive Growth",
    userGrowthRate: 20,
    conversionRate: 3,
    operatingExpenses: 2000,
    cogs: 1.5,
  },
  bootstrap: {
    ...defaultValues,
    name: "Lean Bootstrapping",
    userGrowthRate: 2,
    conversionRate: 1,
    operatingExpenses: 150,
    cogs: 0.1,
  }
};

const MAX_MONTHS = 60; // 5 years

export function BacktestSimulator() {
  // --- Simulation State ---
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<SimulationDataPoint[]>([]);
  const [currentMonth, setCurrentMonth] = useState(0);

  // --- Input Variables State ---
  const [params, setParams] = useState(defaultValues);
  
  const simulationSpeedRef = useRef(500);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const runSimulationStep = useCallback((prevHistory: SimulationDataPoint[]) => {
    const lastPoint = prevHistory[prevHistory.length - 1] || { month: 0, users: params.initialUsers, revenue: 0, costs: 0, profit: 0 };
    
    const newUsers = lastPoint.users * (params.userGrowthRate / 100);
    const churnedUsers = lastPoint.users * (params.churnRate / 100);
    const totalUsers = lastPoint.users + newUsers - churnedUsers;

    const activeUsers = totalUsers * (params.monthlyActiveUsers / 100);
    const convertingUsers = activeUsers * (params.conversionRate / 100);
    
    const revenue = convertingUsers * params.productPrice;
    const acquisitionCosts = newUsers * params.cogs;
    const totalCosts = acquisitionCosts + params.operatingExpenses;
    
    const preTaxProfit = revenue - totalCosts;
    const taxes = preTaxProfit > 0 ? preTaxProfit * (params.taxRate / 100) : 0;
    const profit = preTaxProfit - taxes;

    return {
      month: lastPoint.month + 1,
      users: Math.round(totalUsers),
      revenue: parseFloat(revenue.toFixed(2)),
      costs: parseFloat(totalCosts.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
    };
  }, [params]);
  
  // This effect recalculates the entire history when params change
  useEffect(() => {
    const newHistory: SimulationDataPoint[] = [];
    for (let i = 0; i < MAX_MONTHS; i++) {
      newHistory.push(runSimulationStep(newHistory));
    }
    setHistory(newHistory);
  }, [params, runSimulationStep]);

  const startSimulation = useCallback(() => {
    if (intervalRef.current) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setCurrentMonth(prev => {
        if (prev >= MAX_MONTHS - 1) {
          setIsRunning(false);
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return prev;
        }
        return prev + 1;
      });
    }, simulationSpeedRef.current);
  }, []);

  const pauseSimulation = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleReset = useCallback(() => {
    pauseSimulation();
    setCurrentMonth(0);
  }, [pauseSimulation]);

  const handleStepForward = useCallback(() => {
    if (isRunning) pauseSimulation();
    setCurrentMonth(prev => Math.min(prev + 1, MAX_MONTHS - 1));
  }, [isRunning, pauseSimulation]);

  const handlePresetChange = (presetName: string) => {
    const preset = Object.values(presets).find(p => p.name === presetName);
    if (preset) {
      setParams(preset);
      handleReset();
    }
  };

  const displayedHistory = useMemo(() => {
    return history.slice(0, currentMonth + 1);
  }, [history, currentMonth]);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history.slice(0, MAX_MONTHS), null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `landhare_backtest_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleParamChange = (key: keyof typeof params, value: number) => {
    setParams(prev => ({...prev, [key]: value}));
  };

  const renderSliderInput = (
    label: string, icon: React.ElementType, key: keyof typeof params, 
    min: number, max: number, step: number, unit: string = ""
  ) => (
    <div className="space-y-2">
      <Label htmlFor={key} className="flex items-center gap-2 text-sm"><icon className="h-4 w-4 text-muted-foreground" /> {label}</Label>
      <div className="flex items-center gap-2">
        <Slider id={key} value={[params[key]]} onValueChange={([v]) => handleParamChange(key, v)} min={min} max={max} step={step} className="flex-grow"/>
        <Input type="number" value={params[key]} onChange={(e) => handleParamChange(key, parseFloat(e.target.value) || 0)} className="w-24 h-8" min={min} max={max} step={step} />
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Controls Column */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Simulation Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center gap-2">
              <Button onClick={isRunning ? pauseSimulation : startSimulation} size="sm" className="w-24">
                {isRunning ? <><Pause className="mr-2" /> Pause</> : <><Play className="mr-2"/> Play</>}
              </Button>
              <Button onClick={handleStepForward} variant="outline" size="sm" disabled={isRunning}><SkipForward className="mr-2"/> Step</Button>
              <Button onClick={handleReset} variant="outline" size="sm"><RotateCcw className="mr-2"/> Reset</Button>
            </div>
            <div>
               <Label htmlFor="speed">Simulation Speed</Label>
               <Select defaultValue="500" onValueChange={val => simulationSpeedRef.current = parseInt(val, 10)}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="1000">Slow</SelectItem>
                   <SelectItem value="500">Normal</SelectItem>
                   <SelectItem value="200">Fast</SelectItem>
                   <SelectItem value="50">Very Fast</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preset Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Object.values(presets).map(p => (
              <Button key={p.name} variant={params.name === p.name ? "secondary" : "outline"} onClick={() => handlePresetChange(p.name)}>{p.name}</Button>
            ))}
          </CardContent>
        </Card>
        <Card>
           <CardHeader><CardTitle>Variables</CardTitle></CardHeader>
           <CardContent className="space-y-4">
              {renderSliderInput("Subscription Price", DollarSign, 'productPrice', 0, 100, 1, "$/mo")}
              {renderSliderInput("Operating Expenses", DollarSign, 'operatingExpenses', 0, 10000, 100, "$/mo")}
              {renderSliderInput("Acquisition Cost", DollarSign, 'cogs', 0, 10, 0.1, "$/user")}
              {renderSliderInput("Initial Users", Users, 'initialUsers', 0, 1000, 10)}
              {renderSliderInput("User Growth Rate", TrendingUp, 'userGrowthRate', 0, 50, 1, "%/mo")}
              {renderSliderInput("Churn Rate", TrendingDown, 'churnRate', 0, 20, 0.5, "%/mo")}
              {renderSliderInput("MAU Rate", Users, 'monthlyActiveUsers', 0, 100, 5, "% of total")}
              {renderSliderInput("Conversion Rate", Target, 'conversionRate', 0, 20, 0.5, "% of MAU")}
              {renderSliderInput("Tax Rate", Percent, 'taxRate', 0, 50, 1, "%")}
           </CardContent>
        </Card>
      </div>

      {/* Graph Column */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle>Simulation Output</CardTitle>
              <CardDescription>Month: <span className="font-bold text-primary">{currentMonth}</span> / {MAX_MONTHS}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}><FileJson className="mr-2"/> Export Data</Button>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] w-full">
               <ResponsiveContainer>
                 <LineChart
                   data={displayedHistory}
                   margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                 >
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="month" label={{ value: 'Months', position: 'insideBottom', offset: -5, dy: 10, fontSize: '12px' }}/>
                   <YAxis yAxisId="left" label={{ value: 'USD ($)', angle: -90, position: 'insideLeft', dx: -10, fontSize: '12px' }} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                   <YAxis yAxisId="right" orientation="right" label={{ value: 'Users', angle: 90, position: 'insideRight', dx: 10, fontSize: '12px' }} tickFormatter={(value) => value.toLocaleString()} />
                   <Tooltip
                     formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
                     labelFormatter={(label) => `Month: ${label}`}
                     contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                   />
                   <Legend />
                   <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                   <Line yAxisId="left" type="monotone" dataKey="costs" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                   <Line yAxisId="left" type="monotone" dataKey="profit" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                   <Line yAxisId="right" type="monotone" dataKey="users" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
                 </LineChart>
               </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
