'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth-context';
import { api, Document, TemporaryAccess } from '@/app/lib/api';
import { AppLayout } from '@/app/components/layout/app-layout';
import { Card, CardHeader } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeAccesses: 0,
    pendingAccesses: 0,
    totalDocuments: 0,
  });
  const [recentAccesses, setRecentAccesses] = useState<TemporaryAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardRes = await api.getAccessDashboard();
        if (dashboardRes.data) {
          setStats({
            activeAccesses: dashboardRes.data.dashboard.active.count,
            pendingAccesses: dashboardRes.data.dashboard.pending.count,
            totalDocuments: 0,
          });
          setRecentAccesses(dashboardRes.data.dashboard.active.accesses.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Expiré';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}j ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Bienvenue, {user?.first_name || user?.username} ! 👋
          </h1>
          <p className="text-slate-400">
            Voici un aperçu de votre espace NeroStack
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:border-teal-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Accès actifs</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.activeAccesses}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Accès en attente</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.pendingAccesses}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="hover:border-cyan-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Rôle</p>
                <p className="text-3xl font-bold text-white mt-1 capitalize">{user?.role}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Accesses */}
          <Card>
            <CardHeader
              title="Accès actifs"
              description="Vos accès documents actuellement valides"
              action={
                <Link
                  href="/my-access"
                  className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                >
                  Voir tout →
                </Link>
              }
            />
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentAccesses.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p>Aucun accès actif</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAccesses.map((access) => (
                  <div
                    key={access.id}
                    className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {access.document_id ? `Document #${access.document_id}` : 'Accès global'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Type: <span className="text-slate-300">{access.access_type}</span>
                        </p>
                      </div>
                      <Badge variant="success">
                        {formatTimeRemaining(access.time_remaining)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader title="Actions rapides" />
            <div className="space-y-3">
              <Link
                href="/documents"
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-teal-500/30 hover:bg-slate-800 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                  <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Rechercher des documents</p>
                  <p className="text-sm text-slate-400">Parcourir et consulter vos documents</p>
                </div>
              </Link>

              <Link
                href="/my-access"
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/30 hover:bg-slate-800 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Gérer mes accès</p>
                  <p className="text-sm text-slate-400">Voir vos accès actifs et à venir</p>
                </div>
              </Link>

              {user?.role === 'admin' && (
                <Link
                  href="/admin/users"
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-amber-500/30 hover:bg-slate-800 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Administration</p>
                    <p className="text-sm text-slate-400">Gérer les utilisateurs et accès</p>
                  </div>
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
