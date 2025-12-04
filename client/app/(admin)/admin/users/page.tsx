'use client';

import { useEffect, useState } from 'react';
import { api, User } from '@/app/lib/api';
import { AppLayout } from '@/app/components/layout/app-layout';
import { Card, CardHeader } from '@/app/components/ui/card';
import { Table } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { SearchInput } from '@/app/components/ui/search-input';
import { Pagination } from '@/app/components/ui/pagination';
import { Modal } from '@/app/components/ui/modal';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'user' as 'user' | 'admin',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers({
        page,
        per_page: 10,
        search: search || undefined,
        role: roleFilter || undefined,
      });
      if (res.data) {
        setUsers(res.data.users);
        setTotalPages(res.data.pages);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]);

  const handleCreate = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const res = await api.createUser(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setIsCreateModalOpen(false);
        setFormData({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'user' });
        fetchUsers();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setError('');
    setIsSubmitting(true);
    try {
      const res = await api.updateUser(selectedUser.id, {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setIsEditModalOpen(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      if (user.is_active) {
        await api.deactivateUser(user.id);
      } else {
        await api.activateUser(user.id);
      }
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role,
    });
    setError('');
    setIsEditModalOpen(true);
  };

  const columns = [
    {
      key: 'username',
      header: 'Utilisateur',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
            {(user.first_name?.[0] || user.username[0]).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-white">{user.username}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Nom',
      render: (user: User) => (
        <span className="text-slate-300">
          {user.first_name || user.last_name
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
            : '-'}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      render: (user: User) => (
        <Badge variant={user.role === 'admin' ? 'admin' : 'user'}>
          {user.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (user: User) => (
        <Badge variant={user.is_active ? 'success' : 'danger'}>
          {user.is_active ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: User) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(user)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Modifier"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => handleToggleActive(user)}
            className={`p-2 rounded-lg transition-colors ${
              user.is_active
                ? 'text-amber-400 hover:bg-amber-500/10'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
            title={user.is_active ? 'Désactiver' : 'Activer'}
          >
            {user.is_active ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout requireAdmin>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestion des utilisateurs</h1>
            <p className="text-slate-400 mt-1">{total} utilisateur{total > 1 ? 's' : ''} au total</p>
          </div>
          <Button onClick={() => {
            setFormData({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'user' });
            setError('');
            setIsCreateModalOpen(true);
          }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nouvel utilisateur
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6" padding="sm">
          <div className="flex flex-col md:flex-row gap-4 p-2">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Rechercher par nom ou email..."
              />
            </div>
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'Tous les rôles' },
                { value: 'admin', label: 'Administrateurs' },
                { value: 'user', label: 'Utilisateurs' },
              ]}
            />
          </div>
        </Card>

        {/* Table */}
        <Card padding="none">
          <Table
            columns={columns}
            data={users}
            keyField="id"
            isLoading={isLoading}
            emptyMessage="Aucun utilisateur trouvé"
          />
        </Card>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

        {/* Create Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Créer un utilisateur"
          size="md"
        >
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <Input
                label="Nom"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
            <Input
              label="Nom d'utilisateur"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <Select
              label="Rôle"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })}
              options={[
                { value: 'user', label: 'Utilisateur' },
                { value: 'admin', label: 'Administrateur' },
              ]}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} isLoading={isSubmitting}>
                Créer
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Modifier l'utilisateur"
          size="md"
        >
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <Input
                label="Nom"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
            <Input
              label="Nom d'utilisateur"
              value={formData.username}
              disabled
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Select
              label="Rôle"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })}
              options={[
                { value: 'user', label: 'Utilisateur' },
                { value: 'admin', label: 'Administrateur' },
              ]}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdate} isLoading={isSubmitting}>
                Enregistrer
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}



