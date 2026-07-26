# Vandor — AI Travel Strategist & Intelligent Budget Architect

**Vandor** is a modern, high-performance travel itinerary and cost-estimation platform powered by high-throughput LLM inference and real-world travel market pricing algorithms. Designed for modern explorers, Vandor generates realistic day-by-day travel routes, accurate itemized expense breakdowns, and real venue highlights tailored to your trip style.
Live Link: https://vandor.netlify.app/
---

## Features

- **AI-Driven Itinerary Generation**: Powered by Groq's `llama-3.3-70b-versatile` model for real-time, grounded travel planning.
- **Real-World Price Research**: Itemized daily cost calculations covering accommodation, local culinary experiences, sightseeing tickets, and transit fares.
- **Exact Mathematical Subtotals**: Auto-calculated daily totals and category breakdowns with zero synthetic padding.
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
