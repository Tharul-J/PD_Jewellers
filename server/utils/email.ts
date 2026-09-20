import nodemailer, { Transporter } from 'nodemailer';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const lookup = promisify(dns.lookup);

// Built lazily on first send, never at module load: server.ts calls dotenv.config()
// *after* its route imports, so reading process.env in the module body would see
// undefined credentials and permanently bind a broken transporter.
let transporter: Transporter | null = null;

// Render's free tier has no outbound IPv6 route. smtp.gmail.com resolves to an
// AAAA record there and net.connect()/tls.connect() (which Nodemailer calls
// directly with the hostname) fail with ENETUNREACH. Nodemailer 9.0.6 never
// reads a `family` option — SMTPConnection has no reference to it at all — so
// the previous fix silently did nothing. Resolving the A record ourselves and
// connecting to the literal IPv4 address sidesteps Nodemailer's DNS lookup
// entirely, regardless of what the OS resolver would have preferred.
const getTransporter = async (): Promise<Transporter> => {
  if (transporter) return transporter;

  // Two-tier IPv4 resolution: resolve4() queries the A record directly (fastest,
  // sidesteps getaddrinfo's IPv6 preference entirely) but talks straight to
  // whatever's in dns.getServers() via c-ares — some resolvers (local stub
  // resolvers, certain VPNs) refuse that raw query even though ordinary hostname
  // lookups work fine through them. dns.lookup(family: 4) falls back to the OS
  // resolver but pins the family, so it still avoids IPv6. Only if both fail do
  // we pass the bare hostname through, which reproduces the original ENETUNREACH
  // risk on IPv6-less networks — that path logs loudly so it's never silent.
  let host = 'smtp.gmail.com';
  try {
    const addresses = await resolve4('smtp.gmail.com');
    if (addresses.length > 0) {
      host = addresses[0];
      console.log(`[email] Resolved smtp.gmail.com -> ${host} (IPv4 via resolve4)`);
    }
  } catch (err) {
    console.warn('[email] resolve4 failed, trying dns.lookup(family: 4):', (err as Error).message);
    try {
      const { address } = await lookup('smtp.gmail.com', { family: 4 });
      host = address;
      console.log(`[email] Resolved smtp.gmail.com -> ${host} (IPv4 via lookup)`);
    } catch (err2) {
      console.error(
        '[email] IPv4 resolution failed entirely, falling back to bare hostname (may hit IPv6/ENETUNREACH):',
        (err2 as Error).message
      );
    }
  }

  transporter = nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    // TLS validates the cert against the real hostname, not the IP literal in `host`.
    tls: { servername: 'smtp.gmail.com' },
  });
  return transporter;
};

const emailFrom = () => `PD Jewellers <${process.env.GMAIL_USER}>`;

/**
 * Call once after dotenv.config() has run (server.ts loads env vars after its
 * route imports, so this can't run at module load — see getTransporter above).
 * Gives an immediate Render log line confirming whether the Gmail credentials
 * are actually valid, instead of only finding out when a user triggers a send.
 */
export const verifyEmailTransporter = async (): Promise<void> => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ Email transporter not configured: GMAIL_USER / GMAIL_APP_PASSWORD missing');
    return;
  }
  try {
    const t = await getTransporter();
    await t.verify();
    console.log('✅ Email transporter ready');
  } catch (err) {
    console.error('❌ Email transporter failed:', (err as Error).message);
  }
};

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

/**
 * Optional note an administrator attaches to a status change. Renders nothing
 * when absent, so every template sends exactly as before if no note is given.
 */
const noteBlock = (note?: string): string => {
  const trimmed = note?.trim();
  if (!trimmed) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse;">
    <tr>
      <td style="padding:14px 16px;background-color:#faf8f3;border-left:3px solid ${GOLD};">
        <p style="margin:0 0 6px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#999999;">A note from our team</p>
        <p style="margin:0;font-size:14px;white-space:pre-line;">${esc(trimmed)}</p>
      </td>
    </tr>
  </table>`;
};

const signOff = `<p style="margin:24px 0 0 0;">With warm regards,<br /><strong>The PD Jewellers Team</strong></p>`;

const send = async (to: string, subject: string, html: string, tag: string): Promise<boolean> => {
  if (!to) {
    console.error(`[email:${tag}] no recipient address, skipped`);
    return false;
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error(`[email:${tag}] GMAIL_USER / GMAIL_APP_PASSWORD not configured, skipped`);
    return false;
  }
  try {
    const t = await getTransporter();
    await t.sendMail({ from: emailFrom(), to, subject, html });
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
  total: number,
  note?: string
): Promise<boolean> => {
  const html = buildEmailHtml(`
    ${heading('Great news — your items are available')}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">We're delighted to let you know that the items in your inquiry <strong>${esc(inquiryRef)}</strong> have been reviewed and are available for you.</p>
    ${buildItemsTable(items, 'Est. Price')}
    <p style="margin:0 0 12px 0;font-size:16px;"><strong>Estimated Total: ${money(total)}</strong></p>
    ${noteBlock(note)}
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
  inquiryRef: string,
  note?: string
): Promise<boolean> => {
  const html = buildEmailHtml(`
    ${heading('An update on your inquiry')}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">Thank you for your interest in PD Jewellers. After careful review, we regret to inform you that we are unable to accommodate your inquiry <strong>${esc(inquiryRef)}</strong> at this time due to current availability constraints.</p>
    ${noteBlock(note)}
    <p style="margin:0;">We sincerely appreciate your patience and understanding. We'd love to help you find the perfect piece — please feel free to browse our latest collection or submit a new inquiry at any time.</p>
    ${signOff}
  `);
  return send(to, `An Update on Your Inquiry ${inquiryRef}`, html, 'inquiry-declined');
};

