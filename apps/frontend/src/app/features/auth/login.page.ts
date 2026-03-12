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
          <div class="error-msg" [class.success]="error()!.startsWith('✅')">
            {{ error() }}
          </div>
        }

        <!-- Google login -->
        <button
          class="btn-google"
          (click)="loginGoogle()"
          [disabled]="loading()"
        >
          @if (loading()) {
            <div class="btn-spinner"></div>
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

        <div class="divider"><span>hoặc dùng email</span></div>

        <!-- Mode toggle — pill style -->
        <div class="mode-toggle">
          <button
            class="toggle-btn"
            [class.active]="mode() === 'login'"
            (click)="mode.set('login')"
          >
            <span class="toggle-icon">🔑</span>
            Đăng nhập
          </button>
          <button
            class="toggle-btn"
            [class.active]="mode() === 'register'"
            (click)="mode.set('register')"
          >
            <span class="toggle-icon">✨</span>
            Đăng ký
          </button>
        </div>

        <!-- Email form -->
        <div class="email-form">
          <input
            #emailInput
            type="email"
            placeholder="Email"
            class="input"
            autocomplete="email"
          />
          <input
            #passInput
            type="password"
            placeholder="Mật khẩu"
            class="input"
            autocomplete="current-password"
            (keydown.enter)="
              mode() === 'login'
                ? loginEmail(emailInput.value, passInput.value)
                : registerEmail(emailInput.value, passInput.value)
            "
          />

          @if (mode() === 'login') {
            <button
              class="btn-email"
              (click)="loginEmail(emailInput.value, passInput.value)"
              [disabled]="loading()"
            >
              Đăng nhập
            </button>
          } @else {
            <button
              class="btn-email register"
              (click)="registerEmail(emailInput.value, passInput.value)"
              [disabled]="loading()"
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
        background: radial-gradient(ellipse at 50% 0%, #0f1e38 0%, #09090f 60%);
        font-family: system-ui, sans-serif;
      }

      .login-card {
        background: linear-gradient(160deg, #0f1120 0%, #0a0d1a 100%);
        border: 1px solid #1e293b;
        border-radius: 16px;
        padding: 44px 36px 36px;
        width: 360px;
        text-align: center;
        box-shadow:
          0 24px 60px rgba(0, 0, 0, 0.5),
          0 0 0 1px rgba(59, 130, 246, 0.05);
      }

      .logo {
        font-size: 46px;
        margin-bottom: 10px;
        display: block;
      }

      h1 {
        color: #e2e8f0;
        font-size: 22px;
        margin: 0 0 6px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }

      .subtitle {
        color: #64748b;
        font-size: 13px;
        margin: 0 0 28px;
      }

      /* Google button */
      .btn-google {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 11px 20px;
        background: #fff;
        color: #1a1a1a;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      .btn-google:hover {
        opacity: 0.92;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
      .btn-google:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid #ccc;
        border-top-color: #333;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        flex-shrink: 0;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Divider */
      .divider {
        position: relative;
        margin: 22px 0 18px;
        text-align: center;
      }
      .divider::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #1e293b;
      }
      .divider span {
        position: relative;
        background: #0f1120;
        padding: 0 12px;
        font-size: 11px;
        color: #475569;
        letter-spacing: 0.5px;
      }

      /* ── Mode toggle — pill ── */
      .mode-toggle {
        display: flex;
        gap: 6px;
        background: #060d1a;
        border: 1px solid #1e293b;
        border-radius: 10px;
        padding: 4px;
        margin-bottom: 16px;
      }
      .toggle-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 9px 12px;
        border: none;
        border-radius: 7px;
        background: transparent;
        color: #64748b;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .toggle-btn:hover:not(.active) {
        color: #94a3b8;
        background: #0f1728;
      }
      .toggle-btn.active {
        background: #1e3a6e;
        color: #60a5fa;
        box-shadow:
          0 2px 8px rgba(59, 130, 246, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }
      .toggle-icon {
        font-size: 14px;
      }

      /* Email form */
      .email-form {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .input {
        width: 100%;
        padding: 10px 13px;
        background: #060d1a;
        border: 1px solid #1e293b;
        border-radius: 7px;
        color: #e2e8f0;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.15s;
      }
      .input:focus {
        border-color: #3b82f6;
      }
      .input::placeholder {
        color: #334155;
      }

      .btn-email {
        width: 100%;
        padding: 11px;
        background: #3b82f6;
        color: #fff;
        border: none;
        border-radius: 7px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        margin-top: 2px;
        transition: background 0.15s;
      }
      .btn-email:hover {
        background: #2563eb;
      }
      .btn-email:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-email.register {
        background: linear-gradient(135deg, #6366f1, #3b82f6);
      }
      .btn-email.register:hover {
        background: linear-gradient(135deg, #4f46e5, #2563eb);
      }

      /* Error / success */
      .error-msg {
        background: #1a0808;
        border: 1px solid #7f1d1d;
        color: #fca5a5;
        padding: 10px 14px;
        border-radius: 7px;
        font-size: 12px;
        margin-bottom: 16px;
        text-align: left;
      }
      .error-msg.success {
        background: #0a1a0e;
        border-color: #166534;
        color: #4ade80;
      }
    `,
  ],
})
export class LoginPage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
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
      if (error) this.error.set(error.message);
      else this.router.navigate(['/families']);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async registerEmail(email: string, password: string) {
    if (!email || !password) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const { error } = await this.auth.signUpWithEmail(email, password);
      if (error) this.error.set(error.message);
      else this.error.set('✅ Kiểm tra email để xác nhận tài khoản!');
    } finally {
      this.loading.set(false);
    }
  }

  async signUp(email: string, password: string) {
    this.loading.set(true);
    const { error } = await this.auth.signUpWithEmail(email, password);
    if (error) this.error.set(error.message);
    else this.error.set(null);
    this.loading.set(false);
  }
}
