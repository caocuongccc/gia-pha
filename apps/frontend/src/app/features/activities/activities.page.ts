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

                  <!-- Photo grid — Facebook style -->
                  @if (post.photos.length > 0) {
                    <div
                      class="pg"
                      [class]="'pg-' + Math.min(post.photos.length, 5)"
                    >
                      @for (
                        photo of post.photos.slice(0, 5);
                        track photo.id;
                        let i = $index
                      ) {
                        <div class="pg-cell" (click)="openLb(post.photos, i)">
                          <img
                            [src]="photo.url"
                            [alt]="photo.caption || ''"
                            loading="lazy"
                            (error)="hideImg($event)"
                          />
                          @if (photo.caption) {
                            <div class="pg-cap">{{ photo.caption }}</div>
                          }
                          @if (i === 4 && post.photos.length > 5) {
                            <div class="pg-more">
                              +{{ post.photos.length - 5 }}
                            </div>
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

                  <!-- Ảnh hiện có (khi edit) -->
                  @if (existingPhotos().length > 0) {
                    <div class="existing-photos">
                      <div class="ep-label">
                        {{ existingPhotos().length }} ảnh hiện có — click ✕ để
                        xoá
                      </div>
                      <div class="ep-grid">
                        @for (
                          p of existingPhotos();
                          track p.id;
                          let ei = $index
                        ) {
                          <div class="ep-item">
                            <img [src]="p.url" />
                            <button
                              class="ep-rm"
                              (click)="rmExisting(ei)"
                              title="Xoá ảnh này"
                            >
                              ✕
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  }

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
  styleUrls: ['./activities.page.css'],
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
  existingPhotos = signal<Post['photos']>([]); // ảnh đã có khi edit
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
    this.formDate = post.albumDate
      ? new Date(post.albumDate).toISOString().slice(0, 10)
      : '';
    this.formLocation = post.albumLocation ?? '';
    this.existingPhotos.set([...(post.photos ?? [])]); // load ảnh hiện có
    this.uploadFiles.set([]); // chỉ ảnh mới thêm
    this.ckContent = post.type === 'TEXT' ? (post.content ?? '') : '';
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.ckContent = '';
    this.uploadFiles.set([]);
    this.existingPhotos.set([]);
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
  rmExisting(i: number) {
    this.existingPhotos.update((l) => l.filter((_, idx) => idx !== i));
  }

  async uploadAll() {
    const files = this.uploadFiles();
    const pendingIndexes = files
      .map((f, i) => (f.done ? -1 : i))
      .filter((i) => i >= 0);
    if (!pendingIndexes.length) return;
    this.uploading.set(true);

    const BATCH = 3;
    const uploadSessionId = `album-${Date.now()}`; // subfolder chung cho cả lần upload
    for (let b = 0; b < pendingIndexes.length; b += BATCH) {
      const batchIndexes = pendingIndexes.slice(b, b + BATCH);
      const batchFiles = batchIndexes.map((i) => this.uploadFiles()[i]);

      // Đánh dấu uploading theo index
      this.uploadFiles.update((l) =>
        l.map((f, i) =>
          batchIndexes.includes(i) ? { ...f, uploading: true, error: '' } : f,
        ),
      );

      // Convert sang base64
      let filesData: any[];
      try {
        filesData = await Promise.all(
          batchFiles.map(async (uf) => {
            const b64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve((reader.result as string).split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(uf.file);
            });
            const dim = await this.getDim(uf.preview);
            return {
              name: uf.file.name,
              mimeType: uf.file.type,
              base64: b64,
              ...dim,
            };
          }),
        );
      } catch (e) {
        this.uploadFiles.update((l) =>
          l.map((f, i) =>
            batchIndexes.includes(i)
              ? { ...f, uploading: false, error: 'Lỗi đọc file' }
              : f,
          ),
        );
        continue;
      }

      try {
        const r: any = await this.http
          .post(`${environment.apiUrl}/api/upload`, {
            familyId: this.familyId,
            sessionId: uploadSessionId,
            files: filesData,
          })
          .toPromise();

        // Map kết quả theo thứ tự index — không dùng .find() để tránh mismatch tên file
        this.uploadFiles.update((l) =>
          l.map((f, i) => {
            const pos = batchIndexes.indexOf(i);
            if (pos === -1) return f;
            // r.data có thể là array theo thứ tự, hoặc match theo tên
            const match = Array.isArray(r.data)
              ? (r.data[pos] ?? r.data.find((d: any) => d.name === f.file.name))
              : null;
            return match
              ? { ...f, uploading: false, done: true, preview: match.url }
              : { ...f, uploading: false, error: 'Không nhận được URL' };
          }),
        );
      } catch (err: any) {
        const msg = err?.error?.error ?? err?.message ?? 'Lỗi upload';
        this.uploadFiles.update((l) =>
          l.map((f, i) =>
            batchIndexes.includes(i)
              ? { ...f, uploading: false, error: msg }
              : f,
          ),
        );
        if (msg.includes('Chưa kết nối') || msg.includes('Drive')) {
          this.showToast(msg, true);
          break;
        }
      }
    }

    this.uploading.set(false);

    const doneNow = this.uploadFiles().filter((f) => f.done).length;
    const total = this.uploadFiles().length;
    if (doneNow === total) {
      this.showToast(`✅ Upload xong ${doneNow} ảnh!`);
    } else if (doneNow > 0) {
      this.showToast(
        `Upload ${doneNow}/${total} ảnh — ${total - doneNow} thất bại`,
        true,
      );
    }
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
          photos: [
            // Ảnh cũ (khi edit) — giữ nguyên
            ...this.existingPhotos().map((p, i) => ({
              url: p.url,
              caption: p.caption || null,
              order: i,
              driveFileId: p.driveFileId || null,
            })),
            // Ảnh mới upload
            ...this.uploadFiles()
              .filter((f) => f.done)
              .map((f, i) => ({
                url: f.preview,
                caption: f.caption || null,
                order: this.existingPhotos().length + i,
              })),
          ],
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

  readonly Math = Math;

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
