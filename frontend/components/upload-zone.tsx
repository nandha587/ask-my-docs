"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { docsApi } from "@/lib/api";
import { UploadCloud, CheckCircle, File, AlertCircle, RefreshCw } from "lucide-react";

export default function UploadZone() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const allowed = [".pdf", ".docx", ".txt", ".md", ".markdown"];
    
    if (!allowed.includes(ext)) {
      setError("Unsupported format. Please upload PDF, DOCX, TXT, or Markdown files.");
      return;
    }

    setFileName(file.name);
    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      await docsApi.upload(file);
      setSuccess(true);
      // Automatically redirect to dashboard after a delay so they see success state
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Upload failed. Verify document contents or try again later."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[300px] ${
          isDragActive
            ? "border-cyan-400 bg-cyan-500/5 glow-secondary"
            : "border-white/10 hover:border-white/20 bg-white/5/2"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.docx,.txt,.md,.markdown"
        />

        {uploading ? (
          <div className="space-y-4">
            <div className="p-4 bg-cyan-500/10 text-cyan-400 rounded-full animate-bounce w-fit mx-auto">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Uploading & Vectorizing</h3>
            <p className="text-sm text-cyan-300 font-mono flex items-center justify-center space-x-1.5 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Parsing: {fileName}</span>
            </p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              FastAPI is chunking the document and generating 768-D vectors. Chunks are also indexed into Elasticsearch.
            </p>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full w-fit mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Upload Successful!</h3>
            <p className="text-sm text-emerald-300 font-mono">Redirecting to dashboard...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-white/5 text-slate-400 rounded-full w-fit mx-auto transition-transform hover:scale-105">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Select a document to index</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                Drag and drop your file here, or click to browse. Supports PDF, DOCX, TXT, or Markdown.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs font-mono text-slate-500">
              <File className="w-4 h-4" />
              <span>Max size: 50MB</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl mt-6 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
