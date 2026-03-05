import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'gdrive_access_token';
const EXPIRY_KEY = 'gdrive_expiry';

@Injectable({ providedIn: 'root' })
export class GoogleDriveAuthService {
  private http = inject(HttpClient);

  // Signal lưu access token hiện tại
  private _accessToken = signal<string | null>(
    sessionStorage.getItem(STORAGE_KEY),
  );

  // Public computed: có đang kết nối Drive không?
  isDriveConnected = computed(() => {
    const token = this._accessToken();
    const expiry = sessionStorage.getItem(EXPIRY_KEY);
    if (!token || !expiry) return false;
    return Date.now() < Number(expiry) - 60_000; // còn ít nhất 1 phút
  });

  get accessToken() {
    return this._accessToken();
  }

  /** Lấy URL Google login, mở popup hoặc redirect */
  async connectDrive() {
    const res: any = await firstValueFrom(
      this.http.get(`${environment.apiUrl}/api/drive/auth-url`),
    );
    // Mở popup thay vì redirect toàn trang
    const popup = window.open(
      res.data.url,
      'google-drive-auth',
      'width=500,height=600,left=200,top=100',
    );

    // Lắng nghe message từ callback page (popup sẽ postMessage về)
    return new Promise<void>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
          this.saveToken(event.data.accessToken, event.data.expiryDate);
          window.removeEventListener('message', onMessage);
          popup?.close();
          resolve();
        }
      };
      window.addEventListener('message', onMessage);
    });
  }

  saveToken(accessToken: string, expiryDate: number) {
    sessionStorage.setItem(STORAGE_KEY, accessToken);
    sessionStorage.setItem(EXPIRY_KEY, String(expiryDate));
    this._accessToken.set(accessToken);
  }

  disconnect() {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    this._accessToken.set(null);
  }
}
