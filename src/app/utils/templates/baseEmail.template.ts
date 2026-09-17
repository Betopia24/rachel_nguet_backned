interface IBaseEmailOptions {
  title: string;
  content: string;
}

export const baseEmailTemplate = ({ title, content }: IBaseEmailOptions): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #080d1a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #f1f5f9;
    }
    .email-wrapper {
      width: 100%;
      background-color: #080d1a;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .email-container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 36px 32px 20px 32px;
      text-align: center;
      background: linear-gradient(180deg, #131d36 0%, #0f172a 100%);
      border-bottom: 1px solid #1e293b;
    }
    .logo-diamond {
      font-size: 30px;
      line-height: 1;
      margin-bottom: 8px;
    }
    .logo-text {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #d4af37;
      text-transform: uppercase;
    }
    .tagline {
      font-size: 12px;
      color: #94a3b8;
      letter-spacing: 1px;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .body-content {
      padding: 32px;
      text-align: center;
    }
    .otp-wrapper {
      margin: 28px 0;
    }
    .otp-code {
      display: inline-block;
      background-color: #1e293b;
      border: 2px dashed #d4af37;
      border-radius: 12px;
      padding: 14px 28px;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #f8fafc;
      font-family: 'Courier New', Courier, monospace;
    }
    .notice {
      font-size: 13px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 16px 0 0 0;
    }
    .warning {
      color: #ef4444;
      font-size: 12px;
      margin-top: 8px;
    }
    .footer {
      padding: 24px 32px;
      background-color: #0b1120;
      border-top: 1px solid #1e293b;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <div class="logo-wrapper" style="text-align: center; margin-bottom: 8px;">
          <img src="https://imglink.cc/cdn/FenBYK5zPZ.png" alt="Diamond Pay Logo" style="display: inline-block; max-width: 160px; height: auto; border: 0; outline: none;" />
        </div>
        <div class="tagline">Next Generation Secure Payments</div>
      </div>
      <div class="body-content">
        ${content}
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;">This is an automated security message from Diamond Pay. Please do not reply to this email.</p>
        <p style="margin: 0;">© ${new Date().getFullYear()} Diamond Pay Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
