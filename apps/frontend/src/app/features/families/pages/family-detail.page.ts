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
import { ManageChiPhaiComponent } from '../../settings/manage-chi-phai.component';
import {
  FamilyHeaderActionsComponent,
  type ViewMode,
} from '../components/family-header-actions.component';
import type { Member } from '@gia-pha/shared-types';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type SidePanel = 'none' | 'addMember' | 'editMember' | 'relations' | 'chiPhai';

@Component({
  selector: 'app-family-detail',
  standalone: true,
  imports: [
    CommonModule,
    TreeViewComponent,
    MemberFormComponent,
    RelationFormComponent,

    ManageChiPhaiComponent,
    FamilyHeaderActionsComponent,
  ],
  template: `
    <div class="layout">
      <!-- ── Header ──────────────────────────────────────────── -->
      <header class="header">
        <button class="btn-back" (click)="goBack()">← Danh sách</button>
        <button
          class="btn-outline"
          style="font-size:11px"
          (click)="router.navigate(['/families', familyId, 'fund'])"
        >
          📚 Khuyến học & Quỹ
        </button>
        <button
          class="btn-outline"
          style="font-size:11px"
          (click)="router.navigate(['/families', familyId, 'activities'])"
        >
          📰 Hoạt động
        </button>
        @if (isOwner()) {
          <button
            class="btn-outline"
            style="font-size:11px"
            (click)="router.navigate(['/families', familyId, 'access'])"
          >
            👥 Phân quyền
          </button>
        }

        <div class="header-center">
          <h2>{{ familySvc.selectedFamily()?.name }}</h2>
          <span class="meta">
            {{ memberSvc.count() }} thành viên ·
            {{ chiPhaiSvc.chiList().length }} chi ·
            {{ chiPhaiSvc.allPhai().length }} phái
          </span>
          @if (isViewOnly()) {
            <span class="viewer-badge">👁 Chỉ xem</span>
          }
        </div>

        <app-family-header-actions
          [(viewMode)]="viewMode"
          [family]="familySvc.selectedFamily()"
          [shareUrl]="shareUrl()"
          [copied]="copied()"
          [viewOnly]="isViewOnly()"
          [isOwner]="isOwner()"
          (chiPhaiClicked)="togglePanel('chiPhai')"
          (togglePublicClicked)="togglePublic()"
          (copyLinkClicked)="copyShareUrl()"
          (addMemberClicked)="openAddMember()"
        />
      </header>

      <!-- ── Body ─────────────────────────────────────────────── -->
      <div class="body">
        <div class="main">
          @if (memberSvc.loading()) {
            <div class="center-msg">Đang tải...</div>
          }

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
                        <div
                          class="mc-actions"
                          (click)="$event.stopPropagation()"
                        >
                          @if (canEdit()) {
                            <button (click)="openEditMember(m)" title="Sửa">
                              ✏️
                            </button>
                          }
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
                              @if (canEdit()) {
                                <button (click)="openEditMember(m)" title="Sửa">
                                  ✏️
                                </button>
                              }
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

        @if (activePanel() !== 'none') {
          <aside class="side-panel">
            <div class="panel-header">
              <span class="panel-title">
                @if (activePanel() === 'addMember') {
                  Thêm thành viên
                }
                @if (activePanel() === 'editMember') {
                  {{ canEdit() ? 'Sửa' : 'Thông tin' }} ·
                  {{ memberSvc.selectedMember()?.fullName }}
                }
                @if (activePanel() === 'relations') {
                  Quan hệ · {{ memberSvc.selectedMember()?.fullName }}
                }
                @if (activePanel() === 'chiPhai') {
                  Chi — Phái
                }
              </span>
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
              @if (activePanel() === 'addMember' && canEdit()) {
                <app-member-form
                  [familyId]="familyId"
                  (submitted)="onMemberSaved()"
                  (cancelled)="closePanel()"
                />
              }

              @if (
                activePanel() === 'editMember' && memberSvc.selectedMember()
              ) {
                @if (isViewOnly()) {
                  <!-- VIEWER: read-only info panel -->
                  <div class="ro-info">
                    @let m = memberSvc.selectedMember()!;
                    @if (m.birthDate) {
                      <div class="ro-row">
                        <span class="ro-lbl">Ngày sinh</span
                        ><span>{{ fmtDate(m.birthDate) }}</span>
                      </div>
                    }
                    @if (m.deathDate) {
                      <div class="ro-row">
                        <span class="ro-lbl">Ngày mất</span
                        ><span>{{ fmtDate(m.deathDate) }}</span>
                      </div>
                    }
                    <!-- @if (m.birthPlace) {
                      <div class="ro-row">
                        <span class="ro-lbl">Quê quán</span
                        ><span>{{ m.bi }}</span>
                      </div>
                    } -->
                    @if (m.burialPlace) {
                      <div class="ro-row">
                        <span class="ro-lbl">Mộ phần</span
                        ><span>{{ m.burialPlace }}</span>
                      </div>
                    }
                    @if (m.alias) {
                      <div class="ro-row">
                        <span class="ro-lbl">Tên khác</span
                        ><span>{{ m.alias }}</span>
                      </div>
                    }
                    @if (m.biography) {
                      <div class="ro-row ro-bio">
                        <span class="ro-lbl">Tiểu sử</span
                        ><span>{{ m.biography }}</span>
                      </div>
                    }
                    <div class="ro-hint">👁 Chỉ xem — không thể chỉnh sửa</div>
                  </div>
                } @else {
                  <app-member-form
                    [familyId]="familyId"
                    [editMember]="memberSvc.selectedMember()"
                    (submitted)="onMemberSaved()"
                    (cancelled)="closePanel()"
                  />
                }
              }

              @if (
                activePanel() === 'relations' && memberSvc.selectedMember()
              ) {
                @if (isViewOnly()) {
                  <!-- VIEWER: read-only relations -->
                  <div class="ro-info">
                    @let rels = getRelations(memberSvc.selectedMember()!.id);
                    @if (rels.parents.length > 0) {
                      <div class="ro-rg">
                        <div class="ro-rl">Cha / Mẹ</div>
                        @for (m of rels.parents; track m.id) {
                          <div class="ro-rrow" (click)="onMemberClicked(m)">
                            <span
                              class="ro-dot"
                              [class.male]="m.gender === 'MALE'"
                              [class.female]="m.gender !== 'MALE'"
                            ></span>
                            <span>{{ memberSvc.displayName(m) }}</span>
                            <span class="ro-gen">Đời {{ m.generation }}</span>
                          </div>
                        }
                      </div>
                    }
                    @if (rels.spouses.length > 0) {
                      <div class="ro-rg">
                        <div class="ro-rl">Vợ / Chồng</div>
                        @for (m of rels.spouses; track m.id) {
                          <div class="ro-rrow" (click)="onMemberClicked(m)">
                            <span class="ro-dot spouse"></span>
                            <span>{{ memberSvc.displayName(m) }}</span>
                            <span class="ro-gen">Đời {{ m.generation }}</span>
                          </div>
                        }
                      </div>
                    }
                    @if (rels.children.length > 0) {
                      <div class="ro-rg">
                        <div class="ro-rl">
                          Con cái ({{ rels.children.length }})
                        </div>
                        @for (m of rels.children; track m.id) {
                          <div class="ro-rrow" (click)="onMemberClicked(m)">
                            <span
                              class="ro-dot"
                              [class.male]="m.gender === 'MALE'"
                              [class.female]="m.gender !== 'MALE'"
                            ></span>
                            <span>{{ memberSvc.displayName(m) }}</span>
                            <span class="ro-gen">Đời {{ m.generation }}</span>
                          </div>
                        }
                      </div>
                    }
                    @if (
                      rels.parents.length === 0 &&
                      rels.spouses.length === 0 &&
                      rels.children.length === 0
                    ) {
                      <div
                        style="color:#475569;font-size:12px;text-align:center;padding:24px 0"
                      >
                        Chưa có quan hệ nào
                      </div>
                    }
                  </div>
                } @else {
                  <app-relation-form
                    [memberId]="memberSvc.selectedMember()!.id"
                    [familyId]="familyId"
                    (changed)="onRelationChanged()"
                  />
                }
              }

              @if (activePanel() === 'chiPhai' && !isViewOnly()) {
                <app-manage-chi-phai [familyId]="familyId" />
              }
              @if (isViewOnly() && activePanel() === 'chiPhai') {
                <div
                  style="padding:24px;color:#64748b;font-size:13px;text-align:center"
                >
                  🔒 Bạn không có quyền chỉnh sửa chi phái
                </div>
              }
            </div>
          </aside>
        }
      </div>
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
      .viewer-badge {
        display: inline-block;
        font-size: 10px;
        color: #f59e0b;
        background: #1a1200;
        border: 1px solid #78350f;
        padding: 2px 8px;
        border-radius: 10px;
        margin-top: 3px;
      }
      .ro-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
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
      .ro-bio {
        align-items: flex-start;
      }
      .ro-lbl {
        font-size: 10px;
        color: #475569;
        width: 64px;
        flex-shrink: 0;
        padding-top: 1px;
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
        font-size: 12px;
        color: #94a3b8;
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
      .ro-gen {
        font-size: 10px;
        color: #334155;
        margin-left: auto;
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
    `,
  ],
})
export class FamilyDetailPage implements OnInit, OnDestroy {
  familySvc = inject(FamilyService);
  memberSvc = inject(MemberService);
  relationSvc = inject(RelationService);
  chiPhaiSvc = inject(ChiPhaiService);
  private route = inject(ActivatedRoute);
  protected router = inject(Router);
  private http = inject(HttpClient);

