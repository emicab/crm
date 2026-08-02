"use client";

import React, { useState } from "react";
import { CheckCircle2, Image as ImageIcon, Link2, Loader2, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

interface ConfigCloudinaryTabProps {
  form: Record<string, string>;
  handleChange: (key: string, value: string) => void;
  handleSave: () => void;
  isSaving: boolean;
}

const TEST_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export default function ConfigCloudinaryTab({
  form,
  handleChange,
  handleSave,
  isSaving,
}: ConfigCloudinaryTabProps) {
  const [testing, setTesting] = useState(false);

  const isConfigured = Boolean(form.cloudinaryCloudName && form.cloudinaryApiKey && form.cloudinaryApiSecret);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/upload/cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: TEST_IMAGE }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        toast.success("Conexión exitosa: Cloudinary acepta subidas.", { duration: 5000 });
      } else {
        toast.error(`Error: ${data.message || "No se pudo conectar."}`, { duration: 6000 });
      }
    } catch {
      toast.error("No se pudo conectar con Cloudinary.", { duration: 6000 });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-muted p-6 rounded-xl border border-border space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon size={20} className="text-primary" />
          <h2 className="text-lg font-bold text-foreground">Imágenes en la Nube (Cloudinary)</h2>
          {isConfigured && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 size={12} /> Configurado
            </span>
          )}
        </div>
        <p className="text-xs text-foreground-muted">
          Las imágenes de productos y combos se optimizan a <strong>.webp</strong> y se suben a Cloudinary para verse en tu tienda ClinStore. Las credenciales se guardan cifradas en esta PC (no viajan en el instalador ni se suben a la nube).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <Input
            label="Cloud Name"
            name="cloudinaryCloudName"
            value={form.cloudinaryCloudName || ""}
            onChange={(e) => handleChange("cloudinaryCloudName", e.target.value)}
            placeholder="ej. dgjguph1m"
          />
          <div className="hidden md:block" />
          <Input
            label="API Key"
            name="cloudinaryApiKey"
            type="password"
            value={form.cloudinaryApiKey || ""}
            onChange={(e) => handleChange("cloudinaryApiKey", e.target.value)}
            placeholder="Tu API Key de Cloudinary"
          />
          <Input
            label="API Secret"
            name="cloudinaryApiSecret"
            type="password"
            value={form.cloudinaryApiSecret || ""}
            onChange={(e) => handleChange("cloudinaryApiSecret", e.target.value)}
            placeholder="Tu API Secret de Cloudinary"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span className="text-xs text-foreground-muted">
            Se cifran con AES-256 y se protegen con el keychain del sistema operativo.
          </span>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={handleTest} disabled={testing || !isConfigured}>
          {testing ? <Loader2 className="animate-spin mr-2" size={16} /> : <UploadCloud size={16} className="mr-2" />}
          {testing ? "Probando..." : "Probar Conexión"}
        </Button>
        <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : <RefreshCw size={16} className="mr-2" />}
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <div className="flex items-start gap-2 bg-background border border-border rounded-xl p-4 text-xs text-foreground-muted">
        <Link2 size={16} className="text-primary shrink-0 mt-0.5" />
        <span>
          Para obtener estas credenciales: <strong>cloudinary.com</strong> → tu environment (Cloud name) → <strong>Settings → API Keys</strong>. La clave debe tener permiso de <strong>upload</strong>.
        </span>
      </div>
    </div>
  );
}
