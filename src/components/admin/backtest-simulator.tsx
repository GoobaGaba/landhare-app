
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, Pause, RotateCcw, SkipForward, DollarSign, Users, TrendingUp, TrendingDown, Percent, Target, FileJson, Briefcase, LandPlot, Ratio, Landmark, Zap, Shield, HelpCircle, PiggyBank, Calendar, Clock, Sparkles, Save, Trash2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { getBacktestPresets, saveBacktestPreset, deleteBacktestPreset } from '@/lib/mock-data';
import type { BacktestPreset } from '@/lib/types';


type SimulationDataPoint = {
  month: number;
  year?: number;
  users: number;
  revenue: number;
  subscriptionRevenue: number;
  serviceFeeRevenue: number;
  costs: number;
  profit: number;
};

const defaultValues = {
  name: "Default Balanced Model",
  initialUsers: 100,
  userGrowthRate: 5, // % per month
  churnRate: 2, // % per month
  monthlyActiveUsers: 80, // % of total users
  // Revenue: Subscriptions
  premiumSubscriptionPrice: 5, // $/month
  premiumConversionRate: 2, // % of total users to subscription
  // Revenue: Marketplace Service Fees
  avgNightlyRate: 50, // $
  avgBookingNights: 3,
  shortTermBookingsPerMau: 0.1, // 10% of MAUs book a short-term stay each month
  avgMonthlyLeaseValue: 300, // $
  longTermLeasesPerMau: 0.01, // 1% of MAUs start a new long-term lease each month
  standardLandownerFee: 2.0, // %
  premiumLandownerFee: 0.49, // %
  premiumLandownerRatio: 10, // % of bookings are from premium landowners
  // Costs
  cac: 1.0, // Customer Acquisition Cost per new user
  fixedCosts: 500, // $/month
  variableCostPerUser: 0.05, // $/month
  // Market
  marketVolatility: 5, // % randomness
  taxRate: 25, // %
};

const presets = {
  default: { ...defaultValues },
  aggressive: {
    ...defaultValues,
    name: "Aggressive Growth",
    userGrowthRate: 20,
    premiumConversionRate: 4,
    shortTermBookingsPerMau: 0.15,
    longTermLeasesPerMau: 0.02,
    fixedCosts: 2000,
    cac: 2.5,
    marketVolatility: 15,
  },
  bootstrap: {
    ...defaultValues,
    name: "Lean Bootstrapping",
    userGrowthRate: 2,
    premiumConversionRate: 1.5,
    shortTermBookingsPerMau: 0.05,
    standardLandownerFee: 3.0,
    premiumLandownerFee: 1.0,
    fixedCosts: 250,
    cac: 0.2,
    marketVolatility: 2,
  },
  saasHeavy: {
    ...defaultValues,
    name: "Subscription-Focused",
    premiumSubscriptionPrice: 10,
    premiumConversionRate: 5,
    shortTermBookingsPerMau: 0.05,
    longTermLeasesPerMau: 0.005,
    standardLandownerFee: 1.5,
    premiumLandownerFee: 0.25,
    marketVolatility: 8,
  },
  marketplaceHeavy: {
      ...defaultValues,
      name: "Marketplace-Focused",
      premiumSubscriptionPrice: 2,
      premiumConversionRate: 1,
      shortTermBookingsPerMau: 0.2,
      longTermLeasesPerMau: 0.015,
      standardLandownerFee: 3.5,
      premiumLandownerFee: 1.5,
      marketVolatility: 10,
  }
};


const MAX_MONTHS = 60; // 5 years

const CustomChartTooltip = ({ active, payload, label, isAnnualView }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 text-xs bg-background/90 border rounded-md shadow-lg">
        <p className="font-bold">{isAnnualView ? 'Year' : 'Month'}: {label}</p>
        {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>
                {p.name}: {p.value.toLocaleString('en-US', { style: p.name === 'Total Users' ? 'decimal' : 'currency', currency: 'USD', maximumFractionDigits: 0 })}
            </p>
        ))}
        {data.subscriptionRevenue !== undefined && (
            <div className="pt-1 mt-1 border-t border-dashed">
                <p className="text-muted-foreground">Revenue Breakdown:</p>
                <p> • Subs: {data.subscriptionRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</p>
                <p> • Fees: {data.serviceFeeRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</p>
            </div>
        )}
      </div>
    );
  }
  return null;
};


