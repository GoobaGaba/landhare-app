
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getTransactionsForUser } from '@/lib/mock-data';
import type { Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ReceiptText, Search, UserCircle, AlertTriangle, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { firebaseInitializationError } from '@/lib/firebase';

type FilterType = 'all' | 'payouts' | 'payments' | 'fees' | 'subscriptions';

export default function TransactionsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setIsLoading(false);
      setTransactions([]);
      return;
    }

    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const userTransactions = await getTransactionsForUser(currentUser.uid);
        setTransactions(userTransactions);
      } catch (error: any) {
        toast({ title: 'Error', description: `Failed to load transactions: ${error.message}`, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [currentUser, authLoading, toast]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        switch (filterType) {
          case 'payouts': return t.type === 'Landowner Payout';
          case 'payments': return t.type === 'Booking Payment';
          case 'fees': return t.type === 'Service Fee';
          case 'subscriptions': return t.type === 'Subscription' || t.type === 'Subscription Refund';
          default: return true; // 'all'
        }
      })
      .filter(t => {
        if (!searchTerm.trim()) return true;
        return t.description.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [transactions, filterType, searchTerm]);

  const summary = useMemo(() => {
    return transactions.reduce((acc, t) => {
        if (t.status !== 'Completed') return acc; // Only count completed transactions for summary
        if (t.type === 'Landowner Payout' || t.type === 'Subscription Refund') acc.income += t.amount;
        if (t.type === 'Booking Payment' || t.type === 'Subscription' || t.type === 'Service Fee') acc.expenses += Math.abs(t.amount);
        return acc;
    }, { income: 0, expenses: 0 });
  }, [transactions]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6" /> Not Logged In</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You must be logged in to view your transaction history.</p>
          <Button asChild className="mt-4"><Link href="/login">Log In</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-2"><ReceiptText className="h-8 w-8 text-primary" />Transaction History</CardTitle>
          <CardDescription>View your payments, payouts, and service fees.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${summary.income.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">From completed payouts & refunds</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">${summary.expenses.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">From bookings, fees & subscriptions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", (summary.income - summary.expenses) >= 0 ? 'text-primary' : 'text-destructive')}>
                  ${(summary.income - summary.expenses).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Completed income minus expenses</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search descriptions..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="payouts">Payouts</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="fees">Service Fees</SelectItem>
                <SelectItem value="subscriptions">Subscriptions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Loading transactions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map(t => {
                     const date = t.date instanceof Date ? t.date : (t.date as any).toDate();
                     const isIncome = t.type === 'Landowner Payout' || t.type === 'Subscription Refund';
                     let typeVariant: "default" | "secondary" | "destructive" | "outline" = "default";
                     switch(t.type) {
                        case 'Landowner Payout': typeVariant = 'default'; break;
                        case 'Booking Payment': typeVariant = 'secondary'; break;
                        case 'Subscription': typeVariant = 'secondary'; break;
                        case 'Subscription Refund': typeVariant = 'default'; break;
                        case 'Service Fee': typeVariant = 'destructive'; break;
                     }
                    return (
                        <TableRow key={t.id}>
                            <TableCell className="text-muted-foreground">{format(date, 'MMM d, yyyy')}</TableCell>
                            <TableCell className="font-medium">{t.description}</TableCell>
                            <TableCell><Badge variant={typeVariant}>{t.type}</Badge></TableCell>
                            <TableCell><Badge variant={t.status === 'Completed' ? 'default' : t.status === 'Pending' ? 'outline' : 'destructive'} className={t.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-200' : ''}>{t.status}</Badge></TableCell>
                            <TableCell className={cn("text-right font-mono", isIncome ? 'text-green-600' : 'text-red-600')}>
                                {isIncome ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                            </TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No transactions found for the selected filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
