// apps/frontend/src/app/features/families/pages/public-tree.page.ts
// Route: /share/:token  (token = familyId)
// Không cần đăng nhập — server phải check isPublic=true
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TreeViewComponent } from '../../tree-view/tree-view.component';
import type { Member, Relationship, Family } from '@gia-pha/shared-types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-public-tree',
  standalone: true,
  imports: [CommonModule, TreeViewComponent],
  template: `
    <div class="pub-layout">
      <!-- Header -->
      <header class="pub-header">
        <span class="pub-logo">🌳</span>
        @if (family()) {
          <div class="pub-title">
            <h1>{{ family()!.name }}</h1>
            <span class="pub-sub">{{ members().length }} thành viên</span>
          </div>
        }
        <span class="pub-badge">Chỉ xem · Không cần đăng nhập</span>
      </header>

      <!-- Body -->
      <div class="pub-body">
        @if (loading()) {
          <div class="pub-center">
            <div class="spinner"></div>
            <p>Đang tải gia phả...</p>
          </div>
        }

        @if (!loading() && error()) {
          <div class="pub-center pub-error">
            <p>🔒 {{ error() }}</p>
          </div>
        }

        @if (!loading() && !error() && members().length > 0) {
          <app-tree-view
            [members]="members()"
            [relations]="relations()"
            [viewOnly]="false"
          />
        }
      </div>
    </div>
  `,
  styles: [
    `
      .pub-layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #09090f;
        color: #e2e8f0;
      }
      .pub-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 10px 20px;
        background: #0c1120;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .pub-logo {
        font-size: 22px;
      }
      .pub-title {
        flex: 1;
      }
      .pub-title h1 {
        margin: 0;
        font-size: 15px;
      }
      .pub-sub {
        font-size: 11px;
        color: #475569;
      }
      .pub-badge {
        font-size: 10px;
        color: #22c55e;
        background: #0a1a0e;
        border: 1px solid #166534;
        padding: 3px 10px;
        border-radius: 12px;
      }
      .pub-body {
        flex: 1;
        overflow: hidden;
        position: relative;
      }
      .pub-center {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 16px;
        color: #64748b;
      }
      .pub-error {
        color: #ef4444;
      }
      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #1e293b;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class PublicTreePage implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  family = signal<Family | null>(null);
  members = signal<Member[]>([]);
  relations = signal<Relationship[]>([]);
  loading = signal(true);
  error = signal('');

  async ngOnInit() {
    const familyId = this.route.snapshot.params['token'];
    if (!familyId) {
      this.error.set('Link không hợp lệ.');
      this.loading.set(false);
      return;
    }
    const base = `${environment.apiUrl}/api/public/families/${familyId}`;
    try {
      const [fam, mem, rel] = await Promise.all([
        this.http.get<any>(base).toPromise(),
        this.http.get<any>(`${base}/members`).toPromise(),
        this.http.get<any>(`${base}/relations`).toPromise(),
      ]);
      this.family.set(fam?.data ?? null);
      this.members.set(mem?.data ?? []);
      this.relations.set(rel?.data ?? []);
    } catch (e: any) {
      this.error.set(
        e?.status === 403 || e?.status === 404
          ? 'Gia phả này chưa được chia sẻ công khai.'
          : 'Lỗi khi tải gia phả. Thử lại sau.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
