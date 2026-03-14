import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getAllBusesByClient, getAllClients, createBus } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Bus as BusIcon, Loader2 } from 'lucide-react';

const BusMasterPage = () => {
  const user = getUser();
  const [buses, setBuses] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);

  // Filters
  const [filterClient, setFilterClient] = useState('all');
  const [filterBus, setFilterBus] = useState('');

  const [newBus, setNewBus] = useState({
    client_id: '',
    bus_number: '',
    registration_number: '',
    model: '',
    capacity: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [busesRes, clientsRes] = await Promise.all([
        getAllBusesByClient(),
        getAllClients(),
      ]);
      setBuses(busesRes.data.data || []);
      setClients(clientsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const handleCreateBus = async () => {
    if (!newBus.client_id || !newBus.bus_number) {
      toast.error('Client and Bus Number are required');
      return;
    }

    setLoading(true);
    try {
      await createBus({
        ...newBus,
        capacity: newBus.capacity ? parseInt(newBus.capacity) : null,
      });

      toast.success('Bus added successfully');
      setCreateModal(false);
      setNewBus({
        client_id: '',
        bus_number: '',
        registration_number: '',
        model: '',
        capacity: '',
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to add bus');
    } finally {
      setLoading(false);
    }
  };

  const filteredBuses = buses.filter((bus) => {
    const clientMatch = filterClient === 'all' || bus.client_id === filterClient;
    const busMatch = !filterBus || bus.bus_number.toLowerCase().includes(filterBus.toLowerCase());
    return clientMatch && busMatch;
  });

  // Group buses by client
  const busesGroupedByClient = filteredBuses.reduce((acc, bus) => {
    if (!acc[bus.client_id]) {
      acc[bus.client_id] = [];
    }
    acc[bus.client_id].push(bus);
    return acc;
  }, {});

  return (
    <Layout>
      <div data-testid="bus-master-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Bus Master</h1>
          <Button onClick={() => setCreateModal(true)} className="bg-blue-900" data-testid="add-bus-button">
            <Plus className="w-4 h-4 mr-2" />
            Add Bus
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-slate-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm">Filter by Client</Label>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger data-testid="client-filter">
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.client_id} value={client.client_id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs sm:text-sm">Search Bus Number</Label>
                <Input
                  placeholder="Search bus..."
                  value={filterBus}
                  onChange={(e) => setFilterBus(e.target.value)}
                  data-testid="bus-search"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buses grouped by client */}
        <div className="space-y-6">
          {Object.entries(busesGroupedByClient).map(([clientId, clientBuses]) => {
            const client = clients.find((c) => c.client_id === clientId);
            return (
              <Card key={clientId} className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <BusIcon className="w-5 h-5 text-blue-900" />
                    {client?.company_name || 'Unknown Client'}
                    <span className="text-sm text-slate-500 font-normal">({clientBuses.length} buses)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {clientBuses.map((bus) => (
                      <Card key={bus.bus_id} className="border-slate-200">
                        <CardContent className="pt-4">
                          <p className="font-bold text-base sm:text-lg text-slate-900 mb-2">{bus.bus_number}</p>
                          <div className="space-y-1 text-xs sm:text-sm text-slate-600">
                            <p><strong>Reg:</strong> {bus.registration_number}</p>
                            {bus.model && <p><strong>Model:</strong> {bus.model}</p>}
                            {bus.capacity && <p><strong>Capacity:</strong> {bus.capacity} seats</p>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {Object.keys(busesGroupedByClient).length === 0 && (
            <Card className="border-slate-200">
              <CardContent className="py-12 text-center text-slate-500">
                No buses found
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Bus Modal */}
        <Dialog open={createModal} onOpenChange={setCreateModal}>
          <DialogContent data-testid="add-bus-modal">
            <DialogHeader>
              <DialogTitle>Add New Bus</DialogTitle>
              <DialogDescription>Add a bus to a client</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={newBus.client_id} onValueChange={(value) => setNewBus({ ...newBus, client_id: value })}>
                  <SelectTrigger data-testid="bus-client-select">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.filter(c => c.active).map((client) => (
                      <SelectItem key={client.client_id} value={client.client_id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Bus Number *</Label>
                <Input
                  placeholder="TN-01-AB-1234"
                  value={newBus.bus_number}
                  onChange={(e) => setNewBus({ ...newBus, bus_number: e.target.value })}
                  data-testid="bus-number"
                />
              </div>

              <div>
                <Label>Registration Number</Label>
                <Input
                  placeholder="TN01AB1234"
                  value={newBus.registration_number}
                  onChange={(e) => setNewBus({ ...newBus, registration_number: e.target.value })}
                  data-testid="registration-number"
                />
              </div>

              <div>
                <Label>Model</Label>
                <Input
                  placeholder="Ashok Leyland"
                  value={newBus.model}
                  onChange={(e) => setNewBus({ ...newBus, model: e.target.value })}
                  data-testid="bus-model"
                />
              </div>

              <div>
                <Label>Capacity</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={newBus.capacity}
                  onChange={(e) => setNewBus({ ...newBus, capacity: e.target.value })}
                  data-testid="bus-capacity"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBus} disabled={loading} className="bg-blue-900" data-testid="confirm-add-bus">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Bus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default BusMasterPage;
