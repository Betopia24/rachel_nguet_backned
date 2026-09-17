import { baseEmailTemplate } from "./baseEmail.template";

interface IEmailVerificationOptions {
  name?: string;
  otp: string;
}

export const emailVerificationTemplate = ({ name, otp }: IEmailVerificationOptions) => {
  const greeting = name ? `Hi ${name},` : "Hello,";

  const content = `
    <h2 style="font-size: 20px; font-weight: 700; color: #f8fafc; margin: 0 0 12px 0;">Verify Your Email Address</h2>
    <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin: 0 0 20px 0;">
      ${greeting} welcome to <strong>Diamond Pay</strong>! Use the 6-digit verification code below to complete your registration:
    </p>
    
    <div class="otp-wrapper">
      <div class="otp-code">${otp}</div>
    </div>
    
    <p class="notice">
      This code is valid for <strong>10 minutes</strong>. For security reasons, please do not share this code with anyone.
    </p>
    <p class="notice" style="margin-top: 12px; font-size: 12px; color: #64748b;">
      If you did not create a Diamond Pay account, you can safely ignore this email.
    </p>
  `;

  return {
    subject: "Diamond Pay - Email Verification Code",
    html: baseEmailTemplate({ title: "Verify Your Email Address", content }),
    text: `${greeting} Welcome to Diamond Pay! Your 6-digit verification code is: ${otp} (valid for 10 minutes).`,
  };
};
