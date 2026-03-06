// apps/frontend/src/app/features/member-form/relation-form.component.ts
import {
  Component,
  input,
  output,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemberService } from '../../core/services/member.service';
import { RelationService } from '../../core/services/relation.service';
import type { Member, Relationship } from '@gia-pha/shared-types';

type RelType = 'PARENT' | 'SPOUSE' | 'CHILD';

interface RelOption {
  type: RelType;
  label: string;
  hint: string;
  icon: string;
}

@Component({
  selector: 'app-relation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rel-form">
      <!-- Tiêu đề: member đang xét -->
      <div class="subject">
        <span class="subject-icon">{{ subjectIcon() }}</span>
        <div>
          <div class="subject-name">{{ subject()?.fullName }}</div>
          <div class="subject-meta">
            Đời {{ subject()?.generation }} ·
            {{ subject()?.chi?.name ?? 'Chưa có chi' }}
          </div>
        </div>
      </div>

      <!-- Quan hệ hiện có -->
      @if (existingRels().length > 0) {
        <div class="existing">
          <div class="section-label">Quan hệ hiện có</div>
          @for (r of existingRels(); track r.rel.id) {
            <div class="rel-row">
              <span class="rel-icon">{{ r.icon }}</span>
              <div class="rel-info">
                <span class="rel-label">{{ r.label }}</span>
                <span class="rel-name">{{ r.member.fullName }}</span>
                <span class="rel-gen">Đời {{ r.member.generation }}</span>
              </div>
              <button
                class="btn-del"
                (click)="deleteRel(r.rel.id)"
                title="Xoá quan hệ"
              >
                ✕
              </button>
            </div>
          }
        </div>
      }

      <div class="divider"></div>

      <!-- Thêm quan hệ mới -->
      <div class="section-label">Thêm quan hệ</div>

      <!-- Chọn loại quan hệ -->
      <div class="rel-types">
        @for (opt of relOptions; track opt.type) {
          <button
            class="rel-type-btn"
            [class.active]="selectedType() === opt.type"
            (click)="selectedType.set(opt.type)"
          >
            <span class="rt-icon">{{ opt.icon }}</span>
            <span class="rt-label">{{ opt.label }}</span>
          </button>
        }
      </div>

      @if (selectedType()) {
        <div class="hint-box">{{ currentHint() }}</div>

        <!-- Tìm kiếm member -->
        <div class="search-box">
          <input
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch($event)"
            placeholder="Tìm theo tên..."
            class="search-input"
          />
        </div>

        <!-- Kết quả tìm kiếm -->
        <div class="search-results">
          @if (searchResults().length === 0 && searchQuery.length > 0) {
            <div class="no-result">Không tìm thấy</div>
          }
          @for (m of searchResults(); track m.id) {
            <div
              class="result-row"
              (click)="selectMember(m)"
              [class.selected]="selectedMemberId() === m.id"
            >
              <span class="r-icon">{{
                m.gender === 'MALE' ? '♂' : '♀'
              }}</span>
              <div class="r-info">
                <span class="r-name">{{ m.fullName }}</span>
                @if (m.alias) {
                  <span class="r-alias">({{ m.alias }})</span>
                }
                <span class="r-gen">Đời {{ m.generation }}</span>
                @if (m.chi) {
                  <span class="r-chi">{{ m.chi.name }}</span>
                }
              </div>
              @if (selectedMemberId() === m.id) {
                <span class="check">✓</span>
              }
            </div>
          }
        </div>

        <!-- Confirm -->
        @if (selectedMemberId()) {
          <div class="confirm-box">
            <div class="confirm-preview">
              <strong>{{ subject()?.fullName }}</strong>
              <span class="arrow">{{ currentArrow() }}</span>
              <strong>{{ selectedMemberName() }}</strong>
            </div>
            <button class="btn-save" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Đang lưu...' : 'Xác nhận' }}
            </button>
          </div>
        }
      }

      @if (error()) {
        <div class="error-msg">{{ error() }}</div>
      }
      @if (successMsg()) {
        <div class="success-msg">{{ successMsg() }}</div>
      }
    </div>
  `,
  styles: [
    `
      .rel-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      /* Subject */
      .subject {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #0c1828;
        border: 1px solid #1e3a6e33;
        border-radius: 8px;
        padding: 10px 14px;
      }
      .subject-icon {
        font-size: 22px;
      }
      .subject-name {
        font-size: 13px;
        font-weight: 600;
        color: #e2e8f0;
      }
      .subject-meta {
        font-size: 11px;
        color: #64748b;
        margin-top: 2px;
      }

      /* Existing */
      .existing {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .section-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #64748b;
      }
      .rel-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 10px;
        background: #0a0f1e;
        border: 1px solid #1e293b;
        border-radius: 6px;
      }
      .rel-icon {
        font-size: 14px;
        flex-shrink: 0;
      }
      .rel-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .rel-label {
        font-size: 10px;
        color: #64748b;
        background: #1e293b;
        padding: 1px 6px;
        border-radius: 8px;
      }
      .rel-name {
        font-size: 12px;
        color: #e2e8f0;
      }
      .rel-gen {
        font-size: 10px;
        color: #475569;
      }
      .btn-del {
        background: none;
        border: none;
        color: #475569;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
      }
      .btn-del:hover {
        color: #ef4444;
        background: #1e0a0a;
      }

      .divider {
        height: 1px;
        background: #1e293b;
      }

      /* Rel type buttons */
      .rel-types {
        display: flex;
        gap: 8px;
      }
      .rel-type-btn {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 10px 8px;
        background: #0a0f1e;
        border: 1px solid #1e293b;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .rel-type-btn:hover {
        border-color: #334155;
      }
      .rel-type-btn.active {
        border-color: #3b82f6;
        background: #0f1e38;
      }
      .rt-icon {
        font-size: 18px;
      }
      .rt-label {
        font-size: 10px;
        color: #94a3b8;
      }

      .hint-box {
        font-size: 11px;
        color: #475569;
        background: #0a0f1e;
        border-left: 2px solid #334155;
        padding: 6px 10px;
        border-radius: 0 4px 4px 0;
      }

      /* Search */
      .search-input {
        width: 100%;
        background: #0a0f1e;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        outline: none;
        box-sizing: border-box;
      }
      .search-input:focus {
        border-color: #3b82f6;
      }
      .search-results {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: 220px;
        overflow-y: auto;
      }
      .no-result {
        font-size: 12px;
        color: #475569;
        text-align: center;
        padding: 12px;
      }

      .result-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 10px;
        border: 1px solid #1e293b;
        border-radius: 6px;
        cursor: pointer;
        transition: border-color 0.15s;
      }
      .result-row:hover {
        border-color: #334155;
        background: #0a0f1e;
      }
      .result-row.selected {
        border-color: #3b82f6;
        background: #0f1e38;
      }
      .r-icon {
        font-size: 13px;
        color: #64748b;
        flex-shrink: 0;
      }
      .r-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .r-name {
        font-size: 12px;
        color: #e2e8f0;
      }
      .r-alias {
        font-size: 11px;
        color: #64748b;
      }
      .r-gen {
        font-size: 10px;
        color: #475569;
      }
      .r-chi {
        font-size: 10px;
        background: #0f2d0f;
        color: #4ade80;
        padding: 1px 6px;
        border-radius: 8px;
      }
      .check {
        color: #3b82f6;
        font-size: 14px;
      }

      /* Confirm */
      .confirm-box {
        background: #0f1e38;
        border: 1px solid #1e3a6e;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .confirm-preview {
        font-size: 12px;
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .confirm-preview strong {
        color: #e2e8f0;
      }
      .arrow {
        color: #3b82f6;
        font-size: 14px;
      }
      .btn-save {
        background: #3b82f6;
        border: none;
        color: #fff;
        border-radius: 6px;
        padding: 7px 16px;
        cursor: pointer;
        font-size: 12px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .btn-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .error-msg {
        font-size: 12px;
        color: #ef4444;
        padding: 6px 10px;
        background: #1e0a0a;
        border-radius: 6px;
      }
      .success-msg {
        font-size: 12px;
        color: #4ade80;
        padding: 6px 10px;
        background: #0a1e0a;
        border-radius: 6px;
      }
    `,
  ],
})
export class RelationFormComponent implements OnInit {
  memberId = input.required<string>();
  familyId = input.required<string>();
  changed = output<void>();

  private memberSvc = inject(MemberService);
  private relationSvc = inject(RelationService);

  selectedType = signal<RelType | null>(null);
  selectedMemberId = signal<string | null>(null);
  saving = signal(false);
  error = signal('');
  successMsg = signal('');
  searchQuery = '';
  searchResults = signal<Member[]>([]);

  relOptions: RelOption[] = [
    {
      type: 'PARENT',
      label: 'Cha/Mẹ',
      hint: 'Chọn người là CHA hoặc MẸ của thành viên này',
      icon: '👴',
    },
    {
      type: 'CHILD',
      label: 'Con',
      hint: 'Chọn người là CON của thành viên này',
      icon: '👶',
    },
    {
      type: 'SPOUSE',
      label: 'Vợ/Chồng',
      hint: 'Chọn người là VỢ hoặc CHỒNG của thành viên này',
      icon: '💑',
    },
  ];

  // ── Computed ──────────────────────────────────────────────
  subject = computed(() =>
    this.memberSvc.members().find((m) => m.id === this.memberId()),
  );

  subjectIcon = computed(() => {
    const s = this.subject();
    if (!s) return '👤';
    return s.gender === 'MALE' ? '👨' : s.gender === 'FEMALE' ? '👩' : '👤';
  });

  existingRels = computed(() => {
    const id = this.memberId();
    const rels = this.relationSvc.relations();
    const map = this.memberSvc.members().reduce((m, mem) => {
      m.set(mem.id, mem);
      return m;
    }, new Map<string, Member>());

    const result: {
      rel: Relationship;
      member: Member;
      label: string;
      icon: string;
    }[] = [];

    for (const r of rels) {
      if (r.type === 'PARENT') {
        if (r.toMemberId === id) {
          const m = map.get(r.fromMemberId);
          if (m)
            result.push({ rel: r, member: m, label: 'Cha/Mẹ', icon: '👴' });
        }
        if (r.fromMemberId === id) {
          const m = map.get(r.toMemberId);
          if (m) result.push({ rel: r, member: m, label: 'Con', icon: '👶' });
        }
      }
      if (r.type === 'SPOUSE') {
        const otherId = r.fromMemberId === id ? r.toMemberId : r.fromMemberId;
        if (r.fromMemberId === id || r.toMemberId === id) {
          const m = map.get(otherId);
          if (m)
            result.push({ rel: r, member: m, label: 'Vợ/Chồng', icon: '💑' });
        }
      }
    }
    return result;
  });

  selectedMemberName = computed(
    () =>
      this.memberSvc.members().find((m) => m.id === this.selectedMemberId())
        ?.fullName ?? '',
  );

  currentHint = computed(
    () =>
      this.relOptions.find((o) => o.type === this.selectedType())?.hint ?? '',
  );

  currentArrow = computed(() => {
    switch (this.selectedType()) {
      case 'PARENT':
        return '← con của';
      case 'CHILD':
        return '→ cha/mẹ của';
      case 'SPOUSE':
        return '⚭';
      default:
        return '—';
    }
  });

  // ── Init ──────────────────────────────────────────────────
  ngOnInit() {
    // Hiện tất cả members khác khi mở form
    this.searchResults.set(
      this.memberSvc
        .members()
        .filter((m) => m.id !== this.memberId())
        .slice(0, 20),
    );
  }

  // ── Search ────────────────────────────────────────────────
  onSearch(query: string) {
    const q = query.toLowerCase().trim();
    const all = this.memberSvc
      .members()
      .filter((m) => m.id !== this.memberId());
    if (!q) {
      this.searchResults.set(all.slice(0, 20));
      return;
    }
    this.searchResults.set(
      all
        .filter(
          (m) =>
            m.fullName.toLowerCase().includes(q) ||
            (m.alias ?? '').toLowerCase().includes(q),
        )
        .slice(0, 15),
    );
    this.selectedMemberId.set(null);
  }

  selectMember(m: Member) {
    this.selectedMemberId.set(m.id);
    this.error.set('');
  }

  // ── Save ──────────────────────────────────────────────────
  async save() {
    const type = this.selectedType();
    const otherId = this.selectedMemberId();
    const selfId = this.memberId();
    if (!type || !otherId) return;

    this.saving.set(true);
    this.error.set('');
    this.successMsg.set('');

    try {
      if (type === 'PARENT') {
        // otherId là CHA/MẸ → fromMember=cha, toMember=con(self)
        await this.relationSvc.create({
          familyId: this.familyId(),
          fromMemberId: otherId,
          toMemberId: selfId,
          type: 'PARENT' as any,
        });
      } else if (type === 'CHILD') {
        // otherId là CON → fromMember=self(cha), toMember=con
        await this.relationSvc.create({
          familyId: this.familyId(),
          fromMemberId: selfId,
          toMemberId: otherId,
          type: 'PARENT' as any,
        });
      } else if (type === 'SPOUSE') {
        await this.relationSvc.create({
          familyId: this.familyId(),
          fromMemberId: selfId,
          toMemberId: otherId,
          type: 'SPOUSE' as any,
        });
      }

      this.successMsg.set('Đã thêm quan hệ ✓');
      this.selectedMemberId.set(null);
      this.selectedType.set(null);
      this.searchQuery = '';
      this.searchResults.set(
        this.memberSvc
          .members()
          .filter((m) => m.id !== this.memberId())
          .slice(0, 20),
      );
      this.changed.emit();
    } catch (e: any) {
      const msg = e?.error?.error ?? e?.message ?? 'Lỗi không xác định';
      this.error.set(msg.includes('Unique') ? 'Quan hệ này đã tồn tại' : msg);
    } finally {
      this.saving.set(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────
  async deleteRel(relId: string) {
    if (!confirm('Xoá quan hệ này?')) return;
    try {
      await this.relationSvc.delete(relId);
      this.changed.emit();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Không xoá được');
    }
  }
}
