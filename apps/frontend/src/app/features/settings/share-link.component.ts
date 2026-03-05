import { Component, input, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-share-link',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="share-section">
      <div class="share-toggle">
        <div>
          <strong>Chia sẻ công khai</strong>
          <p>Bật để bất kỳ ai có link đều xem được gia phả này</p>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            [checked]="isPublic()"
            (change)="togglePublic()"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>

      @if (isPublic()) {
        <div class="share-link-box">
          <input [value]="shareUrl()" readonly />
          <button (click)="copyLink()">
            {{ copied() ? '✅ Đã copy' : '📋 Copy' }}
          </button>
        </div>
        <p class="share-note">
          🔓 Bất kỳ ai có link này đều có thể xem gia phả (không thể sửa).
        </p>
      }
    </div>
  `,
})
export class ShareLinkComponent {
  familyId = input.required<string>();
  isPublic = input.required<boolean>();
  copied = signal(false);

  shareUrl = computed(
    () => `${environment.frontendUrl}/family/${this.familyId()}/view`,
  );

  private http = inject(HttpClient);

  async togglePublic() {
    await firstValueFrom(
      this.http.patch(`${environment.apiUrl}/api/families/${this.familyId()}`, {
        isPublic: !this.isPublic(),
      }),
    );
    // Parent sẽ nhận từ event hoặc reload lại family data
  }

  async copyLink() {
    await navigator.clipboard.writeText(this.shareUrl());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }
}
