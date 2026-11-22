# 💎 Diamond Pay - Rachel Nguet Backend API

A production-ready, enterprise-grade backend service built with **Node.js, Express, TypeScript, Prisma ORM, and MongoDB**. This API powers AI media generation, user authentication with dual tokens (Access & Refresh), social sign-ins (Firebase Google & Apple), in-app subscriptions (RevenueCat), and digital asset management.

---

## 🚀 Key Features & Modules

### 1. 🔐 Authentication & Security (`/api/v1/auth`)
- **Email & Password Authentication**: Secure bcrypt password hashing with customizable salt rounds.
- **OTP Verification Flow**: 6-digit email OTP for registration confirmation and password resets via Nodemailer (Gmail/SMTP).
- **Dual JWT Token Architecture**:
  - **Access Token**: Short-lived for API authentication (`Authorization: Bearer <token>`).
  - **Refresh Token**: Long-lived token with rotation support (`/auth/refresh-token`), returned in response body and set as `httpOnly` secure cookie.
- **Social Sign-In (Firebase Admin SDK)**:
  - **Google Login**: ID Token verification via Firebase Admin SDK with fallback to Google tokeninfo.
  - **Apple Login**: Sign In with Apple ID Token verification via Firebase Admin SDK.
- **Password Management**: Forgot password OTP flow, verification to issue short-lived reset tokens, and authenticated password changes.

### 2. 🤖 AI Generation Microservice Integration (`/api/v1/ai`)
Directly integrates with the high-performance AI microservice:
- **Text-to-Image Generation**: Gemini AI image generation (`/ai/generate-image`).
- **Text-to-Video Generation**: Veo text prompt to video synthesis (`/ai/text-to-video`).
- **Image-to-Video Generation**: Animate still images into videos (`/ai/image-to-video`).
- **Text-to-Music Generation**: AI composition from text prompts (`/ai/text-to-music`).
- **Audio Enhancement**: ElevenLabs speech/audio quality enhancement (`/ai/enhance-audio`).
- **Save Creations**: Persist AI generated assets to AWS S3 and database (`/ai/save-creation`).

### 3. 🎨 My Design Studio (`/api/v1/design`)
- Filter creations by category tabs: `all`, `generated`, `uploaded`, `video`, `music`.
- Paginated results with search and sort order.
- Top-level header statistics card: Returns `totalDesigns` along with live counts for each tab.
- Single asset retrieval and deletion.

### 4. 👤 User Management & Profile (`/api/v1/user`)
- User profile retrieval (`/user/me`).
- Profile update supporting `multipart/form-data` with avatar image upload (accepts field names `file`, `avatar`, `image`, or `profileImage`).
- Automatic upload to **AWS S3** with local fallback.
- Admin endpoints: Paginated user list, user lookup by ID, and account status management (`active`, `inactive`, `blocked`).

### 5. 💳 Subscription & RevenueCat Integration (`/api/v1/subscription`)
- **RevenueCat Webhook Handler** (`/subscription/webhook`):
  - Listens for `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, and `UNCANCELLATION`.
  - Automatically provisions subscription tier (`FREE`, `PRO`, `PREMIUM`) and updates database state.
- **My Subscription** (`/subscription/my-subscription`): Returns active user tier, expiry dates, and entitlement details.
- **Subscription Plans** (`/subscription/plans`): Returns tier pricing, features, and RevenueCat product identifiers.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Web Framework**: Express.js
- **Database**: MongoDB (Atlas)
- **ORM**: Prisma Client v6
- **Validation**: Zod
- **Cloud Storage**: AWS S3 (`@aws-sdk/client-s3`)
- **Social Login**: Firebase Admin SDK
- **Email Delivery**: Nodemailer (SMTP)
- **Process Manager**: PM2

---

## 📋 Environment Configuration

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

| Variable Name | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `5289` |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `DATABASE_URL` | MongoDB connection URI | `mongodb+srv://...` |
| `PASSWORD_SALT` | Bcrypt salt rounds | `10` or `12` |
| `JWT_SECRET` | Secret key for Access Tokens | `your_jwt_secret` |
| `JWT_EXPIRES_IN` | Access token lifespan | `7d` |
| `JWT_REFRESH_SECRET` | Secret key for Refresh Tokens | `your_refresh_secret` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `30d` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username / email | `your_email@gmail.com` |
| `SMTP_PASS` | Gmail App Password (16-char) | `abcd efgh ijkl mnop` |
| `SMTP_FROM` | Sender header | `Diamond Pay <no-reply@domain.com>` |
| `AWS_ACCESS_KEY_ID` | AWS IAM Access Key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM Secret Key | `secret_key...` |
| `AWS_REGION` | AWS S3 region | `ap-southeast-2` |
| `AWS_BUCKET_NAME` | AWS S3 bucket name | `diamond-pay-storage` |
| `AI_SERVICE_URL` | FastAPI Microservice URL | `http://206.162.244.175:4444` |
| `AI_SERVICE_TIMEOUT_MS` | AI generation timeout in ms | `180000` (3 mins) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase credentials JSON | `./firebase-service-account.json` |
| `REVENUECAT_WEBHOOK_AUTH_HEADER` | Secret token configured in RevenueCat | `your_webhook_auth_header` |
| `REVENUECAT_API_KEY` | RevenueCat REST API Key | `your_api_key` |

