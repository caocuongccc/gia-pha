import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Route: /auth/google/callback
 * Đây là popup page — nhận token từ URL, postMessage về parent, tự đóng.
 */
@Component({
  standalone: true,
  selector: 'app-google-callback',
  template: `<div style="padding:40px;text-align:center;font-family:monospace">
    ✅ Đã kết nối Google Drive<br />
    <small style="color:#666">Cửa sổ này sẽ tự đóng...</small>
  </div>`,
})
export class GoogleCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    const accessToken = params['access_token'];
    const expiryDate = Number(params['expiry_date']);

    if (accessToken && window.opener) {
      // Gửi token về parent window
      window.opener.postMessage(
        { type: 'GOOGLE_DRIVE_AUTH_SUCCESS', accessToken, expiryDate },
        window.location.origin,
      );
      setTimeout(() => window.close(), 1500);
    }
  }
}
