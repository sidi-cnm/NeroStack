'use client';

import { useEffect, useState } from 'react';
import { api, TemporaryAccess } from '@/app/lib/api';
import { AppLayout } from '@/app/components/layout/app-layout';
import { Card, CardHeader } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

export default function MyAccessPage() {
  const [dashboard, setDashboard] = useState<{
    active: { count: number; accesses: TemporaryAccess[] };
    pending: { count: number; accesses: TemporaryAccess[] };
    expired: { count: number; accesses: TemporaryAccess[] };
    revoked: { count: number; accesses: TemporaryAccess[] };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getAccessDashboard();
        if (res.data) {
          setDashboard(res.data.dashboard);
        }
      } catch (error) {
        console.error('Error fetching access dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Expiré';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const AccessCard = ({ access, status }: { access: TemporaryAccess; status: 'active' | 'pending' | 'expired' | 'revoked' }) => {
    const statusConfig = {
      active: { variant: 'success' as const, label: 'Actif' },
      pending: { variant: 'warning' as const, label: 'En attente' },
      expired: { variant: 'danger' as const, label: 'Expiré' },
      revoked: { variant: 'danger' as const, label: 'Révoqué' },
    };

    return (
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-medium text-white">
              {access.document_id ? `Document #${access.document_id}` : 'Accès global'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Type: <span className="text-slate-300 capitalize">{access.access_type}</span>
            </p>
          </div>
          <Badge variant={statusConfig[status].variant}>
            {statusConfig[status].label}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            {formatDate(access.start_date)} → {formatDate(access.end_date)}
          </span>
          {status === 'active' && (
            <span className="text-teal-400">
              Reste: {formatTimeRemaining(access.time_remaining)}
            </span>
          )}
        </div>

        {access.reason && (
          <p className="text-sm text-slate-500 mt-2 italic">
            "{access.reason}"
          </p>
        )}
      </div>
    );
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

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Mes accès</h1>
          <p className="text-slate-400 mt-1">Gérez vos accès temporaires aux documents</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card padding="sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-400">{dashboard?.active.count || 0}</p>
              <p className="text-sm text-slate-400">Actifs</p>
            </div>
          </Card>
          <Card padding="sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{dashboard?.pending.count || 0}</p>
              <p className="text-sm text-slate-400">En attente</p>
            </div>
          </Card>
          <Card padding="sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-400">{dashboard?.expired.count || 0}</p>
              <p className="text-sm text-slate-400">Expirés</p>
            </div>
          </Card>
          <Card padding="sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{dashboard?.revoked.count || 0}</p>
              <p className="text-sm text-slate-400">Révoqués</p>
            </div>
          </Card>
        </div>

        {/* Active Accesses */}
        <Card className="mb-6">
          <CardHeader
            title="🟢 Accès actifs"
            description="Vos accès actuellement valides"
          />
          {!dashboard?.active.accesses.length ? (
            <p className="text-slate-400 text-sm">Aucun accès actif</p>
          ) : (
            <div className="space-y-3">
              {dashboard.active.accesses.map((access) => (
                <AccessCard key={access.id} access={access} status="active" />
              ))}
            </div>
          )}
        </Card>

        {/* Pending Accesses */}
        {dashboard?.pending.accesses && dashboard.pending.accesses.length > 0 && (
          <Card className="mb-6">
            <CardHeader
              title="🟡 Accès en attente"
              description="Ces accès seront actifs prochainement"
            />
            <div className="space-y-3">
              {dashboard.pending.accesses.map((access) => (
                <AccessCard key={access.id} access={access} status="pending" />
              ))}
            </div>
          </Card>
        )}

        {/* Expired Accesses */}
        {dashboard?.expired.accesses && dashboard.expired.accesses.length > 0 && (
          <Card>
            <CardHeader
              title="⚫ Accès expirés"
              description="Historique de vos anciens accès"
            />
            <div className="space-y-3">
              {dashboard.expired.accesses.slice(0, 5).map((access) => (
                <AccessCard key={access.id} access={access} status="expired" />
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}



