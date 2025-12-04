'use client';

import { useEffect, useState } from 'react';
import { api, Document } from '@/app/lib/api';
import { AppLayout } from '@/app/components/layout/app-layout';
import { Card } from '@/app/components/ui/card';
import { SearchInput } from '@/app/components/ui/search-input';
import { Pagination } from '@/app/components/ui/pagination';
import { Badge } from '@/app/components/ui/badge';
import Link from 'next/link';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      try {
        const res = await api.getDocuments({ page, per_page: 12, search: search || undefined });
        if (res.data) {
          setDocuments(res.data.documents || []);
          setTotalPages(res.data.pages || 1);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [page, search]);

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

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Documents</h1>
            <p className="text-slate-400 mt-1">Parcourez et consultez vos documents</p>
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

        {/* Documents Grid */}
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
            <p className="text-slate-400">
              {search ? 'Essayez avec d\'autres termes de recherche' : 'Les documents apparaîtront ici'}
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <Link key={doc.id} href={`/documents/${doc.id}`}>
                  <Card className="h-full hover:border-teal-500/30 transition-all cursor-pointer group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl">
                        {getFileIcon(doc.file_latest?.mimetype)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate group-hover:text-teal-400 transition-colors">
                          {doc.label}
                        </h3>
                        {doc.document_type && (
                          <Badge variant="info" size="sm">
                            {doc.document_type.label}
                          </Badge>
                        )}
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

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}



