'use client';

import { useAuth } from '@/app/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/app/components/ui/button';

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">NeroStack</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">
                {user.first_name || user.username}
              </p>
              <p className="text-xs text-slate-400">{user.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
              {(user.first_name?.[0] || user.username[0]).toUpperCase()}
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Bienvenue, {user.first_name || user.username} ! 👋
          </h1>
          <p className="text-slate-400">
            Voici votre tableau de bord NeroStack
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Documents', value: '0', icon: '📄', color: 'from-teal-500 to-cyan-500' },
            { label: 'Analyses IA', value: '0', icon: '🤖', color: 'from-cyan-500 to-blue-500' },
            { label: 'Accès actifs', value: '0', icon: '🔓', color: 'from-emerald-500 to-teal-500' },
            { label: 'Partages', value: '0', icon: '🔗', color: 'from-violet-500 to-purple-500' },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{stat.icon}</span>
                <span className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
              <p className="text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">Actions rapides</h2>
            <div className="space-y-3">
              <button className="w-full p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-left transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Uploader un document</p>
                    <p className="text-sm text-slate-500">Ajouter un nouveau fichier</p>
                  </div>
                </div>
              </button>
              <button className="w-full p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-left transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Rechercher</p>
                    <p className="text-sm text-slate-500">Trouver un document</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">Informations du compte</h2>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-slate-800">
                <span className="text-slate-400">Nom d'utilisateur</span>
                <span className="text-white font-medium">{user.username}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-800">
                <span className="text-slate-400">Email</span>
                <span className="text-white font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-800">
                <span className="text-slate-400">Rôle</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.role === 'admin' 
                    ? 'bg-amber-500/10 text-amber-400' 
                    : 'bg-teal-500/10 text-teal-400'
                }`}>
                  {user.role}
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-400">Membre depuis</span>
                <span className="text-white font-medium">
                  {new Date(user.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

