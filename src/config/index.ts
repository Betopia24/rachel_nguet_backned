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
  cloudinary: {
    cloud_name: string;
    api_key: string;
    api_secret: string;
  };
  aws: {
    access_key_id: string;
    secret_access_key: string;
    region: string;
    bucket_name: string;
  };
  ai: {
    service_url: string;
    timeout_ms: number;
  };
  firebase: {
    service_account_key: string;
    service_account_path: string;
    project_id: string;
    client_email: string;
    private_key: string;
  };
  revenuecat: {
    webhook_auth_header: string;
    api_key: string;
  };
}


const config: Config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5289,
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
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
    api_key: process.env.CLOUDINARY_API_KEY || "",
    api_secret: process.env.CLOUDINARY_API_SECRET || "",
  },
  aws: {
    access_key_id: process.env.AWS_ACCESS_KEY_ID || "",
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.AWS_REGION || "ap-southeast-2",
    bucket_name: process.env.AWS_BUCKET_NAME || "diamond-pay-storage",
  },
  ai: {
    service_url: process.env.AI_SERVICE_URL || "http://206.162.244.175:4444",
    timeout_ms: Number(process.env.AI_SERVICE_TIMEOUT_MS) || 180000, // 3 minutes timeout for video/music generation
  },
  firebase: {
    service_account_key: process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "",
    service_account_path: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "",
    project_id: process.env.FIREBASE_PROJECT_ID || "",
    client_email: process.env.FIREBASE_CLIENT_EMAIL || "",
    private_key: process.env.FIREBASE_PRIVATE_KEY || "",
  },
  revenuecat: {
    webhook_auth_header: process.env.REVENUECAT_WEBHOOK_AUTH_HEADER || "",
    api_key: process.env.REVENUECAT_API_KEY || "",
  },
};

export default config;

