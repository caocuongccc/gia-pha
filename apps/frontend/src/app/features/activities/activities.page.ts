// apps/frontend/src/app/features/activities/activities.page.ts
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { CkEditorComponent } from '../../shared/components/ck-editor/ck-editor.component';

type Filter = 'all' | 'text' | 'album';
type PostType = 'TEXT' | 'ALBUM';

interface Photo {
  url: string;
  driveFileId?: string;
  caption?: string;
  width?: number;
  height?: number;
}
interface Post {
  id: string;
  type: PostType;
  title?: string;
  content?: string;
  albumDate?: string;
  albumLocation?: string;
  photos: (Photo & { id: string; order: number })[];
  author: { id: string; name?: string; email: string; avatarUrl?: string };
  authorId: string;
  createdAt: string;
}
interface UploadFile {
  file: File;
  preview: string;
  caption: string;
  uploading: boolean;
  done: boolean;
  error: string;
}

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, FormsModule, CkEditorComponent],
  template: `
    <div class="page">
      <!-- ── Sidebar ─────────────────────────────────────────────── -->
      <aside class="sidebar">
        <button class="back-btn" (click)="goBack()">← Gia phả</button>

        <div class="family-name">{{ familyName() }}</div>
        <div class="sidebar-label">Hoạt động họ</div>

        <nav class="filter-nav">
          <button
            class="filter-btn"
            [class.active]="filter() === 'all'"
            (click)="filter.set('all')"
          >
            <span class="fi-icon">📰</span>
            <span>Tất cả</span>
            <span class="fi-count">{{ posts().length }}</span>
          </button>
          <button
            class="filter-btn"
            [class.active]="filter() === 'text'"
            (click)="filter.set('text')"
          >
            <span class="fi-icon">📝</span>
            <span>Bài viết</span>
            <span class="fi-count">{{ textCount() }}</span>
          </button>
          <button
            class="filter-btn"
            [class.active]="filter() === 'album'"
            (click)="filter.set('album')"
          >
            <span class="fi-icon">🖼️</span>
            <span>Album ảnh</span>
            <span class="fi-count">{{ albumCount() }}</span>
          </button>
        </nav>

        @if (canPost()) {
          <div class="sidebar-divider"></div>
          <button class="compose-btn" (click)="openCreate('TEXT')">
            ✏️ &nbsp;Viết bài
          </button>
          <button class="compose-btn album" (click)="openCreate('ALBUM')">
            📷 &nbsp;Tạo album
          </button>
        }

        @if (!isPublicView && totalPhotos() > 0) {
          <div class="sidebar-divider"></div>
          <div class="stat-row">
            <span>Tổng ảnh</span><strong>{{ totalPhotos() }}</strong>
          </div>
          <div class="stat-row">
            <span>Album</span><strong>{{ albumCount() }}</strong>
          </div>
          <div class="stat-row">
            <span>Bài viết</span><strong>{{ textCount() }}</strong>
          </div>
        }
      </aside>

      <!-- ── Feed ────────────────────────────────────────────────── -->
      <main class="feed-wrap">
        @if (loading()) {
          <div class="spinner-wrap">
            <div class="big-spinner"></div>
          </div>
        } @else if (filtered().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              {{ filter() === 'album' ? '🖼️' : '📭' }}
            </div>
            <div class="empty-title">
              Chưa có
              {{
                filter() === 'album'
                  ? 'album'
                  : filter() === 'text'
                    ? 'bài viết'
                    : 'nội dung'
              }}
              nào
            </div>
            @if (canPost()) {
              <div class="empty-hint">Nhấn nút bên trái để đăng đầu tiên</div>
            }
          </div>
        } @else {
          <div class="feed">
            @for (post of filtered(); track post.id) {
              <!-- ── TEXT POST ──────────────────────────────────── -->
              @if (post.type === 'TEXT') {
                <article class="card text-card">
                  <div class="card-header">
                    <div class="author-row">
                      @if (post.author.avatarUrl) {
                        <img class="av" [src]="post.author.avatarUrl" />
                      } @else {
                        <div class="av av-fb">
                          {{ initials(post.author.name || post.author.email) }}
                        </div>
                      }
                      <div class="author-info">
                        <span class="author-name">{{
                          post.author.name || post.author.email
                        }}</span>
                        <span class="post-time">{{
                          fmtDate(post.createdAt)
                        }}</span>
                      </div>
                      <span class="type-chip text-chip">📝 Bài viết</span>
                    </div>
                    @if (canManage(post)) {
                      <div class="card-actions">
                        <button
                          class="act-btn"
                          (click)="editPost(post)"
                          title="Sửa"
                        >
                          ✏️
                        </button>
                        <button
                          class="act-btn del"
                          (click)="deletePost(post)"
                          title="Xoá"
                        >
                          🗑️
                        </button>
                      </div>
                    }
                  </div>
                  @if (post.title) {
                    <h2 class="post-title">{{ post.title }}</h2>
                  }
                  <div
                    class="post-body ck-out"
                    [innerHTML]="safe(post.content ?? '')"
                  ></div>
                </article>
              }

              <!-- ── ALBUM POST ─────────────────────────────────── -->
              @if (post.type === 'ALBUM') {
                <article class="card album-card">
                  <div class="card-header">
                    <div class="author-row">
                      @if (post.author.avatarUrl) {
                        <img class="av" [src]="post.author.avatarUrl" />
                      } @else {
                        <div class="av av-fb">
                          {{ initials(post.author.name || post.author.email) }}
                        </div>
                      }
                      <div class="author-info">
                        <span class="author-name">{{
                          post.author.name || post.author.email
                        }}</span>
                        <span class="post-time">{{
                          fmtDate(post.createdAt)
                        }}</span>
                      </div>
                      <span class="type-chip album-chip">🖼️ Album</span>
                    </div>
                    @if (canManage(post)) {
                      <div class="card-actions">
                        <button class="act-btn" (click)="editPost(post)">
                          ✏️
                        </button>
                        <button class="act-btn del" (click)="deletePost(post)">
                          🗑️
                        </button>
                      </div>
                    }
                  </div>

                  <!-- Album title + meta -->
                  <div class="album-meta-row">
                    @if (post.title) {
                      <h2 class="post-title">{{ post.title }}</h2>
                    }
                    <div class="album-chips">
                      @if (post.albumDate) {
                        <span class="meta-chip"
                          >📅 {{ fmtDateOnly(post.albumDate) }}</span
                        >
                      }
                      @if (post.albumLocation) {
                        <span class="meta-chip"
                          >📍 {{ post.albumLocation }}</span
                        >
                      }
                      <span class="meta-chip"
                        >{{ post.photos.length }} ảnh</span
                      >
                    </div>
                  </div>

                  <!-- Photo masonry -->
                  @if (post.photos.length > 0) {
                    <div class="masonry">
                      @for (
                        photo of post.photos;
                        track photo.id;
                        let i = $index
                      ) {
                        <div class="m-item" (click)="openLb(post.photos, i)">
                          <img
                            [src]="photo.url"
                            [alt]="photo.caption || ''"
                            loading="lazy"
                            (error)="hideImg($event)"
                          />
                          @if (photo.caption) {
                            <div class="m-cap">{{ photo.caption }}</div>
                          }
                        </div>
                      }
                    </div>
                  }
                </article>
              }
            }
          </div>
        }
      </main>

      <!-- ── Lightbox ─────────────────────────────────────────────── -->
      @if (lbPhotos()) {
        <div class="lb" (click)="closeLb()">
          <button class="lb-x" (click)="closeLb()">✕</button>
          @if (lbI() > 0) {
            <button
              class="lb-nav lb-l"
              (click)="$event.stopPropagation(); lbI.set(lbI() - 1)"
            >
              ‹
            </button>
          }
          <img
            class="lb-img"
            [src]="lbPhotos()![lbI()].url"
            (click)="$event.stopPropagation()"
          />
          @if (lbPhotos()![lbI()].caption) {
            <div class="lb-cap">{{ lbPhotos()![lbI()].caption }}</div>
          }
          @if (lbI() < lbPhotos()!.length - 1) {
            <button
              class="lb-nav lb-r"
              (click)="$event.stopPropagation(); lbI.set(lbI() + 1)"
            >
              ›
            </button>
          }
          <div class="lb-n">{{ lbI() + 1 }} / {{ lbPhotos()!.length }}</div>
        </div>
      }

      <!-- ── Modal ────────────────────────────────────────────────── -->
      @if (showModal()) {
        <div class="overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-hd">
              <h3>
                {{
                  editingPost()
                    ? 'Chỉnh sửa'
                    : formType() === 'TEXT'
                      ? '✏️ Bài viết mới'
                      : '📷 Album mới'
                }}
              </h3>
              <button class="act-btn" (click)="closeModal()">✕</button>
            </div>

            <div class="modal-body">
              <!-- Tiêu đề -->
              <div class="fg">
                <label>Tiêu đề</label>
                <input
                  class="fi"
                  [(ngModel)]="formTitle"
                  [placeholder]="
                    formType() === 'TEXT'
                      ? 'Tiêu đề bài viết...'
                      : 'Tên album...'
                  "
                />
              </div>

              <!-- CKEditor (TEXT) — dùng @ckeditor/ckeditor5-angular -->
              @if (formType() === 'TEXT') {
                <div class="fg">
                  <label>Nội dung</label>
                  <app-ck-editor
                    [(ngModel)]="ckContent"
                    name="ckContent"
                    placeholder="Nhập nội dung bài viết..."
                  />
                </div>
              }

              <!-- Album metadata + upload -->
              @if (formType() === 'ALBUM') {
                <div class="fg two-col">
                  <div>
                    <label>Ngày tổ chức</label>
                    <input class="fi" type="date" [(ngModel)]="formDate" />
                  </div>
                  <div>
                    <label>Địa điểm</label>
                    <input
                      class="fi"
                      [(ngModel)]="formLocation"
                      placeholder="Nhà thờ họ, Hà Nội..."
                    />
                  </div>
                </div>

                <div class="fg">
                  <label
                    >Ảnh
                    <span class="lbl-sub"
                      >(kéo thả hoặc chọn nhiều file — upload Google
                      Drive)</span
                    ></label
                  >
                  <div
                    class="drop-zone"
                    (click)="fileInput.click()"
                    (dragover)="$event.preventDefault()"
                    (drop)="onDrop($event)"
                  >
                    <input
                      #fileInput
                      type="file"
                      multiple
                      accept="image/*"
                      style="display:none"
                      (change)="onFiles($event)"
                    />
                    <div class="dz-icon">☁️</div>
                    <div class="dz-txt">Kéo thả hoặc click để chọn ảnh</div>
                    <div class="dz-sub">
                      JPG · PNG · WEBP — upload thẳng lên Google Drive của bạn
                    </div>
                  </div>

                  @if (uploadFiles().length > 0) {
                    <div class="upload-list">
                      @for (uf of uploadFiles(); track $index) {
                        <div
                          class="ul-row"
                          [class.ul-done]="uf.done"
                          [class.ul-busy]="uf.uploading"
                        >
                          <img class="ul-thumb" [src]="uf.preview" />
                          <div class="ul-meta">
                            <div class="ul-name">{{ uf.file.name }}</div>
                            <div class="ul-size">
                              {{ fmtSize(uf.file.size) }}
                            </div>
                            @if (uf.error) {
                              <div class="ul-err">⚠️ {{ uf.error }}</div>
                            }
                          </div>
                          <input
                            class="fi ul-cap"
                            [ngModel]="uf.caption"
                            (ngModelChange)="setCap($index, $event)"
                            placeholder="Chú thích..."
                          />
                          <div class="ul-st">
                            @if (uf.uploading) {
                              <span class="spin"></span>
                            } @else if (uf.done) {
                              <span class="ul-ok">✓</span>
                            } @else {
                              <button
                                class="act-btn del"
                                (click)="rmFile($index)"
                              >
                                ✕
                              </button>
                            }
                          </div>
                        </div>
                      }
                    </div>

                    <div class="upload-bar">
                      @if (!allDone()) {
                        <button
                          class="up-btn"
                          (click)="uploadAll()"
                          [disabled]="uploading()"
                        >
                          @if (uploading()) {
                            <span class="spin"></span> Đang upload...
                          } @else {
                            ☁️ Upload {{ pendingCount() }} ảnh lên Drive
                          }
                        </button>
                      } @else {
                        <div class="up-done">
                          ✅ Đã upload {{ uploadFiles().length }} ảnh thành công
                        </div>
                      }
                      <div class="up-prog">
                        <div
                          class="up-prog-fill"
                          [style.width.%]="
                            uploadFiles().length
                              ? (doneCount() / uploadFiles().length) * 100
                              : 0
                          "
                        ></div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="modal-ft">
              <button class="btn-cancel" (click)="closeModal()">Huỷ</button>
              <button
                class="btn-post"
                (click)="submit()"
                [disabled]="submitting()"
              >
                {{
                  submitting()
                    ? 'Đang lưu...'
                    : editingPost()
                      ? 'Lưu thay đổi'
                      : 'Đăng'
                }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (toast()) {
        <div class="toast" [class.err]="toastErr()">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [
    `
      /* ── Layout ───────────────────────────────────────────────── */
      .page {
        display: flex;
        height: 100vh;
        background: #07080f;
        color: #e2e8f0;
        font-family: 'Segoe UI', sans-serif;
        overflow: hidden;
      }

      /* ── Sidebar ─────────────────────────────────────────────── */
      .sidebar {
        width: 220px;
        flex-shrink: 0;
        background: #0b0f1c;
        border-right: 1px solid #111827;
        display: flex;
        flex-direction: column;
        padding: 16px 12px;
        gap: 6px;
        overflow-y: auto;
      }
      .back-btn {
        background: none;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
        text-align: left;
        margin-bottom: 8px;
      }
      .back-btn:hover {
        color: #e2e8f0;
        border-color: #334155;
      }
      .family-name {
        font-size: 13px;
        font-weight: 700;
        color: #f1f5f9;
        padding: 0 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sidebar-label {
        font-size: 10px;
        color: #334155;
        padding: 0 4px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 4px;
      }
      .sidebar-divider {
        height: 1px;
        background: #111827;
        margin: 8px 0;
      }

      .filter-nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .filter-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 8px;
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-size: 13px;
        text-align: left;
        width: 100%;
        transition:
          background 0.15s,
          color 0.15s;
      }
      .filter-btn:hover {
        background: #111827;
        color: #94a3b8;
      }
      .filter-btn.active {
        background: #0f1e38;
        color: #60a5fa;
        font-weight: 600;
      }
      .fi-icon {
        font-size: 14px;
        width: 18px;
        text-align: center;
      }
      .fi-count {
        margin-left: auto;
        font-size: 11px;
        background: #1e293b;
        color: #475569;
        padding: 1px 7px;
        border-radius: 10px;
      }
      .filter-btn.active .fi-count {
        background: #1e3a6e;
        color: #93c5fd;
      }

      .compose-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 9px 12px;
        border-radius: 8px;
        background: #1d4ed8;
        border: none;
        color: #fff;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        width: 100%;
        transition: background 0.15s;
      }
      .compose-btn:hover {
        background: #2563eb;
      }
      .compose-btn.album {
        background: #0f4c2a;
        color: #4ade80;
        margin-top: 4px;
      }
      .compose-btn.album:hover {
        background: #166534;
      }

      .stat-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 4px;
        font-size: 12px;
        color: #475569;
      }
      .stat-row strong {
        color: #64748b;
      }

      /* ── Feed ────────────────────────────────────────────────── */
      .feed-wrap {
        flex: 1;
        overflow-y: auto;
        padding: 28px;
        background: #07080f;
      }
      .feed {
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 740px;
        margin: 0 auto;
      }

      .spinner-wrap {
        display: flex;
        justify-content: center;
        padding: 80px;
      }
      .big-spinner {
        width: 36px;
        height: 36px;
        border: 3px solid #1e293b;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }

      .empty-state {
        text-align: center;
        padding: 100px 20px;
        color: #334155;
      }
      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      .empty-title {
        font-size: 16px;
        color: #475569;
        margin-bottom: 8px;
      }
      .empty-hint {
        font-size: 12px;
        color: #334155;
      }

      /* ── Cards ───────────────────────────────────────────────── */
      .card {
        background: #0c1120;
        border: 1px solid #111827;
        border-radius: 14px;
        overflow: hidden;
        transition: border-color 0.2s;
      }
      .card:hover {
        border-color: #1e293b;
      }

      .card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 16px 18px 12px;
      }
      .author-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
      }
      .av {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }
      .av-fb {
        background: #1e3a6e;
        color: #60a5fa;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
      }
      .author-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .author-name {
        font-size: 13px;
        font-weight: 600;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .post-time {
        font-size: 11px;
        color: #334155;
      }
      .type-chip {
        font-size: 10px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 20px;
        flex-shrink: 0;
        margin-left: 8px;
      }
      .text-chip {
        background: #0f1e38;
        color: #60a5fa;
      }
      .album-chip {
        background: #0a1a0e;
        color: #4ade80;
      }

      .card-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }
      .act-btn {
        background: none;
        border: none;
        font-size: 14px;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 5px;
        opacity: 0.5;
        color: #e2e8f0;
      }
      .act-btn:hover {
        opacity: 1;
        background: #1e293b;
      }
      .act-btn.del:hover {
        background: #2d0a0a;
        color: #ef4444;
      }

      /* TEXT card */
      .post-title {
        margin: 0 18px 8px;
        font-size: 17px;
        font-weight: 700;
        color: #f8fafc;
        line-height: 1.4;
      }
      .post-body {
        padding: 0 18px 18px;
        font-size: 14px;
        line-height: 1.78;
        color: #94a3b8;
      }

      /* CKEditor output styles */
      .ck-out b,
      .ck-out strong {
        color: #e2e8f0;
      }
      .ck-out h1,
      .ck-out h2,
      .ck-out h3 {
        color: #f1f5f9;
        margin: 14px 0 6px;
      }
      .ck-out ul,
      .ck-out ol {
        padding-left: 22px;
        margin: 8px 0;
      }
      .ck-out a {
        color: #60a5fa;
      }
      .ck-out blockquote {
        border-left: 3px solid #1e3a6e;
        margin: 10px 0;
        padding: 4px 14px;
        color: #64748b;
      }
      .ck-out table {
        border-collapse: collapse;
        width: 100%;
        margin: 10px 0;
      }
      .ck-out td,
      .ck-out th {
        border: 1px solid #1e293b;
        padding: 7px 12px;
        font-size: 13px;
      }
      .ck-out p {
        margin: 6px 0;
      }

      /* ALBUM card */
      .album-meta-row {
        padding: 0 18px 12px;
      }
      .album-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .meta-chip {
        font-size: 11px;
        color: #475569;
        background: #0c1828;
        border: 1px solid #1e293b;
        border-radius: 12px;
        padding: 2px 10px;
      }

      /* Masonry */
      .masonry {
        padding: 0 4px 16px;
        columns: 4 120px;
        column-gap: 4px;
      }
      .m-item {
        break-inside: avoid;
        margin-bottom: 4px;
        border-radius: 6px;
        overflow: hidden;
        position: relative;
        cursor: zoom-in;
        background: #060d1a;
      }
      .m-item img {
        width: 100%;
        height: auto;
        display: block;
        transition: transform 0.25s;
      }
      .m-item:hover img {
        transform: scale(1.04);
      }
      .m-cap {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
        color: #e2e8f0;
        font-size: 10px;
        padding: 16px 8px 5px;
      }

      /* ── Lightbox ─────────────────────────────────────────────── */
      .lb {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.94);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .lb-img {
        max-width: 92vw;
        max-height: 88vh;
        object-fit: contain;
        border-radius: 4px;
      }
      .lb-x {
        position: absolute;
        top: 18px;
        right: 22px;
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        opacity: 0.6;
      }
      .lb-x:hover {
        opacity: 1;
      }
      .lb-nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #fff;
        font-size: 36px;
        cursor: pointer;
        padding: 10px 16px;
        border-radius: 8px;
      }
      .lb-l {
        left: 16px;
      }
      .lb-r {
        right: 16px;
      }
      .lb-nav:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .lb-cap {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: #e2e8f0;
        font-size: 13px;
        background: rgba(0, 0, 0, 0.55);
        padding: 6px 18px;
        border-radius: 20px;
        max-width: 80vw;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }
      .lb-n {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: #64748b;
        font-size: 12px;
      }

      /* ── Modal ───────────────────────────────────────────────── */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .modal {
        background: #0c1120;
        border: 1px solid #1e293b;
        border-radius: 16px;
        width: 100%;
        max-width: 680px;
        max-height: 92vh;
        display: flex;
        flex-direction: column;
      }
      .modal-hd {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 22px;
        border-bottom: 1px solid #111827;
        flex-shrink: 0;
      }
      .modal-hd h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }
      .modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 18px 22px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .modal-ft {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 14px 22px;
        border-top: 1px solid #111827;
        flex-shrink: 0;
      }
      .btn-cancel {
        padding: 8px 20px;
        background: none;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
      }
      .btn-post {
        padding: 8px 24px;
        background: #1d4ed8;
        border: none;
        color: #fff;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
      }
      .btn-post:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .btn-cancel:hover {
        border-color: #334155;
        color: #94a3b8;
      }
      .btn-post:not(:disabled):hover {
        background: #2563eb;
      }

      /* ── Form ────────────────────────────────────────────────── */
      .fg {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .fg label {
        font-size: 10px;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        font-weight: 600;
      }
      .fi {
        background: #060d1a;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 8px;
        padding: 9px 13px;
        font-size: 13px;
        width: 100%;
        box-sizing: border-box;
      }
      .fi:focus {
        outline: none;
        border-color: #3b82f6;
      }
      .two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .lbl-sub {
        font-size: 10px;
        color: #334155;
        text-transform: none;
        font-weight: normal;
        letter-spacing: 0;
      }
      .ck-loading {
        padding: 12px;
        color: #475569;
        font-size: 12px;
        background: #060d1a;
        border: 1px solid #1e293b;
        border-radius: 8px;
      }

      /* CKEditor styles handled inside ck-editor.component.ts */

      /* ── Upload ──────────────────────────────────────────────── */
      .drop-zone {
        border: 2px dashed #1e293b;
        border-radius: 10px;
        padding: 30px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .drop-zone:hover {
        border-color: #3b82f6;
        background: #060d1a;
      }
      .dz-icon {
        font-size: 30px;
        margin-bottom: 10px;
      }
      .dz-txt {
        font-size: 14px;
        color: #64748b;
        margin-bottom: 4px;
      }
      .dz-sub {
        font-size: 11px;
        color: #334155;
      }

      .upload-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 10px;
      }
      .ul-row {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #060d1a;
        border: 1px solid #1e293b;
        border-radius: 8px;
        padding: 8px 12px;
        transition: border-color 0.2s;
      }
      .ul-done {
        border-color: #166534;
      }
      .ul-busy {
        opacity: 0.7;
      }
      .ul-thumb {
        width: 42px;
        height: 42px;
        border-radius: 6px;
        object-fit: cover;
        flex-shrink: 0;
      }
      .ul-meta {
        flex: 0 0 130px;
        min-width: 0;
      }
      .ul-name {
        font-size: 11px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ul-size {
        font-size: 10px;
        color: #334155;
      }
      .ul-err {
        font-size: 10px;
        color: #ef4444;
        margin-top: 2px;
      }
      .ul-cap {
        flex: 1;
        font-size: 12px;
        padding: 5px 8px !important;
      }
      .ul-st {
        flex-shrink: 0;
        width: 28px;
        text-align: center;
      }
      .ul-ok {
        color: #22c55e;
        font-size: 16px;
        font-weight: 700;
      }

      .upload-bar {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .up-btn {
        width: 100%;
        padding: 11px;
        background: #0f1e38;
        border: 1px solid #1d4ed8;
        color: #60a5fa;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .up-btn:hover:not(:disabled) {
        background: #1d4ed8;
        color: #fff;
      }
      .up-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .up-done {
        text-align: center;
        color: #22c55e;
        font-size: 13px;
        font-weight: 600;
        padding: 8px;
      }
      .up-prog {
        height: 3px;
        background: #1e293b;
        border-radius: 2px;
        overflow: hidden;
      }
      .up-prog-fill {
        height: 100%;
        background: #3b82f6;
        border-radius: 2px;
        transition: width 0.4s;
      }

      .spin {
        display: inline-block;
        width: 13px;
        height: 13px;
        border: 2px solid #334155;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* ── Toast ───────────────────────────────────────────────── */
      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #16a34a;
        color: #fff;
        padding: 10px 24px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        z-index: 999;
        animation: up 0.2s;
        white-space: nowrap;
      }
      .toast.err {
        background: #dc2626;
      }
      @keyframes up {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `,
  ],
})
export class ActivitiesPage implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private san = inject(DomSanitizer);

  familyId = '';
  isPublicView = false;

  familyName = signal('');
  posts = signal<Post[]>([]);
  loading = signal(false);
  myUserId = signal('');
  myRole = signal<'OWNER' | 'EDITOR' | 'VIEWER' | null>(null);

  filter = signal<Filter>('all');

  // Modal
  showModal = signal(false);
  editingPost = signal<Post | null>(null);
  formType = signal<PostType>('TEXT');
  formTitle = '';
  formDate = '';
  formLocation = '';
  uploadFiles = signal<UploadFile[]>([]);
  uploading = signal(false);
  submitting = signal(false);
  ckContent = ''; // bound to <app-ck-editor [(ngModel)]>

  // Lightbox
  lbPhotos = signal<Post['photos'] | null>(null);
  lbI = signal(0);

  // Toast
  toast = signal('');
  toastErr = signal(false);

  // Computed
  textCount = computed(
    () => this.posts().filter((p) => p.type === 'TEXT').length,
  );
  albumCount = computed(
    () => this.posts().filter((p) => p.type === 'ALBUM').length,
  );
  totalPhotos = computed(() =>
    this.posts()
      .filter((p) => p.type === 'ALBUM')
      .reduce((s, a) => s + a.photos.length, 0),
  );
  canPost = computed(
    () => this.myRole() === 'OWNER' || this.myRole() === 'EDITOR',
  );
  pendingCount = computed(
    () => this.uploadFiles().filter((f) => !f.done).length,
  );
  doneCount = computed(() => this.uploadFiles().filter((f) => f.done).length);
  allDone = computed(
    () =>
      this.uploadFiles().length > 0 && this.uploadFiles().every((f) => f.done),
  );
  filtered = computed(() => {
    const f = this.filter();
    if (f === 'text') return this.posts().filter((p) => p.type === 'TEXT');
    if (f === 'album') return this.posts().filter((p) => p.type === 'ALBUM');
    return this.posts();
  });

  canManage(post: Post) {
    return this.myRole() === 'OWNER' || post.authorId === this.myUserId();
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  async ngOnInit() {
    this.familyId = this.route.snapshot.params['id'];
    this.isPublicView = this.route.snapshot.data?.['public'] === true;
    await Promise.all([this.loadName(), this.loadRole(), this.loadPosts()]);
  }

  ngOnDestroy() {}

  // ── Data ──────────────────────────────────────────────────────

  private async loadName() {
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

  goBack() {
    if (this.isPublicView) this.router.navigate(['/share', this.familyId]);
    else this.router.navigate(['/families', this.familyId]);
  }

  // ── Modal ─────────────────────────────────────────────────────

  openCreate(type: PostType) {
    this.editingPost.set(null);
    this.formType.set(type);
    this.formTitle = '';
    this.formDate = '';
    this.formLocation = '';
    this.uploadFiles.set([]);
    this.ckContent = '';
    this.showModal.set(true);
    // Sync filter
    this.filter.set(type === 'TEXT' ? 'text' : 'album');
  }

  editPost(post: Post) {
    this.editingPost.set(post);
    this.formType.set(post.type);
    this.formTitle = post.title ?? '';
    this.formDate = post.albumDate?.slice(0, 10) ?? '';
    this.formLocation = post.albumLocation ?? '';
    this.uploadFiles.set([]);
    this.ckContent = post.type === 'TEXT' ? (post.content ?? '') : '';
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.ckContent = '';
    this.uploadFiles.set([]);
  }

  // ── Upload ────────────────────────────────────────────────────

  onFiles(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    this.addFiles(files);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.addFiles(
      Array.from(e.dataTransfer?.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      ),
    );
  }

  private addFiles(files: File[]) {
    const items: UploadFile[] = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      caption: '',
      uploading: false,
      done: false,
      error: '',
    }));
    this.uploadFiles.update((l) => [...l, ...items]);
  }

  rmFile(i: number) {
    this.uploadFiles.update((l) => l.filter((_, idx) => idx !== i));
  }
  setCap(i: number, v: string) {
    this.uploadFiles.update((l) =>
      l.map((f, idx) => (idx === i ? { ...f, caption: v } : f)),
    );
  }

  async uploadAll() {
    const pending = this.uploadFiles().filter((f) => !f.done);
    if (!pending.length) return;
    this.uploading.set(true);

    const BATCH = 3;
    for (let i = 0; i < this.uploadFiles().length; i += BATCH) {
      const batch = this.uploadFiles()
        .slice(i, i + BATCH)
        .filter((f) => !f.done);
      if (!batch.length) continue;

      this.uploadFiles.update((l) =>
        l.map((f) => (batch.includes(f) ? { ...f, uploading: true } : f)),
      );

      const filesData = await Promise.all(
        batch.map(async (uf) => {
          const ab = await uf.file.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
          const dim = await this.getDim(uf.preview);
          return {
            name: uf.file.name,
            mimeType: uf.file.type,
            base64: b64,
            ...dim,
          };
        }),
      );

      try {
        const r: any = await this.http
          .post(`${environment.apiUrl}/api/upload`, {
            familyId: this.familyId,
            files: filesData,
          })
          .toPromise();

        this.uploadFiles.update((l) =>
          l.map((f) => {
            if (!batch.includes(f)) return f;
            const match = r.data.find((d: any) => d.name === f.file.name);
            return match
              ? { ...f, uploading: false, done: true, preview: match.url }
              : { ...f, uploading: false, error: 'Thất bại' };
          }),
        );
      } catch (err: any) {
        const msg = err.error?.error ?? 'Lỗi upload';
        this.uploadFiles.update((l) =>
          l.map((f) =>
            batch.includes(f) ? { ...f, uploading: false, error: msg } : f,
          ),
        );
        // Nếu lỗi Drive chưa kết nối → dừng hẳn
        if (msg.includes('Chưa kết nối') || msg.includes('Drive')) {
          this.showToast(msg, true);
          break;
        }
      }
    }
    this.uploading.set(false);
  }

  private getDim(src: string): Promise<{ width: number; height: number }> {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () =>
        res({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => res({ width: 0, height: 0 });
      img.src = src;
    });
  }

  // ── Submit ────────────────────────────────────────────────────

  async submit() {
    const isAlbum = this.formType() === 'ALBUM';

    if (!isAlbum && !this.ckContent.trim() && !this.formTitle.trim()) {
      this.showToast('Vui lòng nhập tiêu đề hoặc nội dung', true);
      return;
    }
    if (isAlbum && !this.editingPost() && !this.allDone()) {
      this.showToast('Hãy upload ảnh trước khi đăng', true);
      return;
    }

    this.submitting.set(true);
    try {
      const body: any = {
        familyId: this.familyId,
        type: isAlbum ? 'ALBUM' : 'TEXT',
        title: this.formTitle || null,
        ...(!isAlbum && { content: this.ckContent }),
        ...(isAlbum && {
          albumDate: this.formDate || null,
          albumLocation: this.formLocation || null,
          photos: this.uploadFiles()
            .filter((f) => f.done)
            .map((f, i) => ({
              url: f.preview,
              caption: f.caption || null,
              order: i,
            })),
        }),
      };

      if (this.editingPost()) {
        const r: any = await this.http
          .patch(
            `${environment.apiUrl}/api/post/${this.editingPost()!.id}`,
            body,
          )
          .toPromise();
        this.posts.update((l) =>
          l.map((p) => (p.id === r.data.id ? r.data : p)),
        );
        this.showToast('Đã cập nhật');
      } else {
        const r: any = await this.http
          .post(`${environment.apiUrl}/api/post`, body)
          .toPromise();
        this.posts.update((l) => [r.data, ...l]);
        this.showToast('Đã đăng thành công');
      }
      this.closeModal();
    } catch {
      this.showToast('Lỗi khi lưu', true);
    } finally {
      this.submitting.set(false);
    }
  }

  async deletePost(post: Post) {
    if (!confirm(`Xoá "${post.title || 'bài này'}"?`)) return;
    try {
      await this.http
        .delete(`${environment.apiUrl}/api/post/${post.id}`)
        .toPromise();
      this.posts.update((l) => l.filter((p) => p.id !== post.id));
      this.showToast('Đã xoá');
    } catch {
      this.showToast('Lỗi khi xoá', true);
    }
  }

  // ── Lightbox ──────────────────────────────────────────────────

  openLb(photos: Post['photos'], i: number) {
    this.lbPhotos.set(photos);
    this.lbI.set(i);
  }
  closeLb() {
    this.lbPhotos.set(null);
  }
  hideImg(e: Event) {
    (e.target as HTMLElement).closest('.m-item')?.remove();
  }

  // ── Helpers ───────────────────────────────────────────────────

  safe(html: string): SafeHtml {
    return this.san.bypassSecurityTrustHtml(html);
  }
  initials(s: string) {
    return s
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
  fmtDateOnly(d: string) {
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  fmtSize(b: number) {
    return b < 1048576
      ? `${(b / 1024).toFixed(0)} KB`
      : `${(b / 1048576).toFixed(1)} MB`;
  }

  private showToast(msg: string, err = false) {
    this.toast.set(msg);
    this.toastErr.set(err);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
