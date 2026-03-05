// apps/frontend/src/app/features/auth/login.page.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="logo">🌳</div>
        <h1>Cây Gia Phả</h1>
        <p class="subtitle">Lưu giữ và kết nối các thế hệ</p>

        @if (error()) {
          <div class="error-msg">{{ error() }}</div>
        }

        <button
          class="btn-google"
          (click)="loginGoogle()"
          [disabled]="loading()"
        >
          @if (loading()) {
            <span>Đang xử lý...</span>
          } @else {
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Đăng nhập với Google
          }
        </button>

        <div class="divider">hoặc</div>

        <!-- Thêm vào template, thay thế nút email hiện tại -->
        <div class="mode-toggle">
          <button
            [class.active]="mode() === 'login'"
            (click)="mode.set('login')"
          >
            Đăng nhập
          </button>
          <button
            [class.active]="mode() === 'register'"
            (click)="mode.set('register')"
          >
            Đăng ký
          </button>
        </div>

        <div class="email-form">
          <input #emailInput type="email" placeholder="Email" class="input" />
          <input
            #passInput
            type="password"
            placeholder="Mật khẩu"
            class="input"
          />

          @if (mode() === 'login') {
            <button
              class="btn-email"
              (click)="loginEmail(emailInput.value, passInput.value)"
            >
              Đăng nhập
            </button>
          } @else {
            <button
              class="btn-email"
              (click)="registerEmail(emailInput.value, passInput.value)"
            >
              Tạo tài khoản
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .login-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #09090f;
        font-family: system-ui, sans-serif;
      }
      .login-card {
        background: #0f1120;
        border: 1px solid #252d45;
        border-radius: 12px;
        padding: 48px 40px;
        width: 360px;
        text-align: center;
      }
      .logo {
        font-size: 48px;
        margin-bottom: 12px;
      }
      h1 {
        color: #e2e8f0;
        font-size: 24px;
        margin: 0 0 8px;
      }
      .subtitle {
        color: #64748b;
        font-size: 13px;
        margin-bottom: 32px;
      }
      .btn-google {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 12px 20px;
        background: #fff;
        color: #1a1a1a;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .btn-google:hover {
        opacity: 0.9;
      }
      .btn-google:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .divider {
        color: #334155;
        font-size: 12px;
        margin: 20px 0;
        position: relative;
      }
      .divider::before,
      .divider::after {
        content: '';
        position: absolute;
        top: 50%;
        width: 42%;
        height: 1px;
        background: #1e293b;
      }
      .divider::before {
        left: 0;
      }
      .divider::after {
        right: 0;
      }
      .email-form {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .input {
        width: 100%;
        padding: 10px 12px;
        background: #141828;
        border: 1px solid #252d45;
        border-radius: 6px;
        color: #e2e8f0;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;
      }
      .input:focus {
        border-color: #3b82f6;
      }
      .btn-email {
        width: 100%;
        padding: 10px;
        background: #3b82f6;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        margin-top: 4px;
      }
      .btn-email:disabled {
        opacity: 0.5;
      }
      .error-msg {
        background: #1f0a0a;
        border: 1px solid #7f1d1d;
        color: #fca5a5;
        padding: 10px;
        border-radius: 6px;
        font-size: 12px;
        margin-bottom: 16px;
      }
    `,
  ],
})
export class LoginPage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  // Thêm vào LoginPage class
  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    // Nếu đã đăng nhập rồi → về trang chính
    if (this.auth.currentUser()) {
      this.router.navigate(['/families']);
    }
  }

  async loginGoogle() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { error } = await this.auth.signInWithGoogle();
      if (error) this.error.set(error.message);
      // Supabase tự redirect sau khi OAuth thành công
    } catch (e: any) {
      this.error.set(e.message);
      this.loading.set(false);
    }
  }

  async loginEmail(email: string, password: string) {
    if (!email || !password) {
      this.error.set('Vui lòng nhập email và mật khẩu');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const { error } = await this.auth.signInWithEmail(email, password);
      if (error) {
        this.error.set(error.message);
      } else {
        this.router.navigate(['/families']);
      }
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  // Thêm vào login.page.ts
  async signUp(email: string, password: string) {
    this.loading.set(true);
    const { error } = await this.auth.signUp(email, password);
    if (error) this.error.set(error.message);
    else this.error.set(null); // Supabase gửi email xác nhận
    this.loading.set(false);
  }

  // Thêm vào login.page.ts
  async registerEmail(email: string, password: string) {
    if (!email || !password) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const { error } = await this.auth.signUp(email, password);
      if (error) {
        this.error.set(error.message);
      } else {
        // Supabase gửi email xác nhận
        this.error.set('✅ Kiểm tra email để xác nhận tài khoản!');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
