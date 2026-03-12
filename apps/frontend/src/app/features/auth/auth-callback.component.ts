// apps/frontend/src/app/features/auth/auth-callback.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div
      style="display:flex;align-items:center;justify-content:center;height:100vh;
                background:#09090f;color:#e2e8f0;font-family:'Segoe UI',sans-serif;
                flex-direction:column;gap:16px"
    >
      <div style="font-size:32px">🌳</div>
      <div style="font-size:14px;color:#64748b">{{ status }}</div>
    </div>
  `,
})
export class AuthCallbackComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  status = 'Đang đăng nhập...';

  async ngOnInit() {
    const supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
    );

    // Supabase tự parse hash fragment và set session
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      // Thử setSession từ hash nếu chưa có
      const hash = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // Lấy lại session sau khi set
        const { data: d2 } = await supabase.auth.getSession();
        if (d2.session) {
          this.router.navigate(['/families']);
          return;
        }
      }

      this.status = 'Đăng nhập thất bại, đang chuyển hướng...';
      setTimeout(() => this.router.navigate(['/login']), 1500);
      return;
    }

    this.router.navigate(['/families']);
  }
}
