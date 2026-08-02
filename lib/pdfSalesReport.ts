// lib/pdfSalesReport.ts
import { formatCurrency } from "./formatCurrency";
import { formatDate } from "./formatDate";

export interface PdfSaleRowInput {
  id: number;
  saleDate: string | Date;
  clientName: string;
  sellerName: string;
  paymentTypeDisplay: string;
  itemCount: number;
  totalAmount: number;
}

export interface SalesPdfOptions {
  sales: PdfSaleRowInput[];
  rangeLabel: string;
  businessName?: string;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 15;
const MARGIN_TOP = 15;
const MARGIN_BOTTOM = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const ROW_HEIGHT = 6;
const HEADER_HEIGHT = 7;

type ColumnAlign = "left" | "center" | "right";

const COLUMNS: { header: string; width: number; align: ColumnAlign }[] = [
  { header: "#", width: 10, align: "left" },
  { header: "Fecha", width: 32, align: "left" },
  { header: "Cliente", width: 44, align: "left" },
  { header: "Vendedor", width: 28, align: "left" },
  { header: "Pago", width: 26, align: "left" },
  { header: "Ítems", width: 10, align: "center" },
  { header: "Total", width: 30, align: "right" },
];

/**
 * Genera un reporte de ventas en PDF (A4) usando jsPDF nativo:
 * texto real, seleccionable y con paginación profesional.
 * Devuelve los bytes del documento listos para guardar/descargar.
 */
export async function generateSalesPdf(options: SalesPdfOptions): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const sales = options.sales;
  const businessName = options.businessName?.trim() || "ClinPOS";

  const totalAmount = sales.reduce((sum, row) => sum + row.totalAmount, 0);
  const paymentBreakdown = new Map<string, number>();
  for (const row of sales) {
    const key = row.paymentTypeDisplay || "Otro";
    paymentBreakdown.set(key, (paymentBreakdown.get(key) || 0) + row.totalAmount);
  }

  // ── Encabezado ────────────────────────────────────────────────────────
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(30, 30, 30);
  pdf.text(businessName, MARGIN_X, MARGIN_TOP + 7);

  pdf.setFontSize(12);
  pdf.text("Reporte de Ventas", MARGIN_X, MARGIN_TOP + 14);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text(`Período: ${options.rangeLabel}`, MARGIN_X, MARGIN_TOP + 20);
  pdf.text(`Generado el: ${formatDate(new Date())}`, PAGE_WIDTH - MARGIN_X, MARGIN_TOP + 20, {
    align: "right",
  });

  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_X, MARGIN_TOP + 24, PAGE_WIDTH - MARGIN_X, MARGIN_TOP + 24);

  // ── Resumen ───────────────────────────────────────────────────────────
  let y = MARGIN_TOP + 31;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(50, 50, 50);
  pdf.text("Resumen", MARGIN_X, y);
  y += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Ventas: ${sales.length}`, MARGIN_X, y);
  pdf.text(`Monto total: ${formatCurrency(totalAmount)}`, MARGIN_X + 55, y);

  if (sales.length > 0) {
    const breakdownText = Array.from(paymentBreakdown.entries())
      .map(([k, v]) => `${k}: ${formatCurrency(v)}`)
      .join("   ·   ");
    const breakdownLines = pdf.splitTextToSize(
      `Por tipo de pago: ${breakdownText}`,
      CONTENT_WIDTH
    ) as string[];
    pdf.setFontSize(8.5);
    pdf.text(breakdownLines, MARGIN_X, y + 5);
    y += 5 + (breakdownLines.length - 1) * 4;
  }
  y += 6;

  // ── Tabla ─────────────────────────────────────────────────────────────
  const truncate = (text: string, maxWidth: number): string => {
    const width = (str: string) => (pdf.getStringUnitWidth(str) * pdf.getFontSize()) / 2.8346;
    if (width(text) <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 1 && width(truncated + "…") > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "…";
  };

  const drawHeader = (topY: number) => {
    pdf.setFillColor(229, 231, 235);
    pdf.rect(MARGIN_X, topY, CONTENT_WIDTH, HEADER_HEIGHT, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(40, 40, 40);
    let x = MARGIN_X;
    for (const col of COLUMNS) {
      let cx = x;
      if (col.align === "right") cx = x + col.width;
      else if (col.align === "center") cx = x + col.width / 2;
      pdf.text(col.header, cx, topY + HEADER_HEIGHT / 2, {
        align: col.align,
        baseline: "middle",
      });
      x += col.width;
    }
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM - 4) {
      pdf.addPage();
      y = MARGIN_TOP + 6;
      drawHeader(y);
      y += HEADER_HEIGHT;
    }
  };

  drawHeader(y);
  y += HEADER_HEIGHT;

  if (sales.length === 0) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(10);
    pdf.setTextColor(140, 140, 140);
    pdf.text(
      "No hay ventas en el período seleccionado.",
      PAGE_WIDTH / 2,
      y + 15,
      { align: "center" }
    );
  } else {
    sales.forEach((row, idx) => {
      ensureSpace(ROW_HEIGHT);

      if (idx % 2 === 0) {
        pdf.setFillColor(248, 248, 248);
        pdf.rect(MARGIN_X, y - ROW_HEIGHT / 2, CONTENT_WIDTH, ROW_HEIGHT, "F");
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(60, 60, 60);

      const cells = [
        { text: String(row.id), col: COLUMNS[0] },
        { text: formatDate(row.saleDate), col: COLUMNS[1] },
        { text: truncate(row.clientName || "N/A", COLUMNS[2].width - 2), col: COLUMNS[2] },
        { text: truncate(row.sellerName || "N/A", COLUMNS[3].width - 2), col: COLUMNS[3] },
        { text: truncate(row.paymentTypeDisplay || "-", COLUMNS[4].width - 2), col: COLUMNS[4] },
        { text: String(row.itemCount), col: COLUMNS[5] },
        { text: formatCurrency(row.totalAmount), col: COLUMNS[6] },
      ];

      let x = MARGIN_X;
      for (const cell of cells) {
        let cx = x;
        if (cell.col.align === "right") cx = x + cell.col.width;
        else if (cell.col.align === "center") cx = x + cell.col.width / 2;
        pdf.text(cell.text, cx, y, {
          align: cell.col.align,
          baseline: "middle",
        });
        x += cell.col.width;
      }

      y += ROW_HEIGHT;
    });
  }

  // ── Pies de página ────────────────────────────────────────────────────
  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN_X, PAGE_HEIGHT - MARGIN_BOTTOM, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - MARGIN_BOTTOM);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(140, 140, 140);
    pdf.text(businessName, MARGIN_X, PAGE_HEIGHT - MARGIN_BOTTOM + 5);
    pdf.text(`Página ${page} de ${totalPages}`, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - MARGIN_BOTTOM + 5, {
      align: "right",
    });
  }

  const arrayBuffer = pdf.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}
