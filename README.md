# ChessMaster ♟️

A premium, full-stack chess platform built for high-performance gameplay and deep game analysis. Experience chess like never before with beautiful 3D animations, real-time multiplayer, and advanced game review features.

**Live Demo:** [chessmaster.live](https://chessmaster.live)

---

## 🌟 Key Features

- **🌐 Real-time Multiplayer**: Challenge friends or wait for an opponent with our custom matchmaking system powered by Socket.io.
- **🤖 Artificial Intelligence**: Play against various difficulty levels of AI directly in your browser.
- **👥 Social System**: Add friends, track their online status, and send instant game invites.
- **📊 Advanced Analytics**: Detailed game history and performance metrics with interactive charts.
- **🔍 Game Review**: Step through your past games with our analysis engine to identify blunders and brilliant moves.
- **📱 Cross-Platform**: Fully responsive web design and Capacitor-ready for mobile devices (iOS/Android).
- **✨ Premium UI/UX**: Smooth animations with Framer Motion and immersive 3D board effects using Three.js/Fiber.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS (v4)
- **State Management**: Zustand
- **Animations**: Framer Motion & Three.js/Fiber
- **Icons**: Lucide React
- **Drag & Drop**: React DnD

### Backend (Server)
- **Runtime**: Node.js
- **Framework**: Express (v5)
- **Real-time**: Socket.io
- **ORM**: Prisma (PostgreSQL)
- **Authentication**: JWT & Cryptographic hashing

### Infrastructure & Deployment
- **Frontend Hosting**: Vercel
- **Mobile Wrappers**: Capacitor

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [PostgreSQL](https://www.postgresql.org/) database instance

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shahed-akheer/chess.git
   cd chess
   ```

2. **Install dependencies:**
   ```bash
   # Install client dependencies
   npm install

   # Install server dependencies
   cd server
   npm install
   ```

3. **Configure Environment Variables:**
   - Create a `.env` file in the root directory for client-side configuration.
   - Create a `.env` file in the `server/` directory for backend configuration (Database URL, JWT secrets, etc.).
   
   > [!NOTE]
   > Ensure all necessary environment variables for authentication and database connection are set before running the server.

4. **Initialize Database:**
   ```bash
   cd server
   npx prisma db push
   ```

### Running Locally

To start both the client and server in development mode:
```bash
# From the root directory
npm run dev
```

The client will typically run on `http://localhost:5173` and the server on `http://localhost:3000`.

---

## 🏗️ Building for Production

### Web
```bash
npm run build
```

### Mobile (Android)
```bash
# Ensure you have the Android SDK installed
npx cap add android
npx cap sync
npx cap open android
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

