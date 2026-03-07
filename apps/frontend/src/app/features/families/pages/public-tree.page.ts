// apps/frontend/src/app/features/families/pages/public-tree.page.ts
// Route: /share/:token  (token = familyId)
// viewOnly=true: xem chi tiết nhưng KHÔNG sửa/thêm/xoá
import { Component, inject, OnInit, signal, computed } from '@angular/core';
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
            [viewOnly]="true"
            (memberClicked)="onMemberClicked($event)"
          />

          @if (selectedMember()) {
            <div class="ro-wrap" (click)="selectedMember.set(null)">
              <div class="ro-panel" (click)="$event.stopPropagation()">
                <div class="ro-ph">
                  <div class="ro-avatar">
                    <img
                      [src]="
                        selectedMember()!.photoUrl ||
                        '/assets/avatar-' +
                          (selectedMember()!.gender?.toLowerCase() || 'male') +
                          '.svg'
                      "
                    />
                  </div>
                  <div class="ro-pinfo">
                    <div class="ro-name">{{ selectedMember()!.fullName }}</div>
                    @if (selectedMember()!.alias) {
                      <div class="ro-alias">
                        ({{ selectedMember()!.alias }})
                      </div>
                    }
                    <span class="ro-gen-badge"
                      >Đời {{ selectedMember()!.generation }}</span
                    >
                  </div>
                  <button class="ro-close" (click)="selectedMember.set(null)">
                    ✕
                  </button>
                </div>

                <div class="ro-tabs">
                  <button
                    [class.active]="roTab() === 'info'"
                    (click)="roTab.set('info')"
                  >
                    Thông tin
                  </button>
                  <button
                    [class.active]="roTab() === 'rel'"
                    (click)="roTab.set('rel')"
                  >
                    Quan hệ
                  </button>
                </div>

                @if (roTab() === 'info') {
                  <div class="ro-body">
                    @if (selectedMember()!.birthDate) {
                      <div class="ro-row">
                        <span class="ro-lbl">Ngày sinh</span
                        ><span>{{
                          fmtDate(selectedMember()!.birthDate!)
                        }}</span>
                      </div>
                    }
                    @if (selectedMember()!.deathDate) {
                      <div class="ro-row">
                        <span class="ro-lbl">Ngày mất</span
                        ><span>{{
                          fmtDate(selectedMember()!.deathDate!)
                        }}</span>
                      </div>
                    }
                    @if (selectedMember()!.burialPlace) {
                      <div class="ro-row">
                        <span class="ro-lbl">Quê quán</span
                        ><span>{{ selectedMember()!.burialPlace }}</span>
                      </div>
                    }
                    @if (selectedMember()!.burialPlace) {
                      <div class="ro-row">
                        <span class="ro-lbl">Mộ phần</span
                        ><span>{{ selectedMember()!.burialPlace }}</span>
                      </div>
                    }
                    @if (roChiName()) {
                      <div class="ro-row">
                        <span class="ro-lbl">Chi</span
                        ><span class="ro-chi">{{ roChiName() }}</span>
                      </div>
                    }
                    @if (roPhaiName()) {
                      <div class="ro-row">
                        <span class="ro-lbl">Phái</span
                        ><span class="ro-phai">{{ roPhaiName() }}</span>
                      </div>
                    }
                    @if (selectedMember()!.biography) {
                      <div class="ro-row">
                        <span class="ro-lbl">Tiểu sử</span
                        ><span>{{ selectedMember()!.biography }}</span>
                      </div>
                    }
                    <div class="ro-hint">
                      👁 Chế độ xem — không thể chỉnh sửa
                    </div>
                  </div>
                }

                @if (roTab() === 'rel') {
                  <div class="ro-body">
                    @if (roParents().length > 0) {
                      <div class="ro-rg">
                        <div class="ro-rl">Cha / Mẹ</div>
                        @for (m of roParents(); track m.id) {
                          <div class="ro-rrow" (click)="onMemberClicked(m)">
                            <span
                              class="ro-dot"
                              [class.male]="m.gender === 'MALE'"
                              [class.female]="m.gender !== 'MALE'"
                            ></span>
                            <span class="ro-rname">{{ m.fullName }}</span
                            ><span class="ro-rgen">Đ{{ m.generation }}</span>
                          </div>
                        }
                      </div>
                    }
                    @if (roSpouses().length > 0) {
                      <div class="ro-rg">
                        <div class="ro-rl">Vợ / Chồng</div>
                        @for (m of roSpouses(); track m.id) {
                          <div class="ro-rrow" (click)="onMemberClicked(m)">
                            <span class="ro-dot spouse"></span>
                            <span class="ro-rname">{{ m.fullName }}</span
                            ><span class="ro-rgen">Đ{{ m.generation }}</span>
                          </div>
                        }
                      </div>
                    }
                    @if (roChildren().length > 0) {
                      <div class="ro-rg">
                        <div class="ro-rl">
                          Con cái ({{ roChildren().length }})
                        </div>
                        @for (m of roChildren(); track m.id) {
                          <div class="ro-rrow" (click)="onMemberClicked(m)">
                            <span
                              class="ro-dot"
                              [class.male]="m.gender === 'MALE'"
                              [class.female]="m.gender !== 'MALE'"
                            ></span>
                            <span class="ro-rname">{{ m.fullName }}</span
                            ><span class="ro-rgen">Đ{{ m.generation }}</span>
                          </div>
                        }
                      </div>
                    }
                    @if (
                      roParents().length === 0 &&
                      roChildren().length === 0 &&
                      roSpouses().length === 0
                    ) {
                      <div class="ro-empty">Chưa có quan hệ nào</div>
                    }
                  </div>
                }
              </div>
            </div>
          }
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
      /* Read-only panel */
      .ro-wrap {
        position: absolute;
        inset: 0;
        z-index: 200;
        background: rgba(0, 0, 0, 0.35);
        display: flex;
        justify-content: flex-end;
      }
      .ro-panel {
        width: 300px;
        height: 100%;
        background: #0c1120;
        border-left: 1px solid #1e293b;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: -8px 0 24px rgba(0, 0, 0, 0.5);
      }
      .ro-ph {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .ro-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
        border: 2px solid #1e3a6e;
      }
      .ro-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .ro-pinfo {
        flex: 1;
        min-width: 0;
      }
      .ro-name {
        font-size: 14px;
        font-weight: 700;
        color: #e2e8f0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ro-alias {
        font-size: 11px;
        color: #64748b;
      }
      .ro-gen-badge {
        display: inline-block;
        font-size: 10px;
        color: #d29922;
        background: #1a1200;
        padding: 2px 8px;
        border-radius: 6px;
        margin-top: 4px;
      }
      .ro-close {
        background: none;
        border: none;
        color: #475569;
        cursor: pointer;
        font-size: 18px;
        flex-shrink: 0;
      }
      .ro-close:hover {
        color: #e2e8f0;
      }
      .ro-tabs {
        display: flex;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .ro-tabs button {
        flex: 1;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        padding: 10px;
        font-size: 12px;
        color: #64748b;
        cursor: pointer;
        transition: all 0.15s;
      }
      .ro-tabs button.active {
        color: #60a5fa;
        border-bottom-color: #3b82f6;
      }
      .ro-body {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
      }
      .ro-row {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 7px 0;
        border-bottom: 1px solid #0f1828;
        font-size: 12px;
        color: #94a3b8;
      }
      .ro-row:last-of-type {
        border-bottom: none;
      }
      .ro-lbl {
        font-size: 10px;
        color: #475569;
        width: 60px;
        flex-shrink: 0;
        padding-top: 1px;
      }
      .ro-chi {
        color: #4ade80;
      }
      .ro-phai {
        color: #a78bfa;
      }
      .ro-hint {
        margin-top: 16px;
        font-size: 10px;
        color: #334155;
        text-align: center;
        padding: 6px;
        background: #0a0f1a;
        border-radius: 6px;
      }
      .ro-rg {
        margin-bottom: 14px;
      }
      .ro-rl {
        font-size: 10px;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 6px;
      }
      .ro-rrow {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .ro-rrow:hover {
        background: #0f1828;
      }
      .ro-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .ro-dot.male {
        background: #3b82f6;
      }
      .ro-dot.female {
        background: #a855f7;
      }
      .ro-dot.spouse {
        background: #f59e0b;
      }
      .ro-rname {
        flex: 1;
        font-size: 12px;
        color: #94a3b8;
      }
      .ro-rgen {
        font-size: 10px;
        color: #334155;
      }
      .ro-empty {
        font-size: 12px;
        color: #334155;
        text-align: center;
        padding: 24px 0;
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

  selectedMember = signal<Member | null>(null);
  roTab = signal<'info' | 'rel'>('info');

  roParents = computed(() => {
    const m = this.selectedMember();
    if (!m) return [];
    const map = new Map(this.members().map((x) => [x.id, x]));
    return this.relations()
      .filter((r) => (r as any).type === 'PARENT' && r.toMemberId === m.id)
      .map((r) => map.get(r.fromMemberId))
      .filter(Boolean) as Member[];
  });

  roChildren = computed(() => {
    const m = this.selectedMember();
    if (!m) return [];
    const map = new Map(this.members().map((x) => [x.id, x]));
    return this.relations()
      .filter((r) => (r as any).type === 'PARENT' && r.fromMemberId === m.id)
      .map((r) => map.get(r.toMemberId))
      .filter(Boolean) as Member[];
  });

  roSpouses = computed(() => {
    const m = this.selectedMember();
    if (!m) return [];
    const map = new Map(this.members().map((x) => [x.id, x]));
    return this.relations()
      .filter(
        (r) =>
          (r as any).type === 'SPOUSE' &&
          (r.fromMemberId === m.id || r.toMemberId === m.id),
      )
      .map((r) =>
        map.get(r.fromMemberId === m.id ? r.toMemberId : r.fromMemberId),
      )
      .filter(Boolean) as Member[];
  });

  roChiName = computed(() => (this.selectedMember() as any)?.chi?.name ?? '');
  roPhaiName = computed(() => (this.selectedMember() as any)?.phai?.name ?? '');

  fmtDate(d: string | Date): string {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  }

  onMemberClicked(m: Member) {
    this.selectedMember.set(m);
    this.roTab.set('info');
  }

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
