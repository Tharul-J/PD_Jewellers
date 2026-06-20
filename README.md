# PD Jewellers — Premium Bespoke Fine Jewelry & Custom 3D Studio

PD Jewellers is an elegant, premium e-commerce platform dedicated to showcasing and configuring fine luxury jewelry. Combining a highly-polished, Asian-inspired aesthetic with state-of-the-art interactive 3D rendering and Augmented Reality (AR), this full-stack application allows users to preview luxury collections, customize bespoke jewelry pieces in real time, and request atelier inquiries.

---

## 💎 Core Highlights & Features

### 1. Custom 3D Configurator
*   **Real-time 3D Rendering**: Built using **Three.js** and **React Three Fiber (R3F)** for high-fidelity materials, lighting, and ambient jewelry reflection.
*   **Bespoke Options**:
    *   **Style**: Solitaire, Three-Stone Princess, Vintage Twist, Classic Engraved, and Braided Bands.
    *   **Metals**: Platinum, Yellow Gold, White Gold, and Rose Gold.
    *   **Center Stones**: Diamond, Sapphire, Ruby, Emerald, and Aquamarine.
    *   **Custom Engraving**: Configurable 3D text engraving rendered on the metal band with font pairings.
*   **AR Try-On Integration**: Supports WebXR (`@react-three/xr`) for seamless, device-level augmented reality visualization of jewelry designs.

### 2. High-Fidelity Shopping & Inquiry Services
*   **Bespoke Order/Inquiry Flow**: Users build their dream design and submit inquiry requests. Costs are displayed in Sri Lankan Rupees (Rs.).
*   **Real-Time Status Tracking**: Customers can log in to view their active inquiries on a multi-stage timeline:
    `Pending Review` ➔ `Availability Confirmed` ➔ `Crafting` ➔ `Collection / Handover`.
*   **Exquisite Aesthetic**: Responsive modern grid layouts with classic serif typography pairings (*Playfair Display* and *Montserrat*), gold accent colorways, and bespoke micro-interactions.

### 3. Comprehensive Admin Dashboard
*   Authorized managers can log in to:
    *   Track active inquiries via inquiry codes (e.g., `INQ-4209`).
    *   Approve, modify, or decline workshop slot requests.
    *   Adjust gold/platinum rates, stone pricing dynamics, and handcraft overhead parameters dynamically.

---

## 🛠️ Technology Stack

*   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion (formerly Framer Motion), React Router v7.
*   **3D / Graphics**: Three.js, React Three Fiber, React Three Drei, `@react-three/xr`.
*   **Backend**: Node.js, Express, Custom CommonJS compilation with `esbuild`.
*   **Database & Auth**: MongoDB (Mongoose ODM), JWT-based stateless session authentication, Bcrypt.js password hashing.
*   **Icons & Assets**: Lucide React.

---

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) v18.0.0 or higher.
*   [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas cloud connection string).

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/pd-jewellers.git
    cd pd-jewellers
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory and populate it with your MongoDB connection string and JWT signature secret. Use `.env.example` as a template:
    ```env
    MONGODB_URI=mongodb://localhost:27017/pd_jewellers
    JWT_SECRET=your_jwt_private_key_secret_here
    ```

4.  **Seed Initial Products (Optional)**
    Run the seed script to populate products, precious stones, and pricing matrices:
    ```bash
    npx tsx seeder.ts
    ```

---

## 💻 Running the Application

### Development Mode
Boot the API server and Vite client concurrently in development mode:
```bash
npm run dev
```
Open your browser to `http://localhost:3000` to preview the app.

### Production Build & Deployment
For cloud scaling, container ingress, or general production hosting, the backend compiles into a pre-bundled CommonJS format via `esbuild` to eliminate Node relative-path ESM errors:

1.  **Build the application**:
    ```bash
    npm run build
    ```
    This bundles the static client assets via Vite and packages the unified Express server into `dist/server.cjs`.

2.  **Start the production server**:
    ```bash
    npm run start
    ```

---

## 📂 Project Structure

```text
├── src/                    # Frontend client code
│   ├── components/         # Shared micro-components (Cart drawer, Nav, StyleQuiz)
│   ├── context/            # Auth, Cart, and Wishlist context providers
│   ├── pages/              # Primary view templates (Home, Configurator, Admin, Profile)
│   ├── types.ts            # Shared global TypeScript types and interfaces
│   ├── main.tsx            # Main Web App entry point
│   └── index.css           # Global custom CSS incorporating Tailwind layers
├── server/                 # Database schemas, controller logic, and API routes
├── server.ts               # Express entry point & middleware manager
├── vite.config.ts          # Vite configuration
└── package.json            # Scripts and package manifests
```

---

## 🔒 Security & Optimization Guidelines
*   **Lazy SDK Loading**: Integrates on-demand initializing of database/security utilities to avoid system startup crashes.
*   **Exposed Variables**: API keys or sensitive credentials remain safely isolated on the Node server. Only browser-safe configuration parameters are packaged with the client bundle.
