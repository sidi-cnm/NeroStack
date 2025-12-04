'use client';

import { useEffect, useState } from 'react';
import { api, TemporaryAccess, User } from '@/app/lib/api';
import { AppLayout } from '@/app/components/layout/app-layout';
import { Card } from '@/app/components/ui/card';
import { Table } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Pagination } from '@/app/components/ui/pagination';
import { Modal } from '@/app/components/ui/modal';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';

export default function AdminAccessPage() {
  const [accesses, setAccesses] = useState<TemporaryAccess[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'valid' | 'expired'>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    document_id: '',
    start_date: '',
    end_date: '',
    access_type: 'read' as 'read' | 'write' | 'admin',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchAccesses = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAccesses({
        page,
        per_page: 10,
        valid: filter === 'valid' ? true : undefined,
      });
      if (res.data) {
        setAccesses(res.data.accesses);
        setTotalPages(res.data.pages);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('Error fetching accesses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.getUsers({ per_page: 100 });
      if (res.data) {
        setUsers(res.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchAccesses();
    fetchUsers();
  }, [page, filter]);

  const handleCreate = async () => {
    setError('');

    // Validation
    if (!formData.user_id) {
      setError('Veuillez sélectionner un utilisateur');
      return;
    }
    if (!formData.start_date) {
      setError('Veuillez sélectionner une date de début');
      return;
    }
    if (!formData.end_date) {
      setError('Veuillez sélectionner une date de fin');
      return;
    }

    // Parse dates - handle date-only input by adding default times
    let startDateStr = formData.start_date;
    let endDateStr = formData.end_date;

    // If no time specified, add default times (00:00 for start, 23:59 for end)
    if (startDateStr.length === 10) {
      startDateStr += 'T00:00';
    }
    if (endDateStr.length === 10) {
      endDateStr += 'T23:59';
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Check if dates are valid
    if (isNaN(startDate.getTime())) {
      setError('Date de début invalide');
      return;
    }
    if (isNaN(endDate.getTime())) {
      setError('Date de fin invalide');
      return;
    }

    if (endDate <= startDate) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createAccess({
        user_id: parseInt(formData.user_id),
        document_id: formData.document_id ? parseInt(formData.document_id) : null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        access_type: formData.access_type,
        reason: formData.reason || undefined,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setIsCreateModalOpen(false);
        resetForm();
        fetchAccesses();
      }
    } catch (err) {
      console.error('Error creating access:', err);
      setError('Erreur lors de la création de l\'accès');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (accessId: number) => {
    try {
      await api.revokeAccess(accessId);
      fetchAccesses();
    } catch (error) {
      console.error('Error revoking access:', error);
    }
  };

  const handleDelete = async (accessId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet accès ?')) return;
    try {
      await api.deleteAccess(accessId);
      fetchAccesses();
    } catch (error) {
      console.error('Error deleting access:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      document_id: '',
      start_date: '',
      end_date: '',
      access_type: 'read',
      reason: '',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (access: TemporaryAccess) => {
    if (!access.is_active) return <Badge variant="danger">Révoqué</Badge>;
    if (access.is_expired) return <Badge variant="default">Expiré</Badge>;
    if (access.is_pending) return <Badge variant="warning">En attente</Badge>;
    if (access.is_valid) return <Badge variant="success">Actif</Badge>;
    return <Badge variant="default">-</Badge>;
  };

  const columns = [
    {
      key: 'user',
      header: 'Utilisateur',
      render: (access: TemporaryAccess) => (
        <div>
          <p className="font-medium text-white">{access.user?.username || `User #${access.user_id}`}</p>
          <p className="text-xs text-slate-400">{access.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'target',
      header: 'Cible',
      render: (access: TemporaryAccess) => (
        <span className="text-slate-300">
          {access.document_id ? `Document #${access.document_id}` : 'Accès global'}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (access: TemporaryAccess) => (
        <Badge variant="info">{access.access_type}</Badge>
      ),
    },
    {
      key: 'period',
      header: 'Période',
      render: (access: TemporaryAccess) => (
        <div className="text-sm">
          <p className="text-slate-300">{formatDate(access.start_date)}</p>
          <p className="text-slate-500">→ {formatDate(access.end_date)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (access: TemporaryAccess) => getStatusBadge(access),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (access: TemporaryAccess) => (
        <div className="flex items-center gap-2">
          {access.is_active && access.is_valid && (
            <button
              onClick={() => handleRevoke(access.id)}
              className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
              title="Révoquer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          )}
          <button
            onClick={() => handleDelete(access.id)}
            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            title="Supprimer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
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
            <h1 className="text-3xl font-bold text-white">Accès temporaires</h1>
            <p className="text-slate-400 mt-1">{total} accès au total</p>
          </div>
          <Button onClick={() => {
            resetForm();
            setError('');
            setIsCreateModalOpen(true);
          }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nouvel accès
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6" padding="sm">
          <div className="flex gap-2 p-2">
            {(['all', 'valid', 'expired'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === f
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {f === 'all' ? 'Tous' : f === 'valid' ? 'Actifs' : 'Expirés'}
              </button>
            ))}
          </div>
        </Card>

        {/* Table */}
        <Card padding="none">
          <Table
            columns={columns}
            data={accesses}
            keyField="id"
            isLoading={isLoading}
            emptyMessage="Aucun accès temporaire trouvé"
          />
        </Card>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

        {/* Create Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Créer un accès temporaire"
          size="md"
        >
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <Select
              label="Utilisateur"
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              options={[
                { value: '', label: 'Sélectionner un utilisateur' },
                ...users.map((u) => ({ value: u.id.toString(), label: `${u.username} (${u.email})` })),
              ]}
            />
            <Input
              label="ID du document (optionnel)"
              type="number"
              placeholder="Laisser vide pour accès global"
              value={formData.document_id}
              onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date de début"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
              <Input
                label="Date de fin"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
            <Select
              label="Type d'accès"
              value={formData.access_type}
              onChange={(e) => setFormData({ ...formData, access_type: e.target.value as 'read' | 'write' | 'admin' })}
              options={[
                { value: 'read', label: 'Lecture seule' },
                { value: 'write', label: 'Lecture/Écriture' },
                { value: 'admin', label: 'Administrateur' },
              ]}
            />
            <Input
              label="Raison (optionnel)"
              placeholder="Ex: Audit annuel..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
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
      </div>
    </AppLayout>
  );
}



