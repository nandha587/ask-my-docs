"use client";

import { useEffect, useState, useRef } from "react";
import { chatApi, streamRAGAnswer } from "@/lib/api";
import { Send, Sparkles, RefreshCw, AlertCircle, Bot, User } from "lucide-react";

interface Citation {
  chunk_id: string;
  document_id: string;
  filename: string;
  page?: number;
  content: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  created_at?: string;
}

interface ChatBoxProps {
  sessionId: string | null;
  onSelectCitation: (citation: Citation) => void;
}

export default function ChatBox({ sessionId, onSelectCitation }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat session messages on startup or session select
  const loadMessages = async () => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    setError(null);
    try {
      const msgs = await chatApi.listMessages(sessionId);
      setMessages(msgs);
    } catch (err) {
      setError("Failed to load message history.");
    }
  };

  useEffect(() => {
    loadMessages();
  }, [sessionId]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || streaming) return;

    const query = input;
    setInput("");
    setError(null);
    setStreaming(true);

    // 1. Append User Message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
    };
    
    // 2. Insert User Msg & Empty placeholder for Assistant Msg
    const tempAssistantId = `assistant-${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: tempAssistantId,
      role: "assistant",
      content: "",
      citations: [],
    };
    
    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);

    try {
      // 3. Initiate SSE Generator loop
      const stream = streamRAGAnswer(sessionId, query);
      
      for await (const event of stream) {
        if (event.type === "token" && event.content) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantId
                ? { ...msg, content: msg.content + event.content }
                : msg
            )
          );
        } else if (event.type === "citations" && event.citations) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantId
                ? { ...msg, citations: event.citations }
                : msg
            )
          );
        } else if (event.type === "error") {
          setError(event.content || "An error occurred during inference.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to communicate with RAG orchestrator.");
      // Clean up final message if failed completely
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
      // Reload final state from backend database to ensure IDs are synchronized
      loadMessages();
    }
  };

  const renderMessageContent = (content: string, citations?: Citation[]) => {
    if (!content) return <span className="inline-block w-2.5 h-4 bg-cyan-400 animate-pulse" />;
    
    // Regex splits text into plain texts and [numbers]
    const parts = content.split(/(\[\d+\])/g);
    
    return parts.map((part, index) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const citeIndex = parseInt(match[1]) - 1;
        const citation = citations?.[citeIndex];
        
        if (citation) {
          return (
            <button
              key={index}
              onClick={() => onSelectCitation(citation)}
              className="align-super mx-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/35 border border-cyan-500/10 transition-all font-mono cursor-pointer"
              title={citation.filename}
            >
              {match[1]}
            </button>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (!sessionId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-dot-grid">
        <div className="p-4 bg-white/5 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No conversation selected</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Select an active chat session from the sidebar or click Create Chat to initialize a new conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/20 rounded-2xl border border-white/5 overflow-hidden">
      {/* Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3.5 max-w-3xl ${
              msg.role === "user" ? "ml-auto flex-row-reverse space-x-reverse" : "mr-auto"
            }`}
          >
            {/* Avatar */}
            <div
              className={`p-2 rounded-xl shrink-0 ${
                msg.role === "user"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Message bubble */}
            <div
              className={`p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-cyan-600/10 border border-cyan-500/20 text-white rounded-tr-none"
                  : "bg-white/5 border border-white/5 text-slate-200 rounded-tl-none"
              }`}
            >
              <div className="whitespace-pre-wrap">
                {msg.role === "user"
                  ? msg.content
                  : renderMessageContent(msg.content, msg.citations)}
              </div>

              {/* Citations list footer */}
              {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase mr-1 mt-1">Sources:</span>
                  {msg.citations.map((cite, cIdx) => (
                    <button
                      key={cite.chunk_id}
                      onClick={() => onSelectCitation(cite)}
                      className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center space-x-1 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10"
                    >
                      <span>[{cIdx + 1}]</span>
                      <span className="truncate max-w-[100px]">{cite.filename}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-sm max-w-lg mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-white/5 bg-slate-950/40">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <input
            type="text"
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
            placeholder={streaming ? "Assistant is thinking..." : "Pose a question to your index..."}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-sm text-white placeholder-slate-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="p-3 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 text-white hover:opacity-95 transition-all shadow-md disabled:opacity-50 disabled:scale-100 hover:scale-105 shrink-0 glow-primary"
          >
            {streaming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
