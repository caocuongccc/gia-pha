// apps/frontend/src/app/features/families/pages/access.page.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type Role = 'OWNER' | 'EDITOR' | 'VIEWER';

interface AccessEntry {
  userId: string;
  role: Role;
  joinedAt: string;
  user: { id: string; email: string; name?: string; avatarUrl?: string };
}

const ROLE_LABELS: Record<Role, string> = {
  OWNER: '👑 Owner',
  EDITOR: '✏️ Editor',
  VIEWER: '👁 Viewer',
};

const ROLE_DESC: Record<Role, string> = {
  OWNER: 'Toàn quyền — thêm/sửa/xoá, quản lý chi phái, phân quyền, xoá gia phả',
  EDITOR: 'Thêm/sửa/xoá thành viên, quan hệ, chi phái, khuyến học & quỹ họ',
  VIEWER: 'Chỉ xem — không thay đổi được gì',
};

@Component({
  selector: 'app-access',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ac">
      <header class="ac-header">
        <button class="btn-back" (click)="goBack()">← Gia phả</button>
        <div class="ac-title">
          <h1>👥 Phân quyền thành viên</h1>
          <span class="ac-sub">{{ familyName() }}</span>
        </div>
      </header>

      <!-- Role legend -->
      <div class="role-legend">
        @for (role of roles; track role) {
          <div class="legend-card">
            <div class="legend-label">{{ ROLE_LABELS[role] }}</div>
            <div class="legend-desc">{{ ROLE_DESC[role] }}</div>
          </div>
        }
      </div>

      <!-- Member list -->
      <div class="ac-body">
        @if (loading()) {
          <div class="ac-empty">Đang tải...</div>
        } @else if (accessList().length === 0) {
          <div class="ac-empty">Chưa có thành viên nào.</div>
        } @else {
          <table class="ac-table">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Email</th>
                <th>Tham gia</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (entry of accessList(); track entry.userId) {
                <tr [class.is-me]="entry.userId === myUserId()">
                  <td>
                    <div class="user-cell">
                      @if (entry.user.avatarUrl) {
                        <img class="avatar" [src]="entry.user.avatarUrl" />
                      } @else {
                        <div class="avatar-fallback">
                          {{ initials(entry.user.name || entry.user.email) }}
                        </div>
                      }
                      <div>
                        <div class="user-name">
                          {{ entry.user.name || '—' }}
                        </div>
                        @if (entry.userId === myUserId()) {
                          <span class="me-tag">Bạn</span>
                        }
                      </div>
                    </div>
                  </td>
                  <td class="user-email">{{ entry.user.email }}</td>
                  <td class="user-joined">{{ fmtDate(entry.joinedAt) }}</td>
                  <td>
                    @if (entry.userId === myUserId()) {
                      <!-- Không tự đổi role mình -->
                      <span class="role-badge role-{{ entry.role }}">{{
                        ROLE_LABELS[entry.role]
                      }}</span>
                    } @else {
                      <select
                        class="role-select"
                        [value]="entry.role"
                        (change)="changeRole(entry, $any($event.target).value)"
                      >
                        <option value="OWNER">👑 Owner</option>
                        <option value="EDITOR">✏️ Editor</option>
                        <option value="VIEWER">👁 Viewer</option>
                      </select>
                    }
                  </td>
                  <td>
                    @if (entry.userId !== myUserId()) {
                      <button
                        class="btn-remove"
                        (click)="removeUser(entry)"
                        title="Xoá khỏi gia phả"
                      >
                        ✕
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Toast -->
      @if (toast()) {
        <div class="toast" [class.error]="toastError()">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [
    `
      .ac {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #09090f;
        color: #e2e8f0;
        font-family: 'Segoe UI', sans-serif;
      }
      .ac-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 10px 20px;
        background: #0c1120;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .ac-title {
        flex: 1;
      }
      .ac-title h1 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }
      .ac-sub {
        font-size: 11px;
        color: #475569;
      }
      .btn-back {
        padding: 5px 12px;
        font-size: 12px;
        background: #141828;
        border: 1px solid #1e293b;
        color: #94a3b8;
        border-radius: 5px;
        cursor: pointer;
      }

      .role-legend {
        display: flex;
        gap: 10px;
        padding: 16px 20px;
        border-bottom: 1px solid #0f1828;
        flex-wrap: wrap;
      }
      .legend-card {
        flex: 1;
        min-width: 200px;
        background: #0c1828;
        border: 1px solid #1e293b;
        border-radius: 8px;
        padding: 10px 14px;
      }
      .legend-label {
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .legend-desc {
        font-size: 11px;
        color: #475569;
        line-height: 1.5;
      }

      .ac-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      .ac-empty {
        text-align: center;
        padding: 60px;
        color: #475569;
        font-size: 14px;
      }

      .ac-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .ac-table th {
        text-align: left;
        padding: 10px 12px;
        font-size: 10px;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid #1e293b;
      }
      .ac-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #0a0f1a;
        vertical-align: middle;
      }
      .ac-table tr:last-child td {
        border-bottom: none;
      }
      .ac-table tr.is-me td {
        background: #0c1828;
      }
      .ac-table tr:hover td {
        background: #0a0f1a;
      }

      .user-cell {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
      }
      .avatar-fallback {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #1e3a6e;
        color: #60a5fa;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .user-name {
        font-size: 13px;
        color: #e2e8f0;
        font-weight: 500;
      }
      .user-email {
        color: #64748b;
        font-size: 12px;
      }
      .user-joined {
        color: #475569;
        font-size: 11px;
        white-space: nowrap;
      }
      .me-tag {
        font-size: 9px;
        background: #0f1e38;
        color: #60a5fa;
        border: 1px solid #1e3a6e;
        border-radius: 8px;
        padding: 1px 6px;
      }

      .role-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 8px;
      }
      .role-OWNER {
        background: #1a1200;
        color: #f59e0b;
      }
      .role-EDITOR {
        background: #0a1a0e;
        color: #22c55e;
      }
      .role-VIEWER {
        background: #0f1828;
        color: #60a5fa;
      }

      .role-select {
        background: #0c1828;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 6px;
        padding: 5px 8px;
        font-size: 12px;
        cursor: pointer;
      }
      .role-select:focus {
        outline: none;
        border-color: #3b82f6;
      }

      .btn-remove {
        background: none;
        border: 1px solid #334155;
        color: #475569;
        border-radius: 5px;
        padding: 3px 8px;
        cursor: pointer;
        font-size: 11px;
      }
      .btn-remove:hover {
        border-color: #ef4444;
        color: #ef4444;
      }

      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #22c55e;
        color: #fff;
        padding: 10px 24px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        animation: fadeIn 0.2s;
        z-index: 999;
      }
      .toast.error {
        background: #ef4444;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `,
  ],
})
export class AccessPage implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  familyId = '';
  familyName = signal('');
  myUserId = signal('');
  accessList = signal<AccessEntry[]>([]);
  loading = signal(false);
  toast = signal('');
  toastError = signal(false);

  roles: Role[] = ['OWNER', 'EDITOR', 'VIEWER'];
  ROLE_LABELS = ROLE_LABELS;
  ROLE_DESC = ROLE_DESC;

  async ngOnInit() {
    this.familyId = this.route.snapshot.params['id'];
    await Promise.all([this.loadFamilyName(), this.loadAccess()]);
  }

  private async loadFamilyName() {
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/families/${this.familyId}`)
        .toPromise();
      this.familyName.set(r?.data?.name ?? '');
    } catch {}
  }

  async loadAccess() {
    this.loading.set(true);
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/families/${this.familyId}/access`)
        .toPromise();
      const list: AccessEntry[] = r?.data ?? [];
      this.accessList.set(list);

      // Nếu myUserId chưa set, thử lấy từ my-role
      if (!this.myUserId()) {
        const roleRes: any = await this.http
          .get(`${environment.apiUrl}/api/families/${this.familyId}/my-role`)
          .toPromise();
        if (roleRes?.data?.userId) this.myUserId.set(roleRes.data.userId);
      }
    } catch (e: any) {
      this.showToast('Không có quyền truy cập', true);
      this.router.navigate(['/families', this.familyId]);
    } finally {
      this.loading.set(false);
    }
  }

  async changeRole(entry: AccessEntry, newRole: Role) {
    if (newRole === entry.role) return;
    try {
      await this.http
        .patch(`${environment.apiUrl}/api/families/${this.familyId}/access`, {
          userId: entry.userId,
          role: newRole,
        })
        .toPromise();
      // Update local
      this.accessList.update((list) =>
        list.map((e) =>
          e.userId === entry.userId ? { ...e, role: newRole } : e,
        ),
      );
      this.showToast(
        `Đã đổi ${entry.user.name || entry.user.email} → ${ROLE_LABELS[newRole]}`,
      );
    } catch {
      this.showToast('Lỗi khi đổi role', true);
    }
  }

  async removeUser(entry: AccessEntry) {
    if (!confirm(`Xoá ${entry.user.name || entry.user.email} khỏi gia phả?`))
      return;
    try {
      await this.http
        .delete(
          `${environment.apiUrl}/api/families/${this.familyId}/access?userId=${entry.userId}`,
        )
        .toPromise();
      this.accessList.update((list) =>
        list.filter((e) => e.userId !== entry.userId),
      );
      this.showToast('Đã xoá thành viên');
    } catch {
      this.showToast('Lỗi khi xoá', true);
    }
  }

  private showToast(msg: string, error = false) {
    this.toast.set(msg);
    this.toastError.set(error);
    setTimeout(() => this.toast.set(''), 3000);
  }

  initials(name: string) {
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(-2)
      .join('')
      .toUpperCase();
  }

  fmtDate(d: string) {
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  goBack() {
    this.router.navigate(['/families', this.familyId]);
  }
}
