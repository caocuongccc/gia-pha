// apps/frontend/src/app/features/families/pages/access.page.ts
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type Role = 'OWNER' | 'EDITOR' | 'VIEWER';
interface Member {
  userId: string;
  role: Role;
  joinedAt: string;
  user: { id: string; email: string; name?: string; avatarUrl?: string };
  hasDrivePerm?: boolean;
  isDriveConnector?: boolean;
}
interface DriveStatus {
  connected: boolean;
  account?: { email: string; createdAt: string; connectedBy: string };
  authUrl: string;
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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="hd">
        <button class="btn-back" (click)="goBack()">←</button>
        <div>
          <h1 class="hd-title">👥 Phân quyền</h1>
          <div class="hd-sub">{{ familyName() }}</div>
        </div>
      </header>

      <div class="layout">
        <!-- ASIDE -->
        <aside class="aside">
          <!-- Invite form -->
          <div class="card">
            <div class="card-title">➕ Thêm thành viên</div>
            <p class="card-desc">
              Nhập email tài khoản đã đăng ký. Họ sẽ được thêm ngay với quyền
              bạn chọn.
            </p>
            <div class="invite-form">
              <input
                class="input-email"
                [(ngModel)]="inviteEmail"
                placeholder="email@example.com"
                type="email"
                (keyup.enter)="addMember()"
              />
              <div class="role-tabs">
                @for (r of roles; track r) {
                  <button
                    class="rt-btn"
                    [class.active]="inviteRole === r"
                    (click)="inviteRole = r"
                  >
                    {{ ROLE_LABELS[r] }}
                  </button>
                }
              </div>
              <div class="rt-desc">{{ ROLE_DESC[inviteRole] }}</div>
              <button
                class="btn-invite"
                [disabled]="adding()"
                (click)="addMember()"
              >
                {{ adding() ? 'Đang thêm...' : 'Thêm vào họ' }}
              </button>
              @if (inviteError()) {
                <div class="invite-err">{{ inviteError() }}</div>
              }
            </div>
          </div>

          <!-- Drive card -->
          <div class="card">
            <div class="card-title">🗂 Google Drive gia phả</div>
            @if (driveLoading()) {
              <div class="dc-note">Đang tải...</div>
            } @else if (drive()) {
              @if (drive()!.connected) {
                <div class="dc-connected">
                  <span class="dc-dot"></span>
                  <div>
                    <div class="dc-email">{{ drive()!.account!.email }}</div>
                    <div class="dc-date">
                      Kết nối {{ fmt(drive()!.account!.createdAt) }}
                    </div>
                  </div>
                </div>
                <div class="dc-btns">
                  <button class="btn-sm" (click)="openDrivePopup()">
                    🔄 Đổi account
                  </button>
                  <button class="btn-sm danger" (click)="disconnectDrive()">
                    Ngắt
                  </button>
                </div>
                <p class="dc-note">
                  Editors có toggle 🔑 bên dưới sẽ upload vào Drive này.
                </p>
              } @else {
                <p class="dc-note">
                  Kết nối 1 tài khoản Google Drive để lưu ảnh album.
                </p>
                <button class="btn-connect" (click)="openDrivePopup()">
                  Kết nối Google Drive
                </button>
              }
            }
          </div>

          <!-- Legend -->
          <div class="card">
            @for (r of roles; track r) {
              <div class="lg-row">
                <span class="role-chip" [class]="'rc-' + r.toLowerCase()">{{
                  ROLE_LABELS[r]
                }}</span>
                <span class="lg-desc">{{ ROLE_DESC[r] }}</span>
              </div>
            }
          </div>
        </aside>

        <!-- MAIN -->
        <main class="main">
          <div class="main-hd">
            <div class="main-title">
              Danh sách thành viên
              <span class="cnt">{{ members().length }}</span>
            </div>
          </div>

