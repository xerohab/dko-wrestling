// Shared branded email template for DKO Wrestling.
// Full-width dark background (table-based for email-client compatibility),
// centered content box with border + rounded corners, clickable footer links.

const LOGO_URL =
  "https://media.base44.com/images/public/6a0fab0df03ef3f099fbfaf0/782e6a111_dkowrestl.jpg";

// Convert plain-text URLs in a message into clickable styled anchor tags.
// Input is assumed already HTML-escaped by the caller.
export function linkify(text: string): string {
  return text.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) =>
      `<a href="${url}" style="color:#e8b923;text-decoration:underline;font-weight:500;">${url}</a>`
  );
}

interface TemplateOptions {
  siteUrl?: string;
  preHeader?: string; // hidden preview text
}

export function buildEmailTemplate(innerHtml: string, opts: TemplateOptions = {}): string {
  const siteUrl = (opts.siteUrl || "").replace(/\/$/, "");
  const pricingLink = siteUrl ? `${siteUrl}/pricing` : "/pricing";
  const preHeader = opts.preHeader || "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
${preHeader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preHeader}</div>` : ""}
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Inter,Arial,Helvetica,sans-serif;color:#eaeaea;-webkit-text-size-adjust:100%;">

<!-- Full-width dark background -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;">
<tr>
<td align="center" style="padding:32px 12px;">

<!-- Content box -->
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background-color:#141414;border:1px solid #2a2a2a;border-radius:12px;">
<tr>
<td style="padding:36px 32px;">

<!-- Header / Logo -->
<div style="text-align:center;margin-bottom:28px;padding-bottom:22px;border-bottom:1px solid #2a2a2a;">
<img src="${LOGO_URL}" alt="DKO Wrestling" style="height:46px;width:auto;border:0;" />
</div>

<!-- Body -->
${innerHtml}

<!-- Footer -->
<div style="margin-top:36px;padding-top:22px;border-top:1px solid #2a2a2a;text-align:center;">
<p style="font-family:Oswald,sans-serif;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin:0 0 12px;">
<a href="${pricingLink}" style="color:#e8b923;text-decoration:none;">Join DKO Club</a>
&nbsp;&middot;&nbsp;
<a href="${siteUrl || "#"}" style="color:#e8b923;text-decoration:none;">Visit DKO Wrestling</a>
</p>
<p style="font-size:11px;color:#555;margin:0;">&copy; 2026 DKO Wrestling &middot; Part of DKO LTD</p>
</div>

</td>
</tr>
</table>

</td>
</tr>
</table>

</body>
</html>`;
}