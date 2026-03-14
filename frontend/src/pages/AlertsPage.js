import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getAlerts, createAlert, updateAlert, getBuses } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertTriangle, Plus, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const AlertsPage = () => {
  const user = getUser();
  const [alerts, setAlerts] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [updateModal, setUpdateModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedBusFilter, setSelectedBusFilter] = useState('all');

  const [newAlert, setNewAlert] = useState({
    bus_id: '',
    alert_type: 'INSURANCE',
    alert_name: '',
    expiry_date: '',
    notes: '',
  });

  const [updateData, setUpdateData] = useState({
    new_expiry_date: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsRes, busesRes] = await Promise.all([
        getAlerts(),
        getBuses(),
      ]);

      setAlerts(alertsRes.data.data || []);
      setBuses(busesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load alerts');
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (selectedBusFilter === 'all') return true;
    return alert.bus_id === selectedBusFilter;
  });

  const handleCreateAlert = async () => {
    if (!newAlert.bus_id || !newAlert.alert_name || !newAlert.expiry_date) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await createAlert({
        ...newAlert,
        expiry_date: new Date(newAlert.expiry_date).toISOString(),
        client_id: user.client_id,
      });

      toast.success('Alert created successfully');
      setCreateModal(false);
      setNewAlert({
        bus_id: '',
        alert_type: 'INSURANCE',
        alert_name: '',
        expiry_date: '',
        notes: '',
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to create alert');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAlert = async () => {
    if (!updateData.new_expiry_date) {
      toast.error('Please enter new expiry date');
      return;
    }

    setLoading(true);
    try {
      await updateAlert({
        alert_id: selectedAlert.alert_id,
        new_expiry_date: new Date(updateData.new_expiry_date).toISOString(),
        notes: updateData.notes,
        updated_by: user.user_id,
      });

      toast.success('Alert updated successfully');
      setUpdateModal(false);
      setUpdateData({ new_expiry_date: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to update alert');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, daysRemaining) => {
    if (status === 'EXPIRED') {
      return <Badge className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">Expired</Badge>;
    } else if (status === 'UPCOMING') {
      return <Badge className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-bold">{daysRemaining} days left</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">Valid</Badge>;
  };

  return (
    <Layout>
      <div data-testid="alerts-page">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Alerts</h1>
          <Button onClick={() => setCreateModal(true)} className="bg-blue-900" data-testid="create-alert-button">
            <Plus className="w-4 h-4 mr-2" />
            Create Alert
          </Button>
        </div>

        {/* Bus Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Filter by Bus:</Label>
            <Select value={selectedBusFilter} onValueChange={setSelectedBusFilter}>
              <SelectTrigger className="w-[200px]" data-testid="bus-filter-select">
                <SelectValue placeholder="All Buses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buses</SelectItem>
                {buses.map((bus) => (
                  <SelectItem key={bus.bus_id} value={bus.bus_id}>
                    {bus.bus_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="expired" className="space-y-6">
          <TabsList>
            <TabsTrigger value="expired" data-testid="tab-expired">Expired</TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="valid" data-testid="tab-valid">Valid</TabsTrigger>
          </TabsList>

          {[{ value: 'expired', status: 'EXPIRED' }, { value: 'upcoming', status: 'UPCOMING' }, { value: 'valid', status: 'VALID' }].map(({ value, status }) => (
            <TabsContent key={value} value={value}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAlerts
                  .filter((a) => a.status === status)
                  .map((alert) => {
                    const bus = buses.find((b) => b.bus_id === alert.bus_id);
                    return (
                      <Card key={alert.alert_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{alert.alert_name}</CardTitle>
                              <p className="text-sm text-slate-600 mt-1">{bus?.bus_number}</p>
                            </div>
                            {getStatusBadge(alert.status, alert.days_remaining)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 mb-4">
                            <p className="text-sm text-slate-600">
                              <strong>Type:</strong> {alert.alert_type.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-slate-600">
                              <strong>Expiry:</strong> {format(new Date(alert.expiry_date), 'dd MMM yyyy')}
                            </p>
                            {alert.notes && (
                              <p className="text-sm text-slate-600">
                                <strong>Notes:</strong> {alert.notes}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAlert(alert);
                              setUpdateModal(true);
                            }}
                            className="w-full"
                            data-testid={`update-alert-${alert.alert_id}`}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Update
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Create Alert Modal */}
        <Dialog open={createModal} onOpenChange={setCreateModal}>
          <DialogContent data-testid="create-alert-modal">
            <DialogHeader>
              <DialogTitle>Create Alert</DialogTitle>
              <DialogDescription>Add a new compliance alert</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Bus</Label>
                <Select value={newAlert.bus_id} onValueChange={(value) => setNewAlert({ ...newAlert, bus_id: value })}>
                  <SelectTrigger data-testid="alert-bus-select">
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

              <div>
                <Label>Alert Type</Label>
                <Select value={newAlert.alert_type} onValueChange={(value) => setNewAlert({ ...newAlert, alert_type: value })}>
                  <SelectTrigger data-testid="alert-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INSURANCE">Insurance</SelectItem>
                    <SelectItem value="PERMIT">Permit</SelectItem>
                    <SelectItem value="FITNESS">Fitness</SelectItem>
                    <SelectItem value="POLLUTION">Pollution</SelectItem>
                    <SelectItem value="OIL_CHANGE">Oil Change</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Alert Name</Label>
                <Input
                  placeholder="e.g., Vehicle Insurance Renewal"
                  value={newAlert.alert_name}
                  onChange={(e) => setNewAlert({ ...newAlert, alert_name: e.target.value })}
                  data-testid="alert-name-input"
                />
              </div>

              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={newAlert.expiry_date}
                  onChange={(e) => setNewAlert({ ...newAlert, expiry_date: e.target.value })}
                  data-testid="expiry-date-input"
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Additional notes"
                  value={newAlert.notes}
                  onChange={(e) => setNewAlert({ ...newAlert, notes: e.target.value })}
                  data-testid="alert-notes-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAlert} disabled={loading} className="bg-blue-900" data-testid="confirm-create-alert-button">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Alert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Alert Modal */}
        <Dialog open={updateModal} onOpenChange={setUpdateModal}>
          <DialogContent data-testid="update-alert-modal">
            <DialogHeader>
              <DialogTitle>Update Alert</DialogTitle>
              <DialogDescription>Update expiry date and notes</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>New Expiry Date</Label>
                <Input
                  type="date"
                  value={updateData.new_expiry_date}
                  onChange={(e) => setUpdateData({ ...updateData, new_expiry_date: e.target.value })}
                  data-testid="new-expiry-date-input"
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Update notes"
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                  data-testid="update-notes-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAlert} disabled={loading} className="bg-blue-900" data-testid="confirm-update-alert-button">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Alert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AlertsPage;
