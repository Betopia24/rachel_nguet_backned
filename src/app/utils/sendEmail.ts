import nodemailer from "nodemailer";
import config from "../../config";

interface ISendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async ({ to, subject, html, text }: ISendEmailOptions): Promise<boolean> => {
  try {
    if (config.smtp.user && config.smtp.pass) {
      const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });

      await transporter.sendMail({
        from: config.smtp.from,
        to,
        subject,
        text: text || "",
        html,
      });

      console.log(`📧 [Email]: Successfully sent to ${to} (${subject})`);
      return true;
    } else {
      // In development or when SMTP is not configured, log OTP prominently
      console.log("--------------------------------------------------");
      console.log(`📧 [Email Sim - Dev Mode] To: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 Content:\n${text || html}`);
      console.log("--------------------------------------------------");
      return true;
    }
  } catch (error) {
    console.error(`❌ [Email]: Failed to send email to ${to}:`, error);
    // Return false instead of crashing request flow
    return false;
  }
};
