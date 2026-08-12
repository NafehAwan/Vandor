# Vandor — AI Travel Strategist & Intelligent Budget Architect

**Vandor** is a modern, high-performance travel itinerary and cost-estimation platform powered by high-throughput LLM inference and real-world travel market pricing algorithms. Designed for modern explorers, Vandor generates realistic day-by-day travel routes, accurate itemized expense breakdowns, and real venue highlights tailored to your trip style.
Live Link: https://vandor.netlify.app/
---

## Features

- **AI-Driven Itinerary Generation**: Powered by Groq's `llama-3.3-70b-versatile` model for real-time, grounded travel planning.
- **Real-World Price Research**: Itemized daily cost calculations covering accommodation, local culinary experiences, sightseeing tickets, and transit fares.
- **Exact Mathematical Subtotals**: Auto-calculated daily totals and category breakdowns with zero synthetic padding.
- **Trip Memory (Save & Manage)**: Save any generated itinerary to your personal memory, then view, delete, or re-export it later. Trips persist in browser storage for everyone and sync to **Firebase Cloud Firestore** across devices for signed-in users.
- **PDF Export**: Download any itinerary as a clean, multi-page PDF document (day-by-day plan, highlights, and full budget breakdown) with a single click — generated entirely client-side.
- **Share via Link**: Publish an itinerary to a shareable, unguessable URL backed by Firestore. Anyone with the `?trip=<id>` link can open a read-only view of the plan — no account required.
- **Firebase Authentication**: Secure Google OAuth authentication allowing users to persist custom trips to their profile.
- **Cloud Storage**: Automatic synchronization with Google Cloud Firestore database for saved trip history across devices.
- **Modern Visual Experience**: High-contrast dark canvas, responsive UI with video background fallbacks, and polished micro-interactions using Tailwind CSS and Lucide React icons.

---

##  Tech Stack

- **Frontend**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI Engine**: [Groq API](https://groq.com/) (Llama 3.3 70B Versatile)
- **Backend & Auth**: [Firebase Auth](https://firebase.google.com/docs/auth) & [Cloud Firestore](https://firebase.google.com/docs/firestore)
- **PDF Export**: [jsPDF](https://github.com/parallax/jsPDF) (client-side document generation)

---

##  Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher)
- **npm** or **bun** / **yarn**
- A **Groq API Key** (Get one at [console.groq.com](https://console.groq.com))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/vandor.git
   cd vandor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the project root:
   ```env
   # Optional: Groq API Key default fallback
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000` in your web browser.

---

##  API Key Configuration

Vandor allows users to bring their own **Groq API Key** directly in the interface or via environment variables:
1. Click the **API Key** badge in the top-right header or when generating a trip.
2. Paste your Groq API key (`gsk_...`).
3. Your key is stored locally in your browser session for privacy and security.

---

## 🧠 Trip Memory, PDF Export & Sharing

Vandor remembers your trips and lets you take them anywhere:

- **Save**: On any generated itinerary, click **Save Itinerary**. The trip is stored in your browser (`localStorage`) and — when signed in with Google — mirrored to Firestore under `users/{uid}/itineraries/{tripId}` so it follows you across devices.
- **Manage**: Open **My Saved Trips** from the profile menu to **View**, **Download PDF**, **Share**, or **Delete** each saved trip.
- **Export PDF**: Click **Download PDF** to generate a formatted, multi-page PDF of the itinerary locally in the browser (no server round-trip).
- **Share**: Click **Share Link** to publish a read-only copy to the public `shared/{shareId}` Firestore collection and copy a link like `https://vandor.netlify.app/?trip=share_...` to your clipboard. Opening that link loads the itinerary in a read-only shared view.

### Firestore Data Model

| Collection | Access | Purpose |
| --- | --- | --- |
| `users/{uid}` | owner only | User profile |
| `users/{uid}/itineraries/{tripId}` | owner only | Private saved trips |
| `shared/{shareId}` | public read, public immutable create | Shareable read-only itineraries |

Security rules are defined in [`firestore.rules`](./firestore.rules). Shared documents are validated on write and cannot be updated or deleted once created.

---

## ⚙️ Build & Production Deployment

To generate a production-ready static bundle:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
