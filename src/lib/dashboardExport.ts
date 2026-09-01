import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface DashboardExportData {
  marketRates: {
    gold24k: number | null;
    gold22k: number | null;
    goldPerGramLkr: number | null;
    goldPerGramUsd: number | null;
    usdToLkr: number | null;
  };
  platformStats: {
    catalogProducts: number;
    registeredCustomers: number;
    totalInquiries: number;
    modelsUploaded: number;
  };
  inquiriesByStatus: { label: string; count: number }[];
  productsByCategory: { name: string; count: number }[];
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function formatLkr(v: number | null): string {
  return v != null ? `LKR ${Math.round(v).toLocaleString('en-US')}` : '—';
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportDashboardCsv(data: DashboardExportData) {
  const now = new Date();
  const { marketRates, platformStats } = data;

  const lines: string[] = [
    'PD Jewellers - Dashboard Report',
    `Generated: ${now.toLocaleString('en-US')}`,
    '',
    '--- Market Rates ---',
    `Gold Sovereign 24K (1 Pawn),${formatLkr(marketRates.gold24k)}`,
    `Gold Sovereign 22K (1 Pawn),${formatLkr(marketRates.gold22k)}`,
    `Gold Per Gram,${formatLkr(marketRates.goldPerGramLkr)}`,
    `Gold Per Gram (USD),${marketRates.goldPerGramUsd != null ? `$${marketRates.goldPerGramUsd.toFixed(2)}` : '—'}`,
    `USD to LKR,${marketRates.usdToLkr != null ? marketRates.usdToLkr.toFixed(2) : '—'}`,
    '',
    '--- Platform Stats ---',
    `Catalog Products,${platformStats.catalogProducts}`,
    `Registered Customers,${platformStats.registeredCustomers}`,
    `Total Inquiries,${platformStats.totalInquiries}`,
    `3D Models Uploaded,${platformStats.modelsUploaded}`,
    '',
    '--- Inquiries by Status ---',
    ...data.inquiriesByStatus.map(s => `${csvEscape(s.label)},${s.count}`),
    '',
    '--- Products by Category ---',
    ...data.productsByCategory.map(c => `${csvEscape(c.name)},${c.count}`),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const dateStr = now.toISOString().split('T')[0];
  triggerDownload(blob, `pd-jewellers-dashboard-${dateStr}.csv`);
}

export async function exportDashboardPdf() {
  const element = document.getElementById('dashboard-content');
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  const headerMarginMm = 30;

  pdf.setFontSize(16);
  pdf.text('PD Jewellers — Dashboard Report', 14, 15);
  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  if (pdfHeight + headerMarginMm <= pageHeight) {
    pdf.addImage(imgData, 'PNG', 0, headerMarginMm, pdfWidth, pdfHeight);
  } else {
    // Content is taller than one page — slice the source canvas and spread it across pages.
    let renderedPx = 0;
    let firstPage = true;

    while (renderedPx < canvas.height) {
      const topMarginMm = firstPage ? headerMarginMm : 10;
      const availablePx = ((pageHeight - topMarginMm) * canvas.width) / pdfWidth;
      const slicePx = Math.min(availablePx, canvas.height - renderedPx);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = slicePx;
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) break;
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, slicePx, 0, 0, canvas.width, slicePx);

      const sliceImgData = pageCanvas.toDataURL('image/png');
      const sliceHeightMm = (slicePx * pdfWidth) / canvas.width;

      if (!firstPage) pdf.addPage();
      pdf.addImage(sliceImgData, 'PNG', 0, topMarginMm, pdfWidth, sliceHeightMm);

      renderedPx += slicePx;
      firstPage = false;
    }
  }

  pdf.save(`pd-jewellers-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
}