/** An administrator replied on an inquiry's message thread */
export const sendInquiryMessageEmail = async (
  to: string,
  name: string,
  inquiryRef: string,
  message: string
): Promise<boolean> => {
  const html = buildEmailHtml(`
    ${heading('A message about your inquiry')}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">Our team has sent you a message regarding your inquiry <strong>${esc(inquiryRef)}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:14px 16px;background-color:#faf8f3;border-left:3px solid ${GOLD};">
          <p style="margin:0;font-size:14px;white-space:pre-line;">${esc(message)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;">You can reply from your account dashboard under &ldquo;My Inquiries&rdquo;.</p>
    ${signOff}
  `);
  return send(to, `A Message About Your Inquiry ${inquiryRef}`, html, 'inquiry-message');
};

/**
 * A direct message an administrator sent from the admin Messages tab.
 * `isAnnouncement` only changes the wording — an announcement goes to many
 * recipients at once, so it must not read as a reply to something they sent.
 */
export const sendAdminMessageEmail = async (
  to: string,
  name: string,
  subject: string,
  body: string,
  isAnnouncement = false
): Promise<boolean> => {
  const intro = isAnnouncement
    ? 'We have an announcement to share with you from PD Jewellers.'
    : 'Our team has sent you a message.';

  const html = buildEmailHtml(`
    ${heading(subject)}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">${intro}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:14px 16px;background-color:#faf8f3;border-left:3px solid ${GOLD};">
          <p style="margin:0;font-size:14px;white-space:pre-line;">${esc(body)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;">You can view this and all previous messages from your account dashboard under &ldquo;Messages&rdquo;.</p>
    ${signOff}
  `);
  return send(to, `PD Jewellers: ${subject}`, html, 'admin-message');
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

/** Status -> ordered */
export const sendOrderPlacedEmail = async (
  to: string,
  name: string,
  inquiryRef: string,
  note?: string
): Promise<boolean> => {
  const html = buildEmailHtml(`
    ${heading('Your order is being processed')}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">We've received your order for inquiry <strong>${esc(inquiryRef)}</strong> and it is now being processed by our team.</p>
    <p style="margin:0 0 12px 0;">We'll be in touch again as soon as your piece moves into crafting.</p>
    ${noteBlock(note)}
    <p style="margin:0;">Thank you for choosing PD Jewellers.</p>
    ${signOff}
  `);
  return send(to, `Your Order is Being Processed — Inquiry ${inquiryRef}`, html, 'order-placed');
};

/** Status -> crafting */
export const sendCraftingEmail = async (
  to: string,
  name: string,
  inquiryRef: string,
  note?: string
): Promise<boolean> => {
  const html = buildEmailHtml(`
    ${heading('Your jewellery is being crafted')}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">Your piece from inquiry <strong>${esc(inquiryRef)}</strong> is now in production. Our master craftsmen have begun the detailed work of bringing it to life.</p>
    <p style="margin:0 0 12px 0;">Each piece is made by hand, so this stage takes the time it deserves. We'll let you know the moment it is ready.</p>
    ${noteBlock(note)}
    <p style="margin:0;">Thank you for your patience.</p>
    ${signOff}
  `);
  return send(to, `Your Jewellery is Being Crafted — Inquiry ${inquiryRef}`, html, 'crafting');
};

/** Status -> ready */
export const sendOrderAwaitingCollectionEmail = async (
  to: string,
  name: string,
  inquiryRef: string,
  isPickup: boolean,
  note?: string
): Promise<boolean> => {
  const collection = isPickup
    ? 'You are welcome to collect your order from our showroom in Gampaha at your earliest convenience.'
    : 'Your order will be carefully packaged and dispatched to your provided delivery address shortly.';

  const html = buildEmailHtml(`
    ${heading('Your order is ready')}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">Your order from inquiry <strong>${esc(inquiryRef)}</strong> is ready.</p>
    <p style="margin:0 0 12px 0;">${collection}</p>
    ${noteBlock(note)}
    <p style="margin:0;">We can't wait for you to see it.</p>
    ${signOff}
  `);
  return send(to, `Your Order is Ready — Inquiry ${inquiryRef}`, html, 'order-awaiting-collection');
};

/** Status -> completed */
export const sendOrderReadyEmail = async (
  to: string,
  name: string,
  inquiryRef: string,
  isPickup: boolean,
  note?: string
): Promise<boolean> => {
  const collection = isPickup
    ? 'You are welcome to collect your order from our showroom in Gampaha at your earliest convenience.'
    : 'Your order will be carefully packaged and dispatched to your provided delivery address shortly.';

  const html = buildEmailHtml(`
    ${heading('Your jewellery is ready!')}
    <p style="margin:0 0 12px 0;">Dear ${esc(name)},</p>
    <p style="margin:0 0 12px 0;">Wonderful news — your custom piece from inquiry <strong>${esc(inquiryRef)}</strong> has been completed and is ready for you!</p>
    <p style="margin:0 0 12px 0;">${collection}</p>
    ${noteBlock(note)}
    <p style="margin:0;">It has been a pleasure crafting this piece for you. We hope it brings you joy for years to come.</p>
    ${signOff}
  `);
  return send(to, `Your Jewellery is Ready! — Inquiry ${inquiryRef}`, html, 'order-ready');
};
