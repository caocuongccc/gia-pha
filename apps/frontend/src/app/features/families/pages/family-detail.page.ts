// apps/frontend/src/app/features/families/pages/family-detail.page.ts
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FamilyService } from '../../../core/services/family.service';
import { MemberService } from '../../../core/services/member.service';
import { RelationService } from '../../../core/services/relation.service';
import { ChiPhaiService } from '../../../core/services/chi-phai.service';
import { TreeViewComponent } from '../../tree-view/tree-view.component';
import { MemberFormComponent } from '../../member-form/member-form.component';
import { RelationFormComponent } from '../../member-form/relation-form.component';
import { ExportButtonsComponent } from '../../tree-view/export-buttons.component';
import { ManageChiPhaiComponent } from '../../settings/manage-chi-phai.component';
import type { Member } from '@gia-pha/shared-types';
import { HttpClient } from '@angular/common/http';

type SidePanel = 'none' | 'addMember' | 'editMember' | 'relations' | 'chiPhai';
type ViewMode = 'tree' | 'generation' | 'organization';

@Component({
  selector: 'app-family-detail',
  standalone: true,
  imports: [
    CommonModule,
    TreeViewComponent,
    MemberFormComponent,
    RelationFormComponent,
    ExportButtonsComponent,
    ManageChiPhaiComponent,
  ],
  template: `
    <div class="layout">
      <!-- ── Header ──────────────────────────────────────────── -->
      <header class="header">
        <button class="btn-back" (click)="goBack()">← Danh sách</button>

        <div class="header-center">
          <h2>{{ familySvc.selectedFamily()?.name }}</h2>
          <span class="meta">
            {{ memberSvc.count() }} thành viên ·
            {{ chiPhaiSvc.chiList().length }} chi ·
            {{ chiPhaiSvc.allPhai().length }} phái
          </span>
        </div>

        <div class="header-actions">
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

          <app-export-buttons
            svgElementId="family-tree-svg"
            [familyName]="familySvc.selectedFamily()?.name ?? ''"
          />
          <button class="btn-outline" (click)="togglePanel('chiPhai')">
            Chi — Phái
          </button>
          <!-- Share button -->
          <div class="share-wrap" style="position:relative">
            <button
              class="btn-share"
              [class.is-public]="familySvc.selectedFamily()?.isPublic"
              (click)="sharePopupOpen.set(!sharePopupOpen())"
            >
              🔗
              {{
                familySvc.selectedFamily()?.isPublic
                  ? 'Đang chia sẻ'
                  : 'Chia sẻ'
              }}
            </button>

            @if (sharePopupOpen()) {
              <div class="share-popup" (click)="$event.stopPropagation()">
                <div class="share-row">
                  <span class="share-label">Cho phép xem công khai</span>
                  <button
                    class="share-toggle"
                    [class.on]="familySvc.selectedFamily()?.isPublic"
                    (click)="togglePublic()"
                  >
                    {{ familySvc.selectedFamily()?.isPublic ? 'BẬT ✓' : 'TẮT' }}
                  </button>
                </div>
                @if (familySvc.selectedFamily()?.isPublic) {
                  <div class="share-url-row">
                    <input
                      class="share-url-input"
                      [value]="shareUrl()"
                      readonly
                    />
                    <button class="share-copy-btn" (click)="copyShareUrl()">
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
          <button class="btn-primary" (click)="openAddMember()">+ Thêm</button>
        </div>
      </header>

      <!-- ── Body ─────────────────────────────────────────────── -->
      <div class="body">
        <div class="main">
          <!-- Loading -->
          @if (memberSvc.loading()) {
            <div class="center-msg">Đang tải...</div>
          }

          <!-- Cây D3 -->
          @if (viewMode() === 'tree' && !memberSvc.loading()) {
            @if (memberSvc.members().length > 0) {
              <app-tree-view
                [members]="memberSvc.members()"
                [relations]="relationSvc.relations()"
                (memberClicked)="onMemberClicked($event)"
              />
            } @else {
              <div class="empty">
                <p>
                  Chưa có thành viên. Nhấn <strong>+ Thêm</strong> để bắt đầu.
                </p>
              </div>
            }
          }

          <!-- Theo đời -->
          @if (viewMode() === 'generation' && !memberSvc.loading()) {
            <div class="gen-view">
              @for (group of memberSvc.byGeneration(); track group.generation) {
                <div class="gen-row">
                  <div class="gen-label">Đời {{ group.generation }}</div>
                  <div class="gen-members">
                    @for (m of group.members; track m.id) {
                      <div
                        class="member-card"
                        [class.out-person]="m.isOutPerson"
                        [class.active]="memberSvc.selectedMember()?.id === m.id"
                        (click)="onMemberClicked(m)"
                      >
                        <div class="mc-name">
                          {{ memberSvc.displayName(m) }}
                        </div>
                        <div class="mc-meta">
                          {{
                            m.gender === 'MALE'
                              ? '♂'
                              : m.gender === 'FEMALE'
                                ? '♀'
                                : '—'
                          }}
                          @if (m.birthDate || m.deathDate) {
                            · {{ memberSvc.lifespan(m) }}
                          }
                          @if (m.childOrder) {
                            · Con {{ memberSvc.childOrderLabel(m.childOrder) }}
                          }
                        </div>
                        @if (m.chi || m.phai) {
                          <div class="mc-badges">
                            @if (m.chi) {
                              <span class="badge-chi">{{ m.chi.name }}</span>
                            }
                            @if (m.phai) {
                              <span class="badge-phai">{{ m.phai.name }}</span>
                            }
                          </div>
                        }
                        <!-- Mini actions -->
                        <div
                          class="mc-actions"
                          (click)="$event.stopPropagation()"
                        >
                          <button (click)="openEditMember(m)" title="Sửa">
                            ✏️
                          </button>
                          <button (click)="openRelations(m)" title="Quan hệ">
                            🔗
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Theo chi - phái -->
          @if (viewMode() === 'organization' && !memberSvc.loading()) {
            <div class="org-view">
              @for (chiGroup of orgView(); track chiGroup.chi.id) {
                <div class="chi-section">
                  <h3 class="chi-heading">
                    🌿 {{ chiGroup.chi.name }}
                    @if (chiGroup.chi.founderNote) {
                      <span class="founder"
                        >— {{ chiGroup.chi.founderNote }}</span
                      >
                    }
                    <span class="cnt">{{ chiGroup.totalMembers }} người</span>
                  </h3>

                  @for (pg of chiGroup.phaiList; track pg.phai.id) {
                    <div class="phai-section">
                      <h4 class="phai-heading">
                        🔸 {{ pg.phai.name }}
                        @if (pg.phai.founderNote) {
                          <span class="founder"
                            >— {{ pg.phai.founderNote }}</span
                          >
                        }
                        <span class="cnt">{{ pg.members.length }} người</span>
                      </h4>
                      <div class="member-grid">
                        @for (m of pg.members; track m.id) {
                          <div
                            class="member-card"
                            [class.active]="
                              memberSvc.selectedMember()?.id === m.id
                            "
                            (click)="onMemberClicked(m)"
                          >
                            <div class="mc-name">
                              {{ memberSvc.displayName(m) }}
                            </div>
                            <div class="mc-meta">
                              Đời {{ m.generation }}
                              @if (m.childOrder) {
                                · Con
                                {{ memberSvc.childOrderLabel(m.childOrder) }}
                              }
                              @if (m.birthDate) {
                                · {{ memberSvc.lifespan(m) }}
                              }
                            </div>
                            <div
                              class="mc-actions"
                              (click)="$event.stopPropagation()"
                            >
                              <button (click)="openEditMember(m)" title="Sửa">
                                ✏️
                              </button>
                              <button
                                (click)="openRelations(m)"
                                title="Quan hệ"
                              >
                                🔗
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  @if (chiGroup.membersNoPhai.length > 0) {
                    <div class="phai-section ungrouped">
                      <h4 class="phai-heading muted">
                        Chưa phân phái ({{ chiGroup.membersNoPhai.length }})
                      </h4>
                      <div class="member-grid">
                        @for (m of chiGroup.membersNoPhai; track m.id) {
                          <div class="member-card" (click)="onMemberClicked(m)">
                            <div class="mc-name">
                              {{ memberSvc.displayName(m) }}
                            </div>
                            <div class="mc-meta">Đời {{ m.generation }}</div>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }

              @if (orgView().length === 0) {
                <div class="empty">
                  <p>
                    Chưa có chi nào. Nhấn <strong>Chi — Phái</strong> để thiết
                    lập.
                  </p>
                </div>
              }
            </div>
          }
        </div>
        <!-- /main -->

        <!-- ── Side panel ────────────────────────────────────── -->
        @if (activePanel() !== 'none') {
          <aside class="side-panel">
            <div class="panel-header">
              <span class="panel-title">
                @if (activePanel() === 'addMember') {
                  Thêm thành viên
                }
                @if (activePanel() === 'editMember') {
                  Sửa · {{ memberSvc.selectedMember()?.fullName }}
                }
                @if (activePanel() === 'relations') {
                  Quan hệ · {{ memberSvc.selectedMember()?.fullName }}
                }
                @if (activePanel() === 'chiPhai') {
                  Chi — Phái
                }
              </span>

              <!-- Tabs khi đang xem 1 member -->
              @if (
                activePanel() === 'editMember' || activePanel() === 'relations'
              ) {
                <div class="panel-tabs">
                  <button
                    [class.active]="activePanel() === 'editMember'"
                    (click)="activePanel.set('editMember')"
                  >
                    Thông tin
                  </button>
                  <button
                    [class.active]="activePanel() === 'relations'"
                    (click)="activePanel.set('relations')"
                  >
                    Quan hệ
                  </button>
                </div>
              }

              <button class="btn-close" (click)="closePanel()">✕</button>
            </div>

            <div class="panel-body">
              @if (activePanel() === 'addMember') {
                <app-member-form
                  [familyId]="familyId"
                  (submitted)="onMemberSaved()"
                  (cancelled)="closePanel()"
                />
              }

              @if (
                activePanel() === 'editMember' && memberSvc.selectedMember()
              ) {
                <app-member-form
                  [familyId]="familyId"
                  [editMember]="memberSvc.selectedMember()"
                  (submitted)="onMemberSaved()"
                  (cancelled)="closePanel()"
                />
              }

              @if (
                activePanel() === 'relations' && memberSvc.selectedMember()
              ) {
                <app-relation-form
                  [memberId]="memberSvc.selectedMember()!.id"
                  [familyId]="familyId"
                  (changed)="onRelationChanged()"
                />
              }

              @if (activePanel() === 'chiPhai') {
                <app-manage-chi-phai [familyId]="familyId" />
              }
            </div>
          </aside>
        }
      </div>
      <!-- /body -->
    </div>
  `,
  styles: [
    `
      .layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #09090f;
        color: #e2e8f0;
      }

      .header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 10px 20px;
        border-bottom: 1px solid #1e293b;
        background: #0c1120;
        flex-shrink: 0;
      }
      .header-center {
        flex: 1;
      }
      .header-center h2 {
        margin: 0;
        font-size: 15px;
      }
      .meta {
        font-size: 11px;
        color: #475569;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
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

      .body {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      .main {
        flex: 1;
        overflow-y: auto;
      }
      .center-msg,
      .empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 300px;
        color: #64748b;
      }
      .empty p {
        font-size: 14px;
        text-align: center;
      }

      /* Generation view */
      .gen-view {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .gen-row {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }
      .gen-label {
        width: 56px;
        flex-shrink: 0;
        font-size: 11px;
        color: #475569;
        text-align: right;
        padding-top: 10px;
        font-weight: 600;
      }
      .gen-members {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        flex: 1;
      }

      /* Org view */
      .org-view {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .chi-section {
        border: 1px solid #1e3a6e33;
        border-radius: 10px;
        overflow: hidden;
      }
      .chi-heading {
        margin: 0;
        padding: 12px 16px;
        background: #0f1e38;
        font-size: 13px;
        color: #60a5fa;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .phai-section {
        border-top: 1px solid #1e293b;
        padding: 12px 16px;
      }
      .phai-section.ungrouped {
        opacity: 0.6;
      }
      .phai-heading {
        margin: 0 0 10px;
        font-size: 12px;
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .phai-heading.muted {
        color: #475569;
      }
      .founder {
        font-size: 10px;
        color: #475569;
        font-weight: 400;
      }
      .cnt {
        font-size: 10px;
        color: #475569;
        margin-left: auto;
      }
      .member-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      /* Member card */
      .member-card {
        position: relative;
        background: #0c1828;
        border: 1px solid #1e293b;
        border-radius: 7px;
        padding: 8px 12px;
        cursor: pointer;
        min-width: 140px;
        max-width: 200px;
        transition: border-color 0.15s;
      }
      .member-card:hover,
      .member-card.active {
        border-color: #3b82f6;
      }
      .member-card.out-person {
        border-style: dashed;
        opacity: 0.8;
      }
      .mc-name {
        font-size: 12px;
        color: #e2e8f0;
        font-weight: 500;
      }
      .mc-meta {
        font-size: 10px;
        color: #64748b;
        margin-top: 2px;
      }
      .mc-badges {
        display: flex;
        gap: 4px;
        margin-top: 4px;
        flex-wrap: wrap;
      }
      .badge-chi {
        font-size: 9px;
        background: #0f2d0f;
        color: #4ade80;
        padding: 1px 6px;
        border-radius: 8px;
      }
      .badge-phai {
        font-size: 9px;
        background: #1a0f2e;
        color: #c084fc;
        padding: 1px 6px;
        border-radius: 8px;
      }
      .mc-actions {
        display: none;
        position: absolute;
        top: 6px;
        right: 6px;
        gap: 2px;
      }
      .member-card:hover .mc-actions {
        display: flex;
      }
      .mc-actions button {
        background: #1e293b;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        padding: 2px 5px;
        font-size: 11px;
      }
      .mc-actions button:hover {
        background: #334155;
      }

      /* Side panel */
      .side-panel {
        width: 380px;
        flex-shrink: 0;
        border-left: 1px solid #1e293b;
        background: #0c1120;
        display: flex;
        flex-direction: column;
      }
      .panel-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
        flex-wrap: wrap;
      }
      .panel-title {
        font-size: 13px;
        font-weight: 600;
        color: #e2e8f0;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .panel-tabs {
        display: flex;
        gap: 4px;
      }
      .panel-tabs button {
        background: none;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 4px;
        padding: 3px 10px;
        cursor: pointer;
        font-size: 11px;
      }
      .panel-tabs button.active {
        border-color: #3b82f6;
        color: #60a5fa;
        background: #0f1e38;
      }
      .btn-close {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-size: 16px;
        padding: 0 4px;
        flex-shrink: 0;
      }
      .btn-close:hover {
        color: #e2e8f0;
      }
      .panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
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
export class FamilyDetailPage implements OnInit, OnDestroy {
  familySvc = inject(FamilyService);
  memberSvc = inject(MemberService);
  relationSvc = inject(RelationService);
  chiPhaiSvc = inject(ChiPhaiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  familyId = '';
  viewMode = signal<ViewMode>('tree');
  activePanel = signal<SidePanel>('none');
  sharePopupOpen = signal(false);
  copied = signal(false);

  shareUrl = computed(() => {
    const fam = this.familySvc.selectedFamily();
    return fam ? `${window.location.origin}/public/${fam.id}` : '';
  });

  async togglePublic() {
    const f = this.familySvc.selectedFamily();
    if (!f) return;
    await this.http
      .patch(`/api/families/${this.familyId}`, { isPublic: !f.isPublic })
      .toPromise();
    await this.familySvc.loadOne(this.familyId);
  }

  copyShareUrl() {
    navigator.clipboard.writeText(this.shareUrl()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
  orgView = computed(() =>
    this.chiPhaiSvc.chiList().map((chi) => ({
      chi,
      totalMembers: this.memberSvc.members().filter((m) => m.chiId === chi.id)
        .length,
      phaiList: chi.phaiList.map((phai) => ({
        phai,
        members: this.memberSvc
          .members()
          .filter((m) => m.phaiId === phai.id)
          .sort((a, b) => a.generation - b.generation),
      })),
      membersNoPhai: this.memberSvc
        .members()
        .filter((m) => m.chiId === chi.id && !m.phaiId),
    })),
  );

  async ngOnInit() {
    this.familyId = this.route.snapshot.params['id'];
    await Promise.all([
      this.familySvc.loadOne(this.familyId),
      this.memberSvc.loadByFamily(this.familyId),
      this.relationSvc.loadByFamily(this.familyId),
      this.chiPhaiSvc.load(this.familyId),
    ]);
  }

  ngOnDestroy() {
    this.memberSvc.clearSelected();
    this.memberSvc.clear();
    this.relationSvc.clear();
    this.chiPhaiSvc.clear();
  }

  // ── Panel helpers ─────────────────────────────────────────
  togglePanel(panel: SidePanel) {
    this.activePanel.set(this.activePanel() === panel ? 'none' : panel);
  }

  closePanel() {
    this.activePanel.set('none');
    this.memberSvc.clearSelected();
  }

  openAddMember() {
    this.memberSvc.clearSelected();
    this.activePanel.set('addMember');
  }

  openEditMember(m: Member) {
    this.memberSvc.select(m);
    this.activePanel.set('editMember');
  }

  openRelations(m: Member) {
    this.memberSvc.select(m);
    this.activePanel.set('relations');
  }

  // ── Event handlers ────────────────────────────────────────
  onMemberClicked(member: Member) {
    this.memberSvc.select(member);
    // Nếu panel đang mở ở tab quan hệ → giữ nguyên, nếu không → mở edit
    if (this.activePanel() !== 'relations') {
      this.activePanel.set('editMember');
    }
  }

  async onMemberSaved() {
    await Promise.all([
      this.memberSvc.loadByFamily(this.familyId),
      this.relationSvc.loadByFamily(this.familyId),
    ]);
    this.activePanel.set('none');
    this.memberSvc.clearSelected();
  }

  async onRelationChanged() {
    // Reload relations để cây D3 cập nhật
    await this.relationSvc.loadByFamily(this.familyId);
  }

  goBack() {
    this.router.navigate(['/families']);
  }
}
