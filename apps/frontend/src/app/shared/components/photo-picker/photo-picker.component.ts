// apps/frontend/src/app/shared/components/photo-picker/photo-picker.component.ts
import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

/**
 * PhotoPickerComponent
 * Dùng thay cho <input formControlName="photoUrl" placeholder="https://...">
 *
 * Hỗ trợ:
 *  - Paste URL thẳng vào ô input
 *  - Upload file ảnh → convert base64 (nếu không có storage server)
 *  - Preview ảnh live
 *  - Xoá ảnh
 *
 * Sử dụng trong member-form:
 *   Thay:  <input formControlName="photoUrl" placeholder="https://..." />
 *   Bằng:  <app-photo-picker [value]="form.get('photoUrl')!.value"
 *                             (changed)="form.patchValue({photoUrl: $event})" />
 */
@Component({
  selector: 'app-photo-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="photo-picker">
      <!-- Preview -->
      @if (preview()) {
        <div class="preview-wrap">
          <img
            [src]="preview()"
            class="preview-img"
            alt="preview"
            (error)="onImgError()"
          />
          <button
            type="button"
            class="clear-btn"
            (click)="clear()"
            title="Xoá ảnh"
          >
            ✕
          </button>
        </div>
      } @else {
        <!-- Upload zone -->
        <div
          class="upload-zone"
          [class.drag-over]="dragging()"
          (dragover)="$event.preventDefault(); dragging.set(true)"
          (dragleave)="dragging.set(false)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          <span class="uz-icon">📷</span>
          <span class="uz-text">Kéo ảnh vào đây hoặc <u>chọn file</u></span>
          <span class="uz-sub">JPG, PNG, WEBP — tối đa 2 MB</span>
        </div>
        <input
          #fileInput
          type="file"
          accept="image/*"
          hidden
          (change)="onFileChange($event)"
        />
      }

      <!-- URL input -->
      <div class="url-row">
        <input
          class="url-input"
          placeholder="Hoặc paste link ảnh vào đây..."
          [value]="urlInput()"
          (input)="onUrlInput($any($event.target).value)"
          (paste)="onPaste($event)"
        />
        @if (urlInput()) {
          <button type="button" class="apply-btn" (click)="applyUrl()">
            Dùng
          </button>
        }
      </div>

      @if (error()) {
        <p class="pp-error">{{ error() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .photo-picker {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      /* Preview */
      .preview-wrap {
        position: relative;
        display: inline-flex;
        width: 80px;
        height: 80px;
      }
      .preview-img {
        width: 80px;
        height: 80px;
        border-radius: 10px;
        object-fit: cover;
        border: 2px solid #3b82f6;
      }
      .clear-btn {
        position: absolute;
        top: -6px;
        right: -6px;
        background: #ef4444;
        border: none;
        color: #fff;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }

      /* Upload zone */
      .upload-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        border: 1px dashed #2a3a50;
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition:
          border-color 0.15s,
          background 0.15s;
      }
      .upload-zone:hover,
      .upload-zone.drag-over {
        border-color: #3b82f6;
        background: #0a1628;
      }
      .uz-icon {
        font-size: 22px;
      }
      .uz-text {
        font-size: 11px;
        color: #94a3b8;
      }
      .uz-text u {
        color: #60a5fa;
      }
      .uz-sub {
        font-size: 10px;
        color: #475569;
      }

      /* URL row */
      .url-row {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .url-input {
        flex: 1;
        background: #0a0f1e;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 5px;
        padding: 6px 10px;
        font-size: 11px;
        outline: none;
      }
      .url-input:focus {
        border-color: #3b82f6;
      }
      .apply-btn {
        background: #1e3a6e;
        border: 1px solid #3b82f6;
        color: #60a5fa;
        border-radius: 5px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 11px;
        white-space: nowrap;
      }
      .apply-btn:hover {
        background: #1a3060;
      }

      .pp-error {
        font-size: 10px;
        color: #ef4444;
        margin: 0;
      }
    `,
  ],
})
export class PhotoPickerComponent {
  /** Giá trị hiện tại (URL hoặc base64) */
  value = input<string | null | undefined>(null);

  /** Emit URL/base64 mới khi user chọn ảnh */
  changed = output<string | null>();

  preview = signal<string | null>(null);
  urlInput = signal('');
  dragging = signal(false);
  error = signal('');
  loading = signal(false);

  constructor() {
    // Sync preview với value input
    // Không dùng effect() ở đây để tránh loop — parent tự set value
  }

  ngOnChanges() {
    if (this.value() && !this.preview()) {
      this.preview.set(this.value() ?? null);
    }
  }

  // ── URL input ───────────────────────────────────────────────
  onUrlInput(v: string) {
    this.urlInput.set(v);
    this.error.set('');
  }

  onPaste(event: ClipboardEvent) {
    // Nếu paste file ảnh (từ clipboard screenshot)
    const items = event.clipboardData?.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            this.readFile(file);
            return;
          }
        }
      }
    }
    // Nếu paste URL text — auto apply sau 300ms debounce
    setTimeout(() => {
      const v = this.urlInput();
      if (v.startsWith('http')) this.applyUrl();
    }, 350);
  }

  applyUrl() {
    const url = this.urlInput().trim();
    if (!url) return;
    if (!url.startsWith('http')) {
      this.error.set('URL không hợp lệ — phải bắt đầu bằng https://');
      return;
    }
    this.preview.set(url);
    this.changed.emit(url);
    this.urlInput.set('');
  }

  // ── File select / drop ──────────────────────────────────────
  onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.readFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) this.readFile(file);
  }

  private readFile(file: File) {
    this.error.set('');
    if (file.size > 2 * 1024 * 1024) {
      this.error.set('File quá lớn — tối đa 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.preview.set(base64);
      this.changed.emit(base64);
    };
    reader.readAsDataURL(file);
  }

  // ── Helpers ─────────────────────────────────────────────────
  onImgError() {
    this.error.set('Không load được ảnh — kiểm tra lại URL');
    this.preview.set(null);
  }

  clear() {
    this.preview.set(null);
    this.urlInput.set('');
    this.error.set('');
    this.changed.emit(null);
  }
}
