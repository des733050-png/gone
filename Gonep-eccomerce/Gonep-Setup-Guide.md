# GONEP Healthcare Marketplace
### Developer Setup & Run Guide

> **Stack:** React + Vite / Node.js &nbsp;|&nbsp; **Database:** MongoDB Atlas &nbsp;|&nbsp; **Version:** v1.0 — May 2026

---

## 1. Prerequisites

Ensure the following are installed before proceeding.

| Tool | Requirement |
|------|-------------|
| Node.js | v18 or higher — https://nodejs.org |
| npm | Comes with Node.js (v9+) |
| Git | https://git-scm.com (if cloning from a repo) |
| MongoDB | MongoDB Atlas account with a cluster ready |

> Run `node -v` and `npm -v` in your terminal to confirm versions before starting.

---

## 2. Project Structure

```
Gonep-Healthcare-Marketplace/
├── client/          ← React + Vite frontend
│   ├── src/
│   ├── public/
│   ├── index.html
│   └── package.json
├── server/          ← Node.js + Express backend
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── index.js
│   ├── .env         ← environment variables (you fill this)
│   └── package.json
└── zbpack.json
```

---

## 3. Environment Setup (.env)

The server will not start without a valid `.env` file. Open `server/.env` and fill in all values marked `REPLACE_WITH_...`

### Full .env template

```env
# ─────────────────────────────────────────────
# GONEP Healthcare Marketplace — Server Config
# ─────────────────────────────────────────────

PORT=5000

# MongoDB — your Atlas connection string
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/gonep?retryWrites=true&w=majority

# JWT — long random secret (min 32 chars)
JWT_SECRET=REPLACE_WITH_A_STRONG_RANDOM_SECRET_KEY

# URLs
APPLICATION_URL=http://localhost:5173
PLATFORM_URL=http://localhost:5173

# Admin account (created via setup script)
ADMIN_EMAIL=admin@gonepharm.com
ADMIN_PASSWORD=REPLACE_WITH_STRONG_ADMIN_PASSWORD

# Email (nodemailer)
EMAIL_USER=REPLACE_WITH_EMAIL_ADDRESS
EMAIL_PASS=REPLACE_WITH_EMAIL_APP_PASSWORD
```

### Variable reference

| Variable | Description |
|----------|-------------|
| `PORT` | Port the server listens on. Default: `5000` |
| `MONGODB_URL` | Full MongoDB Atlas connection string. Get it from Atlas → Connect → Drivers |
| `JWT_SECRET` | Secret used to sign auth tokens. Use a random string of 32+ characters |
| `APPLICATION_URL` | Frontend origin for CORS. Use `http://localhost:5173` locally |
| `PLATFORM_URL` | Base URL used in email links. Same as `APPLICATION_URL` in development |
| `ADMIN_EMAIL` | Email for the super-admin account created by the setup script |
| `ADMIN_PASSWORD` | Password for the super-admin account (min 8 chars, use something strong) |
| `EMAIL_USER` | Email address nodemailer sends from (e.g. your Gmail address) |
| `EMAIL_PASS` | App password for the email account — **not** your normal login password |

> ⚠️ **Never commit `.env` to Git.** It is already listed in `server/.gitignore`. Keep it local only.

### Generating a JWT secret (quick method)

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Gmail App Password setup

If you are using Gmail as the email provider:

1. Go to your Google Account → **Security** → **2-Step Verification** (enable it first)
2. Go to **Security** → **App Passwords**
3. Create an app password for **Mail / Other** and name it `Gonep`
4. Copy the 16-character password into `EMAIL_PASS` in `.env`

> If using a different email provider, update the `service` field in `server/utils/sendEmail.js` (e.g. `'Outlook'`, `'Yahoo'`, or use raw SMTP settings).

---

## 4. Install Dependencies

Run the install commands separately for the server and the client. Open two terminal windows or tabs.

### Server

```bash
cd server
npm install
```

