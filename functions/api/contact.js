/* =============================================================
   POST /api/contact — landing-page contact form.

   Cloudflare Pages Function. Relays the message to info@reapinsights.com
   through Resend (the same provider already verified for this domain),
   with Reply-To set to the sender so replying just works.

   Requires the RESEND_API_KEY environment variable on the Pages project.
   ============================================================= */

const TO = "info@reapinsights.com";
const FROM = "REAP Website <noreply@reapinsights.com>";

const LIMITS = { name: 100, email: 200, subject: 150, message: 4000 };

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// The submitted values land inside an HTML email — escape before interpolating.
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const name = (body.name || "").toString().trim();
  const email = (body.email || "").toString().trim();
  const subject = (body.subject || "").toString().trim();
  const message = (body.message || "").toString().trim();

  // Honeypot: a real person never fills a field they cannot see. Answer 200 so
  // a bot gets no signal that it was rejected.
  if ((body.company || "").toString().trim()) return json({ ok: true }, 200);

  if (!name || !email || !subject || !message) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }
  if (name.length > LIMITS.name || email.length > LIMITS.email ||
      subject.length > LIMITS.subject || message.length > LIMITS.message) {
    return json({ ok: false, error: "too_long" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ ok: false, error: "bad_email" }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: "not_configured" }, 503);
  }

  const meta = [
    ["From", `${name} <${email}>`],
    ["Subject", subject],
    ["Sent from", request.headers.get("referer") || "reapinsights.com"],
    ["Country", request.headers.get("cf-ipcountry") || "—"],
  ];

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:640px">
      <div style="background:#102040;color:#fff;padding:18px 22px">
        <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#c9a861">
          REAP &middot; website enquiry
        </div>
        <div style="font-size:18px;font-weight:600;margin-top:4px">${esc(subject)}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#333">
        ${meta.map(([k, v]) => `
          <tr>
            <td style="padding:8px 22px;background:#faf8f4;width:110px;color:#777">${esc(k)}</td>
            <td style="padding:8px 22px;background:#faf8f4">${esc(v)}</td>
          </tr>`).join("")}
      </table>
      <div style="padding:20px 22px;font-size:14px;line-height:1.7;color:#222;white-space:pre-wrap">${esc(message)}</div>
      <div style="padding:14px 22px;border-top:1px solid #e5e0d8;font-size:11px;color:#999">
        Reply directly to this email to respond to ${esc(name)}.
      </div>
    </div>`;

  const text =
    meta.map(([k, v]) => `${k}: ${v}`).join("\n") + "\n\n" + message;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: `[REAP] ${subject}`,
      html,
      text,
    }),
  });

  if (!res.ok) {
    // Surface the status for debugging, never the API key or full provider body.
    return json({ ok: false, error: "send_failed", status: res.status }, 502);
  }

  return json({ ok: true }, 200);
}

// Only onRequestPost is exported — Pages answers every other method with 405
// on its own, so there is no catch-all handler to keep in sync.
