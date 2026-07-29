"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  User,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  X,
  MessageSquare,
  Plus,
  BookmarkPlus,
  Trash2,
} from "lucide-react";
import { useModules } from "@/hooks/useModules";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  id?: string;
  role: "user" | "model";
  content: string;
  suggestions?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
}

export default function ClinIAWidget() {
  const { isPro, currentUser } = useModules();

  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showSessions, setShowSessions] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState<number | null>(null);
  const [noteToSave, setNoteToSave] = useState<{
    index: number;
    content: string;
  } | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDesc, setNoteDesc] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === "ADMIN";

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Load sessions when opened
  useEffect(() => {
    if (isOpen && isAdmin && isPro) {
      loadSessions();
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => {
          if (!data.geminiApiKey || data.geminiApiKey.trim() === "") {
            setHasGeminiKey(false);
          } else {
            setHasGeminiKey(true);
          }
        })
        .catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadSessions = async () => {
    try {
      const res = await fetch("/api/chat-sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSessionChat = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/chat-sessions?sessionId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          data.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            suggestions: m.suggestions ? JSON.parse(m.suggestions) : undefined,
          })),
        );
        setCurrentSessionId(id);
        setShowSessions(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowSessions(false);
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (
      !confirm("¿Seguro que deseas eliminar esta conversación del historial?")
    )
      return;
    try {
      const res = await fetch(`/api/chat-sessions?sessionId=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (currentSessionId === id) {
          createNewChat();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = (customMsg || input).trim();
    if (!userMsg || isLoading) return;

    setInput("");
    const newMessages = [
      ...messages,
      { role: "user" as const, content: userMsg },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/agente-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          sessionId: currentSessionId,
          userId: currentUser?.id,
        }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(
            "Acceso denegado: Se requiere rol de Administrador para usar ClinIA.",
          );
        }
        const errorData = await res.json();
        throw new Error(
          errorData.detalles
            ? `${errorData.error} Detalle: ${errorData.detalles}`
            : errorData.error || "Error al comunicarse con el Agente",
        );
      }

      const data = await res.json();
      setMessages([
        ...newMessages,
        { role: "model", content: data.reply, suggestions: data.suggestions },
      ]);
      if (!currentSessionId && data.sessionId) {
        setCurrentSessionId(data.sessionId);
        loadSessions(); // refresh list
      }
    } catch (err: any) {
      console.error(err);
      setMessages([
        ...newMessages,
        { role: "model", content: `**Error:** ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNote = async () => {
    if (!noteTitle.trim() || !noteToSave) return;

    setIsSavingNote(noteToSave.index);
    try {
      const res = await fetch("/api/saved-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle,
          description: noteDesc,
          content: noteToSave.content,
        }),
      });
      if (res.ok) {
        setNoteToSave(null);
        setNoteTitle("");
        setNoteDesc("");
      } else {
        alert("Error al guardar la nota");
      }
    } catch (e) {
      console.error(e);
      alert("Error al guardar la nota");
    } finally {
      setIsSavingNote(null);
    }
  };

  if (!isAdmin || !isPro) return null;

  return (
    <>
      {/* Botón Flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 z-50 group"
          title="Abrir ClinIA"
        >
          <Bot size={28} />
          {/* Notification dot (optional) */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      )}

      {/* Widget Abierto */}
      {isOpen && (
        <div
          className={`fixed bottom-0 right-0 z-50 flex flex-col bg-white overflow-hidden border border-border shadow-2xl transition-all duration-300 ease-in-out ${isMaximized ? "w-full h-full rounded-none" : "w-[600px] h-[600px] rounded-tl-2xl max-w-full"}`}
        >
          {/* Header */}
          <div className="bg-blue-600 p-3 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <button
                className="bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 text-xs font-medium transition-colors"
                onClick={() => setShowSessions(!showSessions)}
                title="Historial de chats"
              >
                <MessageSquare size={16} />
                <span>Historial</span>
              </button>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-sm leading-tight">ClinIA</h2>
                  <span className="text-[8px] font-extrabold uppercase bg-white/20 text-white px-1.5 py-0.5 rounded shadow-xs">
                    Experimental
                  </span>
                </div>
                <p className="text-blue-100 text-[10px]">Asistente IA</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-2 hover:bg-white/10 rounded-md transition-colors"
              >
                {isMaximized ? (
                  <Minimize2 size={16} />
                ) : (
                  <Maximize2 size={16} />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative flex">
            {/* Panel de Sesiones */}
            {showSessions && (
              <div className="absolute inset-0 bg-white z-10 flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Tus Chats</h3>
                  <button
                    onClick={createNewChat}
                    className="flex items-center gap-1 text-xs bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    <Plus size={14} /> Nuevo
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-center text-foreground-muted mt-4">
                      No hay chats previos.
                    </p>
                  ) : (
                    sessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => loadSessionChat(s.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-colors cursor-pointer group ${s.id === currentSessionId ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-muted text-foreground"}`}
                      >
                        <div className="overflow-hidden pr-2">
                          <div className="truncate">{s.title}</div>
                          <div className="text-xs text-foreground-muted mt-0.5">
                            {new Date(s.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={(e) => deleteSession(e, s.id)}
                          className="p-1.5 text-foreground-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-80 group-hover:opacity-100"
                          title="Eliminar conversación"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Chat Area */}
            {!hasGeminiKey ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-muted/20">
                <AlertCircle size={48} className="text-amber-500" />
                <h3 className="text-lg font-medium text-foreground">
                  API Key no configurada
                </h3>
                <p className="text-sm text-foreground-muted">
                  Para utilizar ClinIA, necesitas configurar tu API Key de
                  Gemini en la sección de Configuración.
                </p>
                <a
                  href="/configuracion"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Ir a Configuración
                </a>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-70 px-4">
                      <Bot size={48} className="text-blue-500" />
                      <h3 className="text-lg font-medium text-foreground">
                        ¡Hola! Soy ClinIA.
                      </h3>
                      <p className="text-xs text-foreground-muted">
                        Puedo consultar tu base de datos. Preguntame por ventas
                        de hoy o productos con poco stock.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <React.Fragment key={index}>
                        <div
                          className={`flex gap-2 max-w-[90%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                        >
                          <div
                            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"}`}
                          >
                            {msg.role === "user" ? (
                              <User size={14} />
                            ) : (
                              <Bot size={14} />
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div
                              className={`px-3 py-2.5 rounded-2xl ${msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-card border border-border shadow-sm rounded-tl-none text-foreground"}`}
                            >
                              {msg.role === "user" ? (
                                <p className="text-sm whitespace-pre-wrap">
                                  {msg.content}
                                </p>
                              ) : (
                                <div
                                  className="prose prose-sm dark:prose-invert max-w-none 
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
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                            {msg.role === "model" && (
                              <div className="flex justify-start mt-1">
                                <button
                                  onClick={() => {
                                    setNoteToSave({
                                      index,
                                      content: msg.content,
                                    });
                                    setNoteTitle(
                                      messages.length === 2
                                        ? messages[0].content.substring(0, 40) +
                                            "..."
                                        : "Nota de ClinIA",
                                    );
                                  }}
                                  disabled={isSavingNote === index}
                                  className="flex items-center gap-1.5 text-xs font-medium bg-background border border-border px-3 py-1.5 rounded-lg text-foreground hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm"
                                  title="Guardar como Nota"
                                >
                                  {isSavingNote === index ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin text-blue-600"
                                    />
                                  ) : (
                                    <BookmarkPlus
                                      size={14}
                                      className="text-blue-500"
                                    />
                                  )}
                                  Guardar resultado
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Sugerencias */}
                        {msg.role === "model" &&
                          msg.suggestions &&
                          msg.suggestions.length > 0 &&
                          index === messages.length - 1 && (
                            <div className="flex flex-wrap gap-1.5 mt-1 ml-9">
                              {msg.suggestions.map((suggestion, i) => (
                                <button
                                  key={i}
                                  onClick={() =>
                                    sendMessage(undefined, suggestion)
                                  }
                                  className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                      </React.Fragment>
                    ))
                  )}

                  {isLoading && (
                    <div className="flex gap-2 max-w-[85%] mr-auto">
                      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                        <Bot size={14} />
                      </div>
                      <div className="px-4 py-3 rounded-2xl bg-card border border-border shadow-sm rounded-tl-none flex items-center gap-2 text-foreground-muted">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs font-medium animate-pulse">
                          Pensando...
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-card border-t border-border shrink-0">
                  <form
                    onSubmit={sendMessage}
                    className="relative flex items-center"
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Preguntale a ClinIA..."
                      className="w-full pl-4 pr-12 py-3 rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Send size={16} className="ml-0.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Modal Guardar Nota */}
          {noteToSave && (
            <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <BookmarkPlus size={18} className="text-blue-500" />
                    Guardar Nota
                  </h3>
                  <button
                    onClick={() => setNoteToSave(null)}
                    className="text-foreground-muted hover:text-foreground"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Título
                    </label>
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                      placeholder="Ej. Mejores clientes 2026"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Descripción (Opcional)
                    </label>
                    <textarea
                      value={noteDesc}
                      onChange={(e) => setNoteDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-blue-500/50 outline-none resize-none h-20"
                      placeholder="Detalles adicionales..."
                    />
                  </div>
                </div>
                <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-2">
                  <button
                    onClick={() => setNoteToSave(null)}
                    className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveNote}
                    disabled={!noteTitle.trim() || isSavingNote !== null}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingNote !== null && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
