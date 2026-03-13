// apps/frontend/src/app/features/families/pages/families-list.page.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FamilyService, Family } from '../../../core/services/family.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-families-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-wrap">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>🌳 Cây Gia Phả</h1>
          <p class="subtitle">{{ familySvc.count() }} họ đang quản lý</p>
        </div>
        <div class="header-right">
          <span class="user-email">{{ authSvc.currentUser()?.email }}</span>
          @if (ownerFamilies().length > 0) {
            <button class="btn-access-nav" (click)="openAccessPanel()">
              👥 Phân quyền
            </button>
          }
          <button class="btn-ghost" (click)="signOut()">Đăng xuất</button>
          <button class="btn-primary" (click)="openCreate()">
            + Tạo họ mới
          </button>
        </div>
      </div>

      <!-- ── Phân quyền panel overlay ── -->
      @if (showAccessPanel()) {
        <div class="acc-overlay" (click)="showAccessPanel.set(false)">
          <div class="acc-panel" (click)="$event.stopPropagation()">
            <div class="acc-hd">
              <h2>👥 Phân quyền</h2>
              <button class="acc-close" (click)="showAccessPanel.set(false)">
                ✕
              </button>
            </div>
            <p class="acc-sub">
              Chỉ OWNER mới thấy mục này — chọn họ để phân quyền
            </p>
            @for (fam of ownerFamilies(); track fam.id) {
              <div class="acc-row" (click)="openAccess(fam)">
                <div class="acc-info">
                  <div class="acc-name">{{ fam.name }}</div>
                  <div class="acc-slug">
                    {{
                      fam.slug
                        ? appUrl + '/f/' + fam.slug
                        : 'Chưa có link share'
                    }}
                  </div>
                </div>
                <span class="acc-arrow">→</span>
              </div>
            }
          </div>
        </div>
      }

      @if (familySvc.loading()) {
        <div class="loading">
          <div class="spinner"></div>
          <span>Đang tải...</span>
        </div>
      }
      @if (familySvc.error()) {
        <div class="error-banner">⚠️ {{ familySvc.error() }}</div>
      }
      @if (!familySvc.loading() && familySvc.families().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🌿</div>
          <h3>Chưa có họ nào</h3>
          <p>Bắt đầu bằng cách tạo họ đầu tiên</p>
          <button class="btn-primary" (click)="openCreate()">
            Tạo họ đầu tiên
          </button>
        </div>
      }

      <div class="family-grid">
        @for (family of familySvc.families(); track family.id) {
          <div class="family-card" (click)="openFamily(family)">
            <div class="fc-top">
              <div class="fc-icon">🌿</div>
              <div class="fc-badge" [class.public]="family.isPublic">
                {{ family.isPublic ? '🌐 Công khai' : '🔒 Riêng tư' }}
              </div>
            </div>
            <div class="fc-name">{{ family.name }}</div>
            @if (family.description) {
              <div class="fc-desc">{{ family.description }}</div>
            }
            <div class="fc-date">
              Tạo {{ family.createdAt | date: 'dd/MM/yyyy' }}
            </div>

            <!-- Share URL nếu có slug -->
            @if (family.slug) {
              <div class="fc-share" (click)="$event.stopPropagation()">
                <span class="fc-share-url"
                  >{{ appUrl }}/f/{{ family.slug }}</span
                >
                <button
                  class="fc-copy"
                  (click)="copySlug(family.slug!)"
                  title="Sao chép link"
                >
                  {{ copied() === family.slug ? '✓' : '⎘' }}
                </button>
              </div>
            } @else if (family.myRole === 'OWNER') {
              <div
                class="fc-no-slug"
                (click)="$event.stopPropagation(); openSetSlug(family)"
              >
                + Thêm tên ngắn để share
              </div>
            }

            <div class="fc-footer">
              <span>Xem chi tiết →</span>
              @if (family.myRole === 'OWNER') {
                <button
                  class="fc-access-btn"
                  (click)="$event.stopPropagation(); openAccess(family)"
                >
                  👥 Phân quyền
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Modal tạo họ mới -->
    @if (showCreate()) {
      <div class="modal-overlay" (click)="showCreate.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Tạo họ mới</h2>
            <button class="modal-close" (click)="showCreate.set(false)">
              ✕
            </button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Tên họ <span class="req">*</span></label>
              <input
                [(ngModel)]="formName"
                placeholder="Ví dụ: Họ Lê Văn, Họ Nguyễn Trần..."
                class="input"
                (input)="autoSlug()"
              />
            </div>
            <div class="field">
              <label>Mô tả <span class="opt">(tuỳ chọn)</span></label>
              <input
                [(ngModel)]="formDesc"
                placeholder="Nguồn gốc, quê quán..."
                class="input"
              />
            </div>
            <div class="field">
              <label>
                Tên ngắn (slug)
                <span class="opt"> — dùng cho link share, vd: ho-le-duy</span>
              </label>
              <div class="slug-row">
                <span class="slug-prefix">{{ appUrl }}/f/</span>
                <input
                  [(ngModel)]="formSlug"
                  placeholder="ho-le-duy"
                  class="input slug-input"
                  (input)="sanitizeSlug()"
                  [class.slug-err]="slugError()"
                />
              </div>
              @if (slugError()) {
                <div class="field-err">{{ slugError() }}</div>
              } @else if (formSlug) {
                <div class="field-hint">
                  Link share: {{ appUrl }}/f/{{ formSlug }}
                </div>
              }
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" (click)="showCreate.set(false)">
              Huỷ
            </button>
            <button
              class="btn-primary"
              (click)="create()"
              [disabled]="creating()"
            >
              {{ creating() ? 'Đang tạo...' : '✓ Tạo họ' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal set slug cho họ đã có -->
    @if (slugFamily()) {
      <div class="modal-overlay" (click)="slugFamily.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Đặt tên ngắn cho "{{ slugFamily()!.name }}"</h2>
            <button class="modal-close" (click)="slugFamily.set(null)">
              ✕
            </button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Tên ngắn (slug)</label>
              <div class="slug-row">
                <span class="slug-prefix">{{ appUrl }}/f/</span>
                <input
                  [(ngModel)]="editSlug"
                  placeholder="ho-le-duy"
                  class="input slug-input"
                  (input)="sanitizeEditSlug()"
                  [class.slug-err]="editSlugError()"
                />
              </div>
              @if (editSlugError()) {
                <div class="field-err">{{ editSlugError() }}</div>
              } @else if (editSlug) {
                <div class="field-hint">
                  Link share: {{ appUrl }}/f/{{ editSlug }}
                </div>
              }
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" (click)="slugFamily.set(null)">
              Huỷ
            </button>
            <button
              class="btn-primary"
              (click)="saveSlug()"
              [disabled]="savingSlug()"
            >
              {{ savingSlug() ? 'Đang lưu...' : 'Lưu' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #09090f;
      }
      .page-wrap {
        max-width: 1100px;
        margin: 0 auto;
        padding: 36px 24px;
        min-height: 100vh;
        background: #09090f;
        color: #e2e8f0;
        font-family: system-ui, sans-serif;
      }
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 36px;
        gap: 16px;
      }
      .page-header h1 {
        margin: 0 0 6px;
        font-size: 26px;
        color: #e2e8f0;
        font-weight: 700;
      }
      .subtitle {
        font-size: 13px;
        color: #64748b;
        margin: 0;
      }
      .header-right {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }
      .user-email {
        font-size: 12px;
        color: #475569;
      }
      .btn-primary {
        padding: 8px 18px;
        font-size: 13px;
        background: #3b82f6;
        border: none;
        color: #fff;
        border-radius: 7px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.15s;
      }
      .btn-primary:hover {
        background: #2563eb;
      }
      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-ghost {
        padding: 7px 14px;
        font-size: 12px;
        background: none;
        border: 1px solid #334155;
        color: #94a3b8;
        border-radius: 7px;
        cursor: pointer;
      }
      .btn-ghost:hover {
        border-color: #64748b;
        color: #e2e8f0;
      }
      .loading {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #64748b;
        font-size: 13px;
        padding: 60px 0;
        justify-content: center;
      }
      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #1e293b;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .error-banner {
        background: #1a0808;
        border: 1px solid #7f1d1d;
        color: #fca5a5;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        margin-bottom: 20px;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 80px 20px;
        text-align: center;
        gap: 12px;
      }
      .empty-icon {
        font-size: 52px;
      }
      .empty-state h3 {
        margin: 0;
        font-size: 18px;
        color: #e2e8f0;
      }
      .empty-state p {
        margin: 0;
        font-size: 13px;
        color: #64748b;
      }
      .family-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }
      .family-card {
        background: #0c1120;
        border: 1px solid #1e293b;
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .family-card:hover {
        border-color: #3b82f6;
        background: #0f1728;
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(59, 130, 246, 0.1);
      }
      .fc-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .fc-icon {
        font-size: 26px;
      }
      .fc-badge {
        font-size: 10px;
        padding: 3px 10px;
        border-radius: 12px;
        background: #1a2535;
        color: #64748b;
        border: 1px solid #1e293b;
      }
      .fc-badge.public {
        background: #0a1e0e;
        color: #4ade80;
        border-color: #166534;
      }
      .fc-name {
        font-size: 16px;
        font-weight: 600;
        color: #e2e8f0;
      }
      .fc-desc {
        font-size: 12px;
        color: #64748b;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .fc-date {
        font-size: 10px;
        color: #334155;
      }
      .fc-share {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #060d1a;
        border: 1px solid #1e293b;
        border-radius: 7px;
        padding: 5px 10px;
        margin-top: 2px;
      }
      .fc-share-url {
        font-size: 11px;
        color: #3b82f6;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .fc-copy {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-size: 14px;
        padding: 0 2px;
        flex-shrink: 0;
      }
      .fc-copy:hover {
        color: #e2e8f0;
      }
      .fc-no-slug {
        font-size: 11px;
        color: #334155;
        cursor: pointer;
        padding: 4px 0;
        margin-top: 2px;
      }
      .fc-no-slug:hover {
        color: #3b82f6;
      }
      .fc-footer {
        border-top: 1px solid #1e293b;
        padding-top: 10px;
        font-size: 11px;
        color: #3b82f6;
        margin-top: 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .family-card:hover .fc-footer {
        color: #60a5fa;
      }
      .fc-access-btn {
        background: none;
        border: 1px solid #1e293b;
        color: #475569;
        border-radius: 6px;
        padding: 3px 8px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .fc-access-btn:hover {
        border-color: #3b82f6;
        color: #60a5fa;
        background: #060d1a;
      }
      .btn-access-nav {
        padding: 7px 14px;
        background: #0f1e38;
        border: 1px solid #1e3a6e;
        color: #60a5fa;
        border-radius: 7px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-access-nav:hover {
        background: #1e3a6e;
      }
      .acc-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 300;
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        padding: 60px 24px 0;
      }
      .acc-panel {
        background: #0c1120;
        border: 1px solid #1e293b;
        border-radius: 14px;
        width: 380px;
        max-height: 80vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      .acc-hd {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #111827;
      }
      .acc-hd h2 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }
      .acc-close {
        background: none;
        border: none;
        color: #475569;
        font-size: 18px;
        cursor: pointer;
      }
      .acc-close:hover {
        color: #e2e8f0;
      }
      .acc-sub {
        font-size: 11px;
        color: #334155;
        padding: 10px 20px 4px;
        margin: 0;
      }
      .acc-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        cursor: pointer;
        transition: background 0.15s;
        border-top: 1px solid #0b0f1c;
      }
      .acc-row:hover {
        background: #0f1828;
      }
      .acc-name {
        font-size: 13px;
        font-weight: 600;
        color: #f1f5f9;
      }
      .acc-slug {
        font-size: 11px;
        color: #334155;
        margin-top: 2px;
      }
      .acc-arrow {
        color: #3b82f6;
        font-size: 16px;
      }
      /* Modal */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal {
        background: #0c1120;
        border: 1px solid #1e3a6e;
        border-radius: 14px;
        width: 460px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
        overflow: hidden;
      }
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 20px;
        border-bottom: 1px solid #1e293b;
      }
      .modal-header h2 {
        margin: 0;
        font-size: 15px;
        color: #e2e8f0;
      }
      .modal-close {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-size: 16px;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .modal-close:hover {
        color: #e2e8f0;
        background: #1e293b;
      }
      .modal-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      label {
        font-size: 11px;
        color: #94a3b8;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .req {
        color: #ef4444;
      }
      .opt {
        color: #334155;
        text-transform: none;
        font-weight: normal;
        letter-spacing: 0;
      }
      .input {
        background: #060d1a;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 7px;
        padding: 10px 14px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.15s;
        width: 100%;
        box-sizing: border-box;
      }
      .input:focus {
        border-color: #3b82f6;
      }
      .input::placeholder {
        color: #334155;
      }
      .slug-row {
        display: flex;
        align-items: center;
        border: 1px solid #1e293b;
        border-radius: 7px;
        overflow: hidden;
        background: #060d1a;
      }
      .slug-prefix {
        padding: 10px 10px 10px 14px;
        font-size: 12px;
        color: #334155;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .slug-input {
        border: none !important;
        border-radius: 0 !important;
        flex: 1;
        min-width: 0;
        padding: 10px 14px 10px 4px !important;
      }
      .slug-input:focus {
        outline: none;
      }
      .slug-row:focus-within {
        border-color: #3b82f6;
      }
      .slug-err + .slug-row,
      .slug-row:has(.slug-err) {
        border-color: #ef4444;
      }
      .input.slug-err {
        color: #ef4444;
      }
      .field-err {
        font-size: 11px;
        color: #ef4444;
      }
      .field-hint {
        font-size: 11px;
        color: #22c55e;
      }
      .modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        padding: 14px 20px;
        border-top: 1px solid #1e293b;
      }
    `,
  ],
})
export class FamiliesListPage implements OnInit {
  familySvc = inject(FamilyService);
  authSvc = inject(AuthService);
  private router = inject(Router);

  readonly appUrl = (environment as any).appUrl ?? window.location.origin;

  showCreate = signal(false);
  creating = signal(false);
  slugFamily = signal<Family | null>(null);
  savingSlug = signal(false);
  copied = signal('');

  // Create form
  formName = '';
  formDesc = '';
  formSlug = '';
  slugError = signal('');

  // Edit slug form
  editSlug = '';
  editSlugError = signal('');
  showAccessPanel = signal(false);
  ownerFamilies = computed(() =>
    this.familySvc.families().filter((f) => f.myRole === 'OWNER'),
  );

  async ngOnInit() {
    if (this.authSvc.isLoading()) {
      await new Promise<void>((resolve) => {
        const id = setInterval(() => {
          if (!this.authSvc.isLoading()) {
            clearInterval(id);
            resolve();
          }
        }, 50);
      });
    }
    if (!this.authSvc.currentUser()) return;
    await this.familySvc.loadAll();
  }

  openFamily(family: Family) {
    this.familySvc.select(family);
    this.router.navigate(['/families', family.id]);
  }

  openAccess(family: Family) {
    this.showAccessPanel.set(false);
    this.router.navigate(['/access', family.id]);
  }

  openAccessPanel() {
    this.showAccessPanel.set(true);
  }

  openCreate() {
    this.formName = '';
    this.formDesc = '';
    this.formSlug = '';
    this.slugError.set('');
    this.showCreate.set(true);
  }

  // Auto-generate slug từ tên họ
  autoSlug() {
    if (!this.formSlug || this.formSlug === this._prevAutoSlug) {
      this.formSlug = this.toSlug(this.formName);
      this._prevAutoSlug = this.formSlug;
    }
    this.slugError.set('');
  }
  private _prevAutoSlug = '';

  sanitizeSlug() {
    this.formSlug = this.toSlug(this.formSlug);
    this.slugError.set('');
  }

  sanitizeEditSlug() {
    this.editSlug = this.toSlug(this.editSlug);
    this.editSlugError.set('');
  }

  private toSlug(s: string): string {
    // Bỏ dấu tiếng Việt
    return s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async create() {
    if (!this.formName.trim()) return;
    if (this.formSlug && this.formSlug.length < 2) {
      this.slugError.set('Slug tối thiểu 2 ký tự');
      return;
    }
    this.creating.set(true);
    try {
      const family = await this.familySvc.create({
        name: this.formName.trim(),
        description: this.formDesc.trim() || undefined,
        slug: this.formSlug || undefined,
      });
      this.showCreate.set(false);
      this.router.navigate(['/families', family.id]);
    } catch (e: any) {
      this.slugError.set(e?.error?.error ?? 'Lỗi tạo họ');
    } finally {
      this.creating.set(false);
    }
  }

  openSetSlug(family: Family) {
    this.slugFamily.set(family);
    this.editSlug = (family as any).slug ?? '';
    this.editSlugError.set('');
  }

  async saveSlug() {
    const family = this.slugFamily();
    if (!family) return;
    if (this.editSlug && this.editSlug.length < 2) {
      this.editSlugError.set('Slug tối thiểu 2 ký tự');
      return;
    }
    this.savingSlug.set(true);
    try {
      await this.familySvc.update(family.id, { slug: this.editSlug || null });
      await this.familySvc.loadAll();
      this.slugFamily.set(null);
    } catch (e: any) {
      this.editSlugError.set(e?.error?.error ?? 'Lỗi lưu slug');
    } finally {
      this.savingSlug.set(false);
    }
  }

  copySlug(slug: string) {
    const url = `${this.appUrl}/f/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(slug);
      setTimeout(() => this.copied.set(''), 2000);
    });
  }

  async signOut() {
    await this.authSvc.signOut();
    this.router.navigate(['/login']);
  }
}
