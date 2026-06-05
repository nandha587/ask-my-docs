"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { docsApi, authApi } from "@/lib/api";
import DocumentList from "@/components/document-list";
import Link from "next/link";
import { FileText, Database, Layers, ArrowRight, UploadCloud, MessageSquare, ShieldCheck } from "lucide-react";

interface DocItem {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  created_at: string;
  chunk_count: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState("");

  const fetchDashboardData = async () => {
    try {
      const docs = await docsApi.list();
      setDocuments(docs);
      
      const me = await authApi.getMe();
      // Fetch tenant name (optional endpoint call or matching query)
      const tenants = await authApi.getTenants();
      const tenant = tenants.find((t: any) => t.id === me.tenant_id);
      if (tenant) {
        setTenantName(tenant.name);
      }
    } catch (err) {
      console.error("Auth expired or failed to load workspace data:", err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Set up an automatic poll interval to refresh indexing files
  useEffect(() => {
    const isIndexing = documents.some((doc) => doc.status === "processing");
    if (!isIndexing) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 4000); // Poll every 4 seconds

    return () => clearInterval(interval);
  }, [documents]);

  const totalChunks = documents.reduce((sum, doc) => sum + doc.chunk_count, 0);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-mono">Loading private workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-10">
      {/* Workspace Summary Panel */}
      <div className="p-8 rounded-2xl glass-panel relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-[300px] h-[100px] bg-gradient-to-l from-cyan-500/10 to-transparent blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">Multi-Tenant Scoped</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {tenantName || "Private Workspace"}
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Review ingestion pipelines, vectorized index logs, and launch semantic searches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/upload"
              className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </Link>
            <Link
              href="/chat"
              className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-95 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md glow-primary"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask Docs</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Numerical Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl glass-panel relative overflow-hidden">
          <div className="absolute top-4 right-4 p-2 bg-rose-500/10 rounded-lg text-rose-400">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-xs font-mono text-slate-400 font-bold uppercase">Total Files</p>
          <p className="text-3xl font-extrabold text-white mt-2">{documents.length}</p>
          <div className="text-xs text-rose-300 mt-2 font-mono">
            {documents.filter((d) => d.status === "ready").length} fully indexed
          </div>
        </div>

        <div className="p-6 rounded-xl glass-panel relative overflow-hidden">
          <div className="absolute top-4 right-4 p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <p className="text-xs font-mono text-slate-400 font-bold uppercase">Vectorized Chunks</p>
          <p className="text-3xl font-extrabold text-white mt-2">{totalChunks}</p>
          <div className="text-xs text-cyan-300 mt-2 font-mono">
            Standard 768-D dense embeddings
          </div>
        </div>

        <div className="p-6 rounded-xl glass-panel relative overflow-hidden">
          <div className="absolute top-4 right-4 p-2 bg-violet-500/10 rounded-lg text-violet-400">
            <Database className="w-5 h-5" />
          </div>
          <p className="text-xs font-mono text-slate-400 font-bold uppercase">Search Coverage</p>
          <p className="text-3xl font-extrabold text-white mt-2">Hybrid</p>
          <div className="text-xs text-violet-300 mt-2 font-mono">
            pgvector (Dense) + BM25 (Sparse)
          </div>
        </div>
      </div>

      {/* Document Listing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Ingested Files</h2>
          <button
            onClick={fetchDashboardData}
            className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            [Force Refresh]
          </button>
        </div>
        <DocumentList documents={documents} onRefresh={fetchDashboardData} />
      </div>
    </div>
  );
}
