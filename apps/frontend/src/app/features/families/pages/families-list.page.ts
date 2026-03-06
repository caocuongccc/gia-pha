// apps/frontend/src/app/features/families/pages/families-list.page.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FamilyService, Family } from '../../../core/services/family.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-families-list',
  standalone: true,
  imports: [CommonModule],
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
          <button class="btn-ghost" (click)="signOut()">Đăng xuất</button>
          <button class="btn-primary" (click)="showCreate = true">
            + Tạo họ mới
          </button>
        </div>
      </div>

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
          <p>Bắt đầu bằng cách tạo họ đầu tiên của bạn</p>
          <button class="btn-primary" (click)="showCreate = true">
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
            <div class="fc-footer">Xem chi tiết →</div>
          </div>
        }
      </div>

      @if (showCreate) {
        <div class="modal-overlay" (click)="showCreate = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Tạo họ mới</h2>
              <button class="modal-close" (click)="showCreate = false">
                ✕
              </button>
            </div>
            <div class="modal-body">
              <div class="field">
                <label>Tên họ <span class="req">*</span></label>
                <input
                  #nameInput
                  placeholder="Ví dụ: Họ Lê Văn, Họ Nguyễn..."
                  class="input"
                  (keydown.enter)="create(nameInput.value, descInput.value)"
                />
              </div>
              <div class="field">
                <label>Mô tả</label>
                <input
                  #descInput
                  placeholder="Nguồn gốc, quê quán... (tuỳ chọn)"
                  class="input"
                />
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn-ghost" (click)="showCreate = false">
                Huỷ
              </button>
              <button
                class="btn-primary"
                (click)="create(nameInput.value, descInput.value)"
              >
                ✓ Tạo họ
              </button>
            </div>
          </div>
        </div>
      }
    </div>
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

      /* ── Header ── */
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

      /* ── Buttons ── */
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
      .btn-ghost {
        padding: 7px 14px;
        font-size: 12px;
        background: none;
        border: 1px solid #334155;
        color: #94a3b8;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-ghost:hover {
        border-color: #64748b;
        color: #e2e8f0;
      }

      /* ── Loading ── */
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

      /* ── Error ── */
      .error-banner {
        background: #1a0808;
        border: 1px solid #7f1d1d;
        color: #fca5a5;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        margin-bottom: 20px;
      }

      /* ── Empty state ── */
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

      /* ── Grid ── */
      .family-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }

      /* ── Card ── */
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
      .fc-footer {
        border-top: 1px solid #1e293b;
        padding-top: 10px;
        font-size: 11px;
        color: #3b82f6;
        margin-top: 4px;
      }
      .family-card:hover .fc-footer {
        color: #60a5fa;
      }

      /* ── Modal ── */
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
        width: 420px;
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
        gap: 14px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      label {
        font-size: 11px;
        color: #94a3b8;
        font-weight: 500;
      }
      .req {
        color: #ef4444;
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
      }
      .input:focus {
        border-color: #3b82f6;
      }
      .input::placeholder {
        color: #334155;
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

  showCreate = false;

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

  async create(name: string, description = '') {
    if (!name.trim()) return;
    const family = await this.familySvc.create({
      name: name.trim(),
      description,
    });
    this.showCreate = false;
    this.router.navigate(['/families', family.id]);
  }

  async signOut() {
    await this.authSvc.signOut();
    this.router.navigate(['/login']);
  }
}
