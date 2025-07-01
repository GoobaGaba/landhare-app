
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, Pause, RotateCcw, SkipForward, DollarSign, Users, TrendingUp, TrendingDown, Percent, Target, FileJson, Briefcase, LandPlot, Ratio, Landmark } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

type SimulationDataPoint = {
  month: number;
  year?: number;
  users: number;
  revenue: number;
  costs: number;
  profit: number;
};

const defaultValues = {
  name: "Default",
  initialUsers: 100,
  userGrowthRate: 5, // % per month
  churnRate: 2, // % per month
  monthlyActiveUsers: 80, // % of total users
  conversionRate: 2, // % of MAU to subscription
  productPrice: 5, // $/month subscription
  cac: 1.0, // Customer Acquisition Cost
  fixedCosts: 500, // $/month
  variableCostPerUser: 0.05, // $/month
  taxRate: 25, // %
  marketVolatility: 5, // % randomness
};

const presets = {
  default: { ...defaultValues },
  aggressive: {
    ...defaultValues,
    name: "Aggressive Growth",
    userGrowthRate: 20,
    conversionRate: 3,
    fixedCosts: 2000,
    cac: 1.5,
    marketVolatility: 15,
  },
  bootstrap: {
    ...defaultValues,
    name: "Lean Bootstrapping",
    userGrowthRate: 2,
    conversionRate: 1.5,
    fixedCosts: 250,
    cac: 0.2,
    marketVolatility: 2,
  }
};

const MAX_MONTHS = 60; // 5 years