### Client

```bash
cd client
npm install
```

> Both installs are independent. Always run `npm install` in both folders on first setup, or after pulling new changes.

---

## 5. Create the Admin Account *(first run only)*

The admin account is seeded into the database by a one-time setup script. Run this after filling in `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.

```bash
cd server
node config/setupAdmin.js
```

Expected output:

```
admin created successfully
```

> ⚠️ Run this script only once. If the admin already exists it will silently exit — it checks before creating.

---

## 6. Running the Project

### Start the server

```bash
cd server

# Development mode (auto-restarts on file changes)
npm run dev

# Production mode
npm start
```

Server runs at: **http://localhost:5000**

Expected terminal output:
```
Database connected
Server running at http://localhost:5000
```

### Start the client

```bash
# Open a separate terminal
cd client
npm run dev
```

Client runs at: **http://localhost:5173**

### Build for production

```bash
cd client
npm run build

# Output goes to client/dist/
# Preview the production build locally
npm run preview
```

> ⚠️ In production, update the base URL in the client's Axios config and set `APPLICATION_URL` / `PLATFORM_URL` in `.env` to your live domain.

---

## 7. Full Startup Checklist

Follow this order every time you set up from scratch:

1. Fill in all `REPLACE_WITH_...` values in `server/.env`
2. `cd server` → `npm install`
3. `cd client` → `npm install`
4. `cd server` → `node migrate.js` → `node config/setupAdmin.js` *(first run only)*
5. `cd server` → `npm run dev` *(keep terminal open)*
6. `cd client` → `npm run dev` *(keep terminal open)*
7. Open **http://localhost:5173** in your browser
8. Log in with your `ADMIN_EMAIL` and `ADMIN_PASSWORD`

---

## 8. Available API Routes

All routes are prefixed with `/api`

| Route | Description |
|-------|-------------|
| `/api/auth` | Login, register, OTP / forgot password |
| `/api/admin` | Admin-only actions: manage users, approve sellers, settings |
| `/api/seller` | Seller dashboard, profile, earnings |
| `/api/user` | User profile management |
| `/api/products` | Product listing, search, details |
| `/api/categories` | Product categories (Prescription, OTC, Devices, Wellness) |
| `/api/brands` | Supplier / brand management |
| `/api/cart` | Cart operations (add, remove, update) |
| `/api/orders` | Order placement, status updates, history |

---

## 9. Common Issues & Fixes

### MongoDB connection error
- Check that `MONGODB_URL` is correct and has no typos.
- Whitelist your IP in MongoDB Atlas: **Network Access → Add IP Address**.
- If using `0.0.0.0/0` in Atlas, ensure your cluster is not paused.

### CORS error in the browser
- Ensure `APPLICATION_URL` in `.env` exactly matches the client origin (including port).
- `http://localhost:5173` and `http://localhost:5173/` are different — no trailing slash.

### Emails not sending
- Gmail: ensure 2-Step Verification is on and you are using an **App Password**, not your account password.
- Check `EMAIL_USER` and `EMAIL_PASS` in `.env` for extra spaces or newlines.
- For non-Gmail providers, update the `service` field in `server/utils/sendEmail.js`.

### Port already in use

```bash
# macOS / Linux
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### node_modules missing / install errors

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 10. Support & Contact

| | |
|--|--|
| **Website** | https://gonepharm.com |
| **Email** | info@gonepharm.com |
| **Phone** | +254 707 231 654 |
| **Address** | 2nd Floor, Chandaria Innovation Centre, Nairobi, Kenya |
| **LinkedIn** | https://www.linkedin.com/company/g-one-pharmaceuticals/ |
| **Instagram** | https://www.instagram.com/gonep_pharmaceauticals/ |
| **Facebook** | https://www.facebook.com/Gonepharmaceuticals |

---

*© 2026 Gonep. All rights reserved. | Transforming Healthcare Access Across Africa*
