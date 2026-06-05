"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { KeyRound, Mail, ArrowRight, BookOpen, AlertCircle, Building2, Link2 } from "lucide-react";

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantOption, setTenantOption] = useState<"create" | "join">("create");
  const [tenantName, setTenantName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const data = await authApi.getTenants();
        setTenants(data);
        if (data.length > 0) {
          setTenantId(data[0].id);
        }
      } catch (err) {
        console.warn("Failed to load tenants list");
      }
    };
    fetchTenants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: any = {
      email,
      password,
    };

    if (tenantOption === "create") {
      if (!tenantName.trim()) {
        setError("Please enter a tenant workspace name.");
        setLoading(false);
        return;
      }
      payload.tenant_name = tenantName;
    } else {
      if (!tenantId) {
        setError("Please select an existing tenant workspace to join.");
        setLoading(false);
        return;
      }
      payload.tenant_id = tenantId;
    }

    try {
      await authApi.register(payload);
      router.push("/login?registered=true");
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-8">
      <div className="w-full max-w-lg p-8 rounded-2xl glass-panel relative shadow-2xl overflow-hidden border border-white/5">
        
        {/* Glow accent */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl -z-10" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-violet-600/10 rounded-full blur-2xl -z-10" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 glow-primary mb-4">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Create Account</h2>
          <p className="text-sm text-slate-400 mt-2">Initialize your private tenant and workspace</p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl mb-6 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-sm text-white placeholder-slate-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-sm text-white placeholder-slate-500 transition-all"
              />
            </div>
          </div>

          {/* Tenant Options selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Workspace Tenant Mapping</label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                type="button"
                onClick={() => setTenantOption("create")}
                className={`py-2 px-4 rounded-xl border text-sm font-medium transition-all ${
                  tenantOption === "create"
                    ? "bg-violet-600/20 border-violet-500 text-violet-300"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Workspace
              </button>
              <button
                type="button"
                onClick={() => setTenantOption("join")}
                className={`py-2 px-4 rounded-xl border text-sm font-medium transition-all ${
                  tenantOption === "join"
                    ? "bg-cyan-600/20 border-cyan-500 text-cyan-300"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                Join Workspace
              </button>
            </div>

            {tenantOption === "create" ? (
              <div className="relative">
                <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="e.g. Acme Research Group"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/5 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none text-sm text-white placeholder-slate-500 transition-all"
                />
              </div>
            ) : (
              <div className="relative">
                <Link2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-sm text-white placeholder-slate-500 transition-all appearance-none"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                      {t.name} ({t.id.slice(0, 8)}...)
                    </option>
                  ))}
                  {tenants.length === 0 && (
                    <option disabled className="bg-slate-900 text-slate-500">
                      No workspaces available. Create one!
                    </option>
                  )}
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-95 transition-all shadow-lg hover:scale-[1.01] glow-primary disabled:opacity-50 mt-6"
          >
            <span>{loading ? "Creating account..." : "Register Workspace"}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
