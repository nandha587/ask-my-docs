"use client";

import UploadZone from "@/components/upload-zone";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function UploadPage() {
  return (
    <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full py-8">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-1 text-sm text-slate-400 hover:text-white font-medium transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Ingest Documents</h1>
        <p className="text-sm text-slate-400 mt-2">
          Upload proprietary research, internal policies, or books. Files are chunked and vectorized locally.
        </p>
      </div>

      <div className="p-8 rounded-2xl border border-white/5 glass-panel relative">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[200px] h-[100px] bg-gradient-to-l from-violet-600/5 to-transparent blur-3xl" />
        <UploadZone />
      </div>
    </div>
  );
}
