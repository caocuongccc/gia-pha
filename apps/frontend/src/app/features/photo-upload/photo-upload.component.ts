import {
  Component,
  input,
  output,
  signal,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DriveUploadService } from '../../core/services/upload.service';
import { GoogleDriveAuthService } from '../../core/services/google-drive-auth.service';

@Component({
  selector: 'app-photo-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="photo-upload-wrap">
      <!-- Preview ảnh hiện tại -->
      <div class="preview-circle" (click)="fileInput.click()">
        @if (previewUrl() || currentUrl()) {
          <img [src]="previewUrl() || currentUrl()" alt="avatar" />
        } @else {
          <span class="placeholder">📷</span>
        }

        @if (driveUpload.uploading()) {
          <div class="progress-ring">
            <div class="progress-text">{{ driveUpload.progress() }}%</div>
          </div>
        } @else {
          <div class="edit-overlay">✏️</div>
        }
      </div>

      <!-- Drive connection status -->
      <div class="drive-status">
        @if (driveAuth.isDriveConnected()) {
          <span class="connected">
            <svg width="12" height="12" viewBox="0 0 24 24">
              <path d="M8.5 2l-7 12h4.5L13 2z" fill="#4285f4" />
              <path d="M15.5 2l7 12h-4.5L11 2z" fill="#34a853" />
              <path d="M1.5 14l3.5 6h13l3.5-6z" fill="#fbbc04" />
            </svg>
            Google Drive đã kết nối
          </span>
        } @else {
          <span class="disconnected" (click)="connectDrive()">
            🔗 Kết nối Google Drive để upload ảnh
          </span>
        }
      </div>

      <input
        #fileInput
        type="file"
        accept="image/*"
        style="display:none"
        (change)="onFileChange($event)"
      />
    </div>
  `,
  styles: [
    `
      .photo-upload-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
      .preview-circle {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 2px solid #252d45;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        background: #141828;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .preview-circle img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .placeholder {
        font-size: 28px;
      }
      .edit-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
        font-size: 18px;
      }
      .preview-circle:hover .edit-overlay {
        opacity: 1;
      }
      .progress-ring {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .progress-text {
        color: #fff;
        font-size: 12px;
        font-family: monospace;
      }
      .drive-status {
        font-size: 11px;
      }
      .connected {
        color: #34a853;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .disconnected {
        color: #4285f4;
        cursor: pointer;
        text-decoration: underline;
      }
    `,
  ],
})
export class PhotoUploadComponent {
  currentUrl = input<string | null>(null);
  uploaded = output<string>();

  previewUrl = signal<string | null>(null);
  error = signal<string | null>(null);

  driveUpload = inject(DriveUploadService);
  driveAuth = inject(GoogleDriveAuthService);

  async connectDrive() {
    await this.driveAuth.connectDrive();
  }

  async onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Preview local tức thì
    this.previewUrl.set(URL.createObjectURL(file));
    this.error.set(null);

    try {
      const url = await this.driveUpload.uploadPhoto(file);
      this.uploaded.emit(url);
    } catch (e: any) {
      this.previewUrl.set(null);
      this.error.set(e.message || 'Upload thất bại');
    }
  }
}
