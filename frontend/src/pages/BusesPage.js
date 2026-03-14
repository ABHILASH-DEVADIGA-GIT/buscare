import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { getBuses, createBus, getCollections, getExpenses, getClient, getAllClients, uploadImage } from '@/lib/api';
import { getUser, getClient as getClientFromStorage } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bus, Plus, Loader2, QrCode, Download, Eye, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';

const BusesPage = () => {
  const user = getUser();
  const clientData = getClientFromStorage();
  const { t } = useLanguage();
  const [buses, setBuses] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [summaryModal, setSummaryModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [busSummary, setBusSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const qrRef = useRef(null);

  // Only Platform Admin can add buses
  const canAddBus = user?.role === 'PLATFORM_ADMIN';

  // Summary filters
  const [summaryStartDate, setSummaryStartDate] = useState('');
  const [summaryEndDate, setSummaryEndDate] = useState('');

  const [newBus, setNewBus] = useState({
    bus_number: '',
    registration_number: '',
    model: '',
    capacity: '',
    client_id: user?.client_id || '',
  });

  useEffect(() => {
    fetchBuses();
    if (canAddBus) {
      fetchClients();
    }
  }, []);

  const fetchBuses = async () => {
    try {
      const response = await getBuses();
      setBuses(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load buses');
    }
  };

  const fetchClients = async () => {
    try {
      const response = await getAllClients();
      setClients(response.data.data || []);
    } catch (error) {
      console.error('Failed to load clients');
    }
  };

  const handleCreateBus = async () => {
    if (!newBus.bus_number || !newBus.registration_number) {
      toast.error('Bus number and registration are required');
      return;
    }

    if (canAddBus && !newBus.client_id) {
      toast.error('Please select a client');
      return;
    }

    setLoading(true);
    try {
      await createBus({
        ...newBus,
        capacity: newBus.capacity ? parseInt(newBus.capacity) : null,
        client_id: newBus.client_id || user.client_id,
      });

      toast.success('Bus added successfully');
      setCreateModal(false);
      setNewBus({
        bus_number: '',
        registration_number: '',
        model: '',
        capacity: '',
        client_id: user?.client_id || '',
      });
      fetchBuses();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to add bus';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const feedbackQRUrl = (bus) => {
    return `${window.location.origin}/feedback?bus_id=${bus.bus_id}&client_id=${user.client_id}`;
  };

  const downloadQRCode = async () => {
    if (!qrRef.current || !selectedBus) return;
    
    try {
      const canvas = await html2canvas(qrRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `QR_${selectedBus.bus_number.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('QR Code downloaded');
    } catch (error) {
      toast.error('Failed to download QR Code');
    }
  };

  const fetchBusSummary = async (bus) => {
    setSummaryLoading(true);
    try {
      const params = {};
      if (summaryStartDate) params.start_date = summaryStartDate;
      if (summaryEndDate) params.end_date = summaryEndDate;
      params.bus_id = bus.bus_id;

      const [collectionsRes, expensesRes] = await Promise.all([
        getCollections(params),
        getExpenses(params),
      ]);

      const collections = collectionsRes.data.data || [];
      const expenses = expensesRes.data.data || [];

      // Calculate totals
      const totalCollection = collections.reduce((sum, c) => sum + c.collected_amount, 0);
      const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netSavings = totalCollection - totalExpense;

      // Group by date for daily stats
      const dailyStats = {};
      collections.forEach(c => {
        if (!dailyStats[c.date]) {
          dailyStats[c.date] = { date: c.date, collection: 0, expense: 0 };
        }
        dailyStats[c.date].collection += c.collected_amount;
      });
      expenses.forEach(e => {
        if (!dailyStats[e.date]) {
          dailyStats[e.date] = { date: e.date, collection: 0, expense: 0 };
        }
        dailyStats[e.date].expense += e.amount;
      });

      // Group expenses by type for pie chart
      const expenseByType = {};
      expenses.forEach(e => {
        const type = e.expense_name || 'Other';
        expenseByType[type] = (expenseByType[type] || 0) + e.amount;
      });

      const pieData = Object.entries(expenseByType).map(([name, value]) => ({
        name,
        value,
        percentage: totalExpense > 0 ? ((value / totalExpense) * 100).toFixed(1) : 0,
      }));

      // Sort daily stats by date (newest first)
      const dailyArray = Object.values(dailyStats).sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      // Collection chart data (sorted by amount)
      const collectionChartData = [...dailyArray]
        .filter(d => d.collection > 0)
        .sort((a, b) => b.collection - a.collection)
        .slice(0, 10);

      // Expense chart data (sorted by amount)
      const expenseChartData = [...dailyArray]
        .filter(d => d.expense > 0)
        .sort((a, b) => b.expense - a.expense)
        .slice(0, 10);

      setBusSummary({
        bus,
        totalCollection,
        totalExpense,
        netSavings,
        dailyStats: dailyArray,
        collectionChartData,
        expenseChartData,
        pieData,
      });
    } catch (error) {
      toast.error('Failed to load bus summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const openBusSummary = (bus) => {
    setSelectedBus(bus);
    setSummaryModal(true);
    fetchBusSummary(bus);
  };

  const COLORS = ['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#6366F1', '#8B5CF6', '#A855F7'];

  return (
    <Layout>
      <div data-testid="buses-page">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{t('buses')}</h1>
          {canAddBus && (
            <Button onClick={() => setCreateModal(true)} className="bg-blue-900" data-testid="create-bus-button">
              <Plus className="w-4 h-4 mr-2" />
              {t('add_bus')}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buses.map((bus) => (
            <Card key={bus.bus_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Bus className="w-5 h-5 text-blue-900" />
                      {bus.bus_number}
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">{bus.registration_number}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {bus.model && (
                    <p className="text-sm text-slate-600">
                      <strong>{t('model')}:</strong> {bus.model}
                    </p>
                  )}
                  {bus.capacity && (
                    <p className="text-sm text-slate-600">
                      <strong>{t('capacity')}:</strong> {bus.capacity} seats
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedBus(bus);
                      setQrModal(true);
                    }}
                    className="flex-1"
                    data-testid={`qr-${bus.bus_id}`}
                  >
                    <QrCode className="w-4 h-4 mr-1" />
                    QR Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openBusSummary(bus)}
                    className="flex-1"
                    data-testid={`view-${bus.bus_id}`}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {buses.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Bus className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_data')}</p>
          </div>
        )}

        {/* Create Bus Modal - Only for Platform Admin */}
        <Dialog open={createModal} onOpenChange={setCreateModal}>
          <DialogContent data-testid="create-bus-modal">
            <DialogHeader>
              <DialogTitle>{t('add_bus')}</DialogTitle>
              <DialogDescription>Register a new bus in the fleet</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Client Selection - Only for Platform Admin */}
              {canAddBus && clients.length > 0 && (
                <div>
                  <Label>Select Client *</Label>
                  <Select 
                    value={newBus.client_id} 
                    onValueChange={(value) => setNewBus({ ...newBus, client_id: value })}
                  >
                    <SelectTrigger data-testid="client-select">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.client_id} value={client.client_id}>
                          {client.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>{t('bus_number')} *</Label>
                <Input
                  placeholder="TN-01-AB-1234"
                  value={newBus.bus_number}
                  onChange={(e) => setNewBus({ ...newBus, bus_number: e.target.value })}
                  data-testid="bus-number-input"
                />
              </div>

              <div>
                <Label>{t('registration_number')} *</Label>
                <Input
                  placeholder="TN01AB1234"
                  value={newBus.registration_number}
                  onChange={(e) => setNewBus({ ...newBus, registration_number: e.target.value })}
                  data-testid="registration-input"
                />
              </div>

              <div>
                <Label>{t('model')}</Label>
                <Input
                  placeholder="Ashok Leyland"
                  value={newBus.model}
                  onChange={(e) => setNewBus({ ...newBus, model: e.target.value })}
                  data-testid="model-input"
                />
              </div>

              <div>
                <Label>{t('capacity')}</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={newBus.capacity}
                  onChange={(e) => setNewBus({ ...newBus, capacity: e.target.value })}
                  data-testid="capacity-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModal(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleCreateBus} disabled={loading} className="bg-blue-900" data-testid="confirm-create-bus-button">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('add_bus')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced QR Code Modal */}
        <Dialog open={qrModal} onOpenChange={setQrModal}>
          <DialogContent className="max-w-md" data-testid="qr-code-modal">
            <DialogHeader>
              <DialogTitle>Passenger Feedback QR Code</DialogTitle>
              <DialogDescription>Scan to submit feedback for {selectedBus?.bus_number}</DialogDescription>
            </DialogHeader>

            <div ref={qrRef} className="bg-white p-6 rounded-lg">
              {/* Company Header */}
              <div className="text-center mb-4 border-b pb-4">
                <h2 className="text-xl font-bold text-blue-900">
                  {clientData?.company_name || 'BusCare'}
                </h2>
                <p className="text-sm text-slate-600">Fleet Feedback System</p>
              </div>

              {/* Bus Info */}
              <div className="text-center mb-4">
                <p className="text-lg font-semibold">{t('bus_number')}: {selectedBus?.bus_number}</p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center p-4 bg-slate-50 rounded-lg">
                {selectedBus && (
                  <QRCode value={feedbackQRUrl(selectedBus)} size={200} />
                )}
              </div>

              {/* URL Display */}
              <div className="mt-4 p-3 bg-slate-100 rounded-lg">
                <p className="text-xs text-center text-slate-600 break-all">
                  {selectedBus && feedbackQRUrl(selectedBus)}
                </p>
              </div>

              {/* Instructions */}
              <div className="mt-4 text-center">
                <p className="text-sm text-slate-600">
                  Scan QR code or visit URL to submit feedback
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setQrModal(false)}>
                {t('close')}
              </Button>
              <Button onClick={downloadQRCode} className="bg-blue-900">
                <Download className="w-4 h-4 mr-2" />
                Download QR
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bus Summary Modal */}
        <Dialog open={summaryModal} onOpenChange={setSummaryModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="bus-summary-modal">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bus className="w-5 h-5 text-blue-900" />
                Bus Summary: {selectedBus?.bus_number}
              </DialogTitle>
              <DialogDescription>
                {selectedBus?.model && `${selectedBus.model} - `}{selectedBus?.registration_number}
              </DialogDescription>
            </DialogHeader>

            {/* Date Filters */}
            <div className="flex gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <Label>{t('start_date')}</Label>
                <Input
                  type="date"
                  value={summaryStartDate}
                  onChange={(e) => setSummaryStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label>{t('end_date')}</Label>
                <Input
                  type="date"
                  value={summaryEndDate}
                  onChange={(e) => setSummaryEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={() => selectedBus && fetchBusSummary(selectedBus)} disabled={summaryLoading}>
                  {summaryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('filter')}
                </Button>
              </div>
            </div>

            {summaryLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              </div>
            ) : busSummary ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-l-4 border-l-green-600">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500">{t('total')} {t('collections')}</p>
                          <p className="text-2xl font-bold text-green-600">₹{busSummary.totalCollection.toLocaleString()}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-red-600">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500">{t('total')} {t('expenses')}</p>
                          <p className="text-2xl font-bold text-red-600">₹{busSummary.totalExpense.toLocaleString()}</p>
                        </div>
                        <TrendingDown className="w-8 h-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border-l-4 ${busSummary.netSavings >= 0 ? 'border-l-blue-600' : 'border-l-amber-600'}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500">Net Savings</p>
                          <p className={`text-2xl font-bold ${busSummary.netSavings >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                            ₹{busSummary.netSavings.toLocaleString()}
                          </p>
                        </div>
                        <DollarSign className={`w-8 h-8 ${busSummary.netSavings >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="charts">
                  <TabsList>
                    <TabsTrigger value="charts">Charts</TabsTrigger>
                    <TabsTrigger value="table">Daily Table</TabsTrigger>
                  </TabsList>

                  <TabsContent value="charts" className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Collection Bar Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">{t('collections')} by Date</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {busSummary.collectionChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={busSummary.collectionChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="collection" fill="#16A34A" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <p className="text-center text-slate-500 py-8">{t('no_data')}</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Expense Bar Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">{t('expenses')} by Date</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {busSummary.expenseChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={busSummary.expenseChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="expense" fill="#DC2626" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <p className="text-center text-slate-500 py-8">{t('no_data')}</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Expense Pie Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">{t('expenses')} by Category</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {busSummary.pieData.length > 0 ? (
                          <div className="flex items-center justify-center gap-8">
                            <ResponsiveContainer width={200} height={200}>
                              <PieChart>
                                <Pie
                                  data={busSummary.pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={80}
                                  dataKey="value"
                                  label={({ percentage }) => `${percentage}%`}
                                >
                                  {busSummary.pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2">
                              {busSummary.pieData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  <span className="text-sm">{entry.name}: {entry.percentage}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-center text-slate-500 py-8">{t('no_data')}</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="table">
                    <Card>
                      <CardContent className="pt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('date')}</TableHead>
                              <TableHead className="text-right">Income</TableHead>
                              <TableHead className="text-right">{t('expenses')}</TableHead>
                              <TableHead className="text-right">Savings</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {busSummary.dailyStats.length > 0 ? (
                              busSummary.dailyStats.map((day) => (
                                <TableRow key={day.date}>
                                  <TableCell>{day.date}</TableCell>
                                  <TableCell className="text-right text-green-600">₹{day.collection.toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-red-600">₹{day.expense.toLocaleString()}</TableCell>
                                  <TableCell className={`text-right font-semibold ${day.collection - day.expense >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                                    ₹{(day.collection - day.expense).toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-slate-500">
                                  {t('no_data')}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}

            <DialogFooter>
              <Button onClick={() => setSummaryModal(false)}>
                {t('close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default BusesPage;
