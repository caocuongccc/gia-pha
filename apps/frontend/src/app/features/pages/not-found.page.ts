// apps/frontend/src/app/features/pages/not-found.page.ts

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div style="text-align:center; padding:80px 20px;">
      <div style="font-size:64px; margin-bottom:16px;">🌿</div>
      <h1 style="font-size:32px;">404</h1>
      <p style="color:#666; margin-bottom:24px;">Trang không tồn tại</p>
      <a
        routerLink="/families"
        style="color:#3b82f6; text-decoration:underline;"
      >
        ← Về trang chủ
      </a>
    </div>
  `,
})
export class NotFoundPage {}
