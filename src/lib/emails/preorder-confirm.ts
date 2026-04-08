export function preorderConfirmEmailHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:48px 24px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
          <tr>
            <td style="padding-bottom:40px;">
              <span style="font-size:20px;font-weight:400;color:#f5f0eb;font-family:Georgia,serif;">Ordo</span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:32px;font-weight:400;color:#f5f0eb;font-family:Georgia,serif;line-height:1.2;">
                Pre-order confirmed, ${firstName}.
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#908882;">
                Your Ordo pre-order is locked in. You're among the first to get an 18-gram AI copilot behind your ear.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#908882;">
                We'll keep you updated on development milestones and ship your unit as soon as it's ready.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <div style="width:60px;height:1px;background:#e8a87c;opacity:0.4;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5a5550;font-family:monospace;">
                Order details
              </p>
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#908882;">Product</td>
                  <td style="padding:8px 0;font-size:14px;color:#f5f0eb;text-align:right;">Ordo — Pre-Order</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#908882;border-top:1px solid #1c1c1c;">Amount</td>
                  <td style="padding:8px 0;font-size:14px;color:#e8a87c;text-align:right;border-top:1px solid #1c1c1c;">$80.00 USD</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#908882;border-top:1px solid #1c1c1c;">Status</td>
                  <td style="padding:8px 0;font-size:14px;color:#b8c9a3;text-align:right;border-top:1px solid #1c1c1c;">Paid</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:48px;">
              <a href="https://ai.ordospaces.com" style="display:inline-block;padding:14px 32px;background:#e8a87c;color:#0a0a0a;text-decoration:none;border-radius:100px;font-size:14px;font-weight:600;">
                Visit ordospaces.com
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #1c1c1c;padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#5a5550;">
                &copy; 2026 Ordo &middot; ai.ordospaces.com
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#5a5550;">
                Questions? Reply to this email or reach us at hello@ordospaces.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
