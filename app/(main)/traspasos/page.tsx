// app/(main)/traspasos/page.tsx
import { TransfersModule } from "@/components/traspasos/TransfersModule";

export default function TraspasosPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Traspasos de Stock
          </h1>
          <p className="mt-1 text-foreground-muted">
            Envía stock a otros locales y aceptá o rechazá los envíos que
            recibís para controlar la recepción.
          </p>
        </div>
      </div>

      <TransfersModule />
    </>
  );
}
