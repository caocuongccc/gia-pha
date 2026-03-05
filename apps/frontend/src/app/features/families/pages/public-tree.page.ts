import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TreeViewComponent } from '../../tree-view/tree-view.component';
import { ExportButtonsComponent } from '../../tree-view/export-buttons.component';
import type { Member, Relationship } from '@gia-pha/shared-types';

@Component({
  selector: 'app-public-tree',
  standalone: true,
  imports: [CommonModule, TreeViewComponent, ExportButtonsComponent],
  template: `
    @if (loading()) {
      <div class="loading-screen">Đang tải cây gia phả...</div>
    } @else if (error()) {
      <div class="error-screen">
        <h2>Không tìm thấy</h2>
        <p>Link chia sẻ không hợp lệ hoặc đã hết hạn</p>
      </div>
    } @else {
      <div class="public-layout">
        <header class="public-header">
          <span class="logo">🌳 Cây Gia Phả</span>
          <h1>{{ familyName() }}</h1>
          <!-- ✅ svgElementId string, không phải svgRef -->
          <app-export-buttons
            svgElementId="family-tree-svg"
            [familyName]="familyName()"
          />
        </header>

        <!-- ✅ Truyền members và relations — required inputs của TreeViewComponent -->
        @if (members().length > 0) {
          <app-tree-view
            [members]="members()"
            [relations]="relations()"
            [viewOnly]="true"
          />
        }
      </div>
    }
  `,
  styles: [
    `
      .loading-screen,
      .error-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        color: #64748b;
      }
      .public-layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #09090f;
      }
      .public-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 20px;
        background: #0f1120;
        border-bottom: 1px solid #252d45;
        flex-shrink: 0;
      }
      .logo {
        font-size: 18px;
      }
      h1 {
        flex: 1;
        font-size: 16px;
        color: #e2e8f0;
        margin: 0;
      }
    `,
  ],
})
export class PublicTreePage implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  // ✅ Dùng signals thay vì plain properties
  familyName = signal('');
  members = signal<Member[]>([]);
  relations = signal<Relationship[]>([]);
  loading = signal(true);
  error = signal(false);

  async ngOnInit() {
    const token = this.route.snapshot.params['token'];
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/api/families/public/${token}`),
      );
      this.familyName.set(res.data.name);
      this.members.set(res.data.members ?? []);
      this.relations.set(res.data.relations ?? []);
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
