# PD Jewellers — Codebase Map

A reference map of the repository for contributors: architecture, folder layout, a file-by-file index, feature-to-file mapping, entry points, and data models.

---

## 1. Architecture overview

PD Jewellers is a MERN application: a Vite/React SPA in `src/` talks to an Express + Mongoose API defined in `server.ts` and `server/`. In development, Vite (port 3000) proxies `/api` and `/uploads` requests to the Express API (port 3001) — see `vite.config.ts`. In production there is no separate API host: `npm run build` compiles the SPA into `dist/` and bundles `server.ts` into `dist/server.cjs` via esbuild, and the single Express process (`npm start`) serves the built static assets, the SPA fallback route, `/uploads`, and all `/api/*` routes together. This means the whole app deploys as **one Render Web Service** (confirmed by `package.json`'s `build`/`start` scripts and the `NODE_ENV === "production"` static-serving branch in `server.ts`), with MongoDB Atlas as the external database and Cloudinary/Gmail SMTP as external services.

---

## 2. Folder guide

| Folder | Role |
|---|---|
| `src/` | React SPA (Vite, TypeScript, Tailwind v4, React Router) |
| `src/pages/` | Route-level page components (one per URL route in `App.tsx`) |
| `src/components/` | Reusable UI components shared across pages |
| `src/components/admin/` | Admin-dashboard-specific components (market rates, export, highlights) |
| `src/components/ui/` | Small generic UI primitives (currently just Toast) |
| `src/context/` | React Context providers for cross-cutting client state (auth, cart, wishlist, pricing, toasts) |
| `src/hooks/` | Reusable stateful hooks (notifications, market rates, categories, admin guard, toast) |
| `src/lib/` | Framework-agnostic client helpers (pricing formatting, SKU parsing, category normalization, polling guard, dashboard export, 1€ filter) |
| `src/utils/` | Small utility modules (GLB model prefetch/load) |
| `src/data/` | Static/mock product catalog used as an offline fallback |
| `src/constants.ts` | Metal/stone/font definitions shared by the 3D configurator and AR try-on |
| `server/` | Express + Mongoose backend |
| `server/routes/` | Express route definitions, one file per resource, mounted in `server.ts` |
| `server/controllers/` | Request-handling logic for the larger resources (users, orders, products, purchases, models, blog) |
| `server/models/` | Mongoose schemas |
| `server/middleware/` | Express middleware (JWT auth / admin guard) |
| `server/utils/` | Backend helpers (Cloudinary upload, GLB compression, Nodemailer, notifications, sort order) |
| `scripts/` | One-off/maintenance Node scripts run via `tsx` (data backfills, migrations, font conversion) |
| `public/` | Static assets served as-is (GLB models, fonts, images, banners) |
| `uploads/` | Local disk storage for user-uploaded files (product images, custom GLBs) not yet migrated to Cloudinary |
| `docs/` | Project documentation (this file) |

---

## 3. File index

### `src/` root

| File | What it does |
|---|---|
| `src/App.tsx` | Root component: wraps the app in `ToastProvider` → `AuthProvider` → `WishlistProvider` → `CartProvider` → `PricingProvider` → `Router`, and declares all React Router routes (including `ProtectedRoute`/`AdminRoute` guards) with page-transition animations via `motion`. |
| `src/main.tsx` | Vite/React entry point — mounts `<App />` into `#root` inside `StrictMode`. |
| `src/constants.ts` | `METALS`, `STONES`, `FONTS` definitions (PBR material properties + offline-fallback zero prices) used by the configurator, AR try-on, and pricing fallback. |
| `src/index.css` | Tailwind v4 entry (`@import "tailwindcss"`), Google Fonts import, `@theme` custom properties (brand colors/fonts), and small global utility classes. |
| `src/data/products.ts` | `MOCK_PRODUCTS` — the static product catalog served when MongoDB is unreachable. |

### `src/pages/`

| File | What it does |
|---|---|
| `AboutUs.tsx` | Static "About" page with an image hero slider and company info. |
| `Admin.tsx` | Admin dashboard: tabs for products, orders, users, models, pricing, blog, reviews; wires up `useMarketRates`, `MarketRateCard`, `GoldPriceChart`, `DashboardHighlights`, `ExportDashboardButton`. |
| `Blog.tsx` | Public blog listing/detail page, fetches posts from `/api/blog`. |
| `Collections.tsx` | Product catalog/grid with category tabs, search, cart/wishlist actions, and the `StyleQuiz`-driven budget/category filter. |
| `Configurator.tsx` | The 3D ring/pendant configurator: R3F canvas, metal/stone/engraving pickers, live pricing via `PricingContext`, and the AR try-on entry point. |
| `ForgotPassword.tsx` | Requests a password-reset email. |
| `Home.tsx` | Landing page: hero slider, featured product carousel, testimonials. |
| `Inquiry.tsx` | Cart checkout/inquiry submission page (pre-payment step). |
| `Login.tsx` | Login form. |
| `Materials.tsx` | Static informational page about metals/gemstones used. |
| `PaymentPage.tsx` | Simulated card payment for a confirmed inquiry, creates a `Purchase`. |
| `ProductDetail.tsx` | Single product page: 3D preview (for configurable products), reviews, wishlist/cart actions. |
| `Profile.tsx` | Customer account page: saved designs, wishlist, order history, profile editing. |
| `Register.tsx` | Signup form. |
| `ResetPassword.tsx` | Consumes a reset token to set a new password. |

### `src/components/`

| File | What it does |
|---|---|
| `ARTryOnModal.tsx` | Camera-based AR try-on modal: MediaPipe hand/face landmark tracking, R3F overlay of the ring/pendant model on the live video feed, screenshot capture. |
| `AdminActionWarning.tsx` | Modal warning shown when an admin account attempts a customer-only action (cart/wishlist/checkout). |
| `Cart.tsx` | Slide-out cart drawer: line items, quantities, recent submitted inquiries. |
| `DuplicateInquiryWarning.tsx` | Modal warning when adding an item already present in an open inquiry. |
| `Footer.tsx` | Site footer (static). |
| `ImageSlider.tsx` | Generic auto-rotating image carousel. |
| `InitialsAvatar.tsx` | Renders a colored initials avatar when no profile picture is set. |
| `InquiryItemThumbnail.tsx` | Thumbnail for a cart/order line item, with fallback for custom (photo-less) designs and dead image URLs. |
| `InquiryMessages.tsx` | Threaded message view between customer and admin for a single order/inquiry. |
| `Layout.tsx` | App shell: Navbar, Footer, Cart drawer, StyleQuiz trigger, offline-DB banner, scroll-to-top. |
| `LoadingSpinner.tsx` | Branded loading spinner. |
| `Navbar.tsx` | Top navigation bar: nav links, cart icon, notifications, auth state, mobile menu. |
| `NotificationBadge.tsx` | Small unread-count badge. |
| `PasswordInput.tsx` | Password `<input>` with a show/hide eye toggle. |
| `PendantModel.tsx` | R3F pendant geometry + engraved text-tag rendering (Text3D from a loaded font). |
| `ProductCarousel.tsx` | Horizontal product carousel used on the homepage. |
| `ProductReviews.tsx` | Star-rating review list + submission form for a single product. |
| `ProfilePictureUpload.tsx` | Avatar upload widget (validates size/type, uploads to Cloudinary via the API). |
| `RingModels.tsx` | R3F ring geometry loader (`CustomGLBRingModel`) with an error boundary fallback. |
| `Scene3DErrorBoundary.tsx` | React error boundary shown when a 3D asset fails to load. |
| `SizeGuideModal.tsx` | Ring size reference chart modal. |
| `StyleQuiz.tsx` | 5-step "Find Your Style" quiz that redirects to `Collections` with category/budget query params. |

### `src/components/admin/`

| File | What it does |
|---|---|
| `DashboardHighlights.tsx` | Top-viewed / top-wishlisted / top-configurator-style cards for the admin dashboard. |
| `ExportDashboardButton.tsx` | Dropdown button triggering PDF or CSV dashboard export. |
| `GoldPriceChart.tsx` | 7-day gold price sparkline/bar chart, fed by `useMarketRates`. |
| `MarketRateCard.tsx` | Live gold price / USD-LKR rate card with 22k/24k sovereign conversions. |

### `src/components/ui/`

| File | What it does |
|---|---|
| `Toast.tsx` | Toast notification stack renderer (success/error/info variants). |

### `src/context/`

| File | What it does |
|---|---|
| `AuthContext.tsx` | User session state, login/register/logout, saved-card management, JWT persistence. |
| `CartContext.tsx` | Cart line items (variant-keyed), quantity updates, inquiry submission tracking. |
| `PricingContext.tsx` | Fetches/holds live metal & stone pricing from `/api/pricing`, merges with `constants.ts` material props, exposes `findCatalogEntry` for legacy-key translation. |
| `ToastContext.tsx` | Wraps `useToast` + `ToastContainer` into a context provider. |
| `WishlistContext.tsx` | Wishlist state, synced to the user's account via the API. |

### `src/hooks/`

| File | What it does |
|---|---|
| `useAdminGuard.ts` | Blocks a customer-only action for admin accounts and shows `AdminActionWarning`. |
| `useCategories.ts` | Derives the shared product category list from live products + admin-added categories (localStorage-persisted). |
| `useMarketRates.ts` | Fetches live gold spot price (`xaus.com`), USD→LKR FX rate (`open.er-api.com`), and 7-day gold history; session-caches results for 15 minutes. |
| `useNotifications.ts` | Polls `/api/notifications`, merges by id, pauses while an overlay is open. |
| `useToast.ts` | Toast queue state (add/dismiss, max visible, auto-dismiss timer). |

### `src/lib/`

| File | What it does |
|---|---|
| `categories.ts` | Category name normalization and localStorage read/write for admin-added categories. |
| `dashboardExport.ts` | Builds the admin dashboard PDF (`jspdf` + `html2canvas-pro`) and CSV export payloads. |
| `hooks.ts` | `useScrollToTop` — scrolls to top on route change. |
| `oneEuro.ts` | One Euro Filter implementation for smoothing noisy AR hand/face landmark data. |
| `pollGuard.ts` | Shared "pause polling while an overlay/modal is open" mechanism used by notification and other pollers. |
| `price.ts` | Price formatting helpers (`formatPrice`, `formatIndicative`, `formatEstimate`, `formatExact`) and the "indicative pricing" disclaimer text. |
| `sku.ts` | `skuOf()` — extracts the base product SKU from a variant-encoded cart/order id. |
| `utils.ts` | `cn()` class-merge helper (clsx + tailwind-merge) and `timeAgo()` relative-time formatter. |

### `src/utils/`

| File | What it does |
|---|---|
| `modelLoader.ts` | `useLoadedModel` / `prefetchModel` — wraps `useGLTF` for GLB loading and prefetching. |

### `server.ts` (root)

Backend entry point. Sets DNS to prefer IPv4, builds the Express app, configures CORS (`FRONTEND_URL`), connects to MongoDB with a 5-attempt retry loop (falling back to per-controller mock data if all attempts fail), drops two stale `Review` indexes on boot, mounts all `/api/*` routers, serves `/uploads` as static files, and — in production — serves the built `dist/` SPA with cache headers tuned per asset type (`index.html` no-cache, hashed assets immutable, `.glb` files a 1-week cache) plus a catch-all SPA fallback route.

### `server/routes/`

| File | What it does |
|---|---|
| `adminRoutes.ts` | Admin dashboard aggregate endpoints: top-viewed/wishlisted/configurator-style highlights, dashboard stats. |
| `blogRoutes.ts` | CRUD for blog posts (admin-only writes). |
| `configRoutes.ts` | `GET/PATCH /api/config/configurator-status` — the configurator kill switch. |
| `messageRoutes.ts` | Admin-to-user messaging/announcements. |
| `modelRoutes.ts` | CRUD + status toggle for `ConfigurableModel` (the GLBs offered in the configurator). |
| `notificationRoutes.ts` | Fetches/marks-read user & admin notifications. |
| `orderRoutes.ts` | Order/inquiry lifecycle: create, list (mine/all), status update, cancel, delete, in-order messaging. |
| `pricingRoutes.ts` | Get/update the live `Pricing` document (metals, stones, upgrades, engraving price); seeds Phase-2 defaults. |
| `productRoutes.ts` | Product catalog CRUD + `/featured`. |
| `purchaseRoutes.ts` | Creates a `Purchase` from a confirmed order (payment), lists purchases. |
| `reviewRoutes.ts` | Site and product review CRUD/approval. |
| `uploadRoutes.ts` | Multer-based file upload endpoint (GLB models) with type validation, compression, and Cloudinary upload. |
| `userRoutes.ts` | Auth (login/register/reset), profile, profile picture, saved card, wishlist, saved configurations, admin user management. |

### `server/controllers/`

| File | What it does |
|---|---|
| `blogController.ts` | Blog CRUD handlers plus `seedBlogPosts()` (called once at boot). |
| `modelController.ts` | `ConfigurableModel` CRUD, local-GLB seeding (`LOCAL_RING_SEEDS`) and Cloudinary cleanup on delete. |
| `orderController.ts` | Order/inquiry state machine (pending → ... → completed/declined), triggers transactional emails and notifications at each transition. |
| `productController.ts` | Product CRUD, mock-mode fallback to `MOCK_PRODUCTS`, SKU prefixing per category. |
| `purchaseController.ts` | Payment/purchase creation tied to a confirmed order, receipt email, admin/user notifications. |
| `userController.ts` | Auth (JWT issue/verify), registration, profile/password/card/wishlist/saved-configuration management, password reset flow, mock-mode fallback stores. |

### `server/models/`

See section 6 (Data models).

### `server/middleware/`

| File | What it does |
|---|---|
| `authMiddleware.ts` | `protect` (verifies JWT from the `Authorization` header, attaches `req.user`) and `admin` (requires `role === 'administrator'`). |

### `server/utils/`

| File | What it does |
|---|---|
| `cloudinaryStorage.ts` | Cloudinary config + upload/delete helpers for GLB files and images. |
| `compressGlb.ts` | Meshopt-based GLB compression pipeline (`@gltf-transform`) with fail-safe passthrough. |
| `email.ts` | Nodemailer/Gmail SMTP transport + all transactional email templates (order lifecycle, password reset, receipts, admin messages). |
| `notify.ts` | Creates `Notification` documents for users/admins. |
| `sort.ts` | `newestFirst()` — sorts mock/fallback payloads to match live-DB ordering. |

### `scripts/`

| File | What it does |
|---|---|
| `backfillProductWeight.ts` | One-shot: parses gram weight out of product description text into the numeric `Product.weight` field. |
| `convert-font.cjs` | Converts a TTF/OTF font to Three.js typeface JSON (for `Text3D` engraving fonts). |
| `deletePricingLegacyDoc.ts` | One-off: removes the pre-migration flat-field `Pricing` document, with a JSON backup safeguard. |
| `migrate-glb-local.ts` | One-shot: migrates `ConfigurableModel` GLBs from Cloudinary to local `public/glb-models/`, dry-run by default. |

---

## 4. Feature-to-file map

**3D configurator (React Three Fiber, GLB loading)**
- `src/pages/Configurator.tsx` (R3F `Canvas`, `OrbitControls`, `ContactShadows`)
- `src/components/RingModels.tsx`, `src/components/PendantModel.tsx`
- `src/utils/modelLoader.ts` (GLB loading/prefetch via `useGLTF`)
- `src/constants.ts` (metal/stone/font material properties)
- `server/models/ConfigurableModel.ts`, `server/controllers/modelController.ts`, `server/routes/modelRoutes.ts` (which GLBs are offered)
- `server/utils/compressGlb.ts`, `server/utils/cloudinaryStorage.ts`, `server/routes/uploadRoutes.ts` (GLB upload pipeline)
- `scripts/migrate-glb-local.ts`, `scripts/convert-font.cjs`

**AR try-on (rings + pendants, MediaPipe)**
- `src/components/ARTryOnModal.tsx` (`HandLandmarker`, `FaceLandmarker`, `FilesetResolver` from `@mediapipe/tasks-vision`; R3F overlay canvas)
- `src/lib/oneEuro.ts` (landmark smoothing)
- `src/lib/pollGuard.ts` (`useOverlayGuard`, pauses background polling while the AR modal is open)
- Invoked from `src/pages/Configurator.tsx` and `src/pages/ProductDetail.tsx`

**Admin dashboard + live gold market rates**
- `src/pages/Admin.tsx` (dashboard shell/tabs)
- `src/hooks/useMarketRates.ts` (fetches `xaus.com` spot price + `open.er-api.com` FX, session-cached)
- `src/components/admin/MarketRateCard.tsx`, `src/components/admin/GoldPriceChart.tsx`, `src/components/admin/DashboardHighlights.tsx`
- `server/routes/adminRoutes.ts` (highlight/stat aggregate endpoints)

**Product catalog + inquiry/cart**
- `src/pages/Collections.tsx`, `src/pages/ProductDetail.tsx`
- `src/context/CartContext.tsx`, `src/components/Cart.tsx`
- `src/pages/Inquiry.tsx`, `src/pages/PaymentPage.tsx`
- `src/data/products.ts` (offline mock catalog)
- `server/models/Product.ts`, `server/controllers/productController.ts`, `server/routes/productRoutes.ts`

**Order management**
- `src/pages/Profile.tsx` (order history), `src/components/InquiryMessages.tsx`
- `server/models/Order.ts`, `server/controllers/orderController.ts`, `server/routes/orderRoutes.ts`
- `server/models/Purchase.ts`, `server/controllers/purchaseController.ts`, `server/routes/purchaseRoutes.ts` (payment/purchase step)
- `server/utils/notify.ts`, `server/utils/email.ts` (status-change notifications/emails)

**User profiles (saved designs, wishlist)**
- `src/pages/Profile.tsx`
- `src/context/WishlistContext.tsx`
- `server/models/User.ts` (`wishlist`, `savedConfigurations` subdocuments)
- `server/controllers/userController.ts` (`toggleWishlistItem`, `saveConfiguration`, `deleteConfiguration`), `server/routes/userRoutes.ts`

**Auth**
- `src/context/AuthContext.tsx`, `src/pages/Login.tsx`, `src/pages/Register.tsx`, `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`
- `server/models/User.ts` (bcrypt password hashing)
- `server/controllers/userController.ts` (`authUser`, `registerUser`, `forgotPassword`, `resetPassword`, JWT signing)
- `server/middleware/authMiddleware.ts` (`protect`, `admin`)

**Transactional email (Nodemailer)**
- `server/utils/email.ts` (Gmail SMTP transport + all templates: order lifecycle, password reset, payment receipt, admin messages)
- Called from `server/controllers/orderController.ts`, `server/controllers/purchaseController.ts`, `server/controllers/userController.ts`, `server/routes/messageRoutes.ts`

**Shop reviews**
- `src/components/ProductReviews.tsx`
- `server/models/Review.ts` (site vs. product reviews, partial unique indexes)
- `server/routes/reviewRoutes.ts`
- `src/lib/sku.ts` (`skuOf`, shared with `server/routes/reviewRoutes.ts` for SKU-based product review lookup)

**Configurator kill switch**
- `server/models/SiteConfig.ts` (`configuratorEnabled` boolean)
- `server/routes/configRoutes.ts` (`GET/PATCH /api/config/configurator-status`, fails open if DB is down)
- `src/pages/Configurator.tsx` (polls the status and blocks access when disabled)
- `src/pages/Admin.tsx` (admin toggle control)

**Dashboard export (PDF/CSV)**
- `src/lib/dashboardExport.ts` (`jspdf` + `html2canvas-pro` PDF build, CSV row generation)
- `src/components/admin/ExportDashboardButton.tsx`
- Wired into `src/pages/Admin.tsx`

**"Find Your Style" quiz / budget filter**
- `src/components/StyleQuiz.tsx` (5-step quiz, builds category/budget query params and navigates)
- `src/pages/Collections.tsx` (reads those query params to pre-filter category and price range)
- `src/hooks/useCategories.ts` (supplies the live category list to the quiz's first step)

All eleven features above have concrete file coverage; none required inventing a path.

---

## 5. Config + entry points

**Frontend entry** — `src/main.tsx` mounts `<App />` (wrapped in `StrictMode`) into `#root` and imports the global stylesheet `src/index.css`. `src/App.tsx` sets up the provider stack (`ToastProvider` → `AuthProvider` → `WishlistProvider` → `CartProvider` → `PricingProvider`) around a `react-router-dom` `BrowserRouter`, defines `ProtectedRoute` (requires login) and `AdminRoute` (requires `role === 'administrator'`) wrappers, and declares every page route with animated (`motion/react`) transitions.

**Vite config** (`vite.config.ts`) — plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`. Path alias `@` → repo root. `three` and `@mediapipe/tasks-vision` are excluded from dependency pre-bundling (large ESM libraries); `@react-three/xr` is deliberately *not* excluded because it needs CJS pre-bundling. Dev server runs on port 3000 and proxies `/api` and `/uploads` to `http://localhost:3001`. HMR can be disabled via `DISABLE_HMR`.

**Tailwind config** — no `tailwind.config.js`; Tailwind v4 is configured entirely inline in `src/index.css` via `@import "tailwindcss" source(".")` and an `@theme` block defining brand fonts/colors (`--color-gold`, `--color-ink`, `--color-paper`, etc.).

**Backend entry** (`server.ts`) — builds the Express app, applies `cors` (origin from `FRONTEND_URL`) and `express.json()`, connects to MongoDB via `mongoose.connect` with a 5-attempt retry loop and automatic reconnect handling, runs `seedBlogPosts()` and drops two legacy `Review` indexes once connected, mounts all API routers under `/api/*`, serves `/uploads` statically, and in production serves the built SPA from `dist/` with per-asset-type cache headers plus a catch-all `index.html` fallback.

**Routing setup** — Express routes are mounted in `server.ts` (one `app.use('/api/<resource>', ...)` per router in `server/routes/`). Client-side routing is `react-router-dom` v7, declared as nested `<Route>` elements inside `src/App.tsx` under a single `Layout` route.

**DB connection** — `mongoose.connect(MONGO_URI, ...)` happens once, in `server.ts`'s `startServer()`, guarded by `if (process.env.MONGODB_URI)`; controllers check `mongoose.connection.readyState !== 1` to decide whether to fall back to in-memory mock data.

**Env var names referenced in code** (names only):
- `PORT`
- `NODE_ENV`
- `FRONTEND_URL`
- `MONGODB_URI`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `JWT_SECRET`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `DISABLE_HMR`

---

## 6. Data models

All under `server/models/`, using Mongoose.

| Model | Purpose |
|---|---|
| `User.ts` | Customer/admin accounts — credentials (bcrypt-hashed password), role (`customer`/`administrator`), profile info, embedded `wishlist` and `savedConfigurations` (configurator designs) subdocuments, a masked `savedCard` (no CVV/PAN), and password-reset token fields. |
| `Product.ts` | Catalog items — SKU-style `id`, price, category, image, description, karatage, metal weight (grams), view count. |
| `Order.ts` | An inquiry/order — line items (with configurator `options` for custom pieces), shipping address, total price, a one-directional lifecycle `status` enum, and an embedded customer↔admin `messages` thread. |
| `Purchase.ts` | A completed payment against a confirmed order — masked card info, amount, immutable `paymentStatus`. |
| `Review.ts` | Site-wide or per-product reviews — rating/title/text, `approved` flag, partial unique indexes enforcing one product review per (user, product) and one site review per user. |
| `Message.ts` | Admin-authored messages/announcements to one or many recipients, with per-recipient `readBy` tracking. |
| `Notification.ts` | In-app notifications for a user or admin — type, message, link, read flag. |
| `BlogPost.ts` | Blog articles — title, category, excerpt, cover/gallery images, content, slug, publish date. |
| `ConfigurableModel.ts` | A GLB model offered in the 3D configurator — name, GLB URL, category, base price, weight, active flag. |
| `Pricing.ts` | The single live pricing document — arrays of metals (LKR/gram), stones, and configurator upgrades, plus the engraving price; schemas are `strict: false` to tolerate legacy flat fields during migration. |
| `SiteConfig.ts` | Site-wide settings — currently just the `configuratorEnabled` kill switch. |

---
