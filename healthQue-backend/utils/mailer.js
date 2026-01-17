const nodemailer = require('nodemailer');

async function sendMail({ to, subject, html }) {
  if (!process.env.SMTP_HOST) {
    console.warn('SMTP not configured; skipping sendMail to', to);
    return;
  }

  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const secure = port === 465;

  const transportConfig = {
    host: process.env.SMTP_HOST,
    port,
    secure,
  };

  if (process.env.SMTP_USER) {
    transportConfig.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || '',
    };
  }

  const transporter = nodemailer.createTransport(transportConfig);

  const from = process.env.FROM_EMAIL || process.env.SMTP_USER || `no-reply@${process.env.SMTP_HOST || 'localhost'}`;

  const msg = {
    from,
    to,
    subject,
    html,
  };

  return transporter.sendMail(msg);
}

module.exports = { sendMail };
