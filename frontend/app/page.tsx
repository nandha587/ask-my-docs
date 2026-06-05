import Link from "next/link";
import { BookOpen, Search, ArrowRight, ShieldCheck, Database, Zap, Cpu } from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center text-center py-12 md:py-24">
      {/* Glow Graphic background element */}
      <div className="absolute top-[20%] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-[40%] w-[350px] h-[350px] bg-violet-600/10 rounded-full blur-[100px] -z-10" />

      {/* Hero Badge */}
      <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/5 rounded-full px-4 py-1.5 mb-6 hover:bg-white/10 transition-all cursor-pointer">
        <span className="text-xs font-mono text-cyan-400 font-bold">V1.0 Production Ready</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
      </div>

      {/* Hero Header */}
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl">
        Private Document Intelligence
        <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-violet-500 glow-text-primary">
          Hosted Completely Locally
        </span>
      </h1>

      {/* Hero Subtitle */}
      <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
        Ask My Docs gives teams citation-enforced RAG answers using locally served models. 
        Zero cloud leaks, robust PostgreSQL + pgvector semantic searches, and Elasticsearch BM25 retrieval.
      </p>

      {/* Call to Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 w-full">
        <Link
          href="/dashboard"
          className="flex items-center justify-center space-x-2 w-full sm:w-auto text-base font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 hover:scale-[1.02] text-white px-8 py-3.5 rounded-xl transition-all shadow-lg glow-primary"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/register"
          className="flex items-center justify-center w-full sm:w-auto text-base font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white px-8 py-3.5 rounded-xl transition-all"
        >
          Create Tenant Workspace
        </Link>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl text-left">
        <div className="p-6 rounded-2xl glass-panel glass-panel-hover">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl w-fit mb-4">
            <Search className="w-6 h-6 text-cyan-400" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-white">Hybrid Retrieval Fusion</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Combines Elasticsearch BM25 keywords and pgvector semantic matches using Reciprocal Rank Fusion (RRF).
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel glass-panel-hover">
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl w-fit mb-4">
            <ShieldCheck className="w-6 h-6 text-violet-400" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-white">Citation-Enforced Answers</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Answers are backed by precise document page numbers and character bounding logs. Strict hallucination filters.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel glass-panel-hover">
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl w-fit mb-4">
            <Cpu className="w-6 h-6 text-teal-400" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-white">100% Local Inference</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Integrated with local Ollama endpoints (Llama3, Nomic-Embed) and CrossEncoder rerankers to keep data air-gapped.
          </p>
        </div>
      </div>
    </div>
  );
}
