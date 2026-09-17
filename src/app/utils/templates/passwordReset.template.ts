import { baseEmailTemplate } from "./baseEmail.template";

interface IPasswordResetOptions {
  name?: string;
  otp: string;
}

export const passwordResetTemplate = ({ name, otp }: IPasswordResetOptions) => {
  const greeting = name ? `Hi ${name},` : "Hello,";

  const content = `
    <h2 style="font-size: 20px; font-weight: 700; color: #f8fafc; margin: 0 0 12px 0;">Reset Your Password</h2>
    <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin: 0 0 20px 0;">
      ${greeting} we received a request to reset the password for your <strong>Diamond Pay</strong> account. Enter the verification code below to proceed:
    </p>
    
    <div class="otp-wrapper">
      <div class="otp-code">${otp}</div>
    </div>
    
    <p class="notice">
      This code is valid for <strong>10 minutes</strong>.
    </p>
    <p class="notice" style="margin-top: 16px; font-size: 12px; color: #f87171; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 10px 14px;">
      ⚠️ If you did not request a password reset, please ignore this email or change your password immediately if you suspect unauthorized access.
    </p>
  `;

  return {
    subject: "Diamond Pay - Password Reset Code",
    html: baseEmailTemplate({ title: "Reset Your Password", content }),
    text: `${greeting} Your Diamond Pay password reset code is: ${otp} (valid for 10 minutes). If you did not request this, please ignore.`,
  };
};
