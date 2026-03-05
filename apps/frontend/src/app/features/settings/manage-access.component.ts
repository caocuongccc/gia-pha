import {
  Component,
  input,
  signal,
  inject,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

interface AccessEntry {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  email?: string;
}

@Component({
  selector: 'app-manage-access',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="access-section">
      <h3>Thành viên có quyền truy cập</h3>
      <ul class="access-list">
        @for (entry of accessList(); track entry.id) {
          <li class="access-item">
            <div class="user-info">
              <span class="email">{{ entry.email || entry.userId }}</span>
              <span class="joined"
                >Tham gia {{ entry.joinedAt | date: 'dd/MM/yyyy' }}</span
              >
            </div>
            <div class="actions">
              <select
                [(ngModel)]="entry.role"
                [disabled]="entry.userId === currentUserId()"
                (change)="changeRole(entry)"
              >
                <option value="OWNER">Owner</option>
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                class="remove-btn"
                [disabled]="entry.userId === currentUserId()"
                (click)="removeMember(entry)"
              >
                Xóa
              </button>
            </div>
          </li>
        }
      </ul>

      <div class="invite-form">
        <h4>Mời thêm thành viên</h4>
        <div class="invite-row">
          <input
            [(ngModel)]="inviteEmail"
            type="email"
            placeholder="email@example.com"
          />
          <select [(ngModel)]="inviteRole">
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <button (click)="sendInvite()" [disabled]="sending()">
            {{ sending() ? 'Đang gửi...' : '📨 Gửi lời mời' }}
          </button>
        </div>
        @if (inviteSent()) {
          <p class="success-msg">✅ Đã gửi lời mời đến {{ inviteEmail }}</p>
        }
      </div>
    </section>
  `,
})
export class ManageAccessComponent implements OnInit {
  familyId = input.required<string>();

  accessList = signal<AccessEntry[]>([]);
  inviteEmail = '';
  inviteRole = 'VIEWER';
  sending = signal(false);
  inviteSent = signal(false);

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  currentUserId = computed(() => this.auth.currentUser()?.id);

  async ngOnInit() {
    const res: any = await firstValueFrom(
      this.http.get(
        `${environment.apiUrl}/api/access?familyId=${this.familyId()}`,
      ),
    );
    this.accessList.set(res.data);
  }

  async changeRole(entry: AccessEntry) {
    await firstValueFrom(
      this.http.patch(`${environment.apiUrl}/api/access/${entry.userId}`, {
        familyId: this.familyId(),
        role: entry.role,
      }),
    );
  }

  async removeMember(entry: AccessEntry) {
    if (!confirm(`Xóa thành viên này khỏi gia phả?`)) return;
    await firstValueFrom(
      this.http.delete(
        `${environment.apiUrl}/api/access/${entry.userId}?familyId=${this.familyId()}`,
      ),
    );
    this.accessList.update((list) => list.filter((e) => e.id !== entry.id));
  }

  async sendInvite() {
    if (!this.inviteEmail) return;
    this.sending.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/invites`, {
          familyId: this.familyId(),
          email: this.inviteEmail,
          role: this.inviteRole,
        }),
      );
      this.inviteSent.set(true);
      this.inviteEmail = '';
      setTimeout(() => this.inviteSent.set(false), 3000);
    } finally {
      this.sending.set(false);
    }
  }
}
