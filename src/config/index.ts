import "dotenv/config";

interface Config {
  NODE_ENV: string;
  port: number;
  database_url: string;
  password_salt: number;
  jwt: {
    secret: string;
    expire_in: string;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
}

const config: Config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  database_url: process.env.DATABASE_URL || "",
  password_salt: Number(process.env.PASSWORD_SALT) || 10,
  jwt: {
    secret: process.env.JWT_SECRET || "secret",
    expire_in: process.env.JWT_EXPIRES_IN || "7d",
  },
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Diamond Pay <no-reply@diamondpay.com>",
  },
};

export default config;