export function BacktestSimulator() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<SimulationDataPoint[]>([]);
  const [currentMonth, setCurrentMonth] = useState(0);
  const [params, setParams] = useState(defaultValues);
  const [displayGranularity, setDisplayGranularity] = useState<'monthly' | 'annual'>('monthly');
  
  const [savedPresets, setSavedPresets] = useState<BacktestPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  
  const simulationSpeedRef = useRef(500);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPresets = useCallback(async () => {
    setIsLoadingPresets(true);
    try {
        const presetsFromDb = await getBacktestPresets();
        setSavedPresets(presetsFromDb);
    } catch (error: any) {
        toast({ title: "Error Loading Presets", description: error.message, variant: "destructive"});
    } finally {
        setIsLoadingPresets(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);


  const handleSavePreset = async () => {
    if (!presetName.trim()) {
        toast({ title: "Preset Name Required", description: "Please enter a name for your preset.", variant: "destructive" });
        return;
    }
    setIsSavingPreset(true);
    try {
        const newPreset: Omit<BacktestPreset, 'id'> = {
            name: presetName,
            parameters: { ...params, name: presetName },
            createdAt: new Date(),
        };
        await saveBacktestPreset(newPreset);
        toast({ title: "Preset Saved", description: `"${presetName}" has been saved to the database.`});
        setPresetName("");
        await fetchPresets(); // Refresh list
    } catch (error: any) {
        toast({ title: "Error Saving Preset", description: error.message, variant: "destructive" });
    } finally {
        setIsSavingPreset(false);
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    try {
      await deleteBacktestPreset(presetId);
      toast({ title: "Preset Deleted", description: "The preset has been removed from the database." });
      await fetchPresets(); // Refresh list
    } catch (error: any) {
      toast({ title: "Error Deleting Preset", description: error.message, variant: "destructive" });
    }
  };

  const loadPreset = (preset: BacktestPreset) => {
    setParams(preset.parameters);
    setPresetName(preset.name);
    handleReset();
    toast({ title: "Preset Loaded", description: `Loaded "${preset.name}".`});
  };

  const runSimulationStep = useCallback((prevHistory: SimulationDataPoint[]) => {
    const lastPoint = prevHistory[prevHistory.length - 1] || { month: 0, users: params.initialUsers, revenue: 0, costs: 0, profit: 0, subscriptionRevenue: 0, serviceFeeRevenue: 0 };
    
    const randomFactor = 1 + (params.marketVolatility / 100) * (Math.random() * 2 - 1);
    const effectiveGrowthRate = (params.userGrowthRate / 100) * randomFactor;
    
    const newUsers = lastPoint.users * effectiveGrowthRate;
    const churnedUsers = lastPoint.users * (params.churnRate / 100);
    const totalUsers = lastPoint.users + newUsers - churnedUsers;
    const activeUsers = totalUsers * (params.monthlyActiveUsers / 100);

    // --- Subscription Revenue ---
    const premiumUsers = totalUsers * (params.premiumConversionRate / 100);
    const subscriptionRevenue = premiumUsers * params.premiumSubscriptionPrice;

    // --- Marketplace Service Fee Revenue ---
    // Short-Term Rentals
    const grossShortTermValue = activeUsers * params.shortTermBookingsPerMau * params.avgNightlyRate * params.avgBookingNights;
    // Long-Term Leases
    const grossLongTermValue = activeUsers * params.longTermLeasesPerMau * params.avgMonthlyLeaseValue;
    // Total gross value processed by the marketplace
    const totalBookingGrossValue = grossShortTermValue + grossLongTermValue;
    // Weighted average service fee
    const standardFeeRate = params.standardLandownerFee / 100;
    const premiumFeeRate = params.premiumLandownerFee / 100;
    const premiumRatio = params.premiumLandownerRatio / 100;
    const avgServiceFeeRate = (premiumRatio * premiumFeeRate) + ((1 - premiumRatio) * standardFeeRate);
    const serviceFeeRevenue = totalBookingGrossValue * avgServiceFeeRate;
    
    const revenue = subscriptionRevenue + serviceFeeRevenue;
    
    // --- Costs ---
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
      subscriptionRevenue: parseFloat(subscriptionRevenue.toFixed(2)),
      serviceFeeRevenue: parseFloat(serviceFeeRevenue.toFixed(2)),
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
    
    const mauRatio = params.monthlyActiveUsers / 100;
    const avgMonthlySubRevenuePerUser = params.premiumSubscriptionPrice * (params.premiumConversionRate / 100);
    const grossShortTermPerMau = params.shortTermBookingsPerMau * params.avgNightlyRate * params.avgBookingNights;
    const grossLongTermPerMau = params.longTermLeasesPerMau * params.avgMonthlyLeaseValue;
    const avgServiceFeeRate = ((params.premiumLandownerRatio / 100) * (params.premiumLandownerFee / 100)) + ((1 - params.premiumLandownerRatio / 100) * (params.standardLandownerFee / 100));
    const avgMonthlyMarketplaceFeePerMau = (grossShortTermPerMau + grossLongTermPerMau) * avgServiceFeeRate;
    const arpu = avgMonthlySubRevenuePerUser + (avgMonthlyMarketplaceFeePerMau * mauRatio);
    const grossMargin = 1 - (params.variableCostPerUser / (arpu > 0 ? arpu : 1));
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
        subscriptionRevenue: parseFloat(yearSlice.reduce((acc, curr) => acc + curr.subscriptionRevenue, 0).toFixed(2)),
        serviceFeeRevenue: parseFloat(yearSlice.reduce((acc, curr) => acc + curr.serviceFeeRevenue, 0).toFixed(2)),
        costs: parseFloat(yearSlice.reduce((acc, curr) => acc + curr.costs, 0).toFixed(2)),
        profit: parseFloat(yearSlice.reduce((acc, curr) => acc + curr.profit, 0).toFixed(2)),
      });
    }
    return yearlyData;
  }, [history]);
  
  const isAnnualView = displayGranularity === 'annual';
  const displayedHistory = useMemo(() => isAnnualView ? annualHistory : history.slice(0, currentMonth + 1), [isAnnualView, annualHistory, history, currentMonth]);
  
  const startSimulation = useCallback(() => {
    if (intervalRef.current || isAnnualView) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => setCurrentMonth(prev => {
      if (prev >= MAX_MONTHS - 1) { setIsRunning(false); clearInterval(intervalRef.current!); intervalRef.current = null; return prev; }
      return prev + 1;
    }), simulationSpeedRef.current);
  }, [isAnnualView]);

  const pauseSimulation = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const handleReset = useCallback(() => { pauseSimulation(); setCurrentMonth(0); }, [pauseSimulation]);
  const handleStepForward = useCallback(() => { if (isRunning) pauseSimulation(); setCurrentMonth(prev => Math.min(prev + 1, MAX_MONTHS - 1)); }, [isRunning, pauseSimulation]);

  const handlePresetChange = (presetName: string) => {
    const preset = Object.values(presets).find(p => p.name === presetName);
    if (preset) { setParams(preset); setPresetName(preset.name); handleReset(); }
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

  const renderSliderInputWithTooltip = (
    label: string, icon: React.ElementType, key: keyof typeof params, min: number, max: number, step: number, tooltipText: string, unit: string = ""
  ) => (
    <div className="space-y-2">
      <UiTooltip delayDuration={100}>
        <TooltipTrigger asChild><Label htmlFor={key} className="flex items-center gap-2 text-sm cursor-help"><icon className="h-4 w-4 text-muted-foreground" /> {label}</Label></TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs"><p>{tooltipText}</p></TooltipContent>
      </UiTooltip>
      <div className="flex items-center gap-2">
        <Slider id={key} value={[params[key]]} onValueChange={([v]) => handleParamChange(key, v)} min={min} max={max} step={step} className="flex-grow"/>
        <Input type="number" value={params[key]} onChange={(e) => handleParamChange(key, parseFloat(e.target.value) || 0)} className="w-24 h-8" min={min} max={max} step={step} />
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );

  const renderKpiCard = (title: string, icon: React.ElementType, value: string, tooltip: string, colorClass?: string) => (
      <div className="p-3 rounded-lg bg-muted/50">
          <UiTooltip delayDuration={100}>
              <TooltipTrigger asChild>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1 cursor-help"><icon className="h-3 w-3" /> {title}</Label>
              </TooltipTrigger>
              <TooltipContent><p>{tooltip}</p></TooltipContent>
          </UiTooltip>
          <p className={cn("font-bold text-lg", colorClass)}>{value}</p>
      </div>
  )

  return (
    <TooltipProvider>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card><CardHeader><CardTitle>Simulation Controls</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center gap-2">
              <Button onClick={isRunning ? pauseSimulation : startSimulation} size="sm" className="w-24" disabled={isAnnualView}><div className="flex items-center">{isRunning ? <Pause className="mr-2" /> : <Play className="mr-2"/>}{isRunning ? "Pause" : "Play"}</div></Button>
              <Button onClick={handleStepForward} variant="outline" size="sm" disabled={isRunning || isAnnualView}><SkipForward className="mr-2"/> Step</Button>
              <Button onClick={handleReset} variant="outline" size="sm" disabled={isAnnualView}><RotateCcw className="mr-2"/> Reset</Button>
            </div>
             <div className="grid grid-cols-2 gap-4"><div><Label htmlFor="speed">Sim Speed</Label><Select defaultValue="500" onValueChange={val => simulationSpeedRef.current = parseInt(val, 10)} disabled={isAnnualView}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1000">Slow</SelectItem><SelectItem value="500">Normal</SelectItem><SelectItem value="200">Fast</SelectItem><SelectItem value="50">Very Fast</SelectItem></SelectContent></Select></div><div><Label htmlFor="granularity">View</Label><Select value={displayGranularity} onValueChange={(v) => {pauseSimulation(); setDisplayGranularity(v as any)}}><SelectTrigger id="granularity"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent></Select></div></div>
          </CardContent>
        </Card>
        
         <Card>
            <CardHeader><CardTitle>Preset Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <Label>Load Preset</Label>
                    <div className="flex gap-2">
                        <Select onValueChange={(id) => { const p = savedPresets.find(pr => pr.id === id); if (p) loadPreset(p); }} disabled={isLoadingPresets}>
                            <SelectTrigger className="flex-grow">
                                <SelectValue placeholder={isLoadingPresets ? "Loading presets..." : "Select a saved preset"} />
                            </SelectTrigger>
                            <SelectContent>
                                {savedPresets.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="built-in">
                                        <AccordionTrigger className="text-xs px-2 py-1">Built-in Scenarios</AccordionTrigger>
                                        <AccordionContent className="p-0">
                                            {Object.values(presets).map(p => <SelectItem key={p.name} value={p.name} onMouseDown={() => handlePresetChange(p.name)}>{p.name}</SelectItem>)}
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </SelectContent>
                        </Select>
                         <Button variant="destructive" size="icon" onClick={() => handleDeletePreset(savedPresets.find(p => p.name === presetName)?.id || '')} disabled={!savedPresets.some(p => p.name === presetName)} title="Delete current preset"><Trash2 className="h-4 w-4"/></Button>
                    </div>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="preset-name">Save Current as Preset</Label>
                    <div className="flex gap-2">
                        <Input id="preset-name" placeholder="Enter preset name..." value={presetName} onChange={(e) => setPresetName(e.target.value)} />
                        <Button onClick={handleSavePreset} disabled={isSavingPreset} size="icon" title="Save preset">{isSavingPreset ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}</Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3', 'item-4']} className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger>Growth & Churn</AccordionTrigger>
                <AccordionContent className="space-y-4">
                    {renderSliderInputWithTooltip("Initial Users", Users, 'initialUsers', 0, 1000, 10, "The starting number of users at Month 0.")}
                    {renderSliderInputWithTooltip("User Growth Rate", TrendingUp, 'userGrowthRate', 0, 50, 1, "The percentage of new users gained each month, based on the current total user count.", "%/mo")}
                    {renderSliderInputWithTooltip("Churn Rate", TrendingDown, 'churnRate', 0, 20, 0.5, "The percentage of total users who leave the platform each month. Higher churn negatively impacts growth and LTV.", "%/mo")}
                    {renderSliderInputWithTooltip("Monthly Active Users", Users, 'monthlyActiveUsers', 0, 100, 5, "The percentage of your total users who are considered 'active' and can contribute to revenue each month.", "% total")}
                </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-2">
                <AccordionTrigger>Revenue Model</AccordionTrigger>
                <AccordionContent className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-premium"/>Subscription Revenue</h4>
                    {renderSliderInputWithTooltip("Premium Sub Price", DollarSign, 'premiumSubscriptionPrice', 0, 100, 1, "The monthly price for your premium subscription tier.", "$/mo")}
                    {renderSliderInputWithTooltip("Premium Conversion Rate", Percent, 'premiumConversionRate', 0, 20, 0.5, "The percentage of your total users who subscribe to the premium plan.", "% total")}
                    
                    <h4 className="text-sm font-semibold text-muted-foreground pt-2 border-t flex items-center gap-2"><Landmark className="h-4 w-4 text-primary"/>Marketplace Revenue</h4>
                    {renderSliderInputWithTooltip("Standard Fee", Percent, 'standardLandownerFee', 0, 10, 0.25, "The service fee percentage charged to standard (non-premium) landowners on their payouts.", "%")}
                    {renderSliderInputWithTooltip("Premium Fee", Percent, 'premiumLandownerFee', 0, 10, 0.01, "The discounted service fee percentage charged to premium landowners on their payouts.", "%")}
                    {renderSliderInputWithTooltip("Premium Landowner Ratio", Users, 'premiumLandownerRatio', 0, 100, 5, "The estimated percentage of bookings that come from premium landowners, who pay the lower service fee.", "%")}

                    <h5 className="text-xs font-semibold text-muted-foreground pt-2 border-t flex items-center gap-2"><Clock className="h-3 w-3"/>Short-Term Rentals</h5>
                     {renderSliderInputWithTooltip("Avg. Nightly Rate", DollarSign, 'avgNightlyRate', 0, 500, 5, "The average price per night for a short-term rental.", "$/night")}
                     {renderSliderInputWithTooltip("Avg. Booking Length", Calendar, 'avgBookingNights', 1, 30, 1, "The average number of nights for a short-term rental booking.", "nights")}
                     {renderSliderInputWithTooltip("Bookings per MAU/Mo", Ratio, 'shortTermBookingsPerMau', 0, 1, 0.01, "The average number of short-term bookings a single 'Monthly Active User' (MAU) makes per month.")}

                     <h5 className="text-xs font-semibold text-muted-foreground pt-2 border-t flex items-center gap-2"><Calendar className="h-3 w-3"/>Long-Term Leases</h5>
                     {renderSliderInputWithTooltip("Avg. Monthly Lease", DollarSign, 'avgMonthlyLeaseValue', 0, 2000, 50, "The average value of a monthly long-term lease.", "$/mo")}
                     {renderSliderInputWithTooltip("Leases per MAU/Mo", Ratio, 'longTermLeasesPerMau', 0, 0.1, 0.005, "The percentage of 'Monthly Active Users' (MAU) who initiate a new long-term lease each month.")}

                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
                <AccordionTrigger>Costs & Market</AccordionTrigger>
                <AccordionContent className="space-y-4">
                    {renderSliderInputWithTooltip("Acquisition Cost (CAC)", Target, 'cac', 0, 10, 0.1, "The cost to acquire one new user (e.g., marketing spend).", "$/user")}
                    {renderSliderInputWithTooltip("Fixed Costs", Briefcase, 'fixedCosts', 0, 10000, 100, "Your fixed monthly expenses that don't change with user count (e.g., salaries, rent).", "$/mo")}
                    {renderSliderInputWithTooltip("Variable Cost per User", LandPlot, 'variableCostPerUser', 0, 5, 0.05, "Costs that scale with your total user base (e.g., server usage, support).", "$/user/mo")}
                    {renderSliderInputWithTooltip("Market Volatility", Zap, 'marketVolatility', 0, 50, 1, "Introduces a random fluctuation to the User Growth Rate each month to simulate market noise.", "%")}
                    {renderSliderInputWithTooltip("Tax Rate", Shield, 'taxRate', 0, 100, 1, "The tax rate applied to any profits generated.", "%")}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <Card><CardHeader><CardTitle>KPI Dashboard</CardTitle></CardHeader>
           <CardContent className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {renderKpiCard("CAC", Target, `$${kpiData.cac.toFixed(2)}`, "Customer Acquisition Cost: The average cost to acquire one new user.")}
              {renderKpiCard("LTV", PiggyBank, isFinite(kpiData.ltv) ? `$${kpiData.ltv.toFixed(2)}` : '∞', "Customer Lifetime Value: The total net profit you can expect from a single customer over their entire time on the platform.")}
              {renderKpiCard("LTV:CAC Ratio", Ratio, isFinite(kpiData.ratio) ? `${kpiData.ratio.toFixed(2)} : 1` : '∞', "The ratio of LTV to CAC. A healthy business model typically has a ratio of 3:1 or higher.", kpiData.ratio < 1 ? 'text-destructive' : kpiData.ratio >= 3 ? 'text-green-600' : '')}
              {renderKpiCard("Break-Even", Landmark, kpiData.breakEvenMonth > 0 ? `Month ${kpiData.breakEvenMonth}` : 'N/A', "The month where cumulative profit turns positive.")}
           </CardContent>
        </Card>
      
        <Card>
          <CardHeader className="flex flex-row justify-between items-start">
            <div><CardTitle>Simulation Output</CardTitle><CardDescription>Timeframe: {isAnnualView ? `${annualHistory.length} Years` : `Month ${currentMonth} / ${MAX_MONTHS}`}</CardDescription></div>
            <Button variant="outline" size="sm" onClick={handleExport}><FileJson className="mr-2"/> Export Full Data</Button>
          </CardHeader>
          <CardContent><div className="h-[400px] w-full">
               <ResponsiveContainer>
                 <LineChart data={displayedHistory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey={isAnnualView ? 'year' : 'month'} label={{ value: isAnnualView ? 'Years' : 'Months', position: 'insideBottom', offset: -5, dy: 10, fontSize: '12px' }}/>
                   <YAxis yAxisId="left" label={{ value: 'USD ($)', angle: -90, position: 'insideLeft', dx: -10, fontSize: '12px' }} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                   <YAxis yAxisId="right" orientation="right" label={{ value: 'Users', angle: 90, position: 'insideRight', dx: 10, fontSize: '12px' }} tickFormatter={(value) => value.toLocaleString()} />
                   <Tooltip content={<CustomChartTooltip isAnnualView={isAnnualView} />} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                   <Legend />
                   <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--premium-feature-h), var(--premium-feature-s), var(--premium-feature-l))" strokeWidth={2} dot={false} name="Revenue" />
                   <Line yAxisId="left" type="monotone" dataKey="costs" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Costs"/>
                   <Line yAxisId="left" type="monotone" dataKey="profit" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Profit"/>
                   <Line yAxisId="right" type="monotone" dataKey="users" stroke="hsl(200, 80%, 70%)" strokeWidth={2} dot={false} name="Total Users"/>
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
