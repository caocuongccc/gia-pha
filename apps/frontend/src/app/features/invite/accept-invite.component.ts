import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

type PageState =
  | 'loading'
  | 'login_required'
  | 'accepting'
  | 'success'
  | 'error';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invite-page">
      @switch (state()) {
        @case ('loading') {
          <p>⏳ Đang xử lý lời mời...</p>
        }
        @case ('login_required') {
          <h2>Vui lòng đăng nhập trước</h2>
          <p>Để chấp nhận lời mời, bạn cần đăng nhập hoặc tạo tài khoản.</p>
          <button (click)="loginAndReturn()">Đăng nhập / Đăng ký</button>
        }
        @case ('success') {
          <h2>✅ Đã tham gia!</h2>
          <p>Bạn đã được thêm vào gia phả với quyền {{ joinedRole() }}.</p>
          <button (click)="goToFamily()">Xem gia phả ngay</button>
        }
        @case ('error') {
          <h2>❌ {{ errorMsg() }}</h2>
        }
      }
    </div>
  `,
})
export class AcceptInviteComponent implements OnInit {
  state = signal<PageState>('loading');
  errorMsg = signal('');
  joinedRole = signal('');
  familyId = signal('');

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  async ngOnInit() {
    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.state.set('error');
      this.errorMsg.set('Link không hợp lệ');
      return;
    }

    // Nếu chưa đăng nhập, lưu token và redirect về login
    if (!this.auth.currentUser()) {
      sessionStorage.setItem('pendingInvite', token);
      this.state.set('login_required');
      return;
    }

    this.state.set('accepting');
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/invites/accept`, { token }),
      );
      this.familyId.set(res.data.familyId);
      this.joinedRole.set(
        res.data.role === 'EDITOR' ? 'Biên tập viên' : 'Người xem',
      );
      this.state.set('success');
    } catch (e: any) {
      this.state.set('error');
      this.errorMsg.set(
        e.error?.error || 'Lời mời không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  loginAndReturn() {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  goToFamily() {
    this.router.navigate(['/family', this.familyId()]);
  }
}
