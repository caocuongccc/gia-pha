import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GoogleDriveAuthService } from './google-drive-auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DriveUploadService {
  private http = inject(HttpClient);
  private driveAuth = inject(GoogleDriveAuthService);

  uploading = signal(false);
  progress = signal(0);

  /**
   * Upload file ảnh lên Google Drive qua API backend.
   * Tự kết nối Drive nếu chưa có token.
   */
  async uploadPhoto(file: File): Promise<string> {
    // Nếu chưa có Drive token → mở popup xin quyền trước
    if (!this.driveAuth.isDriveConnected()) {
      await this.driveAuth.connectDrive();
    }

    const accessToken = this.driveAuth.accessToken;
    if (!accessToken) throw new Error('Drive not connected');

    this.uploading.set(true);
    this.progress.set(10);

    try {
      // Build FormData với file + token
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('accessToken', accessToken);

      this.progress.set(40);

      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/drive/upload`, formData),
        // Không set Content-Type — browser tự set boundary cho multipart
      );

      this.progress.set(100);
      return res.data.url; // URL để dùng trong
    } finally {
      setTimeout(() => {
        this.uploading.set(false);
        this.progress.set(0);
      }, 800);
    }
  }
}