          @if (loading()) {
            <div class="state-msg">
              <div class="spinner"></div>
              Đang tải...
            </div>
          } @else if (members().length === 0) {
            <div class="state-msg">Chưa có thành viên nào</div>
          } @else {
            <div class="member-list">
              @for (m of members(); track m.userId) {
                <div class="member-row" [class.is-me]="m.userId === myUserId()">
                  @if (m.user.avatarUrl) {
                    <img class="av" [src]="m.user.avatarUrl" />
                  } @else {
                    <div class="av av-fb">
                      {{ initials(m.user.name || m.user.email) }}
                    </div>
                  }
                  <div class="m-info">
                    <div class="m-name">
                      {{ m.user.name || m.user.email }}
                      @if (m.userId === myUserId()) {
                        <span class="badge-me">Bạn</span>
                      }
                    </div>
                    <div class="m-email">{{ m.user.email }}</div>
                    <div class="m-meta">Tham gia {{ fmt(m.joinedAt) }}</div>
                  </div>
                  <div class="m-role">
                    @if (m.userId === myUserId()) {
                      <span
                        class="role-chip"
                        [class]="'rc-' + m.role.toLowerCase()"
                        >{{ ROLE_LABELS[m.role] }}</span
                      >
                    } @else {
                      <select
                        class="role-sel"
                        [value]="m.role"
                        (change)="changeRole(m, $event)"
                      >
                        <option value="OWNER">👑 Owner</option>
                        <option value="EDITOR">✏️ Editor</option>
                        <option value="VIEWER">👁 Viewer</option>
                      </select>
                    }
                  </div>
                  @if (drive()?.connected) {
                    <div class="m-drive">
                      @if (m.role === 'VIEWER') {
                        <span class="drive-na">—</span>
                      } @else if (m.isDriveConnector) {
                        <span title="Người kết nối Drive">🔑</span>
                      } @else {
                        <label class="toggle">
                          <input
                            type="checkbox"
                            [checked]="m.hasDrivePerm"
                            (change)="toggleDrive(m, $event)"
                          />
                          <span class="ts"></span>
                        </label>
                      }
                    </div>
                  }
                  @if (m.userId !== myUserId()) {
                    <button
                      class="btn-rm"
                      (click)="removeMember(m)"
                      title="Xoá khỏi gia phả"
                    >
                      ✕
                    </button>
                  }
                </div>
              }
            </div>
          }
        </main>
      </div>
    </div>

