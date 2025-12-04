'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Document } from '@/app/lib/api';
import { AppLayout } from '@/app/components/layout/app-layout';
import { Card, CardHeader } from '@/app/components/ui/card';
import { Table } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { SearchInput } from '@/app/components/ui/search-input';
import { Pagination } from '@/app/components/ui/pagination';
import Link from 'next/link';

export default function AdminDocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDocuments({
        page,
        per_page: 10,
        search: search || undefined,
      });
      if (res.data) {
        setDocuments(res.data.documents || []);
        setTotalPages(res.data.pages || 1);
        setTotal(res.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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

  const columns = [
    {
      key: 'label',
      header: 'Document',
      render: (doc: Document) => (
        <Link href={`/documents/${doc.id}`} className="group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg">
              📄
            </div>
            <div>
              <p className="font-medium text-white group-hover:text-teal-400 transition-colors">
                {doc.label}
              </p>
              {doc.file_latest && (
                <p className="text-xs text-slate-400">{doc.file_latest.filename}</p>
              )}
            </div>
          </div>
        </Link>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (doc: Document) =>
        doc.document_type ? (
          <Badge variant="info">{doc.document_type.label}</Badge>
        ) : (
          <span className="text-slate-500">-</span>
        ),
    },
    {
      key: 'size',
      header: 'Taille',
      render: (doc: Document) => (
        <span className="text-slate-400">{formatSize(doc.file_latest?.size)}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (doc: Document) => (
        <span className="text-slate-400">{formatDate(doc.datetime_created)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (doc: Document) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/documents/${doc.id}`}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Voir"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </Link>
          <button
            className="p-2 rounded-lg text-teal-400 hover:bg-teal-500/10 transition-colors"
            title="Analyser avec IA"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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
            <h1 className="text-3xl font-bold text-white">Gestion des documents</h1>
            <p className="text-slate-400 mt-1">{total} document{total > 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push('/admin/documents/upload')}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Uploader
            </Button>
            <a
              href="http://localhost:8001"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ouvrir Mayan
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card padding="sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{total}</p>
                <p className="text-sm text-slate-400">Documents</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">-</p>
                <p className="text-sm text-slate-400">Analyses IA</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">-</p>
                <p className="text-sm text-slate-400">Dossiers</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">-</p>
                <p className="text-sm text-slate-400">Types</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6" padding="sm">
          <div className="p-2">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Rechercher un document..."
            />
          </div>
        </Card>

        {/* Table */}
        <Card padding="none">
          <Table
            columns={columns}
            data={documents}
            keyField="id"
            isLoading={isLoading}
            emptyMessage="Aucun document trouvé"
          />
        </Card>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

        {/* Mayan Info */}
        <Card className="mt-8">
          <CardHeader
            title="📦 Intégration Mayan EDMS"
            description="Les documents sont gérés via Mayan EDMS"
          />
          <p className="text-slate-400 text-sm mb-4">
            Pour uploader, organiser ou supprimer des documents, utilisez l'interface Mayan EDMS.
            NeroStack synchronise automatiquement les documents disponibles.
          </p>
          <a
            href="http://localhost:8001"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors"
          >
            Accéder à Mayan EDMS
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </Card>
      </div>
    </AppLayout>
  );
}



