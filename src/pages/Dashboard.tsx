import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { Users, UserCheck, Clock, ArrowRight, FileText, User } from 'lucide-react';
import { motion } from 'motion/react';

interface Stats {
  totalUsers?: number;
  totalCustomers?: number;
  recentUsers?: any[];
  message?: string;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Erro ao carregar estatísticas', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (user?.role === 'admin') {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Administrativo</h1>
          <p className="text-slate-500 mt-1">Visão geral do sistema e usuários</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <Users size={24} />
            </div>
            <p className="text-slate-500 text-sm font-medium">Total de Usuários</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats?.totalUsers}</h3>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <UserCheck size={24} />
            </div>
            <p className="text-slate-500 text-sm font-medium">Total de Clientes</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats?.totalCustomers}</h3>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <FileText size={24} />
            </div>
            <p className="text-slate-500 text-sm font-medium">Arquivos Enviados</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats?.totalFiles}</h3>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
              <Clock size={24} />
            </div>
            <p className="text-slate-500 text-sm font-medium">Status do Sistema</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">Operacional</h3>
          </motion.div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Usuários Recentes</h2>
            <button className="text-indigo-600 text-sm font-semibold flex items-center gap-1 hover:underline">
              Ver todos <ArrowRight size={16} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Nome</th>
                  <th className="px-6 py-4 font-semibold">E-mail</th>
                  <th className="px-6 py-4 font-semibold">Cargo</th>
                  <th className="px-6 py-4 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recentUsers?.map((u, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{u.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Olá, {user?.name}!</h1>
        <p className="text-slate-500 mt-1">Bem-vindo ao seu painel de cliente</p>
      </header>

      <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-200">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4">Sua conta está ativa</h2>
          <p className="text-indigo-100 max-w-md">
            Você agora tem acesso a todas as funcionalidades exclusivas para clientes. 
            Em breve teremos novidades por aqui!
          </p>
          <button className="mt-6 px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors">
            Explorar Recursos
          </button>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <FileText size={20} />
          </div>
          <h3 className="font-bold text-slate-900 mb-1">Meus Arquivos</h3>
          <p className="text-2xl font-bold text-slate-900">{stats?.fileCount || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Arquivos disponíveis para você</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <User size={20} />
          </div>
          <h3 className="font-bold text-slate-900 mb-2">Meus Dados</h3>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">E-mail:</span>
              <span className="text-slate-900 font-medium truncate ml-2">{user?.email}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Tipo:</span>
              <span className="text-indigo-600 font-bold uppercase text-[10px] bg-indigo-50 px-2 py-0.5 rounded-full">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mb-4">
            <Clock size={20} />
          </div>
          <h3 className="font-bold text-slate-900 mb-2">Suporte</h3>
          <p className="text-xs text-slate-500 mt-2">
            Precisa de ajuda? Nossa equipe está disponível para atender você.
          </p>
          <button className="mt-3 text-indigo-600 text-xs font-bold hover:underline">
            Abrir um chamado
          </button>
        </div>
      </div>
    </div>
  );
}
