"use client";

import React, { useState, useEffect } from "react";
import { Bookmark, Search, Trash2, Download, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SavedNote {
  id: string;
  title: string;
  description: string | null;
  content: string;
  createdAt: string;
}

export default function NotasIAPage() {
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/saved-notes");
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm("¿Seguro que querés eliminar esta nota?")) return;
    try {
      const res = await fetch(`/api/saved-notes?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotes(notes.filter((n) => n.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const exportNote = (note: SavedNote) => {
    const text = `# ${note.title}\n\n${note.description ? `> ${note.description}\n\n` : ""}${note.content}`;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ClinIA_${note.title.replace(/\s+/g, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.description &&
        n.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bookmark className="text-blue-600" />
            Notas Guardadas (ClinIA)
          </h1>
          <p className="text-foreground-muted text-sm mt-1">
            Resultados e insights extraídos por tu Asistente Copilot
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
          />
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <Bookmark
            size={48}
            className="text-foreground-muted mb-4 opacity-50"
          />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No hay notas guardadas
          </h3>
          <p className="text-foreground-muted text-sm max-w-sm">
            Podés guardar notas haciendo clic en el botón "Guardar" debajo de
            las respuestas del asistente ClinIA.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-white border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-[350px]"
            >
              <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-start shrink-0">
                <div>
                  <h3 className="font-semibold text-foreground truncate">
                    {note.title}
                  </h3>
                  <p className="text-xs text-foreground-muted mt-1">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => exportNote(note)}
                    className="p-1.5 text-foreground-muted hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Exportar"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 text-foreground-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {note.description && (
                <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border-b border-border shrink-0 text-sm text-foreground-muted">
                  {note.description}
                </div>
              )}

              <div
                className="p-4 overflow-y-auto flex-1 prose prose-sm dark:prose-invert max-w-none 
                                prose-p:leading-relaxed prose-p:mb-3 
                                prose-headings:text-blue-600 prose-headings:font-bold prose-headings:mb-3 prose-headings:mt-4 
                                prose-table:w-full prose-table:border-collapse prose-table:my-4 prose-table:border prose-table:border-border 
                                prose-th:bg-blue-50 dark:prose-th:bg-blue-900/30 prose-th:text-blue-700 dark:prose-th:text-blue-300 prose-th:font-semibold prose-th:p-3 prose-th:text-left
                                prose-td:p-3 prose-td:border-t prose-td:border-border 
                                prose-tr:hover:bg-muted/50 transition-colors
                                prose-strong:text-foreground prose-strong:font-semibold
                                prose-li:my-1 text-sm"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