    @if (toast()) {
      <div class="toast" [class.err]="toastErr()">{{ toast() }}</div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      * {
        box-sizing: border-box;
      }
      .page {
        min-height: 100vh;
        background: #07080f;
        color: #e2e8f0;
        font-family: 'Segoe UI', sans-serif;
      }
      .hd {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 24px;
        background: #0b0f1c;
        border-bottom: 1px solid #111827;
      }
      .btn-back {
        padding: 6px 10px;
        background: none;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
      }
      .btn-back:hover {
        color: #94a3b8;
        border-color: #334155;
      }
      .hd-title {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }
      .hd-sub {
        font-size: 11px;
        color: #475569;
        margin-top: 2px;
      }
      .layout {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 20px;
        padding: 20px 24px;
        align-items: start;
      }
      @media (max-width: 860px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
      .aside {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .card {
        background: #0c1120;
        border: 1px solid #1e293b;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 14px;
      }
      .card-title {
        font-size: 13px;
        font-weight: 700;
        color: #f1f5f9;
        margin-bottom: 8px;
      }
      .card-desc {
        font-size: 11px;
        color: #475569;
        line-height: 1.6;
        margin: 0 0 12px;
      }
      .invite-form {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .input-email {
        background: #060d1a;
        border: 1px solid #1e293b;
        border-radius: 7px;
        padding: 9px 12px;
        color: #e2e8f0;
        font-size: 13px;
        width: 100%;
      }
      .input-email:focus {
        outline: none;
        border-color: #3b82f6;
      }
      .input-email::placeholder {
        color: #334155;
      }
      .role-tabs {
        display: flex;
        gap: 4px;
      }
      .rt-btn {
        flex: 1;
        padding: 6px 4px;
        font-size: 11px;
        background: none;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .rt-btn.active {
        border-color: #3b82f6;
        background: #0f1e38;
        color: #60a5fa;
        font-weight: 700;
      }
      .rt-desc {
        font-size: 10px;
        color: #475569;
        line-height: 1.5;
        min-height: 30px;
      }
      .btn-invite {
        padding: 9px;
        background: #1d4ed8;
        border: none;
        color: #fff;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-invite:hover:not(:disabled) {
        background: #2563eb;
      }
      .btn-invite:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .invite-err {
        font-size: 11px;
        color: #ef4444;
        background: #2d0a0a;
        border: 1px solid #7f1d1d;
        border-radius: 6px;
        padding: 8px 10px;
        line-height: 1.5;
      }
      .dc-note {
        font-size: 11px;
        color: #475569;
        line-height: 1.6;
        margin: 0 0 8px;
      }
      .dc-connected {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #060d1a;
        border: 1px solid #166534;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 10px;
      }
      .dc-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #22c55e;
        flex-shrink: 0;
      }
      .dc-email {
        font-size: 12px;
        font-weight: 600;
      }
      .dc-date {
        font-size: 10px;
        color: #334155;
      }
      .dc-btns {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }
      .btn-sm {
        flex: 1;
        padding: 6px;
        font-size: 11px;
        background: none;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 6px;
        cursor: pointer;
      }
      .btn-sm:hover {
        border-color: #334155;
        color: #94a3b8;
      }
      .btn-sm.danger {
        border-color: #2d0a0a;
        color: #ef4444;
      }
      .btn-sm.danger:hover {
        background: #2d0a0a;
      }
      .btn-connect {
        width: 100%;
        padding: 9px;
        background: #fff;
        border: none;
        color: #333;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
      }
      .btn-connect:hover {
        opacity: 0.9;
      }
      .lg-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 8px;
      }
      .lg-row:last-child {
        margin-bottom: 0;
      }
      .lg-desc {
        font-size: 11px;
        color: #475569;
        line-height: 1.5;
      }
      .role-chip {
        font-size: 10px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 10px;
        white-space: nowrap;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .rc-owner {
        background: #1e3a6e;
        color: #60a5fa;
      }
      .rc-editor {
        background: #1a2e0a;
        color: #4ade80;
      }
      .rc-viewer {
        background: #1e293b;
        color: #94a3b8;
      }
      .main {
        background: #0c1120;
        border: 1px solid #1e293b;
        border-radius: 12px;
        overflow: hidden;
      }
      .main-hd {
        padding: 14px 18px;
        border-bottom: 1px solid #111827;
      }
      .main-title {
        font-size: 13px;
        font-weight: 700;
        color: #f1f5f9;
      }
      .cnt {
        background: #1e293b;
        color: #64748b;
        font-size: 10px;
        padding: 2px 7px;
        border-radius: 8px;
        font-weight: 400;
        margin-left: 6px;
      }
      .state-msg {
        padding: 40px;
        text-align: center;
        color: #475569;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      .spinner {
        width: 16px;
        height: 16px;
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
      .member-list {
        display: flex;
        flex-direction: column;
      }
      .member-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 18px;
        border-bottom: 1px solid #0b0f1c;
        transition: background 0.12s;
      }
      .member-row:last-child {
        border-bottom: none;
      }
      .member-row:hover {
        background: #0a0f1a;
      }
      .member-row.is-me {
        background: #060d1a;
      }
      .av {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }
      .av-fb {
        width: 36px;
        height: 36px;
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
      .m-info {
        flex: 1;
        min-width: 0;
      }
      .m-name {
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .m-email {
        font-size: 11px;
        color: #475569;
        margin-top: 1px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .m-meta {
        font-size: 10px;
        color: #334155;
        margin-top: 2px;
      }
      .badge-me {
        font-size: 9px;
        background: #1e293b;
        color: #64748b;
        padding: 1px 6px;
        border-radius: 8px;
        font-weight: 400;
      }
      .m-role {
        flex-shrink: 0;
      }
      .role-sel {
        background: #060d1a;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 6px;
        padding: 5px 8px;
        font-size: 12px;
        cursor: pointer;
      }
      .role-sel:focus {
        outline: none;
        border-color: #3b82f6;
      }
      .m-drive {
        flex-shrink: 0;
        width: 36px;
        display: flex;
        justify-content: center;
      }
      .drive-na {
        color: #334155;
        font-size: 13px;
      }
      .toggle {
        position: relative;
        display: inline-block;
        width: 32px;
        height: 18px;
        cursor: pointer;
      }
      .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .ts {
        position: absolute;
        inset: 0;
        background: #1e293b;
        border-radius: 18px;
        transition: 0.2s;
      }
      .ts::before {
        content: '';
        position: absolute;
        width: 12px;
        height: 12px;
        left: 3px;
        bottom: 3px;
        background: #64748b;
        border-radius: 50%;
        transition: 0.2s;
      }
      .toggle input:checked + .ts {
        background: #1d4ed8;
      }
      .toggle input:checked + .ts::before {
        transform: translateX(14px);
        background: #fff;
      }
      .btn-rm {
        background: none;
        border: none;
        color: #475569;
        font-size: 14px;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 4px;
        flex-shrink: 0;
      }
      .btn-rm:hover {
        color: #ef4444;
      }
      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #1d4ed8;
        color: #fff;
        padding: 10px 20px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }
      .toast.err {
        background: #dc2626;
      }
    `,
  ],
})
export class AccessPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  familyId = '';
  familyName = signal('');
  myUserId = signal('');
  members = signal<Member[]>([]);
  loading = signal(false);
  drive = signal<DriveStatus | null>(null);
  driveLoading = signal(false);
  toast = signal('');
  toastErr = signal(false);

  inviteEmail = '';
  inviteRole: Role = 'VIEWER';
  adding = signal(false);
  inviteError = signal('');

  readonly roles: Role[] = ['OWNER', 'EDITOR', 'VIEWER'];
  readonly ROLE_LABELS = ROLE_LABELS;
  readonly ROLE_DESC = ROLE_DESC;

  private popup: Window | null = null;
  private onMsg = (e: MessageEvent) => {
    if (
      e.data?.type === 'DRIVE_CONNECTED' &&
      e.data.familyId === this.familyId
    ) {
      this.popup?.close();
      this.loadDrive().then(() => this.mergePermissions());
      this.showToast('Kết nối Google Drive thành công!');
    }
  };

  async ngOnInit() {
    this.familyId = this.route.snapshot.params['id'];
    window.addEventListener('message', this.onMsg);
    await Promise.all([this.loadAccess(), this.loadDrive()]);
    await this.mergePermissions();
  }
  ngOnDestroy() {
    window.removeEventListener('message', this.onMsg);
  }

  async loadAccess() {
    this.loading.set(true);
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/families/${this.familyId}/access`)
        .toPromise();
      this.members.set(
        (r.data ?? []).map((m: any) => ({
          userId: m.userId ?? m.user?.id,
          role: m.role,
          joinedAt: m.joinedAt ?? m.createdAt,
          user: m.user,
          hasDrivePerm: false,
          isDriveConnector: false,
        })),
      );
      if (r.myUserId) this.myUserId.set(r.myUserId);
      this.familyName.set(r.familyName ?? '');
    } catch {
      this.showToast('Lỗi tải danh sách', true);
    } finally {
      this.loading.set(false);
    }
  }

  async loadDrive() {
    this.driveLoading.set(true);
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/google-auth?familyId=${this.familyId}`)
        .toPromise();
      this.drive.set(r.data);
    } catch {
    } finally {
      this.driveLoading.set(false);
    }
  }

  async mergePermissions() {
    if (!this.drive()?.connected) return;
    try {
      const r: any = await this.http
        .get(
          `${environment.apiUrl}/api/google-auth/permissions?familyId=${this.familyId}`,
        )
        .toPromise();
      const perms: any[] = r.data ?? [];
      this.members.update((list) =>
        list.map((m) => {
          const p = perms.find((p) => p.userId === m.userId);
          return p
            ? {
                ...m,
                hasDrivePerm: p.hasAccess,
                isDriveConnector: p.isConnector,
              }
            : m;
        }),
      );
    } catch {}
  }

  async addMember() {
    const email = this.inviteEmail.trim();
    if (!email) return;
    this.inviteError.set('');
    this.adding.set(true);
    try {
      const r: any = await this.http
        .post(`${environment.apiUrl}/api/families/${this.familyId}/access`, {
          email,
          role: this.inviteRole,
        })
        .toPromise();
      const m = r.data;
      this.members.update((list) => [
        ...list,
        {
          userId: m.userId ?? m.user?.id,
          role: m.role,
          joinedAt: m.joinedAt ?? new Date().toISOString(),
          user: m.user,
          hasDrivePerm: false,
          isDriveConnector: false,
        },
      ]);
      this.inviteEmail = '';
      this.showToast(`Đã thêm ${email}`);
    } catch (err: any) {
      this.inviteError.set(err?.error?.error ?? 'Lỗi thêm thành viên');
    } finally {
      this.adding.set(false);
    }
  }

  async changeRole(m: Member, e: Event) {
    const newRole = (e.target as HTMLSelectElement).value as Role;
    const old = m.role;
    this.members.update((l) =>
      l.map((x) => (x.userId === m.userId ? { ...x, role: newRole } : x)),
    );
    try {
      await this.http
        .patch(`${environment.apiUrl}/api/families/${this.familyId}/access`, {
          userId: m.userId,
          role: newRole,
        })
        .toPromise();
      if (newRole === 'VIEWER' && old !== 'VIEWER') {
        await this.revokeDrivePerm(m.userId).catch(() => {});
        this.members.update((l) =>
          l.map((x) =>
            x.userId === m.userId ? { ...x, hasDrivePerm: false } : x,
          ),
        );
      }
      this.showToast('Đã cập nhật quyền');
    } catch {
      this.members.update((l) =>
        l.map((x) => (x.userId === m.userId ? { ...x, role: old } : x)),
      );
      this.showToast('Lỗi cập nhật', true);
    }
  }

  async toggleDrive(m: Member, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.members.update((l) =>
      l.map((x) =>
        x.userId === m.userId ? { ...x, hasDrivePerm: checked } : x,
      ),
    );
    try {
      if (checked) {
        await this.http
          .post(
            `${environment.apiUrl}/api/google-auth/permissions?familyId=${this.familyId}`,
            { familyId: this.familyId, userId: m.userId },
          )
          .toPromise();
        this.showToast(`Đã cấp quyền Drive cho ${m.user.name || m.user.email}`);
      } else {
        await this.revokeDrivePerm(m.userId);
        this.showToast('Đã thu hồi quyền Drive');
      }
    } catch {
      this.members.update((l) =>
        l.map((x) =>
          x.userId === m.userId ? { ...x, hasDrivePerm: !checked } : x,
        ),
      );
      this.showToast('Lỗi cập nhật quyền Drive', true);
    }
  }

  private revokeDrivePerm(userId: string) {
    return this.http
      .delete(
        `${environment.apiUrl}/api/google-auth/permissions?familyId=${this.familyId}`,
        { body: { familyId: this.familyId, userId } },
      )
      .toPromise();
  }

  openDrivePopup() {
    const url = this.drive()?.authUrl;
    if (!url) return;
    this.popup = window.open(
      url,
      'google_drive_auth',
      'width=520,height=620,scrollbars=yes',
    );
  }

  async disconnectDrive() {
    if (!confirm('Ngắt kết nối Google Drive? Ảnh đã upload vẫn giữ nguyên.'))
      return;
    try {
      await this.http
        .delete(
          `${environment.apiUrl}/api/google-auth?familyId=${this.familyId}`,
        )
        .toPromise();
      await this.loadDrive();
      this.members.update((l) =>
        l.map((m) => ({ ...m, hasDrivePerm: false, isDriveConnector: false })),
      );
      this.showToast('Đã ngắt kết nối');
    } catch {
      this.showToast('Lỗi', true);
    }
  }

  async removeMember(m: Member) {
    if (!confirm(`Xoá ${m.user.name || m.user.email} khỏi gia phả?`)) return;
    try {
      await this.http
        .delete(`${environment.apiUrl}/api/families/${this.familyId}/access`, {
          params: { userId: m.userId },
        })
        .toPromise();
      this.members.update((l) => l.filter((x) => x.userId !== m.userId));
      this.showToast('Đã xoá');
    } catch {
      this.showToast('Lỗi xoá', true);
    }
  }

  goBack() {
    this.router.navigate(['/families']);
  }
  initials(s: string) {
    return (
      (s || '?')
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(-2)
        .join('')
        .toUpperCase() || '?'
    );
  }
  fmt(d: string) {
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  private showToast(msg: string, err = false) {
    this.toast.set(msg);
    this.toastErr.set(err);
    setTimeout(() => this.toast.set(''), 2800);
  }
}
