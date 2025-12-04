'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Document, DocumentAnalysis } from '@/app/lib/api';
import { AppLayout } from '@/app/components/layout/app-layout';
import { Card, CardHeader } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = Number(params.id);

  const [document, setDocument] = useState<Document | null>(null);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [accessInfo, setAccessInfo] = useState<{
    has_access: boolean;
    reason: string;
    access_type?: string;
    time_remaining?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Check access first
        const accessRes = await api.checkDocumentAccess(documentId);
        if (accessRes.data) {
          setAccessInfo(accessRes.data);
        }

        // Fetch document
        const docRes = await api.getDocument(documentId);
        if (docRes.data) {
          setDocument(docRes.data.document);
        }

        // Fetch existing analysis
        const analysisRes = await api.getDocumentAnalysis(documentId);
        if (analysisRes.data) {
          setAnalysis(analysisRes.data.analysis);
        }
      } catch (error) {
        console.error('Error fetching document:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId) {
      fetchData();
    }
  }, [documentId]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await api.analyzeDocument(documentId);
      if (res.data) {
        setAnalysis(res.data.analysis);
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout>
        <Card className="text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">Document non trouvé</h3>
          <p className="text-slate-400 mb-6">Ce document n'existe pas ou a été supprimé</p>
          <Button onClick={() => router.push('/documents')}>
            Retour aux documents
          </Button>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
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

        {/* Access Warning */}
        {accessInfo && !accessInfo.has_access && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-red-400">Accès restreint</p>
                <p className="text-sm text-red-300/70">Vous n'avez pas accès à ce document. Contactez un administrateur.</p>
              </div>
            </div>
          </div>
        )}

        {/* Document Header */}
        <Card className="mb-6">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-3xl">
              📄
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">{document.label}</h1>
              <div className="flex flex-wrap items-center gap-3">
                {document.document_type && (
                  <Badge variant="info">{document.document_type.label}</Badge>
                )}
                {accessInfo?.has_access && (
                  <Badge variant="success">
                    Accès: {accessInfo.access_type}
                  </Badge>
                )}
              </div>
              {document.description && (
                <p className="text-slate-400 mt-3">{document.description}</p>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Summary */}
            <Card>
              <CardHeader
                title="🤖 Résumé IA"
                description="Analyse automatique du contenu"
                action={
                  <Button
                    size="sm"
                    variant={analysis ? 'secondary' : 'primary'}
                    onClick={handleAnalyze}
                    isLoading={isAnalyzing}
                    disabled={!accessInfo?.has_access}
                  >
                    {analysis ? 'Régénérer' : 'Analyser'}
                  </Button>
                }
              />

              {!analysis ? (
                <div className="text-center py-8 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p>Cliquez sur "Analyser" pour générer un résumé IA</p>
                </div>
              ) : analysis.status === 'processing' ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-400">Analyse en cours...</span>
                </div>
              ) : analysis.status === 'failed' ? (
                <div className="text-center py-8 text-red-400">
                  <p>Erreur lors de l'analyse: {analysis.error_message}</p>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-slate-300 leading-relaxed">{analysis.summary}</p>
                </div>
              )}
            </Card>

            {/* AI Keywords */}
            <Card>
              <CardHeader title="🏷️ Mots-clés IA" />
              {!analysis?.keywords?.length ? (
                <p className="text-slate-400 text-sm">Aucun mot-clé disponible</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analysis.keywords.map((keyword, index) => (
                    <Badge key={index} variant="default" size="md">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* Key Points */}
            {analysis?.key_points && analysis.key_points.length > 0 && (
              <Card>
                <CardHeader title="📌 Points clés" />
                <ul className="space-y-2">
                  {analysis.key_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-300">
                      <span className="w-6 h-6 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {index + 1}
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Document Info */}
            <Card>
              <CardHeader title="Informations" />
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Date de création</dt>
                  <dd className="text-white mt-1">{formatDate(document.datetime_created)}</dd>
                </div>
                {document.file_latest && (
                  <>
                    <div>
                      <dt className="text-slate-500">Nom du fichier</dt>
                      <dd className="text-white mt-1 truncate">{document.file_latest.filename}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Type</dt>
                      <dd className="text-white mt-1">{document.file_latest.mimetype}</dd>
                    </div>
                  </>
                )}
              </dl>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader title="Actions" />
              <div className="space-y-3">
                <Button variant="secondary" className="w-full" disabled={!accessInfo?.has_access}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Télécharger
                </Button>
                <Button variant="ghost" className="w-full" disabled={!accessInfo?.has_access}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Prévisualiser
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}