export function BacktestSimulator() {
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<SimulationDataPoint[]>([]);
  const [currentMonth, setCurrentMonth] = useState(0);
  const [params, setParams] = useState(defaultValues);
  const [displayGranularity, setDisplayGranularity] = useState<'monthly' | 'annual'>('monthly');
  
  const simulationSpeedRef = useRef(500);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const runSimulationStep = useCallback((prevHistory: SimulationDataPoint[]) => {
    const lastPoint = prevHistory[prevHistory.length - 1] || { month: 0, users: params.initialUsers, revenue: 0, costs: 0, profit: 0 };
    
    const randomFactor = 1 + (params.marketVolatility / 100) * (Math.random() * 2 - 1);
    const effectiveGrowthRate = (params.userGrowthRate / 100) * randomFactor;
    
    const newUsers = lastPoint.users * effectiveGrowthRate;
    const churnedUsers = lastPoint.users * (params.churnRate / 100);
    const totalUsers = lastPoint.users + newUsers - churnedUsers;

    const activeUsers = totalUsers * (params.monthlyActiveUsers / 100);
    const convertingUsers = activeUsers * (params.conversionRate / 100);
    
    const revenue = convertingUsers * params.productPrice;
    const acquisitionCosts = newUsers * params.cac;
    const totalVariableCosts = totalUsers * params.variableCostPerUser;
    const totalCosts = acquisitionCosts + params.fixedCosts + totalVariableCosts;
    
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
  
  useEffect(() => {
    const newHistory: SimulationDataPoint[] = [];
    for (let i = 0; i < MAX_MONTHS; i++) {
      newHistory.push(runSimulationStep(newHistory));
    }
    setHistory(newHistory);
  }, [params, runSimulationStep]);

  const kpiData = useMemo(() => {
    const monthlyChurnRate = params.churnRate / 100;
    if (monthlyChurnRate <= 0) return { ltv: Infinity, cac: params.cac, ratio: Infinity, breakEvenMonth: -1 };

    const arpu = params.productPrice * (params.monthlyActiveUsers / 100) * (params.conversionRate / 100);
    const grossMargin = 1; // Assuming digital product for now
    const ltv = (arpu * grossMargin) / monthlyChurnRate;
    const cac = params.cac;
    const ratio = cac > 0 ? ltv / cac : Infinity;

    let cumulativeProfit = 0;
    let breakEvenMonth = -1;
    for (const point of history) {
      cumulativeProfit += point.profit;
      if (cumulativeProfit > 0) {
        breakEvenMonth = point.month;
        break;
      }
    }

    return { ltv, cac, ratio, breakEvenMonth };
  }, [params, history]);


  const annualHistory = useMemo(() => {
    const yearlyData: SimulationDataPoint[] = [];
    for (let i = 0; i < MAX_MONTHS; i += 12) {
      const yearSlice = history.slice(i, i + 12);
      if (yearSlice.length === 0) continue;
      
      const lastMonthOfYear = yearSlice[yearSlice.length - 1];
      
      yearlyData.push({
        month: lastMonthOfYear.month,
        year: (i / 12) + 1,
        users: lastMonthOfYear.users,
        revenue: parseFloat(yearSlice.reduce((acc, curr) => acc + curr.revenue, 0).toFixed(2)),
        costs: parseFloat(yearSlice.reduce((acc, curr) => acc + curr.costs, 0).toFixed(2)),
        profit: parseFloat(yearSlice.reduce((acc, curr) => acc + curr.profit, 0).toFixed(2)),
      });
    }
    return yearlyData;
  }, [history]);
  
  const isAnnualView = displayGranularity === 'annual';

  const displayedHistory = useMemo(() => {
    return isAnnualView ? annualHistory : history.slice(0, currentMonth + 1);
  }, [isAnnualView, annualHistory, history, currentMonth]);
  
  const startSimulation = useCallback(() => {
    if (intervalRef.current || isAnnualView) return;
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
  }, [isAnnualView]);

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

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `landhare_backtest_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current) }; }, []);
  
  const handleParamChange = (key: keyof typeof params, value: number) => setParams(prev => ({...prev, [key]: value}));

  const renderSliderInput = (
    label: string, icon: React.ElementType, key: keyof typeof params, min: number, max: number, step: number, unit: string = ""
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
    <TooltipProvider>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Simulation Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center gap-2">
              <Button onClick={isRunning ? pauseSimulation : startSimulation} size="sm" className="w-24" disabled={isAnnualView}>
                {isRunning ? <><Pause className="mr-2" /> Pause</> : <><Play className="mr-2"/> Play</>}
              </Button>
              <Button onClick={handleStepForward} variant="outline" size="sm" disabled={isRunning || isAnnualView}><SkipForward className="mr-2"/> Step</Button>
              <Button onClick={handleReset} variant="outline" size="sm" disabled={isAnnualView}><RotateCcw className="mr-2"/> Reset</Button>
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="speed">Sim Speed</Label>
                   <Select defaultValue="500" onValueChange={val => simulationSpeedRef.current = parseInt(val, 10)} disabled={isAnnualView}>
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="1000">Slow</SelectItem>
                       <SelectItem value="500">Normal</SelectItem>
                       <SelectItem value="200">Fast</SelectItem>
                       <SelectItem value="50">Very Fast</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
                 <div>
                    <Label htmlFor="granularity">View</Label>
                   <Select value={displayGranularity} onValueChange={(v) => {pauseSimulation(); setDisplayGranularity(v as any)}}>
                     <SelectTrigger id="granularity"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="monthly">Monthly</SelectItem>
                       <SelectItem value="annual">Annual</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card>
           <CardHeader><CardTitle>KPI Dashboard</CardTitle></CardHeader>
           <CardContent className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> CAC</Label>
                  <p className="font-bold text-lg">${kpiData.cac.toFixed(2)}</p>
              </div>
               <div className="p-3 rounded-lg bg-muted/50">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> LTV</Label>
                  <p className="font-bold text-lg">${isFinite(kpiData.ltv) ? kpiData.ltv.toFixed(2) : '∞'}</p>
              </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Ratio className="h-3 w-3" /> LTV:CAC Ratio</Label>
                  <p className={cn("font-bold text-lg", kpiData.ratio < 1 ? 'text-destructive' : kpiData.ratio >= 3 ? 'text-primary' : '')}>
                      {isFinite(kpiData.ratio) ? `${kpiData.ratio.toFixed(2)} : 1` : '∞'}
                  </p>
              </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Landmark className="h-3 w-3" /> Break-Even</Label>
                  <p className="font-bold text-lg">{kpiData.breakEvenMonth > 0 ? `Month ${kpiData.breakEvenMonth}` : 'N/A'}</p>
              </div>
           </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Preset Scenarios</CardTitle></CardHeader>
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
              {renderSliderInput("Fixed Costs", Briefcase, 'fixedCosts', 0, 10000, 100, "$/mo")}
              {renderSliderInput("Variable Cost per User", LandPlot, 'variableCostPerUser', 0, 5, 0.05, "$/user/mo")}
              {renderSliderInput("Acquisition Cost (CAC)", Target, 'cac', 0, 10, 0.1, "$/user")}
              {renderSliderInput("Initial Users", Users, 'initialUsers', 0, 1000, 10)}
              {renderSliderInput("User Growth Rate", TrendingUp, 'userGrowthRate', 0, 50, 1, "%/mo")}
              {renderSliderInput("Churn Rate", TrendingDown, 'churnRate', 0, 20, 0.5, "%/mo")}
              {renderSliderInput("MAU Rate", Users, 'monthlyActiveUsers', 0, 100, 5, "% of total")}
              {renderSliderInput("Premium Conversion Rate", Percent, 'conversionRate', 0, 20, 0.5, "% of MAU")}
              {renderSliderInput("Market Volatility", TrendingUp, 'marketVolatility', 0, 50, 1, "%")}
           </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle>Simulation Output</CardTitle>
              <CardDescription>Timeframe: {isAnnualView ? `${annualHistory.length} Years` : `Month ${currentMonth} / ${MAX_MONTHS}`}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}><FileJson className="mr-2"/> Export Full Data</Button>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] w-full">
               <ResponsiveContainer>
                 <LineChart
                   data={displayedHistory}
                   margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                 >
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey={isAnnualView ? 'year' : 'month'} label={{ value: isAnnualView ? 'Years' : 'Months', position: 'insideBottom', offset: -5, dy: 10, fontSize: '12px' }}/>
                   <YAxis yAxisId="left" label={{ value: 'USD ($)', angle: -90, position: 'insideLeft', dx: -10, fontSize: '12px' }} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                   <YAxis yAxisId="right" orientation="right" label={{ value: 'Users', angle: 90, position: 'insideRight', dx: 10, fontSize: '12px' }} tickFormatter={(value) => value.toLocaleString()} />
                   <Tooltip
                     formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
                     labelFormatter={(label) => `${isAnnualView ? 'Year' : 'Month'}: ${label}`}
                     contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                   />
                   <Legend />
                   <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Revenue" />
                   <Line yAxisId="left" type="monotone" dataKey="costs" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Costs"/>
                   <Line yAxisId="left" type="monotone" dataKey="profit" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Profit"/>
                   <Line yAxisId="right" type="monotone" dataKey="users" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} name="Total Users"/>
                 </LineChart>
               </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </TooltipProvider>
  );
}
