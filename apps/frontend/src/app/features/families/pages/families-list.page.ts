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
          <h1>Cây Gia Phả</h1>
          <p class="subtitle">{{ familySvc.count() }} họ đang quản lý</p>
        </div>
        <button class="btn-primary" (click)="showCreate = true">
          + Tạo họ mới
        </button>
      </div>

      <!-- Loading -->
      @if (familySvc.loading()) {
        <div class="loading">Đang tải...</div>
      }

      <!-- Error -->
      @if (familySvc.error()) {
        <div class="error-banner">{{ familySvc.error() }}</div>
      }

      <!-- Empty state -->
      @if (!familySvc.loading() && familySvc.families().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🌳</div>
          <h3>Chưa có họ nào</h3>
          <p>Bắt đầu bằng cách tạo họ đầu tiên</p>
          <button class="btn-primary" (click)="showCreate = true">
            Tạo họ đầu tiên
          </button>
        </div>
      }

      <!-- Danh sách -->
      <div class="family-grid">
        @for (family of familySvc.families(); track family.id) {
          <div class="family-card" (click)="openFamily(family)">
            <div class="fc-icon">🌿</div>
            <div class="fc-body">
              <div class="fc-name">{{ family.name }}</div>
              @if (family.description) {
                <div class="fc-desc">{{ family.description }}</div>
              }
            </div>
            <div class="fc-badge" [class.public]="family.isPublic">
              {{ family.isPublic ? 'Công khai' : 'Riêng tư' }}
            </div>
          </div>
        }
      </div>

      <!-- Modal tạo họ mới -->
      @if (showCreate) {
        <div class="modal-overlay" (click)="showCreate = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2>Tạo họ mới</h2>
            <input
              #nameInput
              placeholder="Tên họ (vd: Họ Lê Văn)"
              class="input"
              (keydown.enter)="create(nameInput.value)"
            />
            <input #descInput placeholder="Mô tả (tuỳ chọn)" class="input" />
            <div class="modal-actions">
              <button class="btn-ghost" (click)="showCreate = false">
                Huỷ
              </button>
              <button
                class="btn-primary"
                (click)="create(nameInput.value, descInput.value)"
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class FamiliesListPage implements OnInit {
  familySvc = inject(FamilyService);
  authSvc = inject(AuthService);
  private router = inject(Router);

  showCreate = false;

  async ngOnInit() {
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
}