  familyId = '';
  viewMode = signal<ViewMode>('tree');
  activePanel = signal<SidePanel>('none');
  copied = signal(false);
  userRole = signal<'OWNER' | 'EDITOR' | 'VIEWER' | null>(null);

  // VIEWER không được thêm/sửa/xoá
  isViewOnly = computed(() => this.userRole() === 'VIEWER');

  // EDITOR + OWNER được sửa nội dung
  canEdit = computed(
    () => this.userRole() === 'OWNER' || this.userRole() === 'EDITOR',
  );

  // Chỉ OWNER được quản lý gia phả (xoá, public, chi phái, quản lý role)
  isOwner = computed(() => this.userRole() === 'OWNER');

  // FIX 1: route đúng là /share/:token (không phải /public/:id)
  shareUrl = computed(() => {
    const fam = this.familySvc.selectedFamily();
    return fam ? `${window.location.origin}/share/${fam.id}` : '';
  });

  async togglePublic() {
    const f = this.familySvc.selectedFamily();
    if (!f) return;
    await this.familySvc.update(this.familyId, { isPublic: !f.isPublic });
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
      this.loadMyRole(),
    ]);
  }

  private async loadMyRole() {
    try {
      const res: any = await this.http
        .get(`${environment.apiUrl}/api/families/${this.familyId}/my-role`)
        .toPromise();
      this.userRole.set(res?.data?.role ?? 'VIEWER');
    } catch {
      this.userRole.set('VIEWER');
    }
  }

  ngOnDestroy() {
    this.memberSvc.clearSelected();
    this.memberSvc.clear();
    this.relationSvc.clear();
    this.chiPhaiSvc.clear();
  }

  togglePanel(panel: SidePanel) {
    const next = this.activePanel() === panel ? 'none' : panel;
    this.activePanel.set(next);
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

  onMemberClicked(member: Member) {
    this.memberSvc.select(member);
    if (this.isViewOnly()) {
      // VIEWER: mở tab thông tin (editMember hiển thị read-only)
      this.activePanel.set('editMember');
    } else if (this.activePanel() !== 'relations') {
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
    await this.relationSvc.loadByFamily(this.familyId);
  }

  fmtDate(d: string | Date): string {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  }

  getRelations(memberId: string) {
    const map = new Map(this.memberSvc.members().map((m) => [m.id, m]));
    const rels = this.relationSvc.relations();
    const parents = rels
      .filter((r) => (r as any).type === 'PARENT' && r.toMemberId === memberId)
      .map((r) => map.get(r.fromMemberId))
      .filter(Boolean) as Member[];
    const children = rels
      .filter(
        (r) => (r as any).type === 'PARENT' && r.fromMemberId === memberId,
      )
      .map((r) => map.get(r.toMemberId))
      .filter(Boolean) as Member[];
    const spouses = rels
      .filter(
        (r) =>
          (r as any).type === 'SPOUSE' &&
          (r.fromMemberId === memberId || r.toMemberId === memberId),
      )
      .map((r) =>
        map.get(r.fromMemberId === memberId ? r.toMemberId : r.fromMemberId),
      )
      .filter(Boolean) as Member[];
    return { parents, children, spouses };
  }

  goBack() {
    this.router.navigate(['/families']);
  }
}
