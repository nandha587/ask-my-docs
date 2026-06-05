import axios from "axios";

// Standard Backend URL configuration
export const BACKEND_URL = "http://localhost:8000";
export const API_BASE = `${BACKEND_URL}/api/v1`;

// Create Axios Client
export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT tokens into all outbound HTTP requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth Client Endpoints
export const authApi = {
  login: async (email: string, password: str) => {
    const response = await api.post("/auth/login", { email, password });
    if (response.data.access_token) {
      localStorage.setItem("token", response.data.access_token);
    }
    return response.data;
  },
  register: async (payload: { email: string; password: str; tenant_name?: string; tenant_id?: string }) => {
    const response = await api.post("/auth/register", payload);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
  getTenants: async () => {
    const response = await api.get("/auth/tenants");
    return response.data;
  },
  logout: () => {
    localStorage.removeItem("token");
  },
};

// Document Management Endpoints
export const docsApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  list: async () => {
    const response = await api.get("/documents/");
    return response.data;
  },
  delete: async (docId: string) => {
    const response = await api.delete(`/documents/${docId}`);
    return response.data;
  },
};

// Conversational Chat Endpoints
export const chatApi = {
  createSession: async (title: string = "New Chat") => {
    const response = await api.post("/chat/sessions", { title });
    return response.data;
  },
  listSessions: async () => {
    const response = await api.get("/chat/sessions");
    return response.data;
  },
  listMessages: async (sessionId: string) => {
    const response = await api.get(`/chat/sessions/${sessionId}/messages`);
    return response.data;
  },
};

// SSE Chat Orchestration Generator
export interface RAGEvent {
  type: "token" | "citations" | "error";
  content?: string;
  citations?: any[];
}

export async function* streamRAGAnswer(sessionId: string, query: string): AsyncGenerator<RAGEvent, void, unknown> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found. Please log in.");
  }

  const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ content: query }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to start streaming query.");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No readable response body stream from server.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Leave the last partial line in the buffer
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("data: ")) {
        const dataStr = trimmed.slice(6).trim();
        if (dataStr === "[DONE]") {
          return;
        }

        try {
          const parsed: RAGEvent = JSON.parse(dataStr);
          yield parsed;
        } catch (e) {
          console.warn("Failed to parse SSE JSON payload:", dataStr, e);
        }
      }
    }
  }
}

// Admin Panel Diagnostic Endpoints
export const adminApi = {
  getStats: async () => {
    const response = await api.get("/admin/stats");
    return response.data;
  },
  getTenants: async () => {
    const response = await api.get("/admin/tenants");
    return response.data;
  },
};
