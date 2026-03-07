// apps/frontend/src/app/features/families/components/family-header-actions.component.ts
import { Component, input, output, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportButtonsComponent } from '../../tree-view/export-buttons.component';

export type ViewMode = 'tree' | 'generation' | 'organization';

// Minimal interface — tránh type conflict với FamilyService
export interface FamilyLike {
  id?: string;
  name?: string;
  isPublic?: boolean;
  [key: string]: any;
}

@Component({
  selector: 'app-family-header-actions',
  standalone: true,
  imports: [CommonModule, ExportButtonsComponent],
  template: `
    <div class="ha-wrap" (click)="sharePopupOpen.set(false)">
      <!-- View mode toggle -->
      <div class="view-toggle">
        <button
          [class.active]="viewMode() === 'tree'"
          (click)="viewMode.set('tree')"
          title="Cây gia phả"
        >
          🌳
        </button>
        <button
          [class.active]="viewMode() === 'generation'"
          (click)="viewMode.set('generation')"
          title="Theo đời"
        >
          📋
        </button>
        <button
          [class.active]="viewMode() === 'organization'"
          (click)="viewMode.set('organization')"
          title="Theo chi phái"
        >
          🏛
        </button>
      </div>

      <!-- Export — luôn hiển thị -->
      <app-export-buttons
        svgElementId="family-tree-svg"
        [familyName]="family()?.name ?? ''"
      />

      <!-- Chi — Phái: ẩn khi viewOnly -->
      @if (!viewOnly()) {
        <button class="btn-outline" (click)="chiPhaiClicked.emit()">
          Chi — Phái
        </button>
      }

      <!-- Share: ẩn khi viewOnly -->
      @if (!viewOnly()) {
        <div class="share-wrap" style="position:relative">
          <button
            class="btn-share"
            [class.is-public]="family()?.isPublic"
            (click)="
              sharePopupOpen.set(!sharePopupOpen()); $event.stopPropagation()
            "
          >
            🔗 {{ family()?.isPublic ? 'Đang chia sẻ' : 'Chia sẻ' }}
          </button>

          @if (sharePopupOpen()) {
            <div class="share-popup" (click)="$event.stopPropagation()">
              <div class="share-row">
                <span class="share-label">Cho phép xem công khai</span>
                <button
                  class="share-toggle"
                  [class.on]="family()?.isPublic"
                  (click)="togglePublicClicked.emit()"
                >
                  {{ family()?.isPublic ? 'BẬT ✓' : 'TẮT' }}
                </button>
              </div>
              @if (family()?.isPublic) {
                <div class="share-url-row">
                  <input
                    class="share-url-input"
                    [value]="shareUrl()"
                    readonly
                  />
                  <button
                    class="share-copy-btn"
                    (click)="copyLinkClicked.emit()"
                  >
                    {{ copied() ? '✓ Copied!' : 'Copy link' }}
                  </button>
                </div>
                <p class="share-hint">
                  Bất kỳ ai có link đều xem được, không cần đăng nhập.
                </p>
              }
            </div>
          }
        </div>
      }

      <!-- + Thêm: ẩn khi viewOnly -->
      @if (!viewOnly()) {
        <button class="btn-primary" (click)="addMemberClicked.emit()">
          + Thêm
        </button>
      }
    </div>
  `,
  styles: [
    `
      .ha-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .view-toggle {
        display: flex;
        border: 1px solid #1e293b;
        border-radius: 5px;
        overflow: hidden;
      }
      .view-toggle button {
        background: none;
        border: none;
        color: #64748b;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 14px;
      }
      .view-toggle button.active {
        background: #1e3a6e;
        color: #60a5fa;
      }
      .btn-primary {
        padding: 6px 14px;
        font-size: 12px;
        background: #3b82f6;
        border: none;
        color: #fff;
        border-radius: 5px;
        cursor: pointer;
      }
      .btn-outline {
        padding: 6px 14px;
        font-size: 12px;
        background: none;
        border: 1px solid #334155;
        color: #94a3b8;
        border-radius: 5px;
        cursor: pointer;
      }
      .btn-outline:hover {
        border-color: #3b82f6;
        color: #60a5fa;
      }
      .btn-share {
        padding: 6px 12px;
        font-size: 12px;
        background: none;
        border: 1px solid #334155;
        color: #94a3b8;
        border-radius: 5px;
        cursor: pointer;
      }
      .btn-share:hover {
        border-color: #60a5fa;
        color: #60a5fa;
      }
      .btn-share.is-public {
        border-color: #22c55e;
        color: #22c55e;
      }
      .share-popup {
        position: absolute;
        top: 38px;
        right: 0;
        z-index: 300;
        background: #0c1828;
        border: 1px solid #1e3a6e;
        border-radius: 10px;
        padding: 14px 16px;
        min-width: 340px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .share-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .share-label {
        font-size: 12px;
        color: #94a3b8;
      }
      .share-toggle {
        padding: 4px 12px;
        font-size: 11px;
        border-radius: 12px;
        cursor: pointer;
        border: 1px solid #334155;
        background: #0a0f1e;
        color: #64748b;
      }
      .share-toggle.on {
        border-color: #22c55e;
        color: #22c55e;
        background: #0a1a0e;
      }
      .share-url-row {
        display: flex;
        gap: 6px;
      }
      .share-url-input {
        flex: 1;
        background: #060d1a;
        border: 1px solid #1e293b;
        color: #60a5fa;
        border-radius: 5px;
        padding: 6px 10px;
        font-size: 11px;
        font-family: monospace;
      }
      .share-copy-btn {
        background: #1e3a6e;
        border: 1px solid #3b82f6;
        color: #60a5fa;
        border-radius: 5px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 11px;
        white-space: nowrap;
      }
      .share-hint {
        font-size: 10px;
        color: #475569;
        margin: 0;
      }
    `,
  ],
})
export class FamilyHeaderActionsComponent {
  // Inputs
  viewMode = model<ViewMode>('tree');
  family = input<FamilyLike | null>(null);
  shareUrl = input('');
  copied = input(false);
  viewOnly = input(false);

  // Outputs (actions mà parent xử lý)
  chiPhaiClicked = output<void>();
  togglePublicClicked = output<void>();
  copyLinkClicked = output<void>();
  addMemberClicked = output<void>();

  // Local state: popup open/close nằm trong component
  sharePopupOpen = signal(false);
}
