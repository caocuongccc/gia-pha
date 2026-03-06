// apps/frontend/src/app/features/settings/manage-chi-phai.component.ts
import { Component, input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChiPhaiService,
  Chi,
  Phai,
} from '../../core/services/chi-phai.service';

@Component({
  selector: 'app-manage-chi-phai',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mgr">
      <div class="mgr-header">
        <h3>Chi — Phái</h3>
        <span class="stat"
          >{{ svc.chiList().length }} chi · {{ svc.allPhai().length }} phái ·
          {{ svc.totalMembers() }} thành viên</span
        >
      </div>

      @if (svc.loading()) {
        <div class="loading">Đang tải...</div>
      } @else {
        <div class="chi-list">
          @for (chi of svc.chiList(); track chi.id) {
            <div class="chi-card" [class.open]="openChiId() === chi.id">
              <div class="chi-row" (click)="toggleChi(chi.id)">
                @if (editChi()?.id === chi.id) {
                  <input
                    class="inp"
                    [(ngModel)]="editChi()!.name"
                    (click)="$event.stopPropagation()"
                  />
                  <button class="btn-ok" (click)="saveChi($event, chi)">
                    ✓
                  </button>
                  <button
                    class="btn-x"
                    (click)="editChi.set(null); $event.stopPropagation()"
                  >
                    ✕
                  </button>
                } @else {
                  <span class="chi-icon">🌿</span>
                  <span class="chi-name">{{ chi.name }}</span>
                  <span class="chi-note">{{ chi.founderNote }}</span>
                  <span class="chip">{{ chi._count?.members ?? 0 }} người</span>
                  <span class="chip blue">{{ chi.phaiList.length }} phái</span>
                  <button
                    class="btn-sm"
                    (click)="
                      editChi.set({ id: chi.id, name: chi.name });
                      $event.stopPropagation()
                    "
                  >
                    ✏️
                  </button>
                  <button class="btn-sm del" (click)="delChi($event, chi.id)">
                    🗑
                  </button>
                  <span class="arr">{{
                    openChiId() === chi.id ? '▲' : '▼'
                  }}</span>
                }
              </div>

              @if (openChiId() === chi.id) {
                <div class="phai-list">
                  @for (p of chi.phaiList; track p.id) {
                    <div class="phai-row">
                      @if (editPhai()?.id === p.id) {
                        <input
                          class="inp sm"
                          [(ngModel)]="editPhai()!.name"
                          placeholder="Tên phái"
                        />
                        <input
                          class="inp sm"
                          [(ngModel)]="editPhai()!.note"
                          placeholder="Ghi chú..."
                        />
                        <button class="btn-ok" (click)="savePhai(chi.id, p.id)">
                          ✓
                        </button>
                        <button class="btn-x" (click)="editPhai.set(null)">
                          ✕
                        </button>
                      } @else {
                        <span class="p-icon">🔸</span>
                        <div class="p-info">
                          <span class="p-name">{{ p.name }}</span>
                          @if (p.founderNote) {
                            <span class="p-note">{{ p.founderNote }}</span>
                          }
                        </div>
                        <span class="chip sm">{{
                          p._count?.members ?? 0
                        }}</span>
                        <button
                          class="btn-sm"
                          (click)="
                            editPhai.set({
                              id: p.id,
                              name: p.name,
                              note: p.founderNote ?? '',
                            })
                          "
                        >
                          ✏️
                        </button>
                        <button
                          class="btn-sm del"
                          (click)="delPhai(chi.id, p.id)"
                        >
                          🗑
                        </button>
                      }
                    </div>
                  }

                  @if (addingToChiId() === chi.id) {
                    <div class="phai-row add">
                      <input
                        class="inp sm"
                        [(ngModel)]="newPhai.name"
                        placeholder="Tên phái (VD: Phái Nhất)"
                      />
                      <input
                        class="inp sm"
                        [(ngModel)]="newPhai.note"
                        placeholder="Ghi chú tổ phái..."
                      />
                      <button
                        class="btn-ok"
                        (click)="createPhai(chi.id)"
                        [disabled]="!newPhai.name"
                      >
                        + Thêm
                      </button>
                      <button class="btn-x" (click)="addingToChiId.set(null)">
                        ✕
                      </button>
                    </div>
                  } @else {
                    <button
                      class="btn-add-phai"
                      (click)="addingToChiId.set(chi.id)"
                    >
                      + Thêm phái
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>

        @if (addingChi()) {
          <div class="add-chi-form">
            <input
              class="inp"
              [(ngModel)]="newChi.name"
              placeholder="Tên chi (VD: Chi Nhất, Chi Nhì)"
            />
            <input
              class="inp"
              [(ngModel)]="newChi.note"
              placeholder="Ghi chú tổ chi..."
            />
            <div class="row">
              <button class="btn-x" (click)="addingChi.set(false)">Huỷ</button>
              <button
                class="btn-ok"
                (click)="createChi()"
                [disabled]="!newChi.name"
              >
                Tạo chi
              </button>
            </div>
          </div>
        } @else {
          <button class="btn-add-chi" (click)="addingChi.set(true)">
            + Thêm chi mới
          </button>
        }
      }
    </div>
  `,
  styles: [
    `
      .mgr {
        font-family: 'Segoe UI', sans-serif;
      }
      .mgr-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
      }
      .mgr-header h3 {
        margin: 0;
        font-size: 13px;
        color: #e2e8f0;
        letter-spacing: 0.5px;
      }
      .stat {
        font-size: 11px;
        color: #475569;
      }
      .loading {
        color: #64748b;
        font-size: 13px;
        padding: 12px;
        text-align: center;
      }

      .chi-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 10px;
      }
      .chi-card {
        border: 1px solid #1e293b;
        border-radius: 8px;
        background: #0c1120;
        overflow: hidden;
        transition: border-color 0.2s;
      }
      .chi-card.open {
        border-color: #3b5bdb44;
      }

      .chi-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        cursor: pointer;
      }
      .chi-row:hover {
        background: #0f1728;
      }
      .chi-icon {
        font-size: 15px;
        flex-shrink: 0;
      }
      .chi-name {
        font-size: 13px;
        font-weight: 600;
        color: #e2e8f0;
        min-width: 90px;
      }
      .chi-note {
        font-size: 11px;
        color: #475569;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .arr {
        font-size: 9px;
        color: #475569;
        margin-left: auto;
      }

      .chip {
        font-size: 10px;
        background: #1e293b;
        color: #94a3b8;
        padding: 2px 8px;
        border-radius: 10px;
        white-space: nowrap;
      }
      .chip.blue {
        background: #1a2a4a;
        color: #60a5fa;
      }
      .chip.sm {
        min-width: 26px;
        text-align: center;
      }

      .phai-list {
        border-top: 1px solid #1a2035;
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .phai-row {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 4px 6px;
        border-radius: 5px;
      }
      .phai-row:hover {
        background: #0f1728;
      }
      .phai-row.add {
        background: #090e1a;
        border: 1px dashed #1e293b;
      }
      .p-icon {
        font-size: 12px;
        flex-shrink: 0;
      }
      .p-info {
        flex: 1;
        display: flex;
        gap: 8px;
        align-items: baseline;
      }
      .p-name {
        font-size: 12px;
        color: #cbd5e1;
      }
      .p-note {
        font-size: 11px;
        color: #475569;
      }

      .inp {
        background: #0a0f1e;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 4px;
        padding: 5px 9px;
        font-size: 12px;
        outline: none;
        flex: 1;
        min-width: 0;
      }
      .inp.sm {
        max-width: 200px;
      }
      .inp:focus {
        border-color: #3b82f6;
      }

      .btn-ok {
        background: #3b82f6;
        border: none;
        color: #fff;
        border-radius: 4px;
        padding: 4px 12px;
        cursor: pointer;
        font-size: 12px;
      }
      .btn-ok:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .btn-x {
        background: none;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 4px;
        padding: 4px 10px;
        cursor: pointer;
        font-size: 12px;
      }
      .btn-sm {
        background: none;
        border: none;
        color: #475569;
        cursor: pointer;
        font-size: 12px;
        padding: 2px 5px;
        border-radius: 3px;
      }
      .btn-sm:hover {
        color: #94a3b8;
        background: #1e293b;
      }
      .btn-sm.del:hover {
        color: #ef4444;
      }
      .btn-add-phai {
        background: none;
        border: 1px dashed #1e293b;
        color: #475569;
        border-radius: 5px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 11px;
        width: 100%;
        margin-top: 3px;
      }
      .btn-add-phai:hover {
        border-color: #3b82f6;
        color: #60a5fa;
      }
      .btn-add-chi {
        width: 100%;
        background: none;
        border: 1px dashed #1e3a6e;
        color: #3b82f6;
        border-radius: 8px;
        padding: 10px;
        cursor: pointer;
        font-size: 13px;
      }
      .btn-add-chi:hover {
        background: #0f1e38;
      }
      .add-chi-form {
        border: 1px solid #1e3a6e;
        border-radius: 8px;
        padding: 14px;
        background: #0c1120;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .row {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
    `,
  ],
})
export class ManageChiPhaiComponent implements OnInit {
  familyId = input.required<string>();
  svc = inject(ChiPhaiService);

  openChiId = signal<string | null>(null);
  addingChi = signal(false);
  addingToChiId = signal<string | null>(null);
  editChi = signal<{ id: string; name: string } | null>(null);
  editPhai = signal<{ id: string; name: string; note: string } | null>(null);

  newChi = { name: '', note: '' };
  newPhai = { name: '', note: '' };

  async ngOnInit() {
    await this.svc.load(this.familyId());
    if (this.svc.chiList().length > 0)
      this.openChiId.set(this.svc.chiList()[0].id);
  }

  toggleChi(id: string) {
    this.openChiId.set(this.openChiId() === id ? null : id);
  }

  async createChi() {
    if (!this.newChi.name) return;
    await this.svc.createChi(
      this.familyId(),
      this.newChi.name,
      undefined,
      this.newChi.note || undefined,
    );
    this.newChi = { name: '', note: '' };
    this.addingChi.set(false);
  }

  async saveChi(e: Event, chi: Chi) {
    e.stopPropagation();
    const ed = this.editChi();
    if (!ed) return;
    await this.svc.updateChi(chi.id, { name: ed.name });
    this.editChi.set(null);
  }

  async delChi(e: Event, id: string) {
    e.stopPropagation();
    if (
      !confirm(
        'Xoá chi này sẽ gỡ tất cả phái và liên kết thành viên. Tiếp tục?',
      )
    )
      return;
    await this.svc.deleteChi(id);
  }

  async createPhai(chiId: string) {
    if (!this.newPhai.name) return;
    await this.svc.createPhai(
      chiId,
      this.newPhai.name,
      this.newPhai.note || undefined,
    );
    this.newPhai = { name: '', note: '' };
    this.addingToChiId.set(null);
  }

  async savePhai(chiId: string, phaiId: string) {
    const ed = this.editPhai();
    if (!ed) return;
    await this.svc.updatePhai(phaiId, chiId, {
      name: ed.name,
      founderNote: ed.note || undefined,
    });
    this.editPhai.set(null);
  }

  async delPhai(chiId: string, phaiId: string) {
    if (!confirm('Gỡ phái này sẽ xoá liên kết thành viên. Tiếp tục?')) return;
    await this.svc.deletePhai(phaiId, chiId);
  }
}
