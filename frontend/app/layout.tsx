import "@/app/globals.css";
import Navbar from "@/components/navbar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask My Docs - Enterprise-Grade Multi-Tenant Local RAG",
  description: "Secure, local retrieval-augmented generation app. Ask questions against your PDF, DOCX, Markdown and TXT files locally.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-foreground bg-dot-grid">
        <Navbar />
        <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
