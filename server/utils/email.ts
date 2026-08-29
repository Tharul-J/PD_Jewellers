import { Resend } from 'resend';

// Resolved per-send, not at module load: server.ts calls dotenv.config() *after*
// its route imports, so reading process.env in the module body would always miss .env.
const emailFrom = () => process.env.EMAIL_FROM || 'PD Jewellers <onboarding@resend.dev>';

// Hosted on Cloudinary — email clients cannot resolve the app's local /logo.png.
const LOGO_URL =
  'https://res.cloudinary.com/da6s91myr/image/upload/w_240,c_fit,f_png/v1787999757/pd-jewellers/brand/logo.png';

const GOLD = '#B8860B';
const INK = '#333333';

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (n: unknown): string => `LKR ${Number(n ?? 0).toLocaleString('en-US')}`;

/** Wraps email-specific content in the shared PD Jewellers layout. */
export const buildEmailHtml = (content: string): string => `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="margin:0;padding:0;background-color:#f4f4f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:6px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
            <tr><td style="height:4px;background-color:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:32px 32px 24px 32px;font-size:15px;line-height:1.6;color:${INK};">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;border-top:1px solid #eeeeee;text-align:center;">
                <img src="${LOGO_URL}" alt="PD Jewellers" width="120" style="width:120px;max-width:120px;height:auto;display:block;margin:0 auto 12px auto;" />
                <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:${GOLD};">PD Jewellers &mdash; Over 100 Years of Excellence</p>
                <p style="margin:0 0 12px 0;font-size:12px;color:#777777;">Gampaha, Sri Lanka</p>
                <p style="margin:0;font-size:11px;color:#999999;">This is an automated message. Please do not reply directly to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

interface EmailItem {
  name?: string;
  price?: number;
  qty?: number;
  quantity?: number;
}

/**
 * Line-item table. Inquiry/purchase items carry no stored quantity field, so each
 * line represents a single piece unless a quantity is ever added to the model.
 */
const buildItemsTable = (items: EmailItem[] = [], priceLabel = 'Price'): string => {
  if (!Array.isArray(items) || items.length === 0) return '';
  const rows = items
    .map((item, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#faf8f3';
      return `<tr style="background-color:${bg};">
        <td style="padding:10px 12px;border-bottom:1px solid #eeeeee;font-size:14px;">${esc(item.name)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eeeeee;font-size:14px;text-align:center;">${esc(item.qty ?? item.quantity ?? 1)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eeeeee;font-size:14px;text-align:right;white-space:nowrap;">${money(item.price)}</td>
      </tr>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse;">
    <tr style="background-color:${GOLD};">
      <th align="left" style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#ffffff;">Item</th>
      <th align="center" style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#ffffff;">Qty</th>
      <th align="right" style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#ffffff;">${esc(priceLabel)}</th>
    </tr>
    ${rows}
  </table>`;
};

const heading = (text: string): string =>
  `<h1 style="margin:0 0 16px 0;font-size:21px;font-weight:600;color:${GOLD};">${esc(text)}</h1>`;

const signOff = `<p style="margin:24px 0 0 0;">With warm regards,<br /><strong>The PD Jewellers Team</strong></p>`;

const send = async (to: string, subject: string, html: string, tag: string): Promise<boolean> => {
  if (!to) {
    console.error(`[email:${tag}] no recipient address, skipped`);
    return false;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: emailFrom(), to, subject, html });
    if (error) {
      console.error(`[email:${tag}] Resend error:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email:${tag}] failed to send:`, err);
    return false;
  }
};

export const sendPasswordResetEmail = async (to: string, resetLink: string): Promise<boolean> => {
  const html = buildEmailHtml(`
    ${heading('Reset your password')}
    <p style="margin:0 0 12px 0;">You requested a password reset for your PD Jewellers account.</p>
    <p style="margin:0 0 12px 0;">
      <a href="${esc(resetLink)}" style="display:inline-block;padding:12px 24px;background-color:${GOLD};color:#ffffff;text-decoration:none;border-radius:4px;font-weight:600;">Reset your password</a>
    </p>
    <p style="margin:0 0 12px 0;">This link expires in <strong>1 hour</strong>.</p>
    <p style="margin:0;">If you did not request this, you can safely ignore this email.</p>
  `);
  return send(to, 'Reset your PD Jewellers password', html, 'password-reset');
};

/** Status -> availability_confirmed */
export const sendAvailabilityConfirmedEmail = async (
  to: string,
  name: string,
  inquiryRef: string,
  items: EmailItem[],
  total: number
): Promise<boolean> => {
  const html = buildEmailHtml(`
    ${heading('Great news — your items are available')}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">We're delighted to let you know that the items in your inquiry <strong>${esc(inquiryRef)}</strong> have been reviewed and are available for you.</p>
    ${buildItemsTable(items, 'Est. Price')}
    <p style="margin:0 0 12px 0;font-size:16px;"><strong>Estimated Total: ${money(total)}</strong></p>
    <p style="margin:0 0 12px 0;">You can now proceed to place your order by visiting your account dashboard and selecting &ldquo;Order Now&rdquo; on your inquiry.</p>
    <p style="margin:0;">We look forward to crafting something truly special for you.</p>
    ${signOff}
  `);
  return send(
    to,
    `Great News! Your Inquiry ${inquiryRef} — Items Are Available`,
    html,
    'availability-confirmed'
  );
};

/** Status -> declined */
export const sendInquiryDeclinedEmail = async (
  to: string,
  name: string,
  inquiryRef: string
): Promise<boolean> => {
  const html = buildEmailHtml(`
    ${heading('An update on your inquiry')}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">Thank you for your interest in PD Jewellers. After careful review, we regret to inform you that we are unable to accommodate your inquiry <strong>${esc(inquiryRef)}</strong> at this time due to current availability constraints.</p>
    <p style="margin:0;">We sincerely appreciate your patience and understanding. We'd love to help you find the perfect piece — please feel free to browse our latest collection or submit a new inquiry at any time.</p>
    ${signOff}
  `);
  return send(to, `An Update on Your Inquiry ${inquiryRef}`, html, 'inquiry-declined');
};

/** Purchase created (payment received) */
export const sendPaymentReceiptEmail = async (
  to: string,
  name: string,
  inquiryRef: string,
  items: EmailItem[],
  total: number,
  paidAt: Date | string
): Promise<boolean> => {
  const date = new Date(paidAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const html = buildEmailHtml(`
    ${heading('Payment confirmed — thank you for your order')}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">Thank you for your order! We're pleased to confirm that your payment has been successfully received.</p>
    ${buildItemsTable(items, 'Price')}
    <p style="margin:0 0 4px 0;font-size:16px;"><strong>Total Paid: ${money(total)}</strong></p>
    <p style="margin:0 0 4px 0;">Inquiry Reference: <strong>${esc(inquiryRef)}</strong></p>
    <p style="margin:0 0 16px 0;">Date: ${esc(date)}</p>
    <p style="margin:0;">Our master craftsmen will now begin bringing your vision to life. We'll keep you updated on the progress of your piece.</p>
    ${signOff}
  `);
  return send(
    to,
    `Payment Confirmed — Thank You for Your Order (${inquiryRef})`,
    html,
    'payment-receipt'
  );
};

/** Status -> completed */
export const sendOrderReadyEmail = async (
  to: string,
  name: string,
  inquiryRef: string,
  isPickup: boolean
): Promise<boolean> => {
  const collection = isPickup
    ? 'You are welcome to collect your order from our showroom in Gampaha at your earliest convenience.'
    : 'Your order will be carefully packaged and dispatched to your provided delivery address shortly.';

  const html = buildEmailHtml(`
    ${heading('Your jewellery is ready!')}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">Wonderful news — your custom piece from inquiry <strong>${esc(inquiryRef)}</strong> has been completed and is ready for you!</p>
    <p style="margin:0 0 12px 0;">${collection}</p>
    <p style="margin:0;">It has been a pleasure crafting this piece for you. We hope it brings you joy for years to come.</p>
    ${signOff}
  `);
  return send(to, `Your Jewellery is Ready! — Inquiry ${inquiryRef}`, html, 'order-ready');
};
