"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { KeyRound, Mail, ArrowRight, BookOpen, AlertCircle } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authApi.login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Authentication failed. Please verify your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel relative shadow-2xl overflow-hidden border border-white/5">
        
        {/* Glow accent */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl -z-10" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-violet-600/10 rounded-full blur-2xl -z-10" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 glow-primary mb-4">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Welcome Back</h2>
          <p className="text-sm text-slate-400 mt-2">Sign in to your private RAG workspace</p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl mb-6 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-sm text-white placeholder-slate-500 transition-all"
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
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-sm text-white placeholder-slate-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-95 transition-all shadow-lg hover:scale-[1.01] glow-primary disabled:opacity-50"
          >
            <span>{loading ? "Signing in..." : "Login"}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
            Register Tenant Workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
