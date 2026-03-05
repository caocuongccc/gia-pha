import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FamilyService } from '../../../core/services/family.service';
import { MemberService } from '../../../core/services/member.service';
import { RelationService } from '../../../core/services/relation.service';
import { TreeViewComponent } from '../../tree-view/tree-view.component';
import { MemberFormComponent } from '../../member-form/member-form.component';
import { ExportButtonsComponent } from '../../tree-view/export-buttons.component';

@Component({
  selector: 'app-family-detail',
  standalone: true,
  imports: [
    CommonModule,
    TreeViewComponent, // ✅ import đúng
    MemberFormComponent, // ✅ dùng MemberForm thay MemberPanel (nếu chưa có panel)
    ExportButtonsComponent,
  ],
  template: `
    <div class="detail-layout">
      <!-- ── Toolbar ──────────────────────────────────────────────── -->
      <header class="detail-header">
        <button class="btn-back" (click)="goBack()">← Danh sách</button>

        <div class="header-title">
          <h2>{{ familySvc.selectedFamily()?.name }}</h2>
          <span class="member-count">
            {{ memberSvc.members().length }} thành viên
          </span>
        </div>

        <div class="header-actions">
          <!-- ✅ svgElementId phải khớp với id trên thẻ svg trong TreeViewComponent -->
          <app-export-buttons
            svgElementId="family-tree-svg"
            [familyName]="familySvc.selectedFamily()?.name ?? ''"
          />
          <button
            class="btn-icon"
            (click)="showForm = !showForm"
            title="Thêm thành viên"
          >
            + Thêm
          </button>
        </div>
      </header>

      <!-- ── Body ──────────────────────────────────────────────────── -->
      <div class="detail-body">
        <!-- ✅ Truyền members và relations trực tiếp từ service signals -->
        @if (memberSvc.members().length > 0) {
          <app-tree-view
            [members]="memberSvc.members()"
            [relations]="relationSvc.relations()"
            class="tree-area"
            (memberClicked)="onMemberClicked($event)"
          />
        } @else if (memberSvc.loading()) {
          <div class="loading-tree">Đang tải cây gia phả...</div>
        } @else {
          <div class="empty-tree">
            <p>Chưa có thành viên nào. Hãy thêm thành viên đầu tiên!</p>
          </div>
        }

        <!-- Side panel: form thêm/sửa thành viên -->
        @if (showForm) {
          <div class="side-panel">
            <app-member-form
              [familyId]="familyId"
              [editMember]="selectedMember"
              (saved)="onSaved()"
              (cancelled)="showForm = false"
            />
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .detail-layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #09090f;
      }
      .detail-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 20px;
        border-bottom: 1px solid #252d45;
        background: #0f1120;
        flex-shrink: 0;
      }
      .header-title {
        flex: 1;
      }
      .header-title h2 {
        font-size: 15px;
        margin: 0;
        color: #e2e8f0;
      }
      .member-count {
        font-size: 11px;
        color: #64748b;
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
        border: 1px solid #252d45;
        color: #94a3b8;
        border-radius: 4px;
        cursor: pointer;
      }
      .btn-icon {
        padding: 5px 12px;
        font-size: 12px;
        background: #3b82f6;
        border: none;
        color: #fff;
        border-radius: 4px;
        cursor: pointer;
      }
      .detail-body {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      .tree-area {
        flex: 1;
        overflow: hidden;
      }
      .side-panel {
        width: 340px;
        flex-shrink: 0;
        border-left: 1px solid #252d45;
        overflow-y: auto;
        background: #0f1120;
      }
      .loading-tree,
      .empty-tree {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        font-size: 14px;
      }
    `,
  ],
})
export class FamilyDetailPage implements OnInit, OnDestroy {
  familySvc = inject(FamilyService);
  memberSvc = inject(MemberService);
  relationSvc = inject(RelationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  familyId = '';
  showForm = false;
  selectedMember: any = null;

  async ngOnInit() {
    this.familyId = this.route.snapshot.params['id'];

    // ✅ Load song song — tất cả đều có method đúng
    await Promise.all([
      this.familySvc.loadOne(this.familyId),
      this.memberSvc.loadByFamily(this.familyId),
      this.relationSvc.loadByFamily(this.familyId),
      this.familySvc.loadUserRole(this.familyId),
    ]);
  }

  ngOnDestroy() {
    this.memberSvc.clearSelected(); // ✅ method đã thêm vào MemberService
    this.relationSvc.clear();
    this.familySvc.clearRole();
  }

  onMemberClicked(member: any) {
    this.selectedMember = member;
    this.showForm = true;
  }

  async onSaved() {
    this.showForm = false;
    this.selectedMember = null;
    // Reload data sau khi lưu
    await Promise.all([
      this.memberSvc.loadByFamily(this.familyId),
      this.relationSvc.loadByFamily(this.familyId),
    ]);
  }

  goBack() {
    this.router.navigate(['/families']);
  }
}
