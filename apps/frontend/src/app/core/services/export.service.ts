// apps/frontend/src/app/core/services/export.service.ts
//
// Export cây gia phả sang PNG / SVG / PDF chất lượng cao
// PNG: dùng canvas 4x scale để sắc nét trên Retina
// PDF: dùng jsPDF + canvas, landscape, full resolution
//
// Cài đặt:  npm install jspdf
// jsPDF CDN: import tự động qua npm, không cần import thêm

import { Injectable } from '@angular/core';

// jsPDF — cài qua npm: npm install jspdf
// Nếu dùng CDN thêm vào angular.json scripts:
//   "node_modules/jspdf/dist/jspdf.umd.min.js"
declare const jsPDF: any;

@Injectable({ providedIn: 'root' })
export class ExportService {
  // ── PNG ──────────────────────────────────────────────────────
  // scale = 4: ảnh sắc nét 4x (độ phân giải cao, file ~3-5 MB)
  // scale = 2: cân bằng (mặc định trước đây, file nhỏ hơn)
  async exportPng(
    svgEl: SVGSVGElement,
    filename = 'gia-pha',
    scale = 4,
  ): Promise<void> {
    const { dataUrl, pw, ph } = await this.svgToDataUrl(svgEl, scale);

    const link = document.createElement('a');
    link.download = `${filename}-${this.today()}.png`;
    link.href = dataUrl;
    link.click();
  }

  // ── SVG ──────────────────────────────────────────────────────
  exportSvg(svgEl: SVGSVGElement, filename = 'gia-pha'): void {
    const clone = this.cloneSvg(svgEl);
    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${filename}-${this.today()}.svg`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── PDF ──────────────────────────────────────────────────────
  async exportPdf(
    svgEl: SVGSVGElement,
    familyName = 'Gia Phả',
    filename = 'gia-pha',
  ): Promise<void> {
    // Lấy kích thước thực của nội dung SVG
    const g = svgEl.querySelector<SVGGElement>('g.tree-root');
    const bbox = g ? g.getBBox() : svgEl.getBoundingClientRect();

    const contentW = bbox.width || svgEl.clientWidth || 1200;
    const contentH = bbox.height || svgEl.clientHeight || 800;

    const HEADER_H = 60; // px cho title bar ở trên
    const PAD = 40; // padding 4 phía

    const pdfW = contentW + PAD * 2;
    const pdfH = contentH + PAD * 2 + HEADER_H;

    // jsPDF dùng pt — 1px ≈ 0.75pt; dùng px cho đơn giản
    const jspdf = new (window as any).jsPDF({
      orientation: pdfW > pdfH ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pdfW, pdfH],
      hotfixes: ['px_scaling'],
    }) as any;

    // Header
    jspdf.setFontSize(18);
    jspdf.setTextColor(212, 168, 71); // màu vàng
    jspdf.text(`Cây Gia Phả — ${familyName}`, PAD, PAD + 16);
    jspdf.setFontSize(10);
    jspdf.setTextColor(120, 120, 120);
    jspdf.text(
      `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`,
      PAD,
      PAD + 34,
    );

    // Đường kẻ dưới header
    jspdf.setDrawColor(50, 60, 80);
    jspdf.setLineWidth(0.5);
    jspdf.line(PAD, PAD + 44, pdfW - PAD, PAD + 44);

    // Vẽ cây SVG dưới header (scale=3 cho PDF sắc nét)
    const { dataUrl } = await this.svgToDataUrl(svgEl, 3);
    jspdf.addImage(dataUrl, 'PNG', PAD, PAD + HEADER_H, contentW, contentH);

    jspdf.save(`${filename}-${this.today()}.pdf`);
  }

  // ── Helpers ──────────────────────────────────────────────────

  /**
   * Chuyển SVGElement → canvas dataUrl với scale cao.
   * Dùng getBBox() của g.tree-root để lấy đúng bounds nội dung,
   * tránh bị crop hoặc bị dư vùng trắng.
   */
  private async svgToDataUrl(
    svgEl: SVGSVGElement,
    scale: number,
  ): Promise<{ dataUrl: string; pw: number; ph: number }> {
    const clone = this.cloneSvg(svgEl);

    // Lấy bounds nội dung thực (không phụ thuộc vào viewport)
    const g = svgEl.querySelector<SVGGElement>('g.tree-root');
    let pw: number, ph: number, vbX: number, vbY: number;

    if (g) {
      const box = g.getBBox();
      const PAD = 40;
      pw = box.width + PAD * 2;
      ph = box.height + PAD * 2;
      vbX = box.x - PAD;
      vbY = box.y - PAD;
    } else {
      // Fallback: dùng kích thước hiển thị
      const rect = svgEl.getBoundingClientRect();
      pw = rect.width || 1200;
      ph = rect.height || 800;
      vbX = 0;
      vbY = 0;
    }

    // Set viewBox + width/height chính xác lên clone
    clone.setAttribute('width', String(pw));
    clone.setAttribute('height', String(ph));
    clone.setAttribute('viewBox', `${vbX} ${vbY} ${pw} ${ph}`);

    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = (e) => reject(e);
      i.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = pw * scale;
    canvas.height = ph * scale;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, pw, ph);

    URL.revokeObjectURL(url);

    return { dataUrl: canvas.toDataURL('image/png', 1.0), pw, ph };
  }

  /** Clone SVG và thêm background màu tối */
  private cloneSvg(svgEl: SVGSVGElement): SVGSVGElement {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;

    // Inline tất cả computed styles của các phần tử con
    // để bảo đảm màu sắc xuất đúng (CSS class không work sau serialize)
    this.inlineStyles(svgEl, clone);

    // Background tối
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '200%');
    bg.setAttribute('height', '200%');
    bg.setAttribute('x', '-50%');
    bg.setAttribute('y', '-50%');
    bg.setAttribute('fill', '#09090f');
    clone.insertBefore(bg, clone.firstChild);

    return clone;
  }

  /**
   * Inline computed CSS styles từ source → dest.
   * Quan trọng: khi serialize SVG sang PNG thì CSS class mất hết,
   * phải inline style để màu sắc, stroke, font giữ đúng.
   */
  private inlineStyles(source: Element, dest: Element): void {
    const srcChildren = Array.from(source.children);
    const dstChildren = Array.from(dest.children);

    srcChildren.forEach((srcChild, i) => {
      const dstChild = dstChildren[i];
      if (!dstChild) return;

      try {
        const computed = window.getComputedStyle(srcChild);
        const props = [
          'fill',
          'stroke',
          'stroke-width',
          'stroke-opacity',
          'fill-opacity',
          'opacity',
          'font-family',
          'font-size',
          'font-weight',
          'text-anchor',
          'dominant-baseline',
          'color',
          'background-color',
          'display',
        ];
        const inlined: string[] = [];
        for (const p of props) {
          const val = computed.getPropertyValue(p);
          if (val && val !== 'initial' && val !== 'normal') {
            inlined.push(`${p}:${val}`);
          }
        }
        if (inlined.length) {
          const existing = dstChild.getAttribute('style') ?? '';
          dstChild.setAttribute('style', existing + ';' + inlined.join(';'));
        }
      } catch (_) {
        /* cross-origin elements */
      }

      this.inlineStyles(srcChild, dstChild);
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
