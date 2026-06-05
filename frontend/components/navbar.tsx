"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi } from "@/lib/api";
import { BookOpen, LogOut, LayoutDashboard, MessageSquare, UploadCloud, ShieldAlert } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email: string; is_admin: boolean } | null>(null);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const userData = await authApi.getMe();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
      localStorage.removeItem("token");
    }
  };

  useEffect(() => {
    checkAuth();
  }, [pathname]); // Refresh on page changes

  const handleLogout = () => {
    authApi.logout();
    setUser(null);
    router.push("/login");
  };

  const isActive = (path: str) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 glass-panel px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Link href="/" className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-600 glow-primary">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-cyan-400">
            Ask My Docs
          </span>
        </Link>
      </div>

      <div className="flex items-center space-x-6">
        {user ? (
          <>
            <Link
              href="/dashboard"
              className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                isActive("/dashboard") ? "text-cyan-400 font-semibold glow-text-secondary" : "text-slate-300 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/upload"
              className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                isActive("/upload") ? "text-cyan-400 font-semibold glow-text-secondary" : "text-slate-300 hover:text-white"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload</span>
            </Link>

            <Link
              href="/chat"
              className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                isActive("/chat") ? "text-cyan-400 font-semibold glow-text-secondary" : "text-slate-300 hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask Docs</span>
            </Link>

            {user.is_admin && (
              <Link
                href="/admin"
                className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                  isActive("/admin") ? "text-violet-400 font-semibold glow-text-primary" : "text-slate-300 hover:text-violet-300"
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-violet-400" />
                <span>Admin Panel</span>
              </Link>
            )}

            <div className="h-4 w-[1px] bg-white/10" />

            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 bg-white/5 border border-white/5 rounded-full px-3 py-1 font-mono">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-sm text-slate-300 hover:text-white font-medium transition-colors">
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-95 text-white px-4 py-2 rounded-lg transition-all shadow-md glow-primary"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
