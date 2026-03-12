// apps/frontend/src/app/features/families/components/drive-settings.component.ts
// Component nhúng vào access.page.ts (hoặc settings)
// Hiển thị cho OWNER: trạng thái Drive + cấp/thu quyền từng Editor
import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface DriveUser {
  userId: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  role: string;
  hasAccess: boolean;
  isConnector: boolean;
}
interface DriveStatus {
  connected: boolean;
  account?: { email: string; createdAt: string; connectedBy: string };
  authUrl: string;
}

@Component({
  selector: 'app-drive-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="drive-card">
      <div class="drive-hd">
        <div class="drive-icon">
          <svg
            width="22"
            height="22"
            viewBox="0 0 87.3 78"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
              fill="#0066da"
            />
            <path
              d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
              fill="#00ac47"
            />
            <path
              d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
              fill="#ea4335"
            />
            <path
              d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
              fill="#00832d"
            />
            <path
              d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
              fill="#2684fc"
            />
            <path
              d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z"
              fill="#ffba00"
            />
          </svg>
        </div>
        <div>
          <div class="drive-title">Google Drive gia phả</div>
          <div class="drive-sub">
            Kết nối để lưu ảnh album — dùng chung cho cả gia phả
          </div>
        </div>
      </div>

      <!-- Trạng thái kết nối -->
      @if (loading()) {
        <div class="drive-loading">Đang tải...</div>
      } @else if (status()) {
        @if (status()!.connected) {
          <!-- ĐÃ KẾT NỐI -->
          <div class="drive-connected">
            <div class="conn-row">
              <span class="conn-dot"></span>
              <div class="conn-info">
                <div class="conn-email">{{ status()!.account?.email }}</div>
                <div class="conn-date">
                  Kết nối {{ fmtDate(status()!.account!.createdAt) }}
                </div>
              </div>
              <button class="btn-relink" (click)="openConnectPopup()">
                🔄 Đổi tài khoản
              </button>
              <button class="btn-unlink" (click)="disconnect()">
                Ngắt kết nối
              </button>
            </div>
          </div>

          <!-- Cấp quyền upload cho Editors -->
          <div class="perm-section">
            <div class="perm-title">Cấp quyền upload cho Editors</div>
            <div class="perm-hint">
              Editors được cấp quyền sẽ upload ảnh thẳng lên Drive
              <strong>{{ status()!.account?.email }}</strong> — không cần kết
              nối tài khoản riêng.
            </div>

            @if (loadingPerms()) {
              <div class="perm-loading">Đang tải...</div>
            } @else {
              <div class="perm-list">
                @for (u of users(); track u.userId) {
                  <div class="perm-row" [class.perm-me]="u.isConnector">
                    <div class="perm-av">
                      @if (u.avatarUrl) {
                        <img [src]="u.avatarUrl" class="perm-img" />
                      } @else {
                        <div class="perm-fb">
                          {{ initials(u.name || u.email) }}
                        </div>
                      }
                    </div>
                    <div class="perm-user">
                      <div class="perm-name">{{ u.name || u.email }}</div>
                      <div class="perm-email">{{ u.email }}</div>
                    </div>
                    <div class="perm-role">
                      <span
                        class="role-chip"
                        [class.owner]="u.role === 'OWNER'"
                      >
                        {{ u.role === 'OWNER' ? '👑 Owner' : '✏️ Editor' }}
                      </span>
                    </div>
                    <div class="perm-toggle">
                      @if (u.isConnector) {
                        <span class="perm-connector">🔑 Người kết nối</span>
                      } @else {
                        <label
                          class="toggle"
                          [title]="
                            u.hasAccess ? 'Thu hồi quyền' : 'Cấp quyền upload'
                          "
                        >
                          <input
                            type="checkbox"
                            [checked]="u.hasAccess"
                            (change)="togglePerm(u, $event)"
                          />
                          <span class="toggle-slider"></span>
                        </label>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        } @else {
          <!-- CHƯA KẾT NỐI -->
          <div class="drive-empty">
            <div class="empty-desc">
              Kết nối 1 tài khoản Google Drive để lưu ảnh album.<br />
              Có thể dùng tài khoản riêng biệt với tài khoản đăng nhập.
            </div>
            <button class="btn-connect" (click)="openConnectPopup()">
              <svg width="16" height="16" viewBox="0 0 87.3 78" fill="none">
                <path
                  d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
                  fill="#0066da"
                />
                <path
                  d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
                  fill="#00ac47"
                />
                <path
                  d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
                  fill="#ea4335"
                />
                <path
                  d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
                  fill="#00832d"
                />
                <path
                  d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
                  fill="#2684fc"
                />
                <path
                  d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z"
                  fill="#ffba00"
                />
              </svg>
              Kết nối Google Drive
            </button>
          </div>
        }
      }

      @if (toast()) {
        <div class="ds-toast" [class.err]="toastErr()">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [
    `
      .drive-card {
        background: #0c1120;
        border: 1px solid #1e293b;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
      }
      .drive-hd {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 20px;
      }
      .drive-icon {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #060d1a;
        border-radius: 8px;
        border: 1px solid #1e293b;
      }
      .drive-title {
        font-size: 14px;
        font-weight: 700;
        color: #f1f5f9;
        margin-bottom: 2px;
      }
      .drive-sub {
        font-size: 12px;
        color: #475569;
      }
      .drive-loading,
      .perm-loading {
        color: #475569;
        font-size: 13px;
        padding: 8px 0;
      }

      /* Connected */
      .conn-row {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #060d1a;
        border: 1px solid #1e293b;
        border-radius: 10px;
        padding: 14px 16px;
      }
      .conn-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #22c55e;
        flex-shrink: 0;
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
      }
      .conn-info {
        flex: 1;
        min-width: 0;
      }
      .conn-email {
        font-size: 14px;
        font-weight: 600;
        color: #f1f5f9;
      }
      .conn-date {
        font-size: 11px;
        color: #334155;
        margin-top: 2px;
      }
      .btn-relink {
        padding: 6px 12px;
        background: none;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        white-space: nowrap;
      }
      .btn-relink:hover {
        border-color: #334155;
        color: #94a3b8;
      }
      .btn-unlink {
        padding: 6px 12px;
        background: none;
        border: 1px solid #2d0a0a;
        color: #ef4444;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        white-space: nowrap;
      }
      .btn-unlink:hover {
        background: #2d0a0a;
      }

      /* Permissions */
      .perm-section {
        margin-top: 20px;
      }
      .perm-title {
        font-size: 13px;
        font-weight: 600;
        color: #94a3b8;
        margin-bottom: 6px;
      }
      .perm-hint {
        font-size: 12px;
        color: #334155;
        margin-bottom: 14px;
        line-height: 1.6;
      }
      .perm-hint strong {
        color: #475569;
      }
      .perm-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .perm-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: #060d1a;
        border: 1px solid #1e293b;
        border-radius: 8px;
      }
      .perm-row.perm-me {
        border-color: #1e3a6e;
        background: #050e1a;
      }
      .perm-av {
        flex-shrink: 0;
      }
      .perm-img {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
      }
      .perm-fb {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #1e3a6e;
        color: #60a5fa;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
      }
      .perm-user {
        flex: 1;
        min-width: 0;
      }
      .perm-name {
        font-size: 13px;
        font-weight: 600;
        color: #e2e8f0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .perm-email {
        font-size: 11px;
        color: #334155;
      }
      .perm-role {
        flex-shrink: 0;
      }
      .role-chip {
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 10px;
        background: #1e293b;
        color: #475569;
      }
      .role-chip.owner {
        background: #1e3a6e;
        color: #60a5fa;
      }
      .perm-toggle {
        flex-shrink: 0;
      }
      .perm-connector {
        font-size: 11px;
        color: #3b82f6;
        font-weight: 600;
      }

      /* Toggle switch */
      .toggle {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 22px;
        cursor: pointer;
      }
      .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .toggle-slider {
        position: absolute;
        inset: 0;
        background: #1e293b;
        border-radius: 22px;
        transition: 0.2s;
      }
      .toggle-slider::before {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        left: 3px;
        bottom: 3px;
        background: #475569;
        border-radius: 50%;
        transition: 0.2s;
      }
      .toggle input:checked + .toggle-slider {
        background: #1d4ed8;
      }
      .toggle input:checked + .toggle-slider::before {
        background: #fff;
        transform: translateX(18px);
      }

      /* Not connected */
      .drive-empty {
        text-align: center;
        padding: 20px;
      }
      .empty-desc {
        font-size: 13px;
        color: #475569;
        line-height: 1.7;
        margin-bottom: 16px;
      }
      .btn-connect {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 22px;
        background: #fff;
        border: none;
        color: #444;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: box-shadow 0.2s;
      }
      .btn-connect:hover {
        box-shadow: 0 2px 12px rgba(255, 255, 255, 0.15);
      }

      .ds-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #16a34a;
        color: #fff;
        padding: 9px 22px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        z-index: 999;
        white-space: nowrap;
      }
      .ds-toast.err {
        background: #dc2626;
      }
    `,
  ],
})
export class DriveSettingsComponent implements OnInit {
  private http = inject(HttpClient);

  @Input() familyId = '';

  loading = signal(true);
  loadingPerms = signal(false);
  status = signal<DriveStatus | null>(null);
  users = signal<DriveUser[]>([]);
  toast = signal('');
  toastErr = signal(false);

  private popupRef: Window | null = null;

  async ngOnInit() {
    await this.loadStatus();
    // Lắng nghe postMessage từ popup OAuth callback
    window.addEventListener('message', this.onPopupMessage);
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.onPopupMessage);
  }

  private onPopupMessage = async (e: MessageEvent) => {
    if (
      e.data?.type === 'DRIVE_CONNECTED' &&
      e.data.familyId === this.familyId
    ) {
      this.popupRef?.close();
      await this.loadStatus();
      await this.loadPermissions();
      this.showToast('Kết nối Google Drive thành công!');
    }
  };

  async loadStatus() {
    this.loading.set(true);
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/google-auth?familyId=${this.familyId}`)
        .toPromise();
      this.status.set(r.data);
      if (r.data.connected) await this.loadPermissions();
    } catch {
      this.showToast('Lỗi tải trạng thái Drive', true);
    } finally {
      this.loading.set(false);
    }
  }

  async loadPermissions() {
    this.loadingPerms.set(true);
    try {
      const r: any = await this.http
        .get(
          `${environment.apiUrl}/api/google-auth/permissions?familyId=${this.familyId}`,
        )
        .toPromise();
      this.users.set(r.data);
    } catch {
    } finally {
      this.loadingPerms.set(false);
    }
  }

  openConnectPopup() {
    const url = this.status()?.authUrl;
    if (!url) return;
    // Mở popup nhỏ để user chọn Google account
    this.popupRef = window.open(
      url,
      'google_drive_auth',
      'width=520,height=620,scrollbars=yes,resizable=yes',
    );
  }

  async disconnect() {
    if (!confirm('Ngắt kết nối Google Drive? Ảnh đã upload vẫn giữ nguyên.'))
      return;
    try {
      await this.http
        .delete(
          `${environment.apiUrl}/api/google-auth?familyId=${this.familyId}`,
        )
        .toPromise();
      await this.loadStatus();
      this.showToast('Đã ngắt kết nối');
    } catch {
      this.showToast('Lỗi', true);
    }
  }

  async togglePerm(u: DriveUser, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    try {
      if (checked) {
        await this.http
          .post(`${environment.apiUrl}/api/google-auth/permissions`, {
            familyId: this.familyId,
            userId: u.userId,
          })
          .toPromise();
        this.showToast(`Đã cấp quyền cho ${u.name || u.email}`);
      } else {
        await this.http
          .delete(`${environment.apiUrl}/api/google-auth/permissions`, {
            body: { familyId: this.familyId, userId: u.userId },
          })
          .toPromise();
        this.showToast(`Đã thu hồi quyền`);
      }
      this.users.update((list) =>
        list.map((x) =>
          x.userId === u.userId ? { ...x, hasAccess: checked } : x,
        ),
      );
    } catch {
      // Revert toggle
      (e.target as HTMLInputElement).checked = !checked;
      this.showToast('Lỗi cập nhật quyền', true);
    }
  }

  initials(s: string) {
    return s
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

  private showToast(msg: string, err = false) {
    this.toast.set(msg);
    this.toastErr.set(err);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