---

## 💻 Local Installation & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run in Development Mode
```bash
npm run dev
```
The server will start at `http://localhost:5289`.

### 4. Build for Production
```bash
npm run build
```

### 5. Start Production Server
```bash
npm start
```

---

## 🚀 VPS Deployment (PM2)

Requirements on the VPS: Node.js 20+ and PM2 (`npm install -g pm2`).

```bash
# 1. Upload the project and create .env (copy from .env.example)
cd /path/to/rachel_nguet_backned
cp .env.example .env   # then fill in the values

# 2. Install dependencies, build and start with PM2
npm install
npm run pm2:start

# 3. Keep the app running after a VPS reboot
pm2 save
pm2 startup            # run the command it prints

# Deploying updates
git pull && npm install && npm run pm2:restart

# Logs / status / stop
npm run pm2:logs
pm2 status
npm run pm2:stop
```

Logs are also written to `logs/out.log` and `logs/error.log`.

---

## 📑 API Route Cheat Sheet

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new account (sends 6-digit email OTP) |
| `POST` | `/api/v1/auth/verify-registration-otp` | Verify OTP, activate account & return tokens |
| `POST` | `/api/v1/auth/resend-otp` | Resend verification OTP code |
| `POST` | `/api/v1/auth/login` | Login with email & password (returns access & refresh token) |
| `POST` | `/api/v1/auth/google-login` | Sign In with Google ID Token |
| `POST` | `/api/v1/auth/apple-login` | Sign In with Apple ID Token |
| `POST` | `/api/v1/auth/refresh-token` | Exchange refresh token for new access & refresh token |
| `POST` | `/api/v1/auth/forgot-password` | Send password reset OTP |
| `POST` | `/api/v1/auth/verify-forgot-otp` | Verify OTP and obtain password reset token |
| `POST` | `/api/v1/auth/reset-password` | Set new password with reset token or OTP |
| `POST` | `/api/v1/auth/change-password` | Change password (requires Bearer token) |

### AI Generation (`/api/v1/ai`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/ai/health` | Check AI microservice connectivity |
| `POST` | `/api/v1/ai/generate-image` | Generate image from prompt |
| `POST` | `/api/v1/ai/text-to-video` | Generate video from prompt |
| `POST` | `/api/v1/ai/image-to-video` | Generate video from input image |
| `POST` | `/api/v1/ai/text-to-music` | Generate music/audio from prompt |
| `POST` | `/api/v1/ai/enhance-audio` | Enhance audio clarity / remove noise |
| `POST` | `/api/v1/ai/save-creation` | Persist generation to database & S3 |

### Design Studio (`/api/v1/design`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/design` | List creations (`tab=all\|generated\|uploaded\|video\|music` + stats) |
| `GET` | `/api/v1/design/:id` | Get design by ID |
| `DELETE` | `/api/v1/design/:id` | Delete design by ID |

### User Profile (`/api/v1/user`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/user/me` | Get current authenticated user profile |
| `PATCH` | `/api/v1/user/me` | Update profile (name, avatar via form-data) |
| `GET` | `/api/v1/user` | Admin: List all users (paginated) |
| `GET` | `/api/v1/user/:id` | Admin: Get user by ID |
| `PATCH` | `/api/v1/user/:id/status` | Admin: Update user status (`active`, `inactive`, `blocked`) |

### Subscription & RevenueCat (`/api/v1/subscription`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/subscription/webhook` | RevenueCat webhook receiver |
| `GET` | `/api/v1/subscription/my-subscription` | Get current active user subscription |
| `GET` | `/api/v1/subscription/plans` | Get available subscription tiers and feature list |

---

## 📮 Postman Collections

Two Postman collections are included in the repository root for testing:
1. `postman_collection.json`: Comprehensive collection including AI generation, My Design flow, Authentication, and User Profile.
2. `Diamond_Pay_API.postman_collection.json`: Specialized collection for full OTP lifecycle, social logins, and variable auto-saving.

Both collections include test scripts that automatically save `accessToken` and `refreshToken` into collection variables upon login.
