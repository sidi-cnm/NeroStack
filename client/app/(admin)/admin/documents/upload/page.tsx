'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { AppLayout } from '@/app/components/layout/app-layout';
import { Card, CardHeader } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';

interface DocumentType {
  id: number;
  label: string;
}

export default function UploadDocumentPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        const res = await api.getDocuments({ per_page: 1 });
        // We'll get types from a separate endpoint if available
        // For now, set default
        setDocumentTypes([{ id: 1, label: 'Document générique' }]);
      } catch (error) {
        console.error('Error fetching document types:', error);
      }
    };
    fetchDocumentTypes();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!label) {
        setLabel(selectedFile.name);
      }
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    if (!label.trim()) {
      setError('Veuillez entrer un nom pour le document');
      return;
    }

    setError('');
    setSuccess(false);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type_id', documentTypeId || '1');
      if (label) formData.append('label', label);
      if (description) formData.append('description', description);

      // Get auth token
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Vous devez être connecté');
        return;
      }

      // Upload via API
      const response = await fetch('http://localhost:8080/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de l\'upload');
        return;
      }

      setSuccess(true);
      setUploadProgress(100);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/documents/${data.document?.id || ''}`);
      }, 2000);

    } catch (err) {
      console.error('Upload error:', err);
      setError('Erreur lors de l\'upload. Vérifiez votre connexion.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return '📕';
    if (['doc', 'docx'].includes(ext || '')) return '📘';
    if (['xls', 'xlsx'].includes(ext || '')) return '📗';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return '🖼️';
    return '📄';
  };

  return (
    <AppLayout requireAdmin>
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Uploader un document</h1>
          <p className="text-slate-400 mt-1">Ajoutez un nouveau document à Mayan EDMS</p>
        </div>

        {/* Success Message */}
        {success && (
          <Card className="mb-6 border-emerald-500/30 bg-emerald-500/10">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-emerald-400">Document uploadé avec succès !</p>
                <p className="text-sm text-emerald-300/70">Redirection en cours...</p>
              </div>
            </div>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-red-500/30 bg-red-500/10">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-400">{error}</p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            <Card>
              <CardHeader title="📤 Fichier à uploader" />
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-teal-500/50 transition-colors">
                  <input
                    type="file"
                    id="file-input"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                  />
                  <label
                    htmlFor="file-input"
                    className="cursor-pointer flex flex-col items-center gap-4"
                  >
                    {file ? (
                      <>
                        <div className="text-5xl">{getFileIcon(file.name)}</div>
                        <div>
                          <p className="font-medium text-white">{file.name}</p>
                          <p className="text-sm text-slate-400 mt-1">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Changer de fichier
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center">
                          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-white mb-1">
                            Cliquez pour sélectionner un fichier
                          </p>
                          <p className="text-sm text-slate-400">
                            PDF, Word, Excel, Images, etc.
                          </p>
                        </div>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </Card>

            {/* Document Info */}
            <Card>
              <CardHeader title="📝 Informations du document" />
              <div className="space-y-4">
                <Input
                  label="Nom du document"
                  placeholder="Ex: Rapport annuel 2024"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                />
                <Input
                  label="Description (optionnel)"
                  placeholder="Description du document..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <Select
                  label="Type de document"
                  value={documentTypeId}
                  onChange={(e) => setDocumentTypeId(e.target.value)}
                  options={[
                    { value: '1', label: 'Document générique' },
                    ...documentTypes.map((dt) => ({
                      value: dt.id.toString(),
                      label: dt.label,
                    })),
                  ]}
                />
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upload Progress */}
            {isUploading && (
              <Card>
                <CardHeader title="Upload en cours" />
                <div className="space-y-3">
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-400 text-center">
                    {uploadProgress < 100 ? 'Traitement...' : 'Terminé !'}
                  </p>
                </div>
              </Card>
            )}

            {/* Info Card */}
            <Card>
              <CardHeader title="ℹ️ Informations" />
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-400 mb-1">Formats supportés:</p>
                  <div className="flex flex-wrap gap-2">
                    {['PDF', 'Word', 'Excel', 'Images', 'TXT'].map((format) => (
                      <Badge key={format} variant="info" size="sm">
                        {format}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Taille max:</p>
                  <p className="text-white">100 MB</p>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleUpload}
                isLoading={isUploading}
                disabled={!file || !label.trim()}
                size="lg"
                className="w-full"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Uploader
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="w-full"
                disabled={isUploading}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

