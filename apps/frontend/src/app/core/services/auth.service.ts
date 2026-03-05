import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;

  // Signals — Angular 17+ reactivity
  currentUser = signal<User | null>(null);
  isLoading = signal(true);

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      // process.env.SUPABASE_URL!,
      //process.env.SUPABASE_SERVICE_KEY!, // Service key (không phải anon key)
    );

    // Listen auth state changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser.set(session?.user ?? null);
      this.isLoading.set(false);
    });
  }

  async signInWithGoogle() {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async signInWithEmail(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }

  async getToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }
}
