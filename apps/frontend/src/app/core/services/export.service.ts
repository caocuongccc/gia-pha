import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

@Injectable({ providedIn: 'root' })
export class ExportService {
  /**
   * Export SVG element thành file PNG.
   * @param svgEl  - SVGElement từ D3 tree component
   * @param filename - Tên file không cần đuôi
   * @param scale  - 2 = retina quality
   */
  async exportPng(
    svgEl: SVGSVGElement,
    filename = 'gia-pha',
    scale = 2,
  ): Promise<void> {
    const { width, height } = svgEl.getBoundingClientRect();

    // Clone SVG để không làm ảnh hưởng DOM gốc
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    // Thêm white background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', '#0a0d12');
    clone.prepend(bg);

    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    // Trigger download
    const link = document.createElement('a');
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  /**
   * Export PDF — dùng PNG làm base, thêm metadata header.
   */
  async exportPdf(
    svgEl: SVGSVGElement,
    familyName: string,
    filename = 'gia-pha',
  ): Promise<void> {
    const { width, height } = svgEl.getBoundingClientRect();
    const isLandscape = width > height;

    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width + 80, height + 120],
    });

    // Header
    pdf.setFontSize(22);
    pdf.setTextColor(212, 168, 71);
    pdf.text(`🌳 Gia Phả — ${familyName}`, 40, 36);
    pdf.setFontSize(11);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`, 40, 54);

    // Convert SVG → PNG → nhúng vào PDF
    const pngDataUrl = await this.svgToPngDataUrl(svgEl);
    pdf.addImage(pngDataUrl, 'PNG', 40, 70, width, height);
    pdf.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private async svgToPngDataUrl(svgEl: SVGSVGElement): Promise<string> {
    const { width, height } = svgEl.getBoundingClientRect();
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', '#0a0d12');
    clone.prepend(bg);

    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/png');
  }
}
