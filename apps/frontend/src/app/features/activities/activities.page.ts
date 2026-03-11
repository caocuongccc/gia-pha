// apps/frontend/src/app/features/activities/activities.page.ts
import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

type PostType = 'TEXT' | 'ALBUM';

interface Photo {
  url: string;
  caption?: string;
}

interface Post {
  id: string;
  type: PostType;
  title?: string;
  content?: string;
  photos: { id: string; url: string; caption?: string; order: number }[];
  author: { id: string; name?: string; email: string; avatarUrl?: string };
  createdAt: string;
  authorId: string;
}

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="act">
      <!-- Header -->
      <header class="act-header">
        <button class="btn-back" (click)="goBack()">← Gia phả</button>
        <div class="act-title">
          <h1>📰 Hoạt động họ</h1>
          <span class="act-sub">{{ familyName() }}</span>
        </div>
        @if (canPost()) {
          <button class="btn-new" (click)="openCreate()">+ Đăng bài</button>
        }
      </header>

      <!-- Feed -->
      <div class="act-body">
        @if (loading()) {
          <div class="act-empty">Đang tải...</div>
        } @else if (posts().length === 0) {
          <div class="act-empty">
            <div style="font-size:40px;margin-bottom:12px">📭</div>
            <div>Chưa có bài đăng nào</div>
            @if (canPost()) {
              <div style="font-size:12px;margin-top:6px;color:#334155">
                Hãy là người đầu tiên đăng bài!
              </div>
            }
          </div>
        } @else {
          <div class="feed">
            @for (post of posts(); track post.id) {
              <div class="post-card">
                <!-- Post header -->
                <div class="post-header">
                  <div class="post-author">
                    @if (post.author.avatarUrl) {
                      <img
                        class="author-avatar"
                        [src]="post.author.avatarUrl"
                      />
                    } @else {
                      <div class="author-fallback">
                        {{ initials(post.author.name || post.author.email) }}
                      </div>
                    }
                    <div>
                      <div class="author-name">
                        {{ post.author.name || post.author.email }}
                      </div>
                      <div class="post-date">{{ fmtDate(post.createdAt) }}</div>
                    </div>
                  </div>
                  <div class="post-actions">
                    <span
                      class="post-type-badge"
                      [class.album]="post.type === 'ALBUM'"
                    >
                      {{ post.type === 'TEXT' ? '📝 Bài viết' : '🖼️ Album' }}
                    </span>
                    @if (canManage(post)) {
                      <button
                        class="btn-icon"
                        (click)="editPost(post)"
                        title="Sửa"
                      >
                        ✏️
                      </button>
                      <button
                        class="btn-icon danger"
                        (click)="deletePost(post)"
                        title="Xoá"
                      >
                        🗑️
                      </button>
                    }
                  </div>
                </div>

                <!-- Title -->
                @if (post.title) {
                  <h2 class="post-title">{{ post.title }}</h2>
                }

                <!-- TEXT content -->
                @if (post.type === 'TEXT' && post.content) {
                  <div
                    class="post-content ck-content"
                    [innerHTML]="sanitize(post.content)"
                  ></div>
                }

                <!-- ALBUM grid -->
                @if (post.type === 'ALBUM' && post.photos.length > 0) {
                  <div
                    class="photo-grid"
                    [class.single]="post.photos.length === 1"
                    [class.double]="post.photos.length === 2"
                  >
                    @for (photo of post.photos; track photo.id) {
                      <div
                        class="photo-item"
                        (click)="openLightbox(post.photos, $index)"
                      >
                        <img
                          [src]="photo.url"
                          [alt]="photo.caption || ''"
                          loading="lazy"
                        />
                        @if (photo.caption) {
                          <div class="photo-caption">{{ photo.caption }}</div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Lightbox -->
      @if (lightbox()) {
        <div class="lightbox" (click)="closeLightbox()">
          <button class="lb-close" (click)="closeLightbox()">✕</button>
          @if (lbIndex() > 0) {
            <button
              class="lb-nav lb-prev"
              (click)="$event.stopPropagation(); lbIndex.set(lbIndex() - 1)"
            >
              ‹
            </button>
          }
          <img
            class="lb-img"
            [src]="lightbox()![lbIndex()].url"
            (click)="$event.stopPropagation()"
          />
          @if (lightbox()![lbIndex()].caption) {
            <div class="lb-caption">{{ lightbox()![lbIndex()].caption }}</div>
          }
          @if (lbIndex() < lightbox()!.length - 1) {
            <button
              class="lb-nav lb-next"
              (click)="$event.stopPropagation(); lbIndex.set(lbIndex() + 1)"
            >
              ›
            </button>
          }
          <div class="lb-counter">
            {{ lbIndex() + 1 }} / {{ lightbox()!.length }}
          </div>
        </div>
      }

      <!-- Create/Edit Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingPost() ? 'Sửa bài' : 'Đăng bài mới' }}</h3>
              <button class="btn-icon" (click)="closeModal()">✕</button>
            </div>

            <!-- Type selector -->
            @if (!editingPost()) {
              <div class="type-tabs">
                <button
                  [class.active]="formType() === 'TEXT'"
                  (click)="formType.set('TEXT')"
                >
                  📝 Bài viết
                </button>
                <button
                  [class.active]="formType() === 'ALBUM'"
                  (click)="formType.set('ALBUM')"
                >
                  🖼️ Album ảnh
                </button>
              </div>
            }

            <!-- Title -->
            <div class="form-group">
              <label
                >Tiêu đề <span style="color:#475569">(tuỳ chọn)</span></label
              >
              <input
                class="form-input"
                [(ngModel)]="formTitle"
                placeholder="Nhập tiêu đề bài viết..."
              />
            </div>

            <!-- TEXT: CKEditor toolbar + textarea -->
            @if (formType() === 'TEXT') {
              <div class="form-group">
                <label>Nội dung</label>
                <div class="ck-toolbar">
                  <button type="button" (click)="ckCmd('bold')" title="Bold">
                    <b>B</b>
                  </button>
                  <button
                    type="button"
                    (click)="ckCmd('italic')"
                    title="Italic"
                  >
                    <i>I</i>
                  </button>
                  <button
                    type="button"
                    (click)="ckCmd('underline')"
                    title="Underline"
                  >
                    <u>U</u>
                  </button>
                  <span class="ck-sep"></span>
                  <button
                    type="button"
                    (click)="ckCmd('insertUnorderedList')"
                    title="Bullet list"
                  >
                    ≡
                  </button>
                  <button
                    type="button"
                    (click)="ckCmd('insertOrderedList')"
                    title="Numbered list"
                  >
                    1.
                  </button>
                  <span class="ck-sep"></span>
                  <button
                    type="button"
                    (click)="ckCmd('justifyLeft')"
                    title="Left"
                  >
                    ⇤
                  </button>
                  <button
                    type="button"
                    (click)="ckCmd('justifyCenter')"
                    title="Center"
                  >
                    ↔
                  </button>
                  <button
                    type="button"
                    (click)="ckCmd('justifyRight')"
                    title="Right"
                  >
                    ⇥
                  </button>
                  <span class="ck-sep"></span>
                  <select
                    class="ck-select"
                    (change)="ckFontSize($any($event.target).value)"
                  >
                    <option value="">Cỡ chữ</option>
                    <option value="1">Nhỏ</option>
                    <option value="3">Thường</option>
                    <option value="5">Lớn</option>
                    <option value="7">Rất lớn</option>
                  </select>
                </div>
                <div
                  #editor
                  class="ck-editor"
                  contenteditable="true"
                  (input)="onEditorInput($event)"
                  [innerHTML]="editorHtml"
                ></div>
              </div>
            }

            <!-- ALBUM: image URL inputs -->
            @if (formType() === 'ALBUM') {
              <div class="form-group">
                <label>Ảnh <span style="color:#475569">(URL)</span></label>
                <div class="photo-inputs">
                  @for (photo of formPhotos(); track $index) {
                    <div class="photo-input-row">
                      <input
                        class="form-input"
                        [ngModel]="photo.url"
                        (ngModelChange)="updatePhoto($index, 'url', $event)"
                        placeholder="https://... URL ảnh"
                      />
                      <input
                        class="form-input caption-input"
                        [ngModel]="photo.caption"
                        (ngModelChange)="updatePhoto($index, 'caption', $event)"
                        placeholder="Chú thích (tuỳ chọn)"
                      />
                      <button
                        class="btn-remove-photo"
                        (click)="removePhoto($index)"
                      >
                        ✕
                      </button>
                    </div>
                  }
                  <button class="btn-add-photo" (click)="addPhoto()">
                    + Thêm ảnh
                  </button>
                </div>

                <!-- Preview grid -->
                @if (validPhotos().length > 0) {
                  <div
                    class="photo-grid preview-grid"
                    [class.single]="validPhotos().length === 1"
                    [class.double]="validPhotos().length === 2"
                  >
                    @for (p of validPhotos(); track $index) {
                      <div class="photo-item">
                        <img
                          [src]="p.url"
                          [alt]="p.caption || ''"
                          loading="lazy"
                          (error)="$any($event.target).style.display = 'none'"
                        />
                        @if (p.caption) {
                          <div class="photo-caption">{{ p.caption }}</div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <div class="modal-footer">
              <button class="btn-cancel" (click)="closeModal()">Huỷ</button>
              <button
                class="btn-submit"
                (click)="submitPost()"
                [disabled]="submitting()"
              >
                {{
                  submitting()
                    ? 'Đang lưu...'
                    : editingPost()
                      ? 'Lưu thay đổi'
                      : 'Đăng bài'
                }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Toast -->
      @if (toast()) {
        <div class="toast" [class.error]="toastError()">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [
    `
      .act {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #09090f;
        color: #e2e8f0;
        font-family: 'Segoe UI', sans-serif;
      }
      .act-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 20px;
        background: #0c1120;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .act-title {
        flex: 1;
      }
      .act-title h1 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }
      .act-sub {
        font-size: 11px;
        color: #475569;
      }
      .btn-back {
        padding: 5px 12px;
        font-size: 12px;
        background: #141828;
        border: 1px solid #1e293b;
        color: #94a3b8;
        border-radius: 5px;
        cursor: pointer;
      }
      .btn-new {
        padding: 6px 16px;
        font-size: 12px;
        font-weight: 600;
        background: #1d4ed8;
        border: none;
        color: #fff;
        border-radius: 6px;
        cursor: pointer;
      }
      .btn-new:hover {
        background: #2563eb;
      }

      .act-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }
      .act-empty {
        text-align: center;
        padding: 80px 20px;
        color: #475569;
        font-size: 14px;
      }

      .feed {
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 760px;
        margin: 0 auto;
      }

      .post-card {
        background: #0c1120;
        border: 1px solid #1e293b;
        border-radius: 12px;
        overflow: hidden;
      }
      .post-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid #0f1828;
      }
      .post-author {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .author-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
      }
      .author-fallback {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #1e3a6e;
        color: #60a5fa;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
      }
      .author-name {
        font-size: 13px;
        font-weight: 600;
        color: #e2e8f0;
      }
      .post-date {
        font-size: 11px;
        color: #475569;
      }
      .post-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .post-type-badge {
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 8px;
        background: #0f1828;
        color: #60a5fa;
        font-weight: 600;
      }
      .post-type-badge.album {
        background: #0f1a0a;
        color: #22c55e;
      }
      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        padding: 4px 6px;
        border-radius: 4px;
        opacity: 0.6;
      }
      .btn-icon:hover {
        opacity: 1;
        background: #1e293b;
      }
      .btn-icon.danger:hover {
        background: #2d0a0a;
      }

      .post-title {
        margin: 0;
        padding: 14px 16px 0;
        font-size: 16px;
        font-weight: 700;
        color: #f1f5f9;
      }
      .post-content {
        padding: 14px 16px;
        font-size: 14px;
        line-height: 1.7;
        color: #cbd5e1;
      }
      .post-content :global(b),
      .post-content :global(strong) {
        color: #e2e8f0;
      }
      .post-content :global(ul),
      .post-content :global(ol) {
        padding-left: 20px;
      }

      /* ck-content reset */
      .ck-content {
        color: #cbd5e1;
        font-size: 14px;
        line-height: 1.7;
      }
      .ck-content b,
      .ck-content strong {
        color: #e2e8f0;
      }
      .ck-content ul,
      .ck-content ol {
        padding-left: 20px;
        margin: 8px 0;
      }
      .ck-content h1,
      .ck-content h2,
      .ck-content h3 {
        color: #f1f5f9;
        margin: 12px 0 6px;
      }

      /* Photo grid — CSS grid autofill minmax */
      .photo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 4px;
        padding: 0 0 4px;
      }
      .photo-grid.single {
        grid-template-columns: 1fr;
      }
      .photo-grid.double {
        grid-template-columns: 1fr 1fr;
      }
      .photo-item {
        position: relative;
        overflow: hidden;
        aspect-ratio: 1;
        cursor: pointer;
        background: #060d1a;
      }
      .photo-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.2s;
      }
      .photo-item:hover img {
        transform: scale(1.04);
      }
      .photo-caption {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.65);
        color: #e2e8f0;
        font-size: 10px;
        padding: 4px 8px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }

      /* Preview grid in modal */
      .preview-grid {
        margin-top: 12px;
        border-radius: 8px;
        overflow: hidden;
      }
      .preview-grid .photo-item {
        cursor: default;
      }
      .preview-grid .photo-item:hover img {
        transform: none;
      }

      /* Lightbox */
      .lightbox {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.92);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .lb-img {
        max-width: 90vw;
        max-height: 85vh;
        object-fit: contain;
        border-radius: 4px;
      }
      .lb-close {
        position: absolute;
        top: 16px;
        right: 20px;
        background: none;
        border: none;
        color: #e2e8f0;
        font-size: 24px;
        cursor: pointer;
        opacity: 0.7;
      }
      .lb-close:hover {
        opacity: 1;
      }
      .lb-nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #fff;
        font-size: 32px;
        cursor: pointer;
        padding: 12px 18px;
        border-radius: 8px;
      }
      .lb-nav:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .lb-prev {
        left: 16px;
      }
      .lb-next {
        right: 16px;
      }
      .lb-caption {
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        color: #e2e8f0;
        font-size: 13px;
        background: rgba(0, 0, 0, 0.5);
        padding: 6px 16px;
        border-radius: 8px;
        white-space: nowrap;
      }
      .lb-counter {
        position: absolute;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        color: #94a3b8;
        font-size: 12px;
      }

      /* Modal */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .modal {
        background: #0c1120;
        border: 1px solid #1e293b;
        border-radius: 14px;
        width: 100%;
        max-width: 640px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .modal-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }
      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 14px 20px;
        border-top: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .btn-cancel {
        padding: 7px 18px;
        background: none;
        border: 1px solid #334155;
        color: #94a3b8;
        border-radius: 7px;
        cursor: pointer;
        font-size: 13px;
      }
      .btn-submit {
        padding: 7px 22px;
        background: #1d4ed8;
        border: none;
        color: #fff;
        border-radius: 7px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
      }
      .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Modal scrollable content */
      .modal > *:not(.modal-header):not(.modal-footer):not(.type-tabs) {
        overflow-y: auto;
      }
      .type-tabs {
        display: flex;
        gap: 0;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .type-tabs button {
        flex: 1;
        padding: 10px;
        font-size: 13px;
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        border-bottom: 2px solid transparent;
      }
      .type-tabs button.active {
        color: #60a5fa;
        border-bottom-color: #3b82f6;
      }

      .form-group {
        padding: 14px 20px 0;
      }
      .form-group label {
        display: block;
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
      }
      .form-input {
        width: 100%;
        background: #060d1a;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 7px;
        padding: 8px 12px;
        font-size: 13px;
        box-sizing: border-box;
      }
      .form-input:focus {
        outline: none;
        border-color: #3b82f6;
      }

      /* CKEditor-like toolbar */
      .ck-toolbar {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 6px 8px;
        background: #060d1a;
        border: 1px solid #1e293b;
        border-bottom: none;
        border-radius: 7px 7px 0 0;
        flex-wrap: wrap;
      }
      .ck-toolbar button {
        background: none;
        border: none;
        color: #94a3b8;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        min-width: 28px;
      }
      .ck-toolbar button:hover {
        background: #1e293b;
        color: #e2e8f0;
      }
      .ck-sep {
        width: 1px;
        height: 16px;
        background: #1e293b;
        margin: 0 4px;
      }
      .ck-select {
        background: #060d1a;
        border: 1px solid #1e293b;
        color: #94a3b8;
        border-radius: 4px;
        padding: 3px 6px;
        font-size: 11px;
        cursor: pointer;
      }
      .ck-editor {
        min-height: 160px;
        background: #060d1a;
        border: 1px solid #1e293b;
        border-radius: 0 0 7px 7px;
        padding: 12px;
        font-size: 14px;
        line-height: 1.7;
        color: #e2e8f0;
        outline: none;
        overflow-y: auto;
      }
      .ck-editor:focus {
        border-color: #3b82f6;
      }

      /* Photo inputs */
      .photo-inputs {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .photo-input-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .photo-input-row .form-input {
        margin: 0;
      }
      .caption-input {
        max-width: 200px;
      }
      .btn-remove-photo {
        background: none;
        border: 1px solid #334155;
        color: #ef4444;
        border-radius: 5px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 12px;
        flex-shrink: 0;
      }
      .btn-add-photo {
        padding: 7px 16px;
        background: #060d1a;
        border: 1px dashed #334155;
        color: #64748b;
        border-radius: 7px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
        margin-top: 4px;
      }
      .btn-add-photo:hover {
        border-color: #60a5fa;
        color: #60a5fa;
      }

      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #22c55e;
        color: #fff;
        padding: 10px 24px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        z-index: 999;
      }
      .toast.error {
        background: #ef4444;
      }
    `,
  ],
})
export class ActivitiesPage implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('editor') editorRef?: ElementRef<HTMLDivElement>;

  familyId = '';
  isPublicView = false;

  familyName = signal('');
  posts = signal<Post[]>([]);
  loading = signal(false);
  myUserId = signal('');
  myRole = signal<'OWNER' | 'EDITOR' | 'VIEWER' | null>(null);

  // Modal state
  showModal = signal(false);
  editingPost = signal<Post | null>(null);
  formType = signal<PostType>('TEXT');
  formTitle = '';
  formPhotos = signal<Photo[]>([{ url: '', caption: '' }]);
  editorHtml = '';
  submitting = signal(false);

  // Lightbox
  lightbox = signal<Post['photos'] | null>(null);
  lbIndex = signal(0);

  // Toast
  toast = signal('');
  toastError = signal(false);

  canPost = computed(
    () => this.myRole() === 'OWNER' || this.myRole() === 'EDITOR',
  );

  validPhotos = computed(() => this.formPhotos().filter((p) => p.url.trim()));

  canManage(post: Post) {
    return this.myRole() === 'OWNER' || post.authorId === this.myUserId();
  }

  async ngOnInit() {
    this.familyId = this.route.snapshot.params['id'];
    this.isPublicView = this.route.snapshot.data?.['public'] === true;
    await Promise.all([
      this.loadFamilyName(),
      this.loadRole(),
      this.loadPosts(),
    ]);
  }

  private async loadFamilyName() {
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/families/${this.familyId}`)
        .toPromise();
      this.familyName.set(r?.data?.name ?? '');
    } catch {}
  }

  private async loadRole() {
    if (this.isPublicView) return;
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/families/${this.familyId}/my-role`)
        .toPromise();
      this.myRole.set(r?.data?.role ?? 'VIEWER');
      if (r?.data?.userId) this.myUserId.set(r.data.userId);
    } catch {}
  }

  async loadPosts() {
    this.loading.set(true);
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/post?familyId=${this.familyId}`)
        .toPromise();
      this.posts.set(r?.data ?? []);
    } catch {
      this.posts.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.editingPost.set(null);
    this.formType.set('TEXT');
    this.formTitle = '';
    this.editorHtml = '';
    this.formPhotos.set([{ url: '', caption: '' }]);
    this.showModal.set(true);
    setTimeout(() => {
      if (this.editorRef) this.editorRef.nativeElement.innerHTML = '';
    }, 50);
  }

  editPost(post: Post) {
    this.editingPost.set(post);
    this.formType.set(post.type);
    this.formTitle = post.title ?? '';
    this.editorHtml = post.content ?? '';
    this.formPhotos.set(
      post.photos.length
        ? post.photos.map((p) => ({ url: p.url, caption: p.caption ?? '' }))
        : [{ url: '', caption: '' }],
    );
    this.showModal.set(true);
    setTimeout(() => {
      if (this.editorRef)
        this.editorRef.nativeElement.innerHTML = post.content ?? '';
    }, 50);
  }

  closeModal() {
    this.showModal.set(false);
  }

  // CKEditor commands via execCommand
  ckCmd(cmd: string) {
    document.execCommand(cmd, false);
    this.editorRef?.nativeElement.focus();
  }

  ckFontSize(size: string) {
    if (!size) return;
    document.execCommand('fontSize', false, size);
    this.editorRef?.nativeElement.focus();
  }

  onEditorInput(e: Event) {
    this.editorHtml = (e.target as HTMLDivElement).innerHTML;
  }

  addPhoto() {
    this.formPhotos.update((p) => [...p, { url: '', caption: '' }]);
  }
  removePhoto(i: number) {
    this.formPhotos.update((p) => p.filter((_, idx) => idx !== i));
  }
  updatePhoto(i: number, field: 'url' | 'caption', val: string) {
    this.formPhotos.update((p) =>
      p.map((ph, idx) => (idx === i ? { ...ph, [field]: val } : ph)),
    );
  }

  async submitPost() {
    const content = this.editorRef?.nativeElement.innerHTML ?? this.editorHtml;
    const type = this.editingPost()
      ? this.editingPost()!.type
      : this.formType();
    const photos = this.validPhotos();

    if (
      type === 'TEXT' &&
      !content
        .trim()
        .replace(/<[^>]*>/g, '')
        .trim() &&
      !this.formTitle.trim()
    ) {
      this.showToast('Vui lòng nhập nội dung hoặc tiêu đề', true);
      return;
    }
    if (type === 'ALBUM' && photos.length === 0) {
      this.showToast('Vui lòng thêm ít nhất một ảnh', true);
      return;
    }

    this.submitting.set(true);
    try {
      const body: any = {
        familyId: this.familyId,
        type,
        title: this.formTitle || null,
        ...(type === 'TEXT' && { content }),
        ...(type === 'ALBUM' && { photos }),
      };

      if (this.editingPost()) {
        const r: any = await this.http
          .patch(
            `${environment.apiUrl}/api/post/${this.editingPost()!.id}`,
            body,
          )
          .toPromise();
        this.posts.update((list) =>
          list.map((p) => (p.id === r.data.id ? r.data : p)),
        );
        this.showToast('Đã cập nhật bài');
      } else {
        const r: any = await this.http
          .post(`${environment.apiUrl}/api/post`, body)
          .toPromise();
        this.posts.update((list) => [r.data, ...list]);
        this.showToast('Đã đăng bài thành công');
      }
      this.closeModal();
    } catch {
      this.showToast('Lỗi khi lưu bài', true);
    } finally {
      this.submitting.set(false);
    }
  }

  async deletePost(post: Post) {
    if (!confirm(`Xoá bài "${post.title || 'này'}"?`)) return;
    try {
      await this.http
        .delete(`${environment.apiUrl}/api/post/${post.id}`)
        .toPromise();
      this.posts.update((list) => list.filter((p) => p.id !== post.id));
      this.showToast('Đã xoá bài');
    } catch {
      this.showToast('Lỗi khi xoá', true);
    }
  }

  openLightbox(photos: Post['photos'], index: number) {
    this.lightbox.set(photos);
    this.lbIndex.set(index);
  }
  closeLightbox() {
    this.lightbox.set(null);
  }

  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  initials(name: string) {
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(-2)
      .join('')
      .toUpperCase();
  }

  fmtDate(d: string) {
    return new Date(d).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private showToast(msg: string, error = false) {
    this.toast.set(msg);
    this.toastError.set(error);
    setTimeout(() => this.toast.set(''), 3000);
  }

  goBack() {
    if (this.isPublicView) this.router.navigate(['/share', this.familyId]);
    else this.router.navigate(['/families', this.familyId]);
  }
}
