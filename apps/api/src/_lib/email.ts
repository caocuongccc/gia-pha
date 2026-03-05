import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InviteEmailParams {
  to: string;
  inviterName: string;
  familyName: string;
  inviteUrl: string;
  role: string;
}

export async function sendInviteEmail(params: InviteEmailParams) {
  const { to, inviterName, familyName, inviteUrl, role } = params;
  const roleLabel = role === 'EDITOR' ? 'có thể chỉnh sửa' : 'chỉ xem';

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to,
    subject: `${inviterName} mời bạn tham gia gia phả "${familyName}"`,
    html: buildInviteHtml({ inviterName, familyName, inviteUrl, roleLabel }),
  });
}

function buildInviteHtml(p: {
  inviterName: string;
  familyName: string;
  inviteUrl: string;
  roleLabel: string;
}) {
  return `
<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#f5f5f5;padding:40px 0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#0a0d12;padding:24px;text-align:center">
      <h1 style="color:#d4a847;margin:0;font-size:24px">🌳 Cây Gia Phả</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;color:#333">
        <strong>${p.inviterName}</strong> đã mời bạn tham gia
        gia phả <strong>"${p.familyName}"</strong>
        với quyền <strong>${p.roleLabel}</strong>.
      </p>
      <p style="font-size:13px;color:#888">Link có hiệu lực trong 7 ngày.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${p.inviteUrl}"
           style="background:#d4a847;color:#000;padding:14px 32px;border-radius:6px;
                  font-weight:bold;text-decoration:none;font-size:15px">
          Chấp nhận lời mời
        </a>
      </div>
      <p style="font-size:11px;color:#aaa;text-align:center">
        Nếu bạn không biết về lời mời này, hãy bỏ qua email này.
      </p>
    </div>
  </div>
</body></html>
  `;
}
