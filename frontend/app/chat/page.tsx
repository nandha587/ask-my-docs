"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chatApi } from "@/lib/api";
import ChatBox from "@/components/chat-box";
import CitationViewer from "@/components/citation-viewer";
import { MessageSquare, Plus, MessagesSquare, Calendar, ChevronRight } from "lucide-react";

interface SessionItem {
  id: string;
  title: string;
  created_at: string;
}

interface Citation {
  chunk_id: string;
  document_id: string;
  filename: string;
  page?: number;
  content: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSessions = async (selectLatest = false) => {
    try {
      const data = await chatApi.listSessions();
      setSessions(data);
      if (selectLatest && data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error("Auth expired or failed to load chat sessions:", err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions(true);
  }, []);

  const handleCreateSession = async () => {
    try {
      const newSess = await chatApi.createSession(`Chat Session ${sessions.length + 1}`);
      setSessions((prev) => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      setSelectedCitation(null);
    } catch (err) {
      alert("Failed to create new chat session.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-mono">Loading private workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)] min-h-0 relative">
      
      {/* Session Sidebar */}
      <div className="w-full md:w-64 flex flex-col shrink-0 rounded-2xl border border-white/5 glass-panel p-4 bg-slate-950/20">
        <button
          onClick={handleCreateSession}
          className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        <div className="h-[1px] bg-white/5 my-4 shrink-0" />

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessagesSquare className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-xs">No active chats</p>
            </div>
          ) : (
            sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => {
                  setActiveSessionId(sess.id);
                  setSelectedCitation(null);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm transition-all group ${
                  activeSessionId === sess.id
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold truncate">{sess.title}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {new Date(sess.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* RAG Chat container */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <ChatBox
          sessionId={activeSessionId}
          onSelectCitation={(cite) => setSelectedCitation(cite)}
        />
        <CitationViewer
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      </div>

    </div>
  );
}
