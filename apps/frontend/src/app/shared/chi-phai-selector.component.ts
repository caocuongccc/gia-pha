// apps/frontend/src/app/shared/chi-phai-selector.component.ts
// Dùng trong form thêm/sửa thành viên
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
import { ChiPhaiService } from '../core/services/chi-phai.service';

@Component({
  selector: 'app-chi-phai-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sel">
      <div class="field">
        <label>Chi</label>
        <select [ngModel]="chiId()" (ngModelChange)="onChi($event)">
          <option value="">— Chưa phân chi —</option>
          @for (c of svc.chiList(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
      </div>
      @if (chiId()) {
        <div class="field">
          <label>Phái</label>
          <select [ngModel]="phaiId()" (ngModelChange)="onPhai($event)">
            <option value="">— Chưa phân phái —</option>
            @for (p of phai(); track p.id) {
              <option [value]="p.id">
                {{ p.name }}
                @if (p.founderNote) {
                  — {{ p.founderNote }}
                }
              </option>
            }
          </select>
        </div>
      }
      @if (chiId() || phaiId()) {
        <div class="badges">
          @if (chiName()) {
            <span class="badge c">🌿 {{ chiName() }}</span>
          }
          @if (phaiName()) {
            <span class="badge p">🔸 {{ phaiName() }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .sel {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      label {
        font-size: 10px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.7px;
      }
      select {
        background: #0a0f1e;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 4px;
        padding: 6px 10px;
        font-size: 12px;
        outline: none;
      }
      select:focus {
        border-color: #3b82f6;
      }
      .badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .badge {
        font-size: 11px;
        padding: 2px 9px;
        border-radius: 10px;
      }
      .badge.c {
        background: #0f2d0f;
        color: #4ade80;
      }
      .badge.p {
        background: #1a0f2e;
        color: #c084fc;
      }
    `,
  ],
})
export class ChiPhaiSelectorComponent implements OnInit {
  familyId = input.required<string>();
  initialChiId = input<string | null>(null);
  initialPhaiId = input<string | null>(null);
  changed = output<{ chiId: string | null; phaiId: string | null }>();

  svc = inject(ChiPhaiService);

  chiId = signal('');
  phaiId = signal('');

  phai = computed(
    () => this.svc.chiList().find((c) => c.id === this.chiId())?.phaiList ?? [],
  );
  chiName = computed(
    () => this.svc.chiList().find((c) => c.id === this.chiId())?.name ?? '',
  );
  phaiName = computed(
    () => this.phai().find((p) => p.id === this.phaiId())?.name ?? '',
  );

  async ngOnInit() {
    if (!this.svc.chiList().length) await this.svc.load(this.familyId());
    this.chiId.set(this.initialChiId() ?? '');
    this.phaiId.set(this.initialPhaiId() ?? '');
  }

  onChi(v: string) {
    this.chiId.set(v);
    this.phaiId.set('');
    this.emit();
  }
  onPhai(v: string) {
    this.phaiId.set(v);
    this.emit();
  }
  private emit() {
    this.changed.emit({
      chiId: this.chiId() || null,
      phaiId: this.phaiId() || null,
    });
  }
}
