"use client";

import { X, FileText, Calendar, Layers, AlertCircle } from "lucide-react";

interface Citation {
  chunk_id: string;
  document_id: string;
  filename: string;
  page?: number;
  content: string;
}

interface CitationViewerProps {
  citation: Citation | null;
  onClose: () => void;
}

export default function CitationViewer({ citation, onClose }: CitationViewerProps) {
  if (!citation) return null;

  return (
    <div className="w-full md:w-80 border-l border-white/5 bg-slate-950/80 backdrop-blur-xl h-full flex flex-col relative shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center space-x-2 text-white">
          <FileText className="w-4.5 h-4.5 text-cyan-400" />
          <h3 className="font-bold text-sm tracking-wide">Citation Source</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Source Document</label>
          <div className="mt-1.5 p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start space-x-3">
            <FileText className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate" title={citation.filename}>
                {citation.filename}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-1">
                ID: {citation.document_id.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        {citation.page !== undefined && citation.page !== null && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">Page</label>
              <span className="text-lg font-extrabold text-white mt-1 block">
                {citation.page}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">Embed Dimensions</label>
              <span className="text-xs font-mono font-bold text-slate-300 mt-1.5 block">
                768 (Cosine)
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Source Text Segment</label>
          <div className="mt-1.5 p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-slate-300 leading-relaxed font-sans max-h-80 overflow-y-auto whitespace-pre-wrap">
            &ldquo;{citation.content}&rdquo;
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-violet-600/5 border border-violet-500/10 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            This chunk was isolated using recursive split boundaries and ranked relevant by the Cross-Encoder.
          </p>
        </div>
      </div>
    </div>
  );
}
