import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { 
  getAllClients, createClient, updateClient, uploadImage,
  getInspectionQuestionsConfig, createInspectionQuestionConfig, updateInspectionQuestionConfig, deleteInspectionQuestionConfig,
  getExpenseCategoriesConfig, createExpenseCategoryConfig, updateExpenseCategoryConfig,
  getAlertConfigs, createAlertConfig, updateAlertConfig, deleteAlertConfig
} from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, Plus, Loader2, Edit, Trash2, ClipboardCheck, DollarSign, Bell, Settings, Upload, Image } from 'lucide-react';

const ClientManagementPage = () => {
  const user = getUser();
  const { t } = useLanguage();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Configuration states
  const [inspectionQuestions, setInspectionQuestions] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [alertConfigs, setAlertConfigs] = useState([]);
  const [filterClientId, setFilterClientId] = useState('');

  // Modal states for configuration
  const [questionModal, setQuestionModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [alertModal, setAlertModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [newClient, setNewClient] = useState({
    company_name: '',
    logo: '',
    theme_color: '#1E3A8A',
    alert_days: 7,
  });

  const [questionForm, setQuestionForm] = useState({
    client_id: '',
    question_text: '',
    input_type: 'PASS_FAIL',
    is_critical: false,
    is_active: true,
    order_num: 1,
  });

  const [expenseForm, setExpenseForm] = useState({
    client_id: '',
    expense_name: '',
    is_active: true,
  });

  const [alertForm, setAlertForm] = useState({
    client_id: '',
    alert_name: '',
    trigger_condition: '',
    is_active: true,
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (filterClientId) {
      fetchConfigurations();
    }
  }, [filterClientId]);

  const fetchClients = async () => {
    try {
      const response = await getAllClients();
      setClients(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load clients');
    }
  };

  const handleLogoUpload = async (file, isEdit = false) => {
    if (!file) return;
    
    setLogoUploading(true);
    try {
      const response = await uploadImage(file);
      const logoUrl = response.data.data.url;
      
      if (isEdit && selectedClient) {
        setSelectedClient({ ...selectedClient, logo: logoUrl });
      } else {
        setNewClient({ ...newClient, logo: logoUrl });
      }
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const fetchConfigurations = async () => {
    try {
      const params = filterClientId ? { client_id: filterClientId } : {};
      const [questionsRes, expensesRes, alertsRes] = await Promise.all([
        getInspectionQuestionsConfig(params),
        getExpenseCategoriesConfig(params),
        getAlertConfigs(params),
      ]);
      setInspectionQuestions(questionsRes.data.data || []);
      setExpenseCategories(expensesRes.data.data || []);
      setAlertConfigs(alertsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load configurations');
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.company_name.trim()) {
      toast.error('Company name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await createClient({
        ...newClient,
        created_by: user.user_id,
      });
      
      if (response.data.success) {
        toast.success('Client created successfully');
        setCreateModal(false);
        setNewClient({
          company_name: '',
          logo: '',
          theme_color: '#1E3A8A',
          alert_days: 7,
        });
        fetchClients();
      }
    } catch (error) {
      // Improved error handling
      const errorMessage = error.response?.data?.detail || 'Client creation failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;

    setLoading(true);
    try {
      await updateClient({
        client_id: selectedClient.client_id,
        ...selectedClient,
      });

      toast.success('Client updated successfully');
      setEditModal(false);
      fetchClients();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Client update failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Inspection Question handlers
  const handleSaveQuestion = async () => {
    if (!questionForm.client_id || !questionForm.question_text) {
      toast.error('Client and question text are required');
      return;
    }

    setLoading(true);
    try {
      if (editingItem) {
        await updateInspectionQuestionConfig({
          question_id: editingItem.question_id,
          ...questionForm,
        });
        toast.success('Question updated');
      } else {
        await createInspectionQuestionConfig(questionForm);
        toast.success('Question added');
      }
      setQuestionModal(false);
      setEditingItem(null);
      resetQuestionForm();
      fetchConfigurations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    try {
      await deleteInspectionQuestionConfig(questionId);
      toast.success('Question deleted');
      fetchConfigurations();
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };

  // Expense Category handlers
  const handleSaveExpense = async () => {
    if (!expenseForm.client_id || !expenseForm.expense_name) {
      toast.error('Client and expense name are required');
      return;
    }

    setLoading(true);
    try {
      if (editingItem) {
        await updateExpenseCategoryConfig({
          expense_id: editingItem.expense_id,
          ...expenseForm,
        });
        toast.success('Expense category updated');
      } else {
        await createExpenseCategoryConfig(expenseForm);
        toast.success('Expense category added');
      }
      setExpenseModal(false);
      setEditingItem(null);
      resetExpenseForm();
      fetchConfigurations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save expense category');
    } finally {
      setLoading(false);
    }
  };

  // Alert Config handlers
  const handleSaveAlert = async () => {
    if (!alertForm.client_id || !alertForm.alert_name) {
      toast.error('Client and alert name are required');
      return;
    }

    setLoading(true);
    try {
      if (editingItem) {
        await updateAlertConfig({
          alert_config_id: editingItem.alert_config_id,
          ...alertForm,
        });
        toast.success('Alert configuration updated');
      } else {
        await createAlertConfig(alertForm);
        toast.success('Alert configuration added');
      }
      setAlertModal(false);
      setEditingItem(null);
      resetAlertForm();
      fetchConfigurations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save alert configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    
    try {
      await deleteAlertConfig(alertId);
      toast.success('Alert configuration deleted');
      fetchConfigurations();
    } catch (error) {
      toast.error('Failed to delete alert');
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      client_id: filterClientId || '',
      question_text: '',
      input_type: 'PASS_FAIL',
      is_critical: false,
      is_active: true,
      order_num: 1,
    });
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      client_id: filterClientId || '',
      expense_name: '',
      is_active: true,
    });
  };

  const resetAlertForm = () => {
    setAlertForm({
      client_id: filterClientId || '',
      alert_name: '',
      trigger_condition: '',
      is_active: true,
    });
  };

  const inputTypeOptions = [
    { value: 'PASS_FAIL', label: 'Pass / Fail' },
    { value: 'NUMBER', label: 'Number Field' },
    { value: 'TEXT', label: 'Text Input' },
    { value: 'YES_NO', label: 'Yes / No' },
  ];

  return (
    <Layout>
      <div data-testid="client-management-page">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Platform Configuration</h1>
        </div>

        <Tabs defaultValue="clients">
          <TabsList className="mb-4">
            <TabsTrigger value="clients" className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {t('clients')}
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-1">
              <ClipboardCheck className="w-4 h-4" />
              Inspection Questions
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Expense Categories
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-1">
              <Bell className="w-4 h-4" />
              Alert Configuration
            </TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setCreateModal(true)} className="bg-blue-900" data-testid="create-client-button">
                <Plus className="w-4 h-4 mr-2" />
                {t('add_client')}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <Card key={client.client_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {client.logo ? (
                          <img src={client.logo} alt={client.company_name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">{client.company_name}</CardTitle>
                        </div>
                      </div>
                      <Badge variant={client.active ? 'default' : 'secondary'}>
                        {client.active ? t('active') : t('inactive')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="bg-slate-50 p-2 rounded border">
                        <p className="text-xs text-slate-500 font-medium">Client ID (for login):</p>
                        <p className="font-mono text-blue-900 font-bold select-all">{client.client_id}</p>
                      </div>
                      <p><strong>Alert Days:</strong> {client.alert_days || 7}</p>
                      <p><strong>Theme:</strong> 
                        <span 
                          className="inline-block w-4 h-4 rounded ml-2" 
                          style={{ backgroundColor: client.theme_color || '#1E3A8A' }}
                        />
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => {
                        setSelectedClient(client);
                        setEditModal(true);
                      }}
                      data-testid={`edit-client-${client.client_id}`}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {t('edit')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Inspection Questions Tab */}
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Inspection Questions</CardTitle>
                    <CardDescription>Configure inspection checklist questions per client</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <Select value={filterClientId} onValueChange={setFilterClientId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select Client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.client_id} value={c.client_id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => { resetQuestionForm(); setQuestionModal(true); }} className="bg-blue-900" disabled={!filterClientId}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filterClientId ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Input Type</TableHead>
                        <TableHead>Critical</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inspectionQuestions.length > 0 ? (
                        inspectionQuestions.map((q) => (
                          <TableRow key={q.question_id}>
                            <TableCell>{q.order_num}</TableCell>
                            <TableCell>{q.question_text}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{q.question_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {q.is_critical ? (
                                <Badge variant="destructive">Critical</Badge>
                              ) : (
                                <Badge variant="secondary">Normal</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={q.is_active ? 'default' : 'secondary'}>
                                {q.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingItem(q);
                                    setQuestionForm({
                                      client_id: q.client_id,
                                      question_text: q.question_text,
                                      input_type: q.question_type,
                                      is_critical: q.is_critical,
                                      is_active: q.is_active,
                                      order_num: q.order_num,
                                    });
                                    setQuestionModal(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteQuestion(q.question_id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-500">
                            No questions configured for this client
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-slate-500 py-8">Select a client to view and configure questions</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expense Categories Tab */}
          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Expense Categories</CardTitle>
                    <CardDescription>Configure expense dropdown options per client</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <Select value={filterClientId} onValueChange={setFilterClientId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select Client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.client_id} value={c.client_id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => { resetExpenseForm(); setExpenseModal(true); }} className="bg-blue-900" disabled={!filterClientId}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filterClientId ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseCategories.length > 0 ? (
                        expenseCategories.map((e) => (
                          <TableRow key={e.expense_id}>
                            <TableCell className="font-medium">{e.expense_name}</TableCell>
                            <TableCell>
                              <Badge variant={e.active_flag ? 'default' : 'secondary'}>
                                {e.active_flag ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingItem(e);
                                  setExpenseForm({
                                    client_id: e.client_id,
                                    expense_name: e.expense_name,
                                    is_active: e.active_flag,
                                  });
                                  setExpenseModal(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-slate-500">
                            No expense categories configured for this client
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-slate-500 py-8">Select a client to view and configure expense categories</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alert Configuration Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Alert Configuration</CardTitle>
                    <CardDescription>Configure custom alerts per client</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <Select value={filterClientId} onValueChange={setFilterClientId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select Client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.client_id} value={c.client_id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => { resetAlertForm(); setAlertModal(true); }} className="bg-blue-900" disabled={!filterClientId}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Alert
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filterClientId ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alert Name</TableHead>
                        <TableHead>Trigger Condition</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertConfigs.length > 0 ? (
                        alertConfigs.map((a) => (
                          <TableRow key={a.alert_config_id}>
                            <TableCell className="font-medium">{a.alert_name}</TableCell>
                            <TableCell className="text-sm text-slate-600">{a.trigger_condition || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={a.is_active ? 'default' : 'secondary'}>
                                {a.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingItem(a);
                                    setAlertForm({
                                      client_id: a.client_id,
                                      alert_name: a.alert_name,
                                      trigger_condition: a.trigger_condition || '',
                                      is_active: a.is_active,
                                    });
                                    setAlertModal(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteAlert(a.alert_config_id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-500">
                            No alert configurations for this client
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-slate-500 py-8">Select a client to view and configure alerts</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Client Modal */}
        <Dialog open={createModal} onOpenChange={setCreateModal}>
          <DialogContent data-testid="create-client-modal">
            <DialogHeader>
              <DialogTitle>{t('add_client')}</DialogTitle>
              <DialogDescription>Create a new client organization</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>{t('company_name')} *</Label>
                <Input
                  placeholder="Company Name"
                  value={newClient.company_name}
                  onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
                  data-testid="company-name-input"
                />
              </div>

              <div>
                <Label>{t('logo')}</Label>
                <div className="flex items-center gap-4">
                  {newClient.logo ? (
                    <img src={newClient.logo} alt="Logo preview" className="w-16 h-16 rounded-lg object-cover border" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border">
                      <Image className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e.target.files[0], false)}
                      className="cursor-pointer"
                      data-testid="logo-upload-input"
                    />
                    <p className="text-xs text-slate-500 mt-1">Upload company logo (PNG, JPG)</p>
                  </div>
                  {logoUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              </div>

              <div>
                <Label>{t('theme_color')}</Label>
                <Input
                  type="color"
                  value={newClient.theme_color}
                  onChange={(e) => setNewClient({ ...newClient, theme_color: e.target.value })}
                  data-testid="theme-color-input"
                />
              </div>

              <div>
                <Label>{t('alert_days')}</Label>
                <Input
                  type="number"
                  value={newClient.alert_days}
                  onChange={(e) => setNewClient({ ...newClient, alert_days: parseInt(e.target.value) || 7 })}
                  data-testid="alert-days-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModal(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleCreateClient} disabled={loading || logoUploading} className="bg-blue-900" data-testid="confirm-create-client">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('add_client')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Client Modal */}
        <Dialog open={editModal} onOpenChange={setEditModal}>
          <DialogContent data-testid="edit-client-modal">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>Update client configuration</DialogDescription>
            </DialogHeader>

            {selectedClient && (
              <div className="space-y-4">
                <div>
                  <Label>{t('company_name')}</Label>
                  <Input
                    value={selectedClient.company_name || ''}
                    onChange={(e) => setSelectedClient({ ...selectedClient, company_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>{t('logo')}</Label>
                  <div className="flex items-center gap-4">
                    {selectedClient.logo ? (
                      <img src={selectedClient.logo} alt="Logo preview" className="w-16 h-16 rounded-lg object-cover border" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border">
                        <Image className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e.target.files[0], true)}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-slate-500 mt-1">Upload new logo (PNG, JPG)</p>
                    </div>
                    {logoUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                </div>

                <div>
                  <Label>{t('theme_color')}</Label>
                  <Input
                    type="color"
                    value={selectedClient.theme_color || '#1E3A8A'}
                    onChange={(e) => setSelectedClient({ ...selectedClient, theme_color: e.target.value })}
                  />
                </div>

                <div>
                  <Label>{t('alert_days')}</Label>
                  <Input
                    type="number"
                    value={selectedClient.alert_days || 7}
                    onChange={(e) => setSelectedClient({ ...selectedClient, alert_days: parseInt(e.target.value) })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t('active')}</Label>
                  <Switch
                    checked={selectedClient.active}
                    onCheckedChange={(checked) => setSelectedClient({ ...selectedClient, active: checked })}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModal(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleUpdateClient} disabled={loading || logoUploading} className="bg-blue-900">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Inspection Question Modal */}
        <Dialog open={questionModal} onOpenChange={setQuestionModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Question' : 'Add Question'}</DialogTitle>
              <DialogDescription>Configure inspection checklist question</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={questionForm.client_id} onValueChange={(v) => setQuestionForm({ ...questionForm, client_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.client_id} value={c.client_id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Question *</Label>
                <Input
                  placeholder="Enter question text"
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                />
              </div>

              <div>
                <Label>Input Type</Label>
                <Select value={questionForm.input_type} onValueChange={(v) => setQuestionForm({ ...questionForm, input_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inputTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Order Number</Label>
                <Input
                  type="number"
                  value={questionForm.order_num}
                  onChange={(e) => setQuestionForm({ ...questionForm, order_num: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Critical Question</Label>
                <Switch
                  checked={questionForm.is_critical}
                  onCheckedChange={(checked) => setQuestionForm({ ...questionForm, is_critical: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={questionForm.is_active}
                  onCheckedChange={(checked) => setQuestionForm({ ...questionForm, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setQuestionModal(false); setEditingItem(null); }}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSaveQuestion} disabled={loading} className="bg-blue-900">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Expense Category Modal */}
        <Dialog open={expenseModal} onOpenChange={setExpenseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Category' : 'Add Category'}</DialogTitle>
              <DialogDescription>Configure expense category</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={expenseForm.client_id} onValueChange={(v) => setExpenseForm({ ...expenseForm, client_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.client_id} value={c.client_id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Expense Name *</Label>
                <Input
                  placeholder="e.g., Fuel, Maintenance, Toll"
                  value={expenseForm.expense_name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_name: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={expenseForm.is_active}
                  onCheckedChange={(checked) => setExpenseForm({ ...expenseForm, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setExpenseModal(false); setEditingItem(null); }}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSaveExpense} disabled={loading} className="bg-blue-900">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Alert Configuration Modal */}
        <Dialog open={alertModal} onOpenChange={setAlertModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Alert' : 'Add Alert'}</DialogTitle>
              <DialogDescription>Configure alert for client</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={alertForm.client_id} onValueChange={(v) => setAlertForm({ ...alertForm, client_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.client_id} value={c.client_id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Alert Name *</Label>
                <Input
                  placeholder="e.g., Inspection Failure Alert"
                  value={alertForm.alert_name}
                  onChange={(e) => setAlertForm({ ...alertForm, alert_name: e.target.value })}
                />
              </div>

              <div>
                <Label>Trigger Condition</Label>
                <Textarea
                  placeholder="Describe when this alert should be triggered"
                  value={alertForm.trigger_condition}
                  onChange={(e) => setAlertForm({ ...alertForm, trigger_condition: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={alertForm.is_active}
                  onCheckedChange={(checked) => setAlertForm({ ...alertForm, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setAlertModal(false); setEditingItem(null); }}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSaveAlert} disabled={loading} className="bg-blue-900">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ClientManagementPage;
