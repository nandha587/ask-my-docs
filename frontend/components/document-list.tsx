"use client";

import { docsApi } from "@/lib/api";
import { FileText, Trash2, FileCode, CheckCircle, RefreshCw, AlertTriangle, File } from "lucide-react";
import { useState } from "react";

interface DocItem {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  created_at: string;
  chunk_count: number;
}

interface DocumentListProps {
  documents: DocItem[];
  onRefresh: () => void;
}

export default function DocumentList({ documents, onRefresh }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document? All vector embeddings and BM25 index indexes will be purged.")) {
      return;
    }
    
    setDeletingId(docId);
    try {
      await docsApi.delete(docId);
      onRefresh();
    } catch (err) {
      alert("Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const getIcon = (ext: string) => {
    switch (ext) {
      case "pdf":
        return <FileText className="w-5 h-5 text-rose-400" />;
      case "docx":
        return <File className="w-5 h-5 text-blue-400" />;
      case "md":
      case "markdown":
        return <FileCode className="w-5 h-5 text-emerald-400" />;
      default:
        return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            <span>Ready</span>
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Indexing</span>
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>Error</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {documents.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/5 bg-white/5/2 flex flex-col items-center justify-center p-6">
          <div className="p-4 bg-white/5 rounded-full mb-4">
            <FileText className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No documents found</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            Go to the Upload page to ingest your first PDF, DOCX, TXT, or Markdown document.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5 glass-panel">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">File Name</th>
                <th className="px-6 py-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Type</th>
                <th className="px-6 py-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 text-center">Chunks</th>
                <th className="px-6 py-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Uploaded At</th>
                <th className="px-6 py-4 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 flex items-center space-x-3">
                    {getIcon(doc.file_type)}
                    <span className="text-sm font-semibold text-white truncate max-w-xs" title={doc.filename}>
                      {doc.filename}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400 uppercase">{doc.file_type}</td>
                  <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">
                    {doc.chunk_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all disabled:opacity-50"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
