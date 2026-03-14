import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getDashboardMetrics, getInspections, getBuses, getCollections, getExpenses } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bus, ClipboardCheck, AlertTriangle, MessageSquare, DollarSign, TrendingUp, TrendingDown, BarChart3, PieChartIcon, TableIcon } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const DashboardPage = () => {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspectionData, setInspectionData] = useState([]);
  const [buses, setBuses] = useState([]);
  const [collections, setCollections] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Filters
  const [filterBusId, setFilterBusId] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Chart data
  const [collectionChartData, setCollectionChartData] = useState([]);
  const [expenseChartData, setExpenseChartData] = useState([]);
  const [expensePieData, setExpensePieData] = useState([]);
  const [dailyFinancialData, setDailyFinancialData] = useState([]);

  const COLORS = ['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F97316'];

  useEffect(() => {
    fetchBuses();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [filterBusId, filterStartDate, filterEndDate]);

  const fetchBuses = async () => {
    try {
      const response = await getBuses();
      setBuses(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch buses');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Build filter params for API
      const params = {};
      if (filterBusId && filterBusId !== 'all') {
        params.bus_id = filterBusId;
      }
      if (filterStartDate) {
        params.start_date = filterStartDate;
      }
      if (filterEndDate) {
        params.end_date = filterEndDate;
      }
      
      const [metricsRes, inspectionsRes, collectionsRes, expensesRes] = await Promise.all([
        getDashboardMetrics(params),
        getInspections(),
        getCollections(params),
        getExpenses(params),
      ]);
      
      setMetrics(metricsRes.data.data);
      
      const collectionsData = collectionsRes.data.data || [];
      const expensesData = expensesRes.data.data || [];
      setCollections(collectionsData);
      setExpenses(expensesData);
      
      // Process inspection data for charts
      let inspections = inspectionsRes.data.data || [];
      
      // Apply filters for chart data
      if (filterBusId && filterBusId !== 'all') {
        inspections = inspections.filter(i => i.bus_id === filterBusId);
      }
      
      if (filterStartDate) {
        inspections = inspections.filter(i => {
          const inspectionDate = new Date(i.inspection_date).toISOString().split('T')[0];
          return inspectionDate >= filterStartDate;
        });
      }
      
      if (filterEndDate) {
        inspections = inspections.filter(i => {
          const inspectionDate = new Date(i.inspection_date).toISOString().split('T')[0];
          return inspectionDate <= filterEndDate;
        });
      }
      
      processChartData(inspections);
      processFinancialCharts(collectionsData, expensesData);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (inspections) => {
    // Count failures by bus
    const busCounts = {};
    inspections
      .filter((i) => i.inspection_status === 'FAILED')
      .forEach((i) => {
        busCounts[i.bus_number] = (busCounts[i.bus_number] || 0) + 1;
      });

    const chartData = Object.entries(busCounts).map(([bus, failures]) => ({
      bus,
      failures,
    }));

    setInspectionData(chartData);
  };

  const processFinancialCharts = (collectionsData, expensesData) => {
    // Group collections by date
    const collectionsByDate = {};
    collectionsData.forEach(c => {
      collectionsByDate[c.date] = (collectionsByDate[c.date] || 0) + c.collected_amount;
    });

    // Group expenses by date
    const expensesByDate = {};
    expensesData.forEach(e => {
      expensesByDate[e.date] = (expensesByDate[e.date] || 0) + e.amount;
    });

    // Collection chart data (sorted by amount, high to low)
    const collectionChart = Object.entries(collectionsByDate)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    setCollectionChartData(collectionChart);

    // Expense chart data (sorted by amount, high to low)
    const expenseChart = Object.entries(expensesByDate)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    setExpenseChartData(expenseChart);

    // Expense pie chart (by category)
    const expensesByType = {};
    expensesData.forEach(e => {
      const type = e.expense_name || 'Other';
      expensesByType[type] = (expensesByType[type] || 0) + e.amount;
    });

    const totalExpense = Object.values(expensesByType).reduce((sum, val) => sum + val, 0);
    const pieData = Object.entries(expensesByType)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalExpense > 0 ? ((value / totalExpense) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.value - a.value);
    setExpensePieData(pieData);

    // Daily financial table
    const allDates = new Set([...Object.keys(collectionsByDate), ...Object.keys(expensesByDate)]);
    const dailyData = Array.from(allDates)
      .map(date => ({
        date,
        income: collectionsByDate[date] || 0,
        expense: expensesByDate[date] || 0,
        savings: (collectionsByDate[date] || 0) - (expensesByDate[date] || 0),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    setDailyFinancialData(dailyData);
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="dashboard-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{t('dashboard')}</h1>
            <p className="text-slate-600 mt-1">{t('fleet_overview')}</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm">{t('bus_filter')}</Label>
                <Select value={filterBusId} onValueChange={setFilterBusId}>
                  <SelectTrigger data-testid="dashboard-bus-filter" className="h-9 sm:h-10">
                    <SelectValue placeholder={t('all_buses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_buses')}</SelectItem>
                    {buses.map((bus) => (
                      <SelectItem key={bus.bus_id} value={bus.bus_id}>
                        {bus.bus_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs sm:text-sm">{t('start_date')}</Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  data-testid="dashboard-start-date"
                  className="h-9 sm:h-10"
                />
              </div>

              <div>
                <Label className="text-xs sm:text-sm">{t('end_date')}</Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  data-testid="dashboard-end-date"
                  className="h-9 sm:h-10"
                />
              </div>

              <div>
                <Label className="hidden sm:block">&nbsp;</Label>
                <Button
                  variant="outline"
                  className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                  onClick={() => {
                    setFilterBusId('all');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  data-testid="clear-dashboard-filters"
                >
                  {t('clear_filters')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow" data-testid="total-buses-card">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {t('total_buses')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">{metrics?.total_buses || 0}</p>
                <Bus className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600 shadow-sm hover:shadow-md transition-shadow" data-testid="daily-inspections-card">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {t('todays_inspections')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">{metrics?.daily_inspections || 0}</p>
                <ClipboardCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-600 shadow-sm hover:shadow-md transition-shadow" data-testid="failed-inspections-card">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {t('failed_inspections')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">{metrics?.failed_inspections || 0}</p>
                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-600 shadow-sm hover:shadow-md transition-shadow" data-testid="feedback-rate-card">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {t('feedback_resolution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">{metrics?.feedback_resolution_rate || 0}%</p>
                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="shadow-sm hover:shadow-md transition-shadow" data-testid="collection-card">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {t('todays_collection')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-xl sm:text-2xl font-bold text-green-600 font-mono">
                  ₹{metrics?.total_collection?.toLocaleString() || 0}
                </p>
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow" data-testid="expense-card">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {t('todays_expenses')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-xl sm:text-2xl font-bold text-red-600 font-mono">
                  ₹{metrics?.total_expense?.toLocaleString() || 0}
                </p>
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1" data-testid="profit-card">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {t('net_profit')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className={`text-xl sm:text-2xl font-bold font-mono ${metrics?.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{metrics?.net_profit?.toLocaleString() || 0}
                </p>
                <DollarSign className={`w-5 h-5 sm:w-6 sm:h-6 ${metrics?.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Financial Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="charts">
              <TabsList className="mb-4">
                <TabsTrigger value="charts" className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  Charts
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-1">
                  <TableIcon className="w-4 h-4" />
                  Table
                </TabsTrigger>
              </TabsList>

              <TabsContent value="charts" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Collection Bar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{t('collections')} by Date (Highest to Lowest)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {collectionChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={collectionChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip 
                              formatter={(value) => [`₹${value.toLocaleString()}`, 'Collection']}
                              contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                            />
                            <Bar dataKey="amount" fill="#16A34A" radius={[4, 4, 0, 0]} name="Collection" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-slate-500 py-12">{t('no_data')}</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Expense Bar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{t('expenses')} by Date (Highest to Lowest)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {expenseChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={expenseChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip 
                              formatter={(value) => [`₹${value.toLocaleString()}`, 'Expense']}
                              contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                            />
                            <Bar dataKey="amount" fill="#DC2626" radius={[4, 4, 0, 0]} name="Expense" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-slate-500 py-12">{t('no_data')}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Expense Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4" />
                      {t('expenses')} by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expensePieData.length > 0 ? (
                      <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                        <ResponsiveContainer width={300} height={300}>
                          <PieChart>
                            <Pie
                              data={expensePieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={120}
                              dataKey="value"
                              label={({ name, percentage }) => `${percentage}%`}
                            >
                              {expensePieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-3">
                          {expensePieData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-sm">
                                {entry.name}: <strong>{entry.percentage}%</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 py-12">{t('no_data')}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Inspection Failures Chart */}
                {inspectionData.length > 0 && (
                  <Card data-testid="inspection-chart">
                    <CardHeader>
                      <CardTitle className="text-sm">{t('failures_by_bus')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={inspectionData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="bus" stroke="#64748B" style={{ fontSize: '12px' }} />
                          <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                          />
                          <Bar dataKey="failures" fill="#1E3A8A" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="table">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Daily Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('date')}</TableHead>
                            <TableHead className="text-right">Total Income</TableHead>
                            <TableHead className="text-right">Total Expense</TableHead>
                            <TableHead className="text-right">Savings</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailyFinancialData.length > 0 ? (
                            dailyFinancialData.map((day) => (
                              <TableRow key={day.date}>
                                <TableCell className="font-medium">{day.date}</TableCell>
                                <TableCell className="text-right text-green-600 font-mono">
                                  ₹{day.income.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-red-600 font-mono">
                                  ₹{day.expense.toLocaleString()}
                                </TableCell>
                                <TableCell className={`text-right font-mono font-semibold ${day.savings >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                                  ₹{day.savings.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                                {t('no_data')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Most Problematic Bus Alert */}
        {metrics?.most_problematic_bus && (
          <Card className="shadow-sm bg-red-50 border-red-200" data-testid="problematic-bus-card">
            <CardHeader>
              <CardTitle className="text-red-900">{t('most_problematic_bus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-900 font-mono">{metrics.most_problematic_bus}</p>
              <p className="text-sm text-red-700 mt-2">{t('requires_attention')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
