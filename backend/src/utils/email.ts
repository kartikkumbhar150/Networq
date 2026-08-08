import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:'Segoe UI',sans-serif;background:#0A0A0F;color:#e2e8f0;padding:40px;">
  <div style="max-width:520px;margin:0 auto;background:#13131A;border:1px solid rgba(99,102,241,0.3);border-radius:16px;padding:40px;">
    <div style="text-align:center;margin-bottom:28px;">
      <h1 style="font-size:26px;font-weight:800;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">HireX</h1>
    </div>
    ${content}
    <p style="color:#64748b;font-size:12px;text-align:center;margin-top:24px;border-top:1px solid rgba(255,255,255,0.05);padding-top:24px;">
      HireX Platform · Automated Notification
    </p>
  </div>
</body>
</html>`;
}

// ─── OTP ──────────────────────────────────────────────────────────────────────
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTPEmail(toEmail: string, name: string, otp: string): Promise<void> {
  const html = baseTemplate(`
    <p style="color:#cbd5e1;margin-bottom:8px;">Hi <strong>${name}</strong>,</p>
    <p style="color:#94a3b8;line-height:1.6;">Use the code below to verify your email.</p>
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:2px;">
        <div style="background:#0A0A0F;border-radius:10px;padding:20px 40px;">
          <span style="font-size:38px;font-weight:800;letter-spacing:12px;">${otp}</span>
        </div>
      </div>
    </div>
    <p style="color:#64748b;font-size:13px;text-align:center;">Expires in <strong style="color:#94a3b8;">10 minutes</strong>.</p>
  `);
  
  console.log(`\n=========================================\n[DEV] MOCK OTP for ${toEmail}: ${otp}\n=========================================\n`);
  
  try {
    await transporter.sendMail({ from: `"HireX" <${process.env.FROM_EMAIL}>`, to: toEmail, subject: 'Your HireX Verification Code', html });
  } catch (error) {
    console.error(`[Email Service] Failed to send OTP to ${toEmail}. OTP was: ${otp}`);
  }
}

// ─── Event Ticket (QR) ────────────────────────────────────────────────────────
export async function sendTicketEmail(
  toEmail: string, name: string, eventTitle: string,
  entryQrDataUrl: string, exitQrDataUrl: string, eventDate: string, venue: string
): Promise<void> {
  const html = baseTemplate(`
    <p style="color:#cbd5e1;">Hi <strong>${name}</strong>,</p>
    <p style="color:#94a3b8;line-height:1.6;">You're registered for <strong style="color:#a5b4fc;">${eventTitle}</strong>!</p>
    <div style="background:#0e0e1a;border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:4px 0;color:#94a3b8;">📅 <strong style="color:#e2e8f0;">${eventDate}</strong></p>
      <p style="margin:4px 0;color:#94a3b8;">📍 <strong style="color:#e2e8f0;">${venue}</strong></p>
    </div>
    
    <p style="color:#94a3b8;text-align:center;">Your Official QR Tickets:</p>
    
    <div style="display:flex;gap:20px;justify-content:center;margin:16px 0;">
      <div style="text-align:center;background:#fff;padding:16px;border-radius:12px;display:inline-block;">
        <h4 style="color:#10b981;margin:0 0 8px;font-size:16px;">ENTRY SCAN</h4>
        <img src="${entryQrDataUrl}" style="width:160px;height:160px;" alt="Entry QR Ticket"/>
      </div>
      
      <div style="text-align:center;background:#fff;padding:16px;border-radius:12px;display:inline-block;">
        <h4 style="color:#f59e0b;margin:0 0 8px;font-size:16px;">EXIT SCAN</h4>
        <img src="${exitQrDataUrl}" style="width:160px;height:160px;" alt="Exit QR Ticket"/>
      </div>
    </div>
    
    <p style="color:#64748b;font-size:13px;text-align:center;">Present the Entry QR code to checking in, and the Exit QR code to check out.</p>
  `);
  await transporter.sendMail({ from: `"HireX Events" <${process.env.FROM_EMAIL}>`, to: toEmail, subject: `🎟 Your Ticket – ${eventTitle}`, html });
}

// ─── Check-In QR Blast ────────────────────────────────────────────────────────
export async function sendCheckInQREmail(
  toEmail: string, name: string, eventTitle: string, qrDataUrl: string
): Promise<void> {
  const html = baseTemplate(`
    <p style="color:#cbd5e1;">Hi <strong>${name}</strong>,</p>
    <p style="color:#94a3b8;line-height:1.6;">The event <strong style="color:#a5b4fc;">${eventTitle}</strong> has started. Present this QR for <strong style="color:#6ee7b7;">CHECK-IN</strong>:</p>
    <div style="text-align:center;margin:16px 0;background:#fff;padding:16px;border-radius:12px;">
      <img src="${qrDataUrl}" style="width:200px;height:200px;" alt="Check-In QR"/>
    </div>
    <p style="color:#64748b;font-size:13px;text-align:center;">Scan at the entry point to mark your attendance.</p>
  `);
  await transporter.sendMail({ from: `"HireX Events" <${process.env.FROM_EMAIL}>`, to: toEmail, subject: `✅ Check-In QR – ${eventTitle}`, html });
}

// ─── Check-Out QR Blast ───────────────────────────────────────────────────────
export async function sendCheckOutQREmail(
  toEmail: string, name: string, eventTitle: string, qrDataUrl: string
): Promise<void> {
  const html = baseTemplate(`
    <p style="color:#cbd5e1;">Hi <strong>${name}</strong>,</p>
    <p style="color:#94a3b8;line-height:1.6;">Please scan the QR below for <strong style="color:#f59e0b;">CHECK-OUT</strong> from <strong style="color:#a5b4fc;">${eventTitle}</strong>:</p>
    <div style="text-align:center;margin:16px 0;background:#fff;padding:16px;border-radius:12px;">
      <img src="${qrDataUrl}" style="width:200px;height:200px;" alt="Check-Out QR"/>
    </div>
    <p style="color:#64748b;font-size:13px;text-align:center;">Scan at the exit point. Both scans are needed to confirm full participation.</p>
  `);
  await transporter.sendMail({ from: `"HireX Events" <${process.env.FROM_EMAIL}>`, to: toEmail, subject: `🚪 Check-Out QR – ${eventTitle}`, html });
}

// ─── Postpone Notification ────────────────────────────────────────────────────
export async function sendPostponeNotification(
  toEmail: string, name: string, eventTitle: string,
  newDate: string, responseToken: string, deadline: string
): Promise<void> {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const acceptUrl = `${baseUrl}/events/postpone-response?token=${responseToken}&action=accept`;
  const refundUrl = `${baseUrl}/events/postpone-response?token=${responseToken}&action=refund`;
  const html = baseTemplate(`
    <p style="color:#cbd5e1;">Hi <strong>${name}</strong>,</p>
    <p style="color:#94a3b8;line-height:1.6;"><strong style="color:#a5b4fc;">${eventTitle}</strong> has been postponed to <strong style="color:#e2e8f0;">${newDate}</strong>.</p>
    <p style="color:#94a3b8;">Please respond by <strong style="color:#f59e0b;">${deadline}</strong>:</p>
    <div style="display:flex;gap:12px;margin:24px 0;justify-content:center;">
      <a href="${acceptUrl}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:700;">Accept New Date</a>
      <a href="${refundUrl}" style="background:transparent;color:#a5b4fc;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:700;border:1px solid rgba(99,102,241,0.4);">Request Refund</a>
    </div>
    <p style="color:#64748b;font-size:13px;text-align:center;">No response by the deadline = automatic acceptance of new date.</p>
  `);
  await transporter.sendMail({ from: `"HireX Events" <${process.env.FROM_EMAIL}>`, to: toEmail, subject: `📅 Event Postponed – ${eventTitle}`, html });
}

// ─── Refund Notification ──────────────────────────────────────────────────────
export async function sendRefundEmail(
  toEmail: string, name: string, eventTitle: string, amount: number
): Promise<void> {
  const html = baseTemplate(`
    <p style="color:#cbd5e1;">Hi <strong>${name}</strong>,</p>
    <p style="color:#94a3b8;line-height:1.6;">Your payment of <strong style="color:#6ee7b7;">₹${amount}</strong> for <strong style="color:#a5b4fc;">${eventTitle}</strong> has been refunded from escrow.</p>
    <p style="color:#64748b;font-size:13px;">The refund will appear in your account within 5-7 business days (mock: instantly credited).</p>
  `);
  await transporter.sendMail({ from: `"HireX Events" <${process.env.FROM_EMAIL}>`, to: toEmail, subject: `💰 Refund Processed – ${eventTitle}`, html });
}

// ─── Organizer Release Notification ──────────────────────────────────────────
export async function sendReleaseEmail(
  toEmail: string, name: string, eventTitle: string, amount: number
): Promise<void> {
  const html = baseTemplate(`
    <p style="color:#cbd5e1;">Hi <strong>${name}</strong>,</p>
    <p style="color:#94a3b8;line-height:1.6;">Great news! The attendance threshold was met for <strong style="color:#a5b4fc;">${eventTitle}</strong>.</p>
    <p style="color:#94a3b8;">Your escrow funds of <strong style="color:#6ee7b7;">₹${amount}</strong> have been released to your account.</p>
  `);
  await transporter.sendMail({ from: `"HireX Events" <${process.env.FROM_EMAIL}>`, to: toEmail, subject: `🎉 Funds Released – ${eventTitle}`, html });
}
