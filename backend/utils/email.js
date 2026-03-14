const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

async function sendVerificationEmail(toEmail, firstName, code) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="440" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid rgba(60,50,30,0.12);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(60,50,30,0.08);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#7950B0;width:36px;height:36px;border-radius:9px;text-align:center;vertical-align:middle;">
                    <span style="color:white;font-size:18px;font-weight:bold;">D</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="font-size:20px;font-weight:600;color:#1a1814;font-style:italic;">DocsyChat</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1a1814;line-height:1.3;">
                Hi ${firstName}, verify your email
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#6b6356;line-height:1.6;">
                Enter this 6-digit code in DocsyChat to complete your signup. It expires in <strong>15 minutes</strong>.
              </p>
              <!-- Code box -->
              <div style="background:#f5f0e8;border:1.5px solid rgba(121,80,176,0.20);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <span style="font-size:42px;font-weight:700;letter-spacing:10px;color:#7950B0;font-family:'Courier New',monospace;">${code}</span>
              </div>
              <p style="margin:0;font-size:13px;color:#a89f92;line-height:1.6;">
                If you didn't create a DocsyChat account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(60,50,30,0.08);background:#faf7f2;">
              <p style="margin:0;font-size:12px;color:#a89f92;">
                Sent by DocsyChat · docsychat@gmail.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"DocsyChat" <${process.env.EMAIL_FROM}>`,
    to: toEmail,
    subject: `${code} — Your DocsyChat verification code`,
    html
  });
}

module.exports = { sendVerificationEmail };
