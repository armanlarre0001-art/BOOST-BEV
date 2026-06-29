# BoostBev 🥤

BoostBev is a premium beverage e-commerce web application featuring a smooth modern design, product catalog browsing, cart operations, user authentication, and admin management.

The application is built using a **Node.js + Express** backend, which serves static frontend assets directly. It features a unique **dual-database setup**: it defaults to **MongoDB (Mongoose)** but gracefully falls back to a **Local JSON File Database** if MongoDB is unavailable, making it robust and easy to run anywhere.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Local Installation & Setup](#local-installation--setup)
4. [Environment Variables](#environment-variables)
5. [Running the Application](#running-the-application)
6. [Deployment Guide](#deployment-guide)
7. [Architecture & Troubleshooting](#architecture--troubleshooting)

---

## 1. Prerequisites

Before setting up the project, make sure you have the following installed on your machine:
- **Node.js** (Version `>= 18.0.0` recommended)
- **npm** (comes bundled with Node.js)
- **MongoDB** (Optional - if not installed or running, the application will automatically fall back to saving data locally in `data_fallback/*.json` files)

---

## 2. Project Structure

```text
boost-bev/
├── data_fallback/          # Local JSON database files (automatically generated)
├── public/                 # Static frontend files (HTML, CSS, JS)
│   ├── css/                # Styling (vanilla CSS files)
│   ├── js/                 # Frontend logic (auth, cart, shop, admin scripts)
│   └── index.html          # Single Page Application entrypoint
├── src/                    # Backend source code
│   ├── config/             # Database connection & fallback configurations
│   ├── controllers/        # Business logic for API endpoints
│   ├── middleware/         # Express middlewares (auth checking, etc.)
│   ├── models/             # Mongoose schemas / fallback models
│   └── routes/             # Express API routing tables
├── .env                    # Environment configuration file (ignored by Git)
├── .gitignore              # Files to exclude from Git tracking
├── package.json            # Node project configuration and dependencies
└── server.js               # Main server entry point
```

---

## 3. Local Installation & Setup

1. **Clone the Repository:**
   ```bash
   git clone <repository-url>
   cd boost-bev
   ```

2. **Install Dependencies:**
   Install both runtime and development dependencies:
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a file named `.env` in the root directory (the parent of `src`) and add the necessary configurations. See [Environment Variables](#environment-variables) below for details.

---

## 4. Environment Variables

The application reads configurations from a `.env` file in the root directory. Below is the list of supported environment variables:

| Variable Name | Default Value / Example | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | The port on which the server will listen. |
| `MONGODB_URI` | `mongodb://localhost:27017/boostbev` | MongoDB connection URL. If the server fails to connect, it falls back to the JSON database. |
| `JWT_SECRET` | `boostbev_secret_key_12345!` | Secret key used for signing JWT tokens during user login. |
| `STRIPE_SECRET_KEY` | `sk_test_boostbev_stripe_secret_key_mock` | API Secret Key for Stripe payment processing integration. |
| `EMAIL_HOST` | `smtp.ethereal.email` | SMTP Server Host for sending transactional emails (order confirmations, etc.). |
| `EMAIL_PORT` | `587` | SMTP Server Port. |
| `EMAIL_USER` | `mock_user` | Authentication username for SMTP server. |
| `EMAIL_PASS` | `mock_pass` | Authentication password for SMTP server. |

### Example `.env` File Content:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/boostbev
JWT_SECRET=boostbev_secret_key_12345!
STRIPE_SECRET_KEY=sk_test_boostbev_stripe_secret_key_mock
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=mock_user
EMAIL_PASS=mock_pass
```

---

## 5. Running the Application

Once variables are set and dependencies are installed, you can start the application:

### Development Mode (with Live Reloading)
Runs the server with `nodemon` to automatically restart whenever code changes:
```bash
npm run dev
```

### Production Mode
Starts the server normally using Node:
```bash
npm start
```

Once started, open your browser and navigate to: **[http://localhost:5000](http://localhost:5000)** (or the port defined in your `.env`).

---

## 6. Deployment Guide

You can deploy this Express application to various cloud hosting platforms.

> [!IMPORTANT]  
> If you deploy to platforms with ephemeral filesystems (like Render, Railway, or Heroku without disk mounting), **do not use the Local JSON Fallback DB** for production. Any data added to the JSON files (registered users, new orders) will be lost when the container restarts. **Always configure a remote MongoDB instance (e.g., MongoDB Atlas)** by setting the `MONGODB_URI` environment variable.

### Option A: Deploying to Render
1. Sign up/Log in to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your Git repository.
4. Configure the Service Settings:
   - **Name:** `boost-bev`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Click **Advanced** and add your Environment Variables (from your `.env` file). Specifically, make sure to add a remote `MONGODB_URI` connecting to MongoDB Atlas.
6. Click **Deploy Web Service**.

### Option B: Deploying to Railway
1. Sign up/Log in to [Railway](https://railway.app/).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository.
4. Go to the **Variables** tab of the service and add your Environment Variables.
5. Railway will automatically detect `package.json` scripts and run `npm install` followed by `npm start`.

### Option C: Deploying to Heroku
1. Log in to your Heroku CLI and create a new application:
   ```bash
   heroku create boost-bev-app
   ```
2. Add your environment variables via the Heroku Dashboard under settings (Config Vars) or via CLI:
   ```bash
   heroku config:set MONGODB_URI="mongodb+srv://..." JWT_SECRET="your_secret_key"
   ```
3. Deploy the application:
   ```bash
   git push heroku main
   ```

---

## 7. Architecture & Troubleshooting

### Dual Database Mode
When the server boots up, it attempts to connect to MongoDB using the configured `MONGODB_URI`.
- **Success:** The application runs fully on MongoDB.
- **Failure:** The console outputs a warning, and the system automatically swaps models to interact with the local JSON database inside `data_fallback/`.

### Seeding Products
The server automatically runs a seed check on startup. If the database (MongoDB or fallback JSON) does not contain any beverage products, it will seed a set of premium mock beverages automatically to ensure the shop page is populated.
