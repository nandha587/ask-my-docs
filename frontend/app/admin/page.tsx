"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, authApi } from "@/lib/api";
import { Building2, Users, FileText, Layers, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Stats {
  tenant_count: number;
  user_count: number;
  document_count: number;
  chunk_count: number;
}

interface TenantItem {
  id: string;
  name: string;
  user_count: number;
  document_count: number;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const me = await authApi.getMe();
        if (!me.is_admin) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }

        const statsData = await adminApi.getStats();
        const tenantsData = await adminApi.getTenants();
        setStats(statsData);
        setTenants(tenantsData);
      } catch (err) {
        console.error("Failed to load admin panel data:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-mono">Loading admin statistics...</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-24 max-w-md mx-auto">
        <div className="p-4 bg-rose-500/10 text-rose-400 rounded-full mb-4 border border-rose-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          The Admin Workspace is locked to tenant-level administrators. You do not have permission to view this panel.
        </p>
        <Link
          href="/dashboard"
          className="flex items-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center space-x-2.5">
            <ShieldAlert className="w-8 h-8 text-violet-400 shrink-0" />
            <span>Admin Control Panel</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            System diagnostics, database counts, and tenant workspaces summaries.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Numerical Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl glass-panel relative overflow-hidden">
            <div className="absolute top-4 right-4 p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-mono text-slate-400 font-bold uppercase">Workspaces</p>
            <p className="text-3xl font-extrabold text-white mt-2">{stats.tenant_count}</p>
          </div>

          <div className="p-6 rounded-xl glass-panel relative overflow-hidden">
            <div className="absolute top-4 right-4 p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs font-mono text-slate-400 font-bold uppercase">Total Users</p>
            <p className="text-3xl font-extrabold text-white mt-2">{stats.user_count}</p>
          </div>

          <div className="p-6 rounded-xl glass-panel relative overflow-hidden">
            <div className="absolute top-4 right-4 p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-mono text-slate-400 font-bold uppercase">Files Uploaded</p>
            <p className="text-3xl font-extrabold text-white mt-2">{stats.document_count}</p>
          </div>

          <div className="p-6 rounded-xl glass-panel relative overflow-hidden">
            <div className="absolute top-4 right-4 p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <Layers className="w-5 h-5" />
            </div>
            <p className="text-xs font-mono text-slate-400 font-bold uppercase">Vector Index Blocks</p>
            <p className="text-3xl font-extrabold text-white mt-2">{stats.chunk_count}</p>
          </div>
        </div>
      )}

      {/* Tenancy lists */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Active Tenants</h2>
        <div className="overflow-x-auto rounded-xl border border-white/5 glass-panel">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Tenant ID</th>
                <th className="px-6 py-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Workspace Name</th>
                <th className="px-6 py-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 text-center">User Count</th>
                <th className="px-6 py-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 text-center">Files Uploaded</th>
                <th className="px-6 py-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono text-cyan-400">{t.id}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-white">{t.name}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">{t.user_count}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">{t.document_count}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(t.created_at).toLocaleDateString()}
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
