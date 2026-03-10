// apps/frontend/src/app/features/auth/auth-callback.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div
      style="display:flex;align-items:center;justify-content:center;height:100vh;background:#09090f;color:#e2e8f0;font-family:'Segoe UI',sans-serif;flex-direction:column;gap:16px"
    >
      <div style="font-size:32px">🌳</div>
      <div style="font-size:14px;color:#64748b">Đang đăng nhập...</div>
    </div>
  `,
})
export class AuthCallbackComponent implements OnInit {
  private router = inject(Router);

  async ngOnInit() {
    const supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
    );

    // Supabase tự đọc hash fragment (#access_token=...) và set session
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      // Thử exchange code nếu dùng PKCE flow
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');

      if (accessToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') ?? '',
        });
      } else {
        this.router.navigate(['/login']);
        return;
      }
    }

    this.router.navigate(['/families']);
  }
}
