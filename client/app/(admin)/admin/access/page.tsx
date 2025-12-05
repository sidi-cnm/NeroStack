'use client';

import { useEffect, useState } from 'react';
import { api, TemporaryAccess, User, Document } from '@/app/lib/api';
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
    is_global: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Document selection states
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentPage, setDocumentPage] = useState(1);
  const [documentTotalPages, setDocumentTotalPages] = useState(1);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

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

  const fetchDocuments = async (search?: string, pageNum: number = 1) => {
    setIsLoadingDocuments(true);
    try {
      const res = await api.getDocuments({
        page: pageNum,
        per_page: 20,
        search: search || undefined,
      });
      if (res.data) {
        setDocuments(res.data.documents || []);
        setDocumentTotalPages(res.data.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  useEffect(() => {
    fetchAccesses();
    fetchUsers();
  }, [page, filter]);

  useEffect(() => {
    if (isCreateModalOpen) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (isCreateModalOpen) {
      const timeoutId = setTimeout(() => {
        fetchDocuments(documentSearch, 1);
        setDocumentPage(1);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentSearch, isCreateModalOpen]);

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

    // Check if documents are selected or global access
    if (!formData.is_global && selectedDocuments.length === 0) {
      setError('Veuillez sélectionner au moins un document ou activer l\'accès global');
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
      const documentIds = formData.is_global ? [null] : selectedDocuments;
      let successCount = 0;
      let errorCount = 0;

      // Create access for each selected document (or one global access)
      for (const docId of documentIds) {
        try {
          const res = await api.createAccess({
            user_id: parseInt(formData.user_id),
            document_id: docId,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            access_type: formData.access_type,
            reason: formData.reason || undefined,
          });
          if (res.error) {
            errorCount++;
            console.error(`Error creating access for document ${docId}:`, res.error);
          } else {
            successCount++;
          }
        } catch (err) {
          errorCount++;
          console.error(`Error creating access for document ${docId}:`, err);
        }
      }

      if (errorCount > 0 && successCount === 0) {
        setError(`Erreur lors de la création de tous les accès`);
      } else if (errorCount > 0) {
        setError(`${successCount} accès créés, ${errorCount} erreurs`);
        // Still close modal and refresh on partial success
        setTimeout(() => {
          setIsCreateModalOpen(false);
          resetForm();
          fetchAccesses();
        }, 2000);
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
      is_global: false,
    });
    setSelectedDocuments([]);
    setDocumentSearch('');
    setDocumentPage(1);
  };

  const toggleDocumentSelection = (docId: number) => {
    setSelectedDocuments((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleGlobalAccess = () => {
    setFormData({ ...formData, is_global: !formData.is_global });
    if (!formData.is_global) {
      setSelectedDocuments([]);
    }
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
          size="lg"
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
            {/* Global Access Toggle */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <input
                type="checkbox"
                id="global-access"
                checked={formData.is_global}
                onChange={toggleGlobalAccess}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500 focus:ring-2"
              />
              <label htmlFor="global-access" className="text-sm text-slate-300 cursor-pointer flex-1">
                Accès global (tous les documents)
              </label>
            </div>

            {/* Document Selection */}
            {!formData.is_global && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">
                    Documents ({selectedDocuments.length} sélectionné{selectedDocuments.length > 1 ? 's' : ''})
                  </label>
                  {selectedDocuments.length > 0 && (
                    <button
                      onClick={() => setSelectedDocuments([])}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Tout désélectionner
                    </button>
                  )}
                </div>

                {/* Document Search */}
                <Input
                  placeholder="Rechercher un document..."
                  value={documentSearch}
                  onChange={(e) => setDocumentSearch(e.target.value)}
                />

                {/* Documents List */}
                <div className="max-h-64 overflow-y-auto border border-slate-700/50 rounded-lg bg-slate-900/50">
                  {isLoadingDocuments ? (
                    <div className="p-4 text-center text-slate-400">Chargement...</div>
                  ) : documents.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">Aucun document trouvé</div>
                  ) : (
                    <div className="divide-y divide-slate-700/50">
                      {documents.map((doc) => (
                        <label
                          key={doc.id}
                          className="flex items-start gap-3 p-3 hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={() => toggleDocumentSelection(doc.id)}
                            className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500 focus:ring-2"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{doc.label}</p>
                            {doc.description && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{doc.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {doc.document_type && (
                                <Badge variant="info" size="sm">
                                  {doc.document_type.label}
                                </Badge>
                              )}
                              <span className="text-xs text-slate-500">ID: {doc.id}</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Document Pagination */}
                {documentTotalPages > 1 && (
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <button
                      onClick={() => {
                        const newPage = documentPage - 1;
                        if (newPage >= 1) {
                          setDocumentPage(newPage);
                          fetchDocuments(documentSearch, newPage);
                        }
                      }}
                      disabled={documentPage === 1}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Précédent
                    </button>
                    <span>
                      Page {documentPage} / {documentTotalPages}
                    </span>
                    <button
                      onClick={() => {
                        const newPage = documentPage + 1;
                        if (newPage <= documentTotalPages) {
                          setDocumentPage(newPage);
                          fetchDocuments(documentSearch, newPage);
                        }
                      }}
                      disabled={documentPage === documentTotalPages}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </div>
            )}
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



