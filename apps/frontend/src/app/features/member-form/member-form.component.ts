// apps/frontend/src/app/features/member-form/member-form.component.ts
import {
  Component,
  input,
  output,
  inject,
  effect,
  signal,
  computed,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MemberService } from '../../core/services/member.service';
import { ChiPhaiService } from '../../core/services/chi-phai.service';
import { PhotoPickerComponent } from '../../shared/components/photo-picker/photo-picker.component';
import type { Member } from '@gia-pha/shared-types';
import { Gender } from '@gia-pha/shared-types';
import { CapitalizeDirective } from '../../shared/directives/capitalize.directive';

@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PhotoPickerComponent,
    CapitalizeDirective,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="member-form">
      <!-- ── Thông tin cơ bản ─────────────────────── -->
      <section class="section">
        <h4 class="section-title">Thông tin cơ bản</h4>

        <div class="row">
          <div class="field flex-2">
            <label>Họ tên <span class="required">*</span></label>
            <input
              formControlName="fullName"
              placeholder="Lê Văn A"
              appCapitalize
            />
          </div>
          <div class="field">
            <label>Tên tự / Tên khác</label>
            <input
              formControlName="alias"
              placeholder="Tên hiệu, pháp danh..."
            />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Giới tính <span class="required">*</span></label>
            <select formControlName="gender">
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>
          <div class="field">
            <label>Đời thứ</label>
            <input
              formControlName="generation"
              type="number"
              min="1"
              placeholder="1"
            />
          </div>
          <div class="field">
            <label>Thứ tự con</label>
            <select formControlName="childOrder">
              <option [value]="null">—</option>
              @for (n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track n) {
                <option [value]="n">{{ orderLabel(n) }}</option>
              }
            </select>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Năm / ngày sinh</label>
            <input formControlName="birthDate" type="date" />
          </div>
          <div class="field">
            <label>Năm / ngày mất (DL)</label>
            <input formControlName="deathDate" type="date" />
          </div>
          <div class="field">
            <label>Năm mất (Âm lịch)</label>
            <input formControlName="deathYearAm" placeholder="VD: Canh Tý" />
          </div>
        </div>

        <div class="field">
          <label>Nơi an táng</label>
          <input formControlName="burialPlace" placeholder="Thôn X, xã Y..." />
        </div>

        <div class="field">
          <label>Ảnh đại diện</label>
          <app-photo-picker
            [value]="form.get('photoUrl')!.value"
            (changed)="form.patchValue({ photoUrl: $event })"
          />
        </div>

        <div class="field">
          <label>Tiểu sử / Ghi chú</label>
          <textarea
            formControlName="biography"
            rows="3"
            placeholder="Sự nghiệp, công trạng, ghi chú gia phả..."
          ></textarea>
        </div>

        <div class="field checkbox-field">
          <label>
            <input formControlName="isOutPerson" type="checkbox" />
            Người ngoại tộc (vợ/chồng lấy vào, không mang họ)
          </label>
        </div>
      </section>

      <!-- ── Phân cấp Chi - Phái ──────────────────── -->
      @if (!form.value.isOutPerson) {
        <section class="section">
          <h4 class="section-title">Chi — Phái</h4>

          <div class="row">
            <div class="field">
              <label>Chi</label>
              <select formControlName="chiId" (change)="onChiChange()">
                <option value="">— Chưa xác định —</option>
                @for (c of chiSvc.chiList(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label>Phái</label>
              <select formControlName="phaiId" [disabled]="!form.value.chiId">
                <option value="">— Chưa xác định —</option>
                @for (p of availablePhai(); track p.id) {
                  <option [value]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>
          </div>
        </section>
      }

      <!-- ── Nhóm gia đình ────────────────────────── -->
      <section class="section">
        <h4 class="section-title">Nhóm gia đình</h4>
        <div class="field">
          <label>
            Mã nhóm (coupleGroupId)
            <span class="hint">— Ghép vợ chồng + con cái vào cùng 1 nhóm</span>
          </label>
          <div class="input-row">
            <input
              formControlName="coupleGroupId"
              placeholder="UUID nhóm..."
              readonly
              class="readonly"
            />
            <button type="button" class="btn-gen" (click)="genGroupId()">
              Tạo mới
            </button>
            <button type="button" class="btn-clear" (click)="clearGroupId()">
              Xoá
            </button>
          </div>
          <p class="hint-text">
            Để ghép thành viên này vào nhóm gia đình đã có → paste mã nhóm của
            người cha/chồng vào đây.
          </p>
        </div>
      </section>

      <!-- ── Actions ──────────────────────────────── -->
      <div class="form-actions">
        <button type="button" class="btn-cancel" (click)="cancelled.emit()">
          Huỷ
        </button>
        <button
          type="submit"
          class="btn-submit"
          [disabled]="form.invalid || saving()"
        >
          {{
            saving()
              ? 'Đang lưu...'
              : editMember()
                ? 'Cập nhật'
                : 'Thêm thành viên'
          }}
        </button>
      </div>

      @if (error()) {
        <p class="error-msg">{{ error() }}</p>
      }
    </form>
  `,
  styles: [
    `
      .member-form {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .section {
        padding: 16px 0;
        border-bottom: 1px solid #1e293b;
      }
      .section:last-of-type {
        border-bottom: none;
      }
      .section-title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #64748b;
        margin: 0 0 12px;
      }
      .row {
        display: flex;
        gap: 12px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 0;
      }
      .field.flex-2 {
        flex: 2;
      }
      label {
        font-size: 11px;
        color: #94a3b8;
      }
      .required {
        color: #ef4444;
      }
      .hint {
        font-size: 10px;
        color: #475569;
      }
      input,
      select,
      textarea {
        background: #0a0f1e;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 5px;
        padding: 7px 10px;
        font-size: 12px;
        outline: none;
        width: 100%;
      }
      input:focus,
      select:focus,
      textarea:focus {
        border-color: #3b82f6;
      }
      input.readonly {
        color: #64748b;
        cursor: default;
      }
      textarea {
        resize: vertical;
        font-family: inherit;
      }
      .checkbox-field label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 12px;
        color: #cbd5e1;
      }
      .checkbox-field input[type='checkbox'] {
        width: auto;
      }
      .input-row {
        display: flex;
        gap: 6px;
      }
      .input-row input {
        flex: 1;
      }
      .btn-gen,
      .btn-clear {
        background: #1e293b;
        border: 1px solid #334155;
        color: #94a3b8;
        border-radius: 5px;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 11px;
        white-space: nowrap;
      }
      .btn-gen:hover {
        border-color: #3b82f6;
        color: #60a5fa;
      }
      .btn-clear:hover {
        border-color: #ef4444;
        color: #ef4444;
      }
      .hint-text {
        font-size: 10px;
        color: #475569;
        margin: 4px 0 0;
      }
      .form-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        padding-top: 16px;
      }
      .btn-cancel {
        background: none;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 6px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 13px;
      }
      .btn-submit {
        background: #3b82f6;
        border: none;
        color: #fff;
        border-radius: 6px;
        padding: 8px 20px;
        cursor: pointer;
        font-size: 13px;
      }
      .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .error-msg {
        color: #ef4444;
        font-size: 12px;
        text-align: center;
        margin: 8px 0 0;
      }
    `,
  ],
})
export class MemberFormComponent {
  // ── Inputs / Outputs ─────────────────────────────────────────
  familyId = input.required<string>();
  editMember = input<Member | null>(null); // ← đổi từ editId (string) sang editMember (Member)

  submitted = output<Member>(); // backward-compat: emit full Member sau khi save
  saved = output<void>(); // simple notify (dùng ở chỗ không cần Member)
  cancelled = output<void>();

  private fb = inject(FormBuilder);
  private memberSvc = inject(MemberService);
  chiSvc = inject(ChiPhaiService);

  saving = signal(false);
  error = signal('');

  // availablePhai tự tính từ chiId đang chọn
  availablePhai = computed(() => {
    const chiId = this.form?.get('chiId')?.value;
    if (!chiId) return [];
    return this.chiSvc.chiList().find((c) => c.id === chiId)?.phaiList ?? [];
  });

  form = this.fb.group({
    fullName: ['', Validators.required],
    alias: ['' as string],
    gender: [Gender.MALE as string, Validators.required],
    generation: [1, [Validators.required, Validators.min(1)]],
    childOrder: [null as number | null],
    birthDate: ['' as string],
    deathDate: ['' as string],
    deathYearAm: ['' as string],
    burialPlace: ['' as string],
    biography: ['' as string],
    photoUrl: ['' as string],
    isOutPerson: [false],
    coupleGroupId: ['' as string],
    chiId: ['' as string],
    phaiId: ['' as string],
  });

  constructor() {
    effect(() => {
      const familyId = this.familyId();
      const m = this.editMember();

      // ✅ untracked: đọc chiList để check nhưng KHÔNG track làm dependency
      if (!untracked(() => this.chiSvc.chiList().length)) {
        this.chiSvc.load(familyId);
      }

      this.form.reset({
        fullName: '',
        alias: '',
        gender: Gender.MALE,
        generation: 1,
        childOrder: null,
        birthDate: '',
        deathDate: '',
        deathYearAm: '',
        burialPlace: '',
        biography: '',
        photoUrl: '',
        isOutPerson: false,
        coupleGroupId: '',
        chiId: '',
        phaiId: '',
      });

      if (m) {
        this.form.patchValue({
          fullName: m.fullName,
          alias: m.alias ?? '',
          gender: m.gender,
          generation: m.generation,
          childOrder: m.childOrder ?? null,
          birthDate: m.birthDate ? m.birthDate.slice(0, 10) : '',
          deathDate: m.deathDate ? m.deathDate.slice(0, 10) : '',
          deathYearAm: m.deathYearAm ?? '',
          burialPlace: m.burialPlace ?? '',
          biography: m.biography ?? '',
          photoUrl: m.photoUrl ?? '',
          isOutPerson: m.isOutPerson,
          coupleGroupId: m.coupleGroupId ?? '',
          chiId: m.chiId ?? '',
          phaiId: m.phaiId ?? '',
        });
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────
  onChiChange() {
    this.form.patchValue({ phaiId: '' });
  }

  genGroupId() {
    this.form.patchValue({ coupleGroupId: crypto.randomUUID() });
  }

  clearGroupId() {
    this.form.patchValue({ coupleGroupId: '' });
  }

  orderLabel(n: number): string {
    return (
      [
        '',
        'Con trưởng',
        'Con thứ',
        'Con ba',
        'Con tư',
        'Con năm',
        'Con sáu',
        'Con bảy',
        'Con tám',
        'Con chín',
        'Con mười',
      ][n] ?? `Con thứ ${n}`
    );
  }

  // ── Submit ────────────────────────────────────────────────────
  async submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');

    try {
      const v = this.form.value;
      const dto = {
        familyId: this.familyId(),
        fullName: v.fullName!,
        gender: v.gender! as any,
        generation: Number(v.generation),
        birthDate: v.birthDate || null,
        deathDate: v.deathDate || null,
        deathYearAm: v.deathYearAm || null,
        alias: v.alias || null,
        childOrder: v.childOrder ? Number(v.childOrder) : null,
        burialPlace: v.burialPlace || null,
        biography: v.biography || null,
        photoUrl: v.photoUrl || null,
        isOutPerson: v.isOutPerson ?? false,
        coupleGroupId: v.coupleGroupId || null,
        chiId: v.chiId || null,
        phaiId: v.phaiId || null,
      };

      const result = this.editMember()
        ? await this.memberSvc.update(this.editMember()!.id, dto)
        : await this.memberSvc.create(dto);

      this.submitted.emit(result); // emit Member cho parent cũ
      this.saved.emit(); // emit void cho parent mới
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Có lỗi xảy ra');
    } finally {
      this.saving.set(false);
    }
  }
}
