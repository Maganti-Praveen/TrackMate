# TrackMate — Smart Bus Tracking System

Full-stack MERN application that enables school admins, drivers, and students to collaborate around realtime bus tracking, ETA computation, and push notifications.

## Tech Stack

- **Backend**: Node.js, Express, MongoDB, Mongoose, Socket.IO, JWT (no hashing, per spec)
- **Frontend**: React + Vite, React Router, Axios, Tailwind CSS, Leaflet/OpenStreetMap, Socket.IO client
- **Notifications**: Service Worker stub + Notification API

## Features

### Admin
- Manage buses, drivers, routes, stops, and student assignments
- View active trips and stop event history

### Driver
- Mobile-first dashboard with trip start/end, GPS streaming, and stop event buttons
- Push "approaching stop" trigger

### Student
- Login via roll number, see assigned bus/stop
- Live map tracking, ETA refresh, and notification opt-in

## Project Structure

```
root
├─ backend
│  ├─ config / controllers / models / routes / middleware / utils
│  ├─ server.js
│  ├─ .env (sample included)
├─ frontend
│  ├─ public (PWA assets + service worker)
│  └─ src (components, pages, context, hooks, utils)
├─ README.md
└─ .gitignore
```

## Environment

The backend `.env` contains the provided MongoDB Atlas URL, default database name, JWT secret, and client origin.

```
PORT=5000
MONGO_URI=...
DB_NAME=TrackMatev1
JWT_SECRET=trackmate-demo-secret
CLIENT_URL=http://localhost:5173
DEFAULT_ETA_MINUTES=2
```

## Running the Backend

```bash
cd backend
npm install
npm run dev
```

The server runs at `http://localhost:5000`, connects to MongoDB Atlas, and starts Socket.IO.

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves the React client at `http://localhost:5173`.

## Testing Flow

1. **Login** using default accounts:
   - Admin: `ad1 / ad1`
   - Driver: `dr1 / dr1`
   - Student: use assigned roll number (created via admin panel).
2. **Admin dashboard** — create buses/routes/stops, assign students.
3. **Driver dashboard** — start trip, enable GPS streaming (browser geolocation), mark stop events.
4. **Student dashboard** — subscribe to bus room automatically, view live map and ETA, enable notifications.
5. **Socket.IO** — verify realtime location & event updates appear on admin/student screens.

## Deployment Notes

- Frontend: add `vercel.json` (see repository root) and deploy via Vercel.
- Backend: deploy to Render/Node provider; ensure environment variables mirror `.env` and `CLIENT_URL` includes deployed frontend URL.

## Sample Accounts

| Role    | Username  | Password |
| ------- | --------- | -------- |
| Admin   | `ad1`     | `ad1`    |
| Driver  | `dr1`     | `dr1`    |
| Student | Roll No   | Same as roll number |

Use the admin UI to add more drivers/students as needed.
