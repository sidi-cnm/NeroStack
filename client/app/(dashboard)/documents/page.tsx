'use client';

import { useEffect, useState } from 'react';
import { api, Document } from '@/app/lib/api';
import { AppLayout } from '@/app/components/layout/app-layout';
import { Card } from '@/app/components/ui/card';
import { SearchInput } from '@/app/components/ui/search-input';
import { Pagination } from '@/app/components/ui/pagination';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Select } from '@/app/components/ui/select';
import Link from 'next/link';

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

interface DocumentType {
  id: number;
  label: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('');
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);

  const sortDocuments = (docs: Document[], sort: SortOption): Document[] => {
    const sorted = [...docs];
    switch (sort) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.datetime_created).getTime() - new Date(a.datetime_created).getTime()
        );
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.datetime_created).getTime() - new Date(b.datetime_created).getTime()
        );
      case 'name_asc':
        return sorted.sort((a, b) => a.label.localeCompare(b.label));
      case 'name_desc':
        return sorted.sort((a, b) => b.label.localeCompare(a.label));
      default:
        return sorted;
    }
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getDocuments({ 
          page, 
          per_page: viewMode === 'grid' ? 12 : 20,
          search: search || undefined,
          document_type: documentTypeFilter ? parseInt(documentTypeFilter) : undefined
        });
        if (res.data) {
          let docs = res.data.documents || [];
          
          // Sort documents
          docs = sortDocuments(docs, sortBy);
          
          setDocuments(docs);
          setTotalPages(res.data.pages || 1);
          setTotal(res.data.total || 0);
        } else if (res.error) {
          setError(res.error);
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Erreur lors du chargement des documents');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [page, search, documentTypeFilter, sortBy, viewMode]);

  // Fetch document types
  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        // This would need to be added to the API
        // For now, we'll extract unique types from documents
        const res = await api.getDocuments({ page: 1, per_page: 100 });
        if (res.data?.documents) {
          const types = new Map<number, string>();
          res.data.documents.forEach((doc: Document) => {
            if (doc.document_type) {
              types.set(doc.document_type.id, doc.document_type.label);
            }
          });
          setDocumentTypes(Array.from(types.entries()).map(([id, label]) => ({ id, label })));
        }
      } catch (err) {
        console.error('Error fetching document types:', err);
      }
    };
    fetchDocumentTypes();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getFileIcon = (mimetype?: string) => {
    if (!mimetype) return '📄';
    if (mimetype.includes('pdf')) return '📕';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📘';
    if (mimetype.includes('sheet') || mimetype.includes('excel')) return '📗';
    if (mimetype.includes('image')) return '🖼️';
    return '📄';
  };

  const getStatusBadge = (doc: Document) => {
    // Check if document has file_latest to determine status
    if (!doc.file_latest) {
      return <Badge variant="warning" size="sm">En attente</Badge>;
    }
    return <Badge variant="success" size="sm">Disponible</Badge>;
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Documents</h1>
            <p className="text-slate-400 mt-1">
              {total > 0 ? `${total} document${total > 1 ? 's' : ''} disponible${total > 1 ? 's' : ''}` : 'Parcourez et consultez vos documents'}
            </p>
          </div>
          <div className="w-full md:w-80">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Rechercher un document..."
            />
          </div>
        </div>

        {/* Filters and View Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-3 flex-1">
            <Select
              value={documentTypeFilter}
              onChange={(e) => {
                setDocumentTypeFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'Tous les types' },
                ...documentTypes.map((dt) => ({
                  value: dt.id.toString(),
                  label: dt.label,
                })),
              ]}
              className="w-full sm:w-48"
            />
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              options={[
                { value: 'newest', label: 'Plus récents' },
                { value: 'oldest', label: 'Plus anciens' },
                { value: 'name_asc', label: 'Nom (A-Z)' },
                { value: 'name_desc', label: 'Nom (Z-A)' },
              ]}
              className="w-full sm:w-48"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-500/30 bg-red-500/10 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-red-400 font-medium">Erreur</p>
                <p className="text-red-300/70 text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Documents Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <Card className="text-center py-16">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">Aucun document trouvé</h3>
            <p className="text-slate-400 mb-4">
              {search || documentTypeFilter 
                ? 'Essayez de modifier vos filtres de recherche' 
                : 'Les documents apparaîtront ici une fois que vous aurez reçu un accès'}
            </p>
            {!search && !documentTypeFilter && (
              <Link href="/my-access">
                <Button variant="secondary" size="sm">
                  Voir mes accès
                </Button>
              </Link>
            )}
          </Card>
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <Link key={doc.id} href={`/documents/${doc.id}`}>
                  <Card className="h-full hover:border-teal-500/30 transition-all cursor-pointer group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                        {getFileIcon(doc.file_latest?.mimetype)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate group-hover:text-teal-400 transition-colors mb-2">
                          {doc.label}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {getStatusBadge(doc)}
                          {doc.document_type && (
                            <Badge variant="info" size="sm">
                              {doc.document_type.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {doc.description && (
                      <p className="text-sm text-slate-400 mt-3 line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                      <span className="text-xs text-slate-500">
                        {formatDate(doc.datetime_created)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatSize(doc.file_latest?.size)}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <Card>
              <div className="divide-y divide-slate-800">
                {documents.map((doc) => (
                  <Link key={doc.id} href={`/documents/${doc.id}`}>
                    <div className="p-4 hover:bg-slate-800/50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                          {getFileIcon(doc.file_latest?.mimetype)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-white group-hover:text-teal-400 transition-colors truncate">
                              {doc.label}
                            </h3>
                            {getStatusBadge(doc)}
                            {doc.document_type && (
                              <Badge variant="info" size="sm">
                                {doc.document_type.label}
                              </Badge>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-slate-400 truncate">
                              {doc.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm text-slate-500 flex-shrink-0">
                          <span>{formatDate(doc.datetime_created)}</span>
                          <span>{formatSize(doc.file_latest?.size)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}



