# PD Jewellers

A full-stack MERN e-commerce platform for a jewellery business, built as a university final-year project. Features a live 3D jewellery configurator and an AR try-on experience alongside standard e-commerce functionality.

**Live demo:** [LIVE_URL]

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS |
| 3D / AR | React Three Fiber, Three.js, MediaPipe (CDN) |
| Backend | Node.js, Express (TypeScript), esbuild |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Storage | Cloudinary (images + GLB models via `resource_type: raw`) |
| Email | Resend (transactional — order confirmation, password reset) |
| Hosting | Render (single-service: Express serves built React SPA) |

---

## Features

### Customer
- Browse products by category with image galleries
- **3D Jewellery Configurator** — customise rings and pendants (metal, stone, engraving, size, chain style) with live Three.js rendering; canvas snapshot thumbnails saved per design
- **AR Try-On** — overlay rings and pendants on a live camera feed using MediaPipe hand/pose landmarks
- Wishlist, Saved Designs, and My Inquiries with delete support
- Cart → checkout with a simulated payment gateway (dummy card flow)
- Order history (Purchased Items tab)
- Post/edit shop reviews (star rating + text)
- Real-time notification badges (polled every 5 s) for inquiry and order updates

### Admin
- Full product CRUD with Cloudinary image upload and progress bar
- 3D model management (GLB upload/replace via Cloudinary raw)
- Order management (Sold Items) with status updates
- User management and role assignment
- Inquiry management with collapsible cards and status lifecycle
- Review moderation (approve/reject; approved reviews feed "Stories of Radiance" card fan)
- Configurator kill switch (disables the 3D feature globally with a user-facing warning)
- Notification badges for incoming inquiries, new users, and sold items

---

## Project Structure

```
/
├── src/                  # React frontend (TypeScript)
│   ├── components/       # Shared UI + Three.js configurator + AR components
│   ├── pages/            # Route-level pages
│   ├── context/          # Auth, Cart, Wishlist contexts
│   └── utils/
├── server/               # Express backend (TypeScript)
│   ├── models/           # Mongoose schemas
│   ├── routes/           # REST API routes
│   └── middleware/       # Auth, error handling
├── server.ts             # Entry point — serves API + SPA in production
└── dist/                 # Built frontend (gitignored, generated at deploy)
```

---

## Environment Variables

Copy `.env.example` and fill in your own values:

```
MONGODB_URI=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
FRONTEND_URL=
PORT=3001
```

---

## Local Development

```bash
npm install
# Start both servers (Vite on :3000, Express on :3001)
npm run dev
```

---

## Deployment (Render)

Single Web Service — Express serves the built React SPA.

**Build command:**
```bash
npm install --include=dev && npm run build
```

**Start command:**
```bash
npm start
```

**Required env vars on Render dashboard:**
`NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `RESEND_API_KEY`, `FRONTEND_URL`

> MongoDB Atlas → Network Access → must allow `0.0.0.0/0` for Render to connect.  
> Free tier: service sleeps after ~15 min of inactivity. Wake it manually before a demo.

---

## Key Architectural Notes

- Single-origin deployment — no CORS complexity; all `/api/` calls and the SPA share one Render origin.
- `devDependencies` (Vite, esbuild) are needed at build time → `--include=dev` flag is required.
- GLB assets stored in Cloudinary with `resource_type: 'raw'`; fetched at runtime by the configurator.
- AR Try-On uses MediaPipe via CDN (version-pinned) for hand and pose landmark detection.
- Simulated payment gateway — no real payment processor integrated; dummy card `4242 4242 4242 4242` triggers the order flow.
- Notification polling runs at 5 s intervals with per-type badge counts; `markReadByType` clears badges on tab open.
