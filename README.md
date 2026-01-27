# TrackMate - Real-Time School Bus Tracking System

> **Next-Gen Campus Transit Logic: Real-Time, Predictive, and "God Mode" Enabled.**

TrackMate is a modern, full-stack progressive web application (PWA) designed to solve the chaos of school bus tracking. It avoids the pitfalls of laggy GPS by implementing intelligent smoothing, real-time socket simulation known as "God Mode," and a sophisticated admin "Route Lab" for managing transit networks.

![Driver Dashboard](Screenshots/driver_dash.png)

## 🚀 Key Features

* **⚡ "God Mode" Simulation**: Drivers can toggle a simulation loop that mimics real GPS movement or "teleport" instantly by clicking a map location. Critical for testing without driving a bus.
* **🚨 SOS Panic System**: Instant emergency broadcasting. Drivers can trigger a "Bus Breakdown" or "Emergency" alert that overrides all student screens with a red warning modal and pushes a high-priority system notification.
* **🗣️ Voice Announcements**: Accessibility-first design. Students can tap the speaker icon to hear real-time status: *"Bus is arriving in 2 minutes at 45 km/h"*.
* **🧠 Intelligent ETA Engine**: The backend (`locationController.js`) uses OSRM for precise routing but falls back to "crow-flies" logic if the routing server times out (>1.5s), ensuring zero lag for end-users.
* **🧪 Route Lab**: A powerful Admin interface built with **React Portals** and **@dnd-kit**. Administrators can draw routes on the map and drag-and-drop stops in the sidebar to reorder them in real-time.
* **📴 Offline-First PWA**: A custom Service Worker (`sw.js`) ensures students receive "Bus Arrived" and "SOS" push notifications even when the app is closed or the phone is locked. No more "silent failures."

## 🛠️ Technology Stack

* **Frontend**: React (Vite), Leaflet (Maps), @dnd-kit (Drag & Drop), Socket.io-client.
* **Backend**: Node.js, Express, MongoDB (Mongoose).
* **Real-Time**: Socket.io (Bi-directional low-latency communication).
* **Mobile**: PWA (Manifest + Service Worker) for installable app-like experience.

## 🏁 Quick Start

### Prerequisites

* Node.js (v18+)
* MongoDB (Local or Atlas URI)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/trackmate.git
cd trackmate
```

### 2. Backend Setup

```bash
cd backend
npm install
# Create .env according to the template below
npm run dev
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

The app should now be running at `http://localhost:5173` (Frontend) and `http://localhost:5000` (Backend).

## 🔑 Environment Variables (.env.example)

Create a `.env` file in the `backend/` directory:

```properties
PORT=5000
MONGO_URI=mongodb://localhost:27017/trackmate
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
VAPID_PUBLIC_KEY=your_web_push_public_key
VAPID_PRIVATE_KEY=your_web_push_private_key
```

## 📸 Screenshots

| Driver Simulation | Route Lab | Student View |
|:---:|:---:|:---:|
| ![Driver Sim](Screenshots/god_mode.png) | ![Route Lab](Screenshots/route%20table.png) | ![Mobile View](Screenshots/student_mobile1.jpg) |

## 👤 User Accounts

### Default Admin Account

On first login, the system auto-creates a default admin:

| Username | Password | Role |
|----------|----------|------|
| `ad1` | `ad1` | Admin |

> Just try logging in with `ad1/ad1` and the account will be created automatically.

### User Registration

Students can self-register via the login page:

1. Click **"Create Account"** on the login page
2. Enter name, username (roll number), and password
3. Click **Create Account** → Auto-login to student dashboard

> **Note:** Only student accounts can self-register. Admin and Driver accounts must be created by administrators.

### Profile Management

Students can update their profile including:
* **Name and Phone**
* **Bus Assignment** - Select their assigned bus
* **Stop Selection** - Choose their pickup/drop-off stop
* **Push Notification Preferences** - Customize proximity alerts

## 🔐 Role-Based Access

| Role | Access |
|------|--------|
| **Admin** | Full access: Route Designer, Bus Management, Fleet Map, Analytics |
| **Driver** | Dashboard, Trip Start/End, SOS, Simulation Mode |
| **Student** | Dashboard, ETA, Notifications, Profile Settings |
