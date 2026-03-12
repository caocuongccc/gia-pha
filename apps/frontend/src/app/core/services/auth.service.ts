// apps/frontend/src/app/core/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import {
  createClient,
  SupabaseClient,
  Session,
  User,
} from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;

  session = signal<Session | null>(null);
  currentUser = signal<User | null>(null);
  isLoading = signal(true);
  // Google provider_token (dùng để upload Drive)
  googleToken = signal<string>('');

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
    );

    // Khởi tạo session từ storage
    this.supabase.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.currentUser.set(data.session?.user ?? null);
      this.googleToken.set((data.session as any)?.provider_token ?? '');
      this.isLoading.set(false);
    });

    // Lắng nghe thay đổi auth state
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.currentUser.set(session?.user ?? null);
      this.googleToken.set((session as any)?.provider_token ?? '');
      this.isLoading.set(false);
    });
  }

  async signInWithGoogle() {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Chỉ dùng scope tối thiểu cho login.
        // Drive scope được xử lý riêng qua popup /api/google-auth (DriveSettingsComponent).
      },
    });
  }

  async signInWithEmail(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signUpWithEmail(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  getSupabase() {
    return this.supabase;
  }

  // Trả về JWT token để gửi lên API
  async getAccessToken(): Promise<string> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }
}
