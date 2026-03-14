import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getBuses, getExpenseMaster, createCollection, createExpense, getCollections, getExpenses, getBusWiseProfit, createExpenseMaster } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Plus, DollarSign, X, Calculator } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const FinancialPage = () => {
  const user = getUser();
  const { t } = useLanguage();
  const [buses, setBuses] = useState([]);
  const [expenseMaster, setExpenseMaster] = useState([]);
  const [profitData, setProfitData] = useState([]);
  const [collections, setCollections] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // Filters
  const [filterBusId, setFilterBusId] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  const [collectionForm, setCollectionForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    bus_id: '',
    collected_amount: '',
    notes: '',
  });

  // Combined collection + expense entries
  const [includeExpenses, setIncludeExpenses] = useState(false);
  const [collectionExpenseEntries, setCollectionExpenseEntries] = useState([
    { expense_id: '', custom_name: '', amount: '', notes: '' }
  ]);

  const [expenseForm, setExpenseForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    bus_id: '',
    expense_id: '',
    custom_name: '',
    amount: '',
    notes: '',
    save_to_master: false,
  });

  // Multiple expenses array
  const [expenseEntries, setExpenseEntries] = useState([
    {
      expense_id: '',
      custom_name: '',
      amount: '',
      notes: '',
    }
  ]);

  const [newExpenseType, setNewExpenseType] = useState('');
  const [showCustomExpense, setShowCustomExpense] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start_date: '', end_date: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const dateFilter = filterStartDate && filterEndDate ? { start_date: filterStartDate, end_date: filterEndDate } : {};
      const busFilter = filterBusId && filterBusId !== 'all' ? { bus_id: filterBusId } : {};
      const combinedFilter = { ...dateFilter, ...busFilter };

      const [busesRes, expenseMasterRes, profitRes, collectionsRes, expensesRes] = await Promise.all([
        getBuses(),
        getExpenseMaster(),
        getBusWiseProfit(combinedFilter),
        getCollections(combinedFilter),
        getExpenses(combinedFilter),
      ]);

      setBuses(busesRes.data.data || []);
      setExpenseMaster(expenseMasterRes.data.data || []);
      setProfitData(profitRes.data.data || []);
      setCollections(collectionsRes.data.data || []);
      setExpenses(expensesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load financial data');
    }
  };

  const handleCollectionSubmit = async (e) => {
    e.preventDefault();
    
    if (!collectionForm.bus_id || !collectionForm.collected_amount) {
      toast.error('Please select bus and enter collection amount');
      return;
    }

    try {
      // Save collection
      await createCollection({
        ...collectionForm,
        collected_amount: parseFloat(collectionForm.collected_amount),
        client_id: user.client_id,
        created_by: user.user_id,
      });

      // If expenses are included, save them too
      if (includeExpenses) {
        for (const entry of collectionExpenseEntries) {
          if ((entry.expense_id || entry.custom_name) && entry.amount && parseFloat(entry.amount) > 0) {
            await createExpense({
              date: collectionForm.date,
              bus_id: collectionForm.bus_id,
              expense_id: entry.expense_id || null,
              custom_name: entry.custom_name || null,
              amount: parseFloat(entry.amount),
              notes: entry.notes || null,
              save_to_master: false,
              client_id: user.client_id,
              created_by: user.user_id,
            });
          }
        }
      }

      toast.success('Collection' + (includeExpenses ? ' and expenses' : '') + ' added successfully');
      
      // Reset forms
      setCollectionForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        bus_id: '',
        collected_amount: '',
        notes: '',
      });
      setIncludeExpenses(false);
      setCollectionExpenseEntries([{ expense_id: '', custom_name: '', amount: '', notes: '' }]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add collection');
    }
  };

  // Calculate remaining amount
  const calculateRemaining = () => {
    const collection = parseFloat(collectionForm.collected_amount) || 0;
    const totalExpense = collectionExpenseEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    return collection - totalExpense;
  };

  const addCollectionExpenseEntry = () => {
    setCollectionExpenseEntries([...collectionExpenseEntries, { expense_id: '', custom_name: '', amount: '', notes: '' }]);
  };

  const removeCollectionExpenseEntry = (index) => {
    if (collectionExpenseEntries.length > 1) {
      setCollectionExpenseEntries(collectionExpenseEntries.filter((_, i) => i !== index));
    }
  };

  const updateCollectionExpenseEntry = (index, field, value) => {
    const updated = [...collectionExpenseEntries];
    updated[index][field] = value;
    setCollectionExpenseEntries(updated);
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    
    if (!expenseForm.date || !expenseForm.bus_id) {
      toast.error('Date and Bus are required');
      return;
    }

    // Validate all entries
    for (const entry of expenseEntries) {
      if (!entry.expense_id && !entry.custom_name) {
        toast.error('Please select or enter expense type for all entries');
        return;
      }
      if (!entry.amount || parseFloat(entry.amount) <= 0) {
        toast.error('Please enter valid amounts for all entries');
        return;
      }
    }

    try {
      // Submit all expenses
      for (const entry of expenseEntries) {
        await createExpense({
          date: expenseForm.date,
          bus_id: expenseForm.bus_id,
          expense_id: entry.expense_id || null,
          custom_name: entry.custom_name || null,
          amount: parseFloat(entry.amount),
          notes: entry.notes || null,
          save_to_master: false,
          client_id: user.client_id,
          created_by: user.user_id,
        });
      }

      toast.success('All expenses added successfully');
      setExpenseForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        bus_id: '',
        expense_id: '',
        custom_name: '',
        amount: '',
        notes: '',
        save_to_master: false,
      });
      setExpenseEntries([{
        expense_id: '',
        custom_name: '',
        amount: '',
        notes: '',
      }]);
      setShowCustomExpense(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add expenses');
    }
  };

  const handleAddExpenseType = async () => {
    if (!newExpenseType.trim()) {
      toast.error('Enter expense type name');
      return;
    }

    try {
      await createExpenseMaster({
        expense_name: newExpenseType,
        client_id: user.client_id,
        created_by: user.user_id,
      });

      toast.success('Expense type added');
      setNewExpenseType('');
      fetchData();
    } catch (error) {
      toast.error('Failed to add expense type');
    }
  };

  const addExpenseEntry = () => {
    setExpenseEntries([...expenseEntries, {
      expense_id: '',
      custom_name: '',
      amount: '',
      notes: '',
    }]);
  };

  const removeExpenseEntry = (index) => {
    if (expenseEntries.length > 1) {
      setExpenseEntries(expenseEntries.filter((_, i) => i !== index));
    }
  };

  const updateExpenseEntry = (index, field, value) => {
    const updated = [...expenseEntries];
    updated[index][field] = value;
    setExpenseEntries(updated);
  };

  const applyFilters = () => {
    fetchData();
  };

  const totalCollection = profitData.reduce((sum, item) => sum + item.total_collection, 0);
  const totalExpense = profitData.reduce((sum, item) => sum + item.total_expense, 0);
  const netProfit = totalCollection - totalExpense;

  const expenseChartData = {};
  expenses.forEach((exp) => {
    expenseChartData[exp.expense_name] = (expenseChartData[exp.expense_name] || 0) + exp.amount;
  });
  const pieData = Object.entries(expenseChartData).map(([name, value]) => ({ name, value }));

  const COLORS = ['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'];

  return (
    <Layout>
      <div data-testid="financial-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Financial Reports</h1>
            <p className="text-slate-600 mt-1">Track collections, expenses, and profit</p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="collection" data-testid="tab-collection">Add Collection</TabsTrigger>
            <TabsTrigger value="expense" data-testid="tab-expense">Add Expense</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* Filters */}
              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Bus</Label>
                      <Select value={filterBusId} onValueChange={setFilterBusId}>
                        <SelectTrigger data-testid="filter-bus">
                          <SelectValue placeholder="All buses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All buses</SelectItem>
                          {buses.map((bus) => (
                            <SelectItem key={bus.bus_id} value={bus.bus_id}>
                              {bus.bus_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        data-testid="filter-start-date"
                      />
                    </div>

                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        data-testid="filter-end-date"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button onClick={applyFilters} className="bg-blue-900" data-testid="apply-filters">
                      Apply Filters
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFilterBusId('all');
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                      data-testid="clear-filters"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm border-l-4 border-l-green-600">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                      Total Collection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold text-green-600 font-mono">
                        ₹{totalCollection.toLocaleString()}
                      </p>
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-red-600">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                      Total Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold text-red-600 font-mono">
                        ₹{totalExpense.toLocaleString()}
                      </p>
                      <TrendingDown className="w-8 h-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className={`shadow-sm border-l-4 ${netProfit >= 0 ? 'border-l-blue-600' : 'border-l-red-600'}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                      Net Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className={`text-3xl font-bold font-mono ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ₹{netProfit.toLocaleString()}
                      </p>
                      <DollarSign className={`w-8 h-8 ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bus-wise Profit Table */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Bus-wise Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-bold text-slate-700 uppercase text-xs whitespace-nowrap">Bus</th>
                            <th className="text-right py-2 sm:py-3 px-3 sm:px-4 font-bold text-slate-700 uppercase text-xs whitespace-nowrap">Collection</th>
                            <th className="text-right py-2 sm:py-3 px-3 sm:px-4 font-bold text-slate-700 uppercase text-xs whitespace-nowrap">Expense</th>
                            <th className="text-right py-2 sm:py-3 px-3 sm:px-4 font-bold text-slate-700 uppercase text-xs whitespace-nowrap">Profit</th>
                            <th className="text-center py-2 sm:py-3 px-3 sm:px-4 font-bold text-slate-700 uppercase text-xs whitespace-nowrap">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profitData.map((item) => (
                            <tr key={item.bus_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="py-2 sm:py-3 px-3 sm:px-4 font-semibold text-slate-900 whitespace-nowrap">{item.bus_number}</td>
                              <td className="py-2 sm:py-3 px-3 sm:px-4 text-right font-mono text-green-600 whitespace-nowrap">₹{item.total_collection.toLocaleString()}</td>
                              <td className="py-2 sm:py-3 px-3 sm:px-4 text-right font-mono text-red-600 whitespace-nowrap">₹{item.total_expense.toLocaleString()}</td>
                              <td className={`py-2 sm:py-3 px-3 sm:px-4 text-right font-mono font-bold whitespace-nowrap ${item.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{item.net_profit.toLocaleString()}
                              </td>
                              <td className="py-2 sm:py-3 px-3 sm:px-4 text-center">
                                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                                  item.status === 'Profit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Bus-wise Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={profitData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="bus_number" stroke="#64748B" />
                        <YAxis stroke="#64748B" />
                        <Tooltip />
                        <Bar dataKey="net_profit" fill="#1E3A8A" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Expense Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => entry.name}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Add Collection */}
          <TabsContent value="collection">
            <Card className="shadow-sm max-w-3xl">
              <CardHeader>
                <CardTitle>{t('add_collection')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCollectionSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('date')}</Label>
                      <Input
                        type="date"
                        value={collectionForm.date}
                        onChange={(e) => setCollectionForm({ ...collectionForm, date: e.target.value })}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        required
                        data-testid="collection-date"
                      />
                    </div>

                    <div>
                      <Label>{t('select_bus')}</Label>
                      <Select value={collectionForm.bus_id} onValueChange={(value) => setCollectionForm({ ...collectionForm, bus_id: value })}>
                        <SelectTrigger data-testid="collection-bus-select">
                          <SelectValue placeholder={t('select_bus')} />
                        </SelectTrigger>
                        <SelectContent>
                          {buses.map((bus) => (
                            <SelectItem key={bus.bus_id} value={bus.bus_id}>
                              {bus.bus_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>{t('collected_amount')} (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={collectionForm.collected_amount}
                      onChange={(e) => setCollectionForm({ ...collectionForm, collected_amount: e.target.value })}
                      required
                      min="0.01"
                      step="0.01"
                      data-testid="collection-amount"
                    />
                  </div>

                  <div>
                    <Label>{t('notes')} (Optional)</Label>
                    <Textarea
                      placeholder="Additional notes"
                      value={collectionForm.notes}
                      onChange={(e) => setCollectionForm({ ...collectionForm, notes: e.target.value })}
                      data-testid="collection-notes"
                    />
                  </div>

                  {/* Add Expense Option */}
                  <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg">
                    <Checkbox 
                      id="include-expenses" 
                      checked={includeExpenses}
                      onCheckedChange={setIncludeExpenses}
                    />
                    <Label htmlFor="include-expenses" className="cursor-pointer">
                      Also add expenses for this collection
                    </Label>
                  </div>

                  {/* Expense Entries (if enabled) */}
                  {includeExpenses && (
                    <div className="border rounded-lg p-4 space-y-4 bg-amber-50">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-amber-900">
                          {t('expenses')}
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCollectionExpenseEntry}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add More
                        </Button>
                      </div>

                      {collectionExpenseEntries.map((entry, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <Select 
                              value={entry.expense_id} 
                              onValueChange={(value) => updateCollectionExpenseEntry(index, 'expense_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('expense_type')} />
                              </SelectTrigger>
                              <SelectContent>
                                {expenseMaster.map((exp) => (
                                  <SelectItem key={exp.expense_id} value={exp.expense_id}>
                                    {exp.expense_name}
                                  </SelectItem>
                                ))}
                                <SelectItem value="custom">+ Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            {entry.expense_id === 'custom' && (
                              <Input
                                className="mt-2"
                                placeholder="Custom expense name"
                                value={entry.custom_name}
                                onChange={(e) => updateCollectionExpenseEntry(index, 'custom_name', e.target.value)}
                              />
                            )}
                          </div>
                          <div className="w-32">
                            <Input
                              type="number"
                              placeholder={t('amount')}
                              value={entry.amount}
                              onChange={(e) => updateCollectionExpenseEntry(index, 'amount', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                          </div>
                          {collectionExpenseEntries.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCollectionExpenseEntry(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}

                      {/* Remaining Amount Calculation */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Calculator className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold">Remaining Amount:</span>
                        </div>
                        <span className={`text-xl font-bold font-mono ${calculateRemaining() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{calculateRemaining().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full bg-blue-900" data-testid="submit-collection-button">
                    {includeExpenses ? 'Save Collection & Expenses' : t('add_collection')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add Expense */}
          <TabsContent value="expense">
            <Card className="shadow-sm max-w-4xl">
              <CardHeader>
                <CardTitle>Add Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleExpenseSubmit} className="space-y-6">
                  {/* Common fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        required
                        data-testid="expense-date"
                      />
                    </div>

                    <div>
                      <Label>Bus *</Label>
                      <Select value={expenseForm.bus_id} onValueChange={(value) => setExpenseForm({ ...expenseForm, bus_id: value })}>
                        <SelectTrigger data-testid="expense-bus-select">
                          <SelectValue placeholder="Select bus" />
                        </SelectTrigger>
                        <SelectContent>
                          {buses.map((bus) => (
                            <SelectItem key={bus.bus_id} value={bus.bus_id}>
                              {bus.bus_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Multiple expense entries */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Expense Items</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addExpenseEntry}
                        data-testid="add-expense-entry"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add More
                      </Button>
                    </div>

                    {expenseEntries.map((entry, index) => (
                      <Card key={index} className="border-slate-300">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-slate-700">Item {index + 1}</h4>
                            {expenseEntries.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExpenseEntry(index)}
                                data-testid={`remove-expense-${index}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Expense Type *</Label>
                              {!entry.custom_name ? (
                                <Select 
                                  value={entry.expense_id} 
                                  onValueChange={(value) => updateExpenseEntry(index, 'expense_id', value)}
                                >
                                  <SelectTrigger data-testid={`expense-type-${index}`}>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {expenseMaster.map((exp) => (
                                      <SelectItem key={exp.expense_id} value={exp.expense_id}>
                                        {exp.expense_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  placeholder="Custom expense name"
                                  value={entry.custom_name}
                                  onChange={(e) => updateExpenseEntry(index, 'custom_name', e.target.value)}
                                  data-testid={`custom-expense-${index}`}
                                />
                              )}
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="mt-1 p-0 h-auto"
                                onClick={() => {
                                  if (entry.custom_name) {
                                    updateExpenseEntry(index, 'custom_name', '');
                                  } else {
                                    updateExpenseEntry(index, 'expense_id', '');
                                    updateExpenseEntry(index, 'custom_name', 'Custom');
                                  }
                                }}
                              >
                                {entry.custom_name ? 'Use predefined' : 'Use custom'}
                              </Button>
                            </div>

                            <div>
                              <Label>Amount (₹) *</Label>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={entry.amount}
                                onChange={(e) => updateExpenseEntry(index, 'amount', e.target.value)}
                                required
                                min="0.01"
                                step="0.01"
                                data-testid={`expense-amount-${index}`}
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Label>Notes (Optional)</Label>
                              <Textarea
                                placeholder="Additional notes"
                                value={entry.notes}
                                onChange={(e) => updateExpenseEntry(index, 'notes', e.target.value)}
                                rows={2}
                                data-testid={`expense-notes-${index}`}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button type="submit" className="w-full bg-blue-900" data-testid="submit-expenses-button">
                    Save All Expenses
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default FinancialPage;
