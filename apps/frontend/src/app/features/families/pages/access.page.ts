// apps/frontend/src/app/features/families/pages/access.page.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type Role = 'OWNER' | 'EDITOR' | 'VIEWER';

interface Member {
  userId: string;
  role: Role;
  joinedAt: string;
  user: { id: string; email: string; name?: string; avatarUrl?: string };
  // Drive permission (chỉ có nghĩa khi driveConnected && role !== VIEWER)
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
  imports: [CommonModule],
  template: `
    <div class="page">
      <header class="hd">
        <button class="btn-back" (click)="goBack()">← Gia phả</button>
        <div>
          <h1 class="hd-title">👥 Phân quyền thành viên</h1>
          <div class="hd-sub">{{ familyName() }}</div>
        </div>
      </header>

      <div class="body">
        <!-- ── LEFT: Drive card ───────────────────────────────── -->
        <aside class="drive-col">
          <div class="drive-card">
            <div class="dc-hd">
              <div class="dc-logo">
                <svg width="20" height="20" viewBox="0 0 87.3 78" fill="none">
                  <path
                    d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
                    fill="#0066da"
                  />
                  <path
                    d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z"
                    fill="#00ac47"
                  />
                  <path
                    d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z"
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
                <div class="dc-title">Google Drive gia phả</div>
                <div class="dc-sub">
                  Kết nối để lưu ảnh album — dùng chung cho cả gia phả
                </div>
              </div>
            </div>

            @if (driveLoading()) {
              <div class="dc-loading">Đang tải...</div>
            } @else if (drive()) {
              @if (drive()!.connected) {
                <!-- Đã kết nối -->
                <div class="dc-connected">
                  <span class="dc-dot"></span>
                  <div class="dc-info">
                    <div class="dc-email">{{ drive()!.account!.email }}</div>
                    <div class="dc-date">
                      Kết nối {{ fmt(drive()!.account!.createdAt) }}
                    </div>
                  </div>
                </div>
                <div class="dc-btns">
                  <button class="btn-relink" (click)="openDrivePopup()">
                    🔄 Đổi tài khoản
                  </button>
                  <button class="btn-unlink" (click)="disconnectDrive()">
                    Ngắt
                  </button>
                </div>
                <div class="dc-note">
                  Editors có toggle 🔑 Drive bên dưới sẽ upload ảnh vào Drive
                  này — không cần kết nối tài khoản riêng.
                </div>
              } @else {
                <!-- Chưa kết nối -->
                <div class="dc-empty">
                  <p>
                    Kết nối 1 tài khoản Google Drive để lưu ảnh album.<br />Có
                    thể dùng account khác với account đăng nhập.
                  </p>
                  <button class="btn-connect" (click)="openDrivePopup()">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 87.3 78"
                      fill="none"
                      style="flex-shrink:0"
                    >
                      <path
                        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
                        fill="#0066da"
                      />
                      <path
                        d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z"
                        fill="#00ac47"
                      />
                      <path
                        d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z"
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
          </div>

          <!-- Role legend -->
          <div class="legend">
            @for (r of roles; track r) {
              <div class="lg-row">
                <span class="lg-chip" [class]="'role-' + r.toLowerCase()">{{
                  ROLE_LABELS[r]
                }}</span>
                <span class="lg-desc">{{ ROLE_DESC[r] }}</span>
              </div>
            }
          </div>
        </aside>

        <!-- ── RIGHT: Members table ───────────────────────────── -->
        <main class="members-col">
          <div class="tbl-hd">
            <div class="tbl-col col-user">THÀNH VIÊN</div>
            <div class="tbl-col col-email">EMAIL</div>
            <div class="tbl-col col-joined">THAM GIA</div>
            <div class="tbl-col col-role">ROLE</div>
            @if (drive()?.connected) {
              <div class="tbl-col col-drive" title="Quyền upload Google Drive">
                🔑 DRIVE
              </div>
            }
            <div class="tbl-col col-del"></div>
          </div>

          @if (loading()) {
            <div class="tbl-empty">Đang tải...</div>
          } @else {
            @for (m of members(); track m.userId) {
              <div class="tbl-row" [class.row-me]="m.userId === myUserId()">
                <!-- Avatar + name -->
                <div class="tbl-cell col-user">
                  <div class="av-wrap">
                    @if (m.user.avatarUrl) {
                      <img class="av" [src]="m.user.avatarUrl" />
                    } @else {
                      <div class="av av-fb">
                        {{ initials(m.user.name || m.user.email) }}
                      </div>
                    }
                    <div>
                      <div class="m-name">{{ m.user.name || '—' }}</div>
                      @if (m.userId === myUserId()) {
                        <span class="badge-me">Bạn</span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Email -->
                <div class="tbl-cell col-email">{{ m.user.email }}</div>

                <!-- Joined -->
                <div class="tbl-cell col-joined">{{ fmt(m.joinedAt) }}</div>

                <!-- Role -->
                <div class="tbl-cell col-role">
                  @if (m.userId === myUserId()) {
                    <span
                      class="role-badge"
                      [class]="'role-' + m.role.toLowerCase()"
                    >
                      {{ ROLE_LABELS[m.role] }}
                    </span>
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

                <!-- Drive toggle — chỉ hiện khi drive connected và role EDITOR/OWNER -->
                @if (drive()?.connected) {
                  <div class="tbl-cell col-drive">
                    @if (m.role === 'VIEWER') {
                      <span
                        class="drive-na"
                        title="Viewer không cần quyền Drive"
                        >—</span
                      >
                    } @else if (m.isDriveConnector) {
                      <span
                        class="drive-owner-badge"
                        title="Người kết nối Drive"
                        >🔑</span
                      >
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

                <!-- Remove -->
                <div class="tbl-cell col-del">
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
              </div>
            }
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
      /* ── Layout ─────────────────────────────────────────────── */
      .page {
        min-height: 100vh;
        background: #07080f;
        color: #e2e8f0;
        font-family: 'Segoe UI', sans-serif;
      }
      .hd {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 24px;
        background: #0b0f1c;
        border-bottom: 1px solid #111827;
      }
      .btn-back {
        padding: 6px 12px;
        background: none;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 6px;
        font-size: 12px;
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

      .body {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 24px;
        padding: 24px;
        align-items: start;
      }
      @media (max-width: 900px) {
        .body {
          grid-template-columns: 1fr;
        }
      }

      /* ── Drive Card ──────────────────────────────────────────── */
      .drive-col {
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: sticky;
        top: 24px;
      }
      .drive-card {
        background: #0c1120;
        border: 1px solid #1e293b;
        border-radius: 12px;
        padding: 18px;
      }
      .dc-hd {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      .dc-logo {
        width: 36px;
        height: 36px;
        background: #060d1a;
        border: 1px solid #1e293b;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .dc-title {
        font-size: 13px;
        font-weight: 700;
        color: #f1f5f9;
        margin-bottom: 2px;
      }
      .dc-sub {
        font-size: 11px;
        color: #475569;
      }
      .dc-loading {
        font-size: 12px;
        color: #475569;
      }

      .dc-connected {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #060d1a;
        border: 1px solid #166534;
        border-radius: 8px;
        padding: 12px 14px;
        margin-bottom: 10px;
      }
      .dc-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        flex-shrink: 0;
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
      }
      .dc-email {
        font-size: 13px;
        font-weight: 600;
        color: #f1f5f9;
      }
      .dc-date {
        font-size: 10px;
        color: #334155;
        margin-top: 1px;
      }
      .dc-info {
        flex: 1;
        min-width: 0;
        overflow: hidden;
      }
      .dc-btns {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      .btn-relink {
        flex: 1;
        padding: 7px;
        font-size: 12px;
        background: none;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 7px;
        cursor: pointer;
      }
      .btn-relink:hover {
        border-color: #334155;
        color: #94a3b8;
      }
      .btn-unlink {
        padding: 7px 12px;
        font-size: 12px;
        background: none;
        border: 1px solid #2d0a0a;
        color: #ef4444;
        border-radius: 7px;
        cursor: pointer;
      }
      .btn-unlink:hover {
        background: #2d0a0a;
      }
      .dc-note {
        font-size: 11px;
        color: #334155;
        line-height: 1.6;
        border-top: 1px solid #111827;
        padding-top: 10px;
      }

      .dc-empty p {
        font-size: 12px;
        color: #475569;
        line-height: 1.7;
        margin: 0 0 12px;
      }
      .btn-connect {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 10px;
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

      /* ── Legend ─────────────────────────────────────────────── */
      .legend {
        background: #0c1120;
        border: 1px solid #1e293b;
        border-radius: 12px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .lg-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }
      .lg-chip {
        font-size: 10px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 10px;
        white-space: nowrap;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .lg-desc {
        font-size: 11px;
        color: #475569;
        line-height: 1.5;
      }
      .role-owner {
        background: #1e3a6e;
        color: #60a5fa;
      }
      .role-editor {
        background: #1a2e0a;
        color: #4ade80;
      }
      .role-viewer {
        background: #1e293b;
        color: #64748b;
      }

      /* ── Members table ───────────────────────────────────────── */
      .members-col {
        background: #0c1120;
        border: 1px solid #1e293b;
        border-radius: 12px;
        overflow: hidden;
      }
      .tbl-hd {
        display: grid;
        grid-template-columns: 180px 1fr 100px 130px 70px 36px;
        gap: 0;
        padding: 0 16px;
        background: #060d1a;
        border-bottom: 1px solid #111827;
      }
      .tbl-row {
        display: grid;
        grid-template-columns: 180px 1fr 100px 130px 70px 36px;
        gap: 0;
        padding: 0 16px;
        border-bottom: 1px solid #0b0f1c;
        align-items: center;
        transition: background 0.15s;
      }
      /* Without drive column */
      .tbl-hd:not(:has(.col-drive)) {
        grid-template-columns: 180px 1fr 100px 130px 36px;
      }
      .tbl-row:not(:has(.col-drive)) {
        grid-template-columns: 180px 1fr 100px 130px 36px;
      }
      .tbl-row:hover {
        background: #0a0e1a;
      }
      .row-me {
        background: #050a14;
      }
      .tbl-col {
        padding: 10px 8px;
        font-size: 10px;
        font-weight: 700;
        color: #334155;
        text-transform: uppercase;
        letter-spacing: 0.07em;
      }
      .tbl-cell {
        padding: 12px 8px;
        font-size: 13px;
      }
      .tbl-empty {
        padding: 40px;
        text-align: center;
        color: #475569;
        font-size: 13px;
      }

      .col-user {
        min-width: 0;
      }
      .col-email {
        min-width: 0;
        color: #475569;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .col-joined {
        color: #334155;
        font-size: 12px;
        white-space: nowrap;
      }
      .col-drive {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .col-del {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .av-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .av {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }
      .av-fb {
        background: #1e3a6e;
        color: #60a5fa;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
      }
      .m-name {
        font-size: 13px;
        font-weight: 600;
        color: #e2e8f0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 130px;
      }
      .badge-me {
        font-size: 9px;
        background: #1e3a6e;
        color: #60a5fa;
        padding: 1px 6px;
        border-radius: 8px;
        font-weight: 700;
      }

      .role-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 10px;
        white-space: nowrap;
      }
      .role-sel {
        background: #060d1a;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 7px;
        padding: 5px 8px;
        font-size: 12px;
        cursor: pointer;
        width: 100%;
      }
      .role-sel:focus {
        outline: none;
        border-color: #3b82f6;
      }

      /* Drive column cells */
      .drive-na {
        color: #1e293b;
        font-size: 16px;
        display: block;
        text-align: center;
      }
      .drive-owner-badge {
        font-size: 16px;
        display: block;
        text-align: center;
        cursor: default;
      }
      /* Toggle switch */
      .toggle {
        position: relative;
        display: inline-block;
        width: 38px;
        height: 21px;
        cursor: pointer;
      }
      .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
        position: absolute;
      }
      .ts {
        position: absolute;
        inset: 0;
        background: #1e293b;
        border-radius: 21px;
        transition: 0.2s;
      }
      .ts::before {
        content: '';
        position: absolute;
        width: 15px;
        height: 15px;
        left: 3px;
        bottom: 3px;
        background: #475569;
        border-radius: 50%;
        transition: 0.2s;
      }
      .toggle input:checked + .ts {
        background: #1d4ed8;
      }
      .toggle input:checked + .ts::before {
        background: #fff;
        transform: translateX(17px);
      }

      .btn-rm {
        background: none;
        border: none;
        color: #334155;
        cursor: pointer;
        font-size: 13px;
        padding: 4px 6px;
        border-radius: 4px;
      }
      .btn-rm:hover {
        color: #ef4444;
        background: #1a0505;
      }

      /* Toast */
      .toast {
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
        animation: up 0.2s;
      }
      .toast.err {
        background: #dc2626;
      }
      @keyframes up {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(8px);
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
  members = signal<Member[]>([]);
  loading = signal(false);
  drive = signal<DriveStatus | null>(null);
  driveLoading = signal(false);

  toast = signal('');
  toastErr = signal(false);

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

  // ── Load data ─────────────────────────────────────────────────

  async loadAccess() {
    this.loading.set(true);
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/families/${this.familyId}/access`)
        .toPromise();
      const list: Member[] = (r.data ?? []).map((m: any) => ({
        userId: m.userId ?? m.user?.id,
        role: m.role,
        joinedAt: m.joinedAt ?? m.createdAt,
        user: m.user,
        hasDrivePerm: false,
        isDriveConnector: false,
      }));
      // Tìm myUserId từ member không có dropdown (bản thân)
      const me = list.find((m) => m.user?.email === r.myEmail);
      if (r.myUserId) this.myUserId.set(r.myUserId);
      this.members.set(list);
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

  // Sau khi load cả 2, merge drive permissions vào members
  async mergePermissions() {
    if (!this.drive()?.connected) return;
    try {
      const r: any = await this.http
        .get(
          `${environment.apiUrl}/api/google-auth/permissions?familyId=${this.familyId}`,
        )
        .toPromise();
      const perms: {
        userId: string;
        hasAccess: boolean;
        isConnector: boolean;
      }[] = r.data ?? [];
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

  // ── Role change ───────────────────────────────────────────────

  async changeRole(m: Member, e: Event) {
    const newRole = (e.target as HTMLSelectElement).value as Role;
    const old = m.role;
    // Optimistic update
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
      // Nếu đổi từ EDITOR/OWNER → VIEWER, tự động thu hồi drive perm
      if (newRole === 'VIEWER' && old !== 'VIEWER') {
        await this.revokeDrivePerm(m.userId).catch(() => {});
        this.members.update((l) =>
          l.map((x) =>
            x.userId === m.userId ? { ...x, hasDrivePerm: false } : x,
          ),
        );
      }
      // Reload permissions để phản ánh đúng
      await this.mergePermissions();
      this.showToast('Đã cập nhật quyền');
    } catch {
      this.members.update((l) =>
        l.map((x) => (x.userId === m.userId ? { ...x, role: old } : x)),
      );
      this.showToast('Lỗi cập nhật', true);
    }
  }

  // ── Drive toggle ──────────────────────────────────────────────

  async toggleDrive(m: Member, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    // Optimistic
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
      (e.target as HTMLInputElement).checked = !checked;
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

  // ── Drive connect / disconnect ────────────────────────────────

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

  // ── Remove member ─────────────────────────────────────────────

  async removeMember(m: Member) {
    if (!confirm(`Xoá ${m.user.name || m.user.email} khỏi gia phả?`)) return;
    try {
      await this.http
        .delete(`${environment.apiUrl}/api/families/${this.familyId}/access`, {
          body: { userId: m.userId },
        })
        .toPromise();
      this.members.update((l) => l.filter((x) => x.userId !== m.userId));
      this.showToast('Đã xoá');
    } catch {
      this.showToast('Lỗi xoá', true);
    }
  }

  goBack() {
    this.router.navigate(['/families', this.familyId]);
  }

  initials(s: string) {
    return s
      .split(' ')
      .map((w) => w[0])
      .slice(-2)
      .join('')
      .toUpperCase();
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
