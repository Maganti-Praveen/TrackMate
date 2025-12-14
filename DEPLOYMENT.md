# Deployment Guide (Render.com)

This guide walks you through deploying **TrackMate** (Backend & Frontend) to Render for free.

## Prerequisites

1.  **GitHub Repo**: Your code must be pushed to a GitHub repository.
2.  **MongoDB Atlas**: You need a cloud database. If you don't have one:
    *   Go to [MongoDB Atlas](https://www.mongodb.com/atlas/database)
    *   Create a free cluster.
    *   Get the connection string (e.g., `mongodb+srv://<user>:<password>@cluster.mongodb.net/trackmate`).

---

## Part 1: Deploy the Backend (Web Service)

1.  Log in to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  Configure the service:
    *   **Name**: `trackmate-backend` (or similar)
    *   **Region**: Choose the one closest to you (e.g., Singapore, Frankfurt).
    *   **Root Directory**: `backend` (Important!)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
    *   **Instance Type**: Free

5.  **Environment Variables**:
    Scroll down to "Environment Variables" and add these:
    *   `MONGO_URI`: Your MongoDB connection string.
    *   `JWT_SECRET`: A long random string (e.g., `mySuperSecretKey123`).
    *   `VAPID_PUBLIC_KEY`: (From your local dev or generate new ones)
    *   `VAPID_PRIVATE_KEY`: (From your local dev)
    *   `CLIENT_URL`: Leave empty for now (we will update this after deploying frontend).

6.  Click **Create Web Service**.
    *   Wait for the build to finish.
    *   **Copy the Backend URL** (e.g., `https://trackmate-backend.onrender.com`). You will need this for the frontend.

---

## Part 2: Deploy the Frontend (Static Site)

1.  On Render Dashboard, click **New +** -> **Static Site**.
2.  Connect the **same** GitHub repository.
3.  Configure the site:
    *   **Name**: `trackmate-frontend`
    *   **Root Directory**: `frontend` (Important!)
    *   **Build Command**: `npm install && npm run build`
    *   **Publish Directory**: `dist`
    *   **Instance Type**: Free

4.  **Environment Variables**:
    Add the following variable so the frontend knows where the backend is:
    *   `VITE_API_URL`: Paste the **Backend URL** from Part 1 (e.g., `https://trackmate-backend.onrender.com`). Ensure no trailing slash (Use `https...com` not `https...com/`).

5.  **Rewrite Rules (Critical for React/Vite)**:
    Since this is a Single Page App (SPA), you need to redirect all traffic to `index.html`.
    *   Go to **Redirects/Rewrites** tab (or check Advanced Settings).
    *   Add a Rule:
        *   **Source**: `/*`
        *   **Destination**: `/index.html`
        *   **Action**: `Rewrite`

6.  Click **Create Static Site**.
    *   Wait for the build.
    *   **Copy the Frontend URL** (e.g., `https://trackmate-frontend.onrender.com`).

---

## Part 3: Final Configuration

1.  Go back to your **Backend Service** on Render.
2.  Go to **Environment Variables**.
3.  Add/Update `CLIENT_URL` to match your **Frontend URL** (e.g., `https://trackmate-frontend.onrender.com`).
    *   *Note: This is used for CORS security to allow the frontend to talk to the backend.*
4.  **Manual Redeploy** the Backend (or it might auto-restart when you save variables).

---

## 🎉 Verification

1.  Open your **Frontend URL** on your phone or laptop.
2.  Log in.
3.  The dashboard should load, and it should successfully connect to the socket (check the "Socket: Connected" status in debug panels).
