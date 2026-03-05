import {
  Component,
  input,
  output,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import type { Member } from '@gia-pha/shared-types';
import { MemberService } from '../../core/services/member.service';

@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="member-form">
      <h3>{{ editMember() ? 'Sửa thành viên' : 'Thêm thành viên' }}</h3>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label>Họ và tên *</label>
          <input formControlName="fullName" placeholder="Lê Văn Tổ" />
        </div>

        <div class="field">
          <label>Giới tính</label>
          <select formControlName="gender">
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </select>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Năm sinh</label>
            <input formControlName="birthDate" type="date" />
          </div>
          <div class="field">
            <label>Năm mất</label>
            <input formControlName="deathDate" type="date" />
          </div>
        </div>

        <div class="field">
          <label>Đời thứ</label>
          <input formControlName="generation" type="number" min="1" />
        </div>

        <div class="field">
          <label>Tiểu sử</label>
          <textarea
            formControlName="biography"
            rows="3"
            placeholder="Ghi chú..."
          ></textarea>
        </div>

        <!-- ✅ photoUrl fix: ?? null trong TypeScript, không phải template -->
        <div class="field">
          <label>Ảnh đại diện URL</label>
          <input formControlName="photoUrl" placeholder="https://..." />
        </div>

        @if (error()) {
          <div class="error">{{ error() }}</div>
        }

        <div class="form-actions">
          <button type="button" class="btn-ghost" (click)="cancelled.emit()">
            Huỷ
          </button>
          <button
            type="submit"
            class="btn-primary"
            [disabled]="form.invalid || saving()"
          >
            {{ saving() ? 'Đang lưu...' : editMember() ? 'Cập nhật' : 'Thêm' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .member-form {
        padding: 20px;
      }
      h3 {
        font-size: 14px;
        color: #e2e8f0;
        margin-bottom: 16px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 12px;
      }
      .field-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      label {
        font-size: 11px;
        color: #64748b;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      input,
      select,
      textarea {
        background: #141828;
        border: 1px solid #252d45;
        color: #e2e8f0;
        border-radius: 4px;
        padding: 7px 10px;
        font-size: 12px;
        font-family: inherit;
        outline: none;
      }
      input:focus,
      select:focus,
      textarea:focus {
        border-color: #3b82f6;
      }
      .form-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }
      .btn-ghost {
        padding: 6px 14px;
        background: transparent;
        border: 1px solid #252d45;
        color: #94a3b8;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }
      .btn-primary {
        padding: 6px 14px;
        background: #3b82f6;
        border: none;
        color: #fff;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }
      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .error {
        color: #ef4444;
        font-size: 11px;
        margin-bottom: 8px;
      }
    `,
  ],
})
export class MemberFormComponent implements OnInit {
  // ✅ Input tên là 'editMember' — không phải 'member' để tránh conflict
  familyId = input.required<string>();
  editMember = input<Member | null>(null);

  saved = output<void>();
  cancelled = output<void>();

  private fb = inject(FormBuilder);
  private memberSvc = inject(MemberService);

  saving = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    fullName: ['', Validators.required],
    gender: ['MALE'],
    generation: [1, [Validators.required, Validators.min(1)]],
    birthDate: [null as string | null],
    deathDate: [null as string | null],
    biography: [null as string | null], // ✅ Prisma field name
    photoUrl: [null as string | null],
  });

  ngOnInit() {
    const m = this.editMember();
    if (m) {
      this.form.patchValue({
        fullName: m.fullName,
        gender: m.gender,
        generation: m.generation,
        birthDate: m.birthDate,
        deathDate: m.deathDate,
        biography: m.biography,
        // ✅ Dùng ?? null trong TypeScript — giải quyết undefined không assign được string | null
        photoUrl: m.photoUrl ?? null,
      });
    }
  }

  async submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);

    try {
      const v = this.form.value;
      // ✅ Convert null→undefined vì CreateMemberDto dùng optional (string|undefined)
      const dto = {
        familyId: this.familyId(),
        fullName: v.fullName!,
        gender: v.gender as any,
        generation: v.generation!,
        birthDate: v.birthDate ?? undefined,
        deathDate: v.deathDate ?? undefined,
        biography: v.biography ?? undefined,
        photoUrl: v.photoUrl ?? undefined,
      };

      const m = this.editMember();
      if (m) {
        await this.memberSvc.update(m.id, dto);
      } else {
        await this.memberSvc.create(dto);
      }

      this.saved.emit();
    } catch (err: any) {
      this.error.set(err.error?.error ?? 'Lưu thất bại');
    } finally {
      this.saving.set(false);
    }
  }
}
