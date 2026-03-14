import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getAllUsers, getAllClients, createUserByAdmin, updateUserByAdmin, changeUserPassword } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Users as UsersIcon, Loader2, Edit, Key, Eye, EyeOff } from 'lucide-react';

const UserMasterPage = () => {
  const user = getUser();
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Filters
  const [filterClient, setFilterClient] = useState('all');
  const [filterRole, setFilterRole] = useState('all');

  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    role: 'DRIVER',
    client_id: '',
  });

  const roles = [
    { value: 'DRIVER', label: 'Driver' },
    { value: 'MECHANIC', label: 'Mechanic' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'OWNER', label: 'Owner' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, clientsRes] = await Promise.all([
        getAllUsers(),
        getAllClients(),
      ]);
      setUsers(usersRes.data.data || []);
      setClients(clientsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password || !newUser.client_id) {
      toast.error('All fields are required');
      return;
    }

    setLoading(true);
    try {
      await createUserByAdmin({
        ...newUser,
        created_by: user.user_id,
      });

      toast.success('User created successfully');
      setCreateModal(false);
      setNewUser({
        email: '',
        name: '',
        password: '',
        role: 'DRIVER',
        client_id: '',
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (u) => {
    setSelectedUser({ ...u });
    setEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      await updateUserByAdmin(selectedUser.user_id, {
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        active: selectedUser.active,
      });

      toast.success('User updated successfully');
      setEditModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (u) => {
    setSelectedUser(u);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setPasswordModal(true);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await changeUserPassword(selectedUser.user_id, newPassword);
      toast.success('Password changed successfully');
      setPasswordModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const clientMatch = filterClient === 'all' || u.client_id === filterClient;
    const roleMatch = filterRole === 'all' || u.role === filterRole;
    return clientMatch && roleMatch && u.role !== 'PLATFORM_ADMIN';
  });

  const getRoleBadge = (role) => {
    const colors = {
      DRIVER: 'bg-blue-100 text-blue-800',
      MECHANIC: 'bg-green-100 text-green-800',
      SUPERVISOR: 'bg-purple-100 text-purple-800',
      ADMIN: 'bg-red-100 text-red-800',
      OWNER: 'bg-amber-100 text-amber-800',
    };
    return <Badge className={`${colors[role] || 'bg-slate-100 text-slate-800'} px-2 py-1 rounded-full text-xs font-bold`}>{role}</Badge>;
  };

  return (
    <Layout>
      <div data-testid="user-master-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">User Master</h1>
          <Button onClick={() => setCreateModal(true)} className="bg-blue-900" data-testid="create-user-button">
            <Plus className="w-4 h-4 mr-2" />
            Create User
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
                <Label className="text-xs sm:text-sm">Filter by Role</Label>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger data-testid="role-filter">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-bold text-slate-700 uppercase text-xs whitespace-nowrap">Name</th>
                      <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-bold text-slate-700 uppercase text-xs whitespace-nowrap">Email</th>
                      <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-bold text-slate-700 uppercase text-xs whitespace-nowrap">Role</th>
                      <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-bold text-slate-700 uppercase text-xs whitespace-nowrap">Client</th>
                      <th className="text-center py-2 sm:py-3 px-3 sm:px-4 font-bold text-slate-700 uppercase text-xs whitespace-nowrap">Status</th>
                      <th className="text-center py-2 sm:py-3 px-3 sm:px-4 font-bold text-slate-700 uppercase text-xs whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const client = clients.find((c) => c.client_id === u.client_id);
                      return (
                        <tr key={u.user_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-2 sm:py-3 px-3 sm:px-4 font-semibold text-slate-900 whitespace-nowrap">{u.name}</td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-slate-600 whitespace-nowrap">{u.email}</td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4">{getRoleBadge(u.role)}</td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-slate-600 whitespace-nowrap">{client?.company_name || 'Unknown'}</td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-center">
                            <Badge className={`${u.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} px-2 py-1 rounded-full text-xs font-bold`}>
                              {u.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-2 sm:py-3 px-3 sm:px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(u)}
                                className="text-blue-600 hover:text-blue-800"
                                data-testid={`edit-user-${u.user_id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePasswordChange(u)}
                                className="text-amber-600 hover:text-amber-800"
                                data-testid={`change-password-${u.user_id}`}
                              >
                                <Key className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredUsers.length === 0 && (
              <div className="py-12 text-center text-slate-500">No users found</div>
            )}
          </CardContent>
        </Card>

        {/* Create User Modal */}
        <Dialog open={createModal} onOpenChange={setCreateModal}>
          <DialogContent data-testid="create-user-modal">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new user to the system</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={newUser.client_id} onValueChange={(value) => setNewUser({ ...newUser, client_id: value })}>
                  <SelectTrigger data-testid="user-client-select">
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
                <Label>Name *</Label>
                <Input
                  placeholder="John Doe"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  data-testid="user-name"
                />
              </div>

              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  data-testid="user-email"
                />
              </div>

              <div>
                <Label>Password *</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  data-testid="user-password"
                />
              </div>

              <div>
                <Label>Role *</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger data-testid="user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={loading} className="bg-blue-900" data-testid="confirm-create-user">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={editModal} onOpenChange={setEditModal}>
          <DialogContent data-testid="edit-user-modal">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information</DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={selectedUser.name}
                    onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Role</Label>
                  <Select value={selectedUser.role} onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={selectedUser.active}
                    onCheckedChange={(checked) => setSelectedUser({ ...selectedUser, active: checked })}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={loading} className="bg-blue-900">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Password Modal */}
        <Dialog open={passwordModal} onOpenChange={setPasswordModal}>
          <DialogContent data-testid="change-password-modal">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="new-password-input"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label>Confirm Password</Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="confirm-password-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleChangePassword} disabled={loading} className="bg-blue-900">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Change Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default UserMasterPage;
