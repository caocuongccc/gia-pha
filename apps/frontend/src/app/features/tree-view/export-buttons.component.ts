import { Component, input } from '@angular/core';
import { ExportService } from '../../core/services/export.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-export-buttons',
  standalone: true,
  template: `
    <div class="export-actions">
      <button class="btn-export" (click)="exportPng()" title="Xuất ảnh PNG">
        🖼 PNG
      </button>
      <button class="btn-export" (click)="exportSvg()" title="Xuất file SVG">
        📐 SVG
      </button>
      <button class="btn-export" (click)="exportPdf()" title="Xuất file PDF">
        📄 PDF
      </button>
    </div>
  `,
  styles: [
    `
      .export-actions {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .btn-export {
        padding: 5px 10px;
        font-size: 11px;
        border-radius: 4px;
        background: #1a2035;
        border: 1px solid #252d45;
        color: #94a3b8;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-export:hover {
        background: #252d45;
        color: #e2e8f0;
      }
    `,
  ],
})
export class ExportButtonsComponent {
  // ✅ Input là string id của SVG element — không phải ElementRef
  svgElementId = input.required<string>();
  familyName = input<string>('gia-pha');

  private exportSvc = inject(ExportService);

  private getSvgElement(): SVGSVGElement | null {
    return document.getElementById(this.svgElementId()) as SVGSVGElement | null;
  }

  exportPng() {
    const el = this.getSvgElement();
    if (el) this.exportSvc.exportPng(el, this.familyName());
  }

  exportSvg() {
    const el = this.getSvgElement();
    if (el) this.exportSvc.exportPng(el, this.familyName(), 2);
  }

  exportPdf() {
    const el = this.getSvgElement();
    if (el) this.exportSvc.exportPdf(el, this.familyName());
  }
}
