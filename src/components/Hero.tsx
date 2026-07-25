import React, { useRef, useState, useEffect } from 'react';
import {
  Upload, Sparkles, MapPin, Calendar, Compass, Check, X,
  FileText, ArrowRight, Star, Heart, Key, DollarSign, Wallet,
  CreditCard, User, LogOut, Settings, Lock, PieChart, ExternalLink, Bookmark,
  Users, Zap, Coffee, ShoppingBag, Sliders, Plus, Minus, Info, Globe,
  Utensils, Camera, Trees, Activity, Ticket, Train, Building2, Landmark, Mountain, Sun,
  Share2, Download, Navigation, Map, SunMedium, ShieldCheck, Layers, Award, Copy
} from 'lucide-react';
import { UserProfile, ItineraryResult } from '@/types';
import { auth, googleProvider, signInWithPopup, signOut, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

interface NavButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function NavButton({ children, onClick, className = '' }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-transparent border-none cursor-pointer font-sans text-[15px] font-medium uppercase text-wandor-text tracking-[0.04em] transition-opacity hover:opacity-55 ${className}`}
    >
      {children}
    </button>
  );
}

const DEFAULT_PLACEHOLDER = "I'm planning a 7-day trip to Japan in October. I love food, hidden cafes, scenic hikes, and want to avoid crowds....";

const SAMPLE_PROMPTS = [
  "I'm planning a 7-day trip to Japan in October. I love food, hidden cafes, scenic hikes, and want to avoid crowds....",
  "Planning a 5-day romantic getaway to Amalfi Coast in May. Scenic views, authentic pasta, and coastal walks....",
  "10 days in Iceland Ring Road in September. Hot springs, waterfalls, stargazing spots, and glacier hiking....",
  "A weekend getaway to Mexico City focusing on contemporary art, street food tacos, and architectural landmarks...."
];

export function Hero() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Prompt State - initialized to empty string so placeholder is shown!
  const [promptText, setPromptText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Groq API Key State
  const [groqApiKey, setGroqApiKey] = useState<string>(() => {
    return localStorage.getItem('groq_api_key') || '';
  });
  const [tempApiKey, setTempApiKey] = useState('');
  
  // User Authentication State
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('vandor_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Saved Itineraries State
  const [savedTrips, setSavedTrips] = useState<ItineraryResult[]>(() => {
    const saved = localStorage.getItem('vandor_saved_trips');
    return saved ? JSON.parse(saved) : [];
  });

  // Active Modal & Generation State
  const [activeModal, setActiveModal] = useState<
    'discover' | 'pricing' | 'faqs' | 'login' | 'groqKey' | 'itinerary' | 'savedTrips' | 'waitlist' | 'tripWizard' | null
  >(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<ItineraryResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Trip Architect Wizard State
  const [travelersCount, setTravelersCount] = useState<number>(2);
  const [budgetStyle, setBudgetStyle] = useState<'economy' | 'moderate' | 'luxury'>('moderate');
  const [targetBudget, setTargetBudget] = useState<string>('');
  const [tripPace, setTripPace] = useState<'relaxed' | 'balanced' | 'action'>('balanced');
  const [accommodationStyle, setAccommodationStyle] = useState<string>('Boutique & 3-4★ Hotels');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Food & Dining', 'Culture & Sights', 'Scenic & Nature'
  ]);
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  // Interactive Currency & Budget Scaling (Hackathon Pitch Mode)
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD'>('USD');
  const [budgetMultiplier, setBudgetMultiplier] = useState<number>(1.0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const CURRENCY_CONFIG: Record<string, { rate: number; symbol: string }> = {
    USD: { rate: 1, symbol: '$' },
    EUR: { rate: 0.92, symbol: '€' },
    GBP: { rate: 0.79, symbol: '£' },
    JPY: { rate: 155, symbol: '¥' },
    CAD: { rate: 1.36, symbol: 'C$' },
    AUD: { rate: 1.52, symbol: 'A$' },
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatMoney = (amountInUSD: number) => {
    const config = CURRENCY_CONFIG[selectedCurrency] || CURRENCY_CONFIG.USD;
    const scaled = Math.round(amountInUSD * budgetMultiplier * config.rate);
    return `${config.symbol}${scaled.toLocaleString()}`;
  };

  const handleCopyItineraryText = () => {
    if (!currentItinerary) return;
    const text = `✈️ Vandor AI Itinerary: ${currentItinerary.destination}
Duration: ${currentItinerary.durationDays} Days | Total Budget: ${formatMoney(currentItinerary.totalCostUSD)}

Daily Highlights:
${currentItinerary.days.map((d) => `Day ${d.dayNumber}: ${d.dayTitle} (${formatMoney(d.totalDayCostUSD)})\n` + d.highlights.map(h => ` • ${h}`).join('\n')).join('\n\n')}

Generated with Vandor AI Travel Architect`;
    navigator.clipboard.writeText(text);
    showToast('Copied full itinerary to clipboard!');
  };

  const handleOpenGoogleMaps = (dayTitle: string, highlights: string[]) => {
    const query = `${currentItinerary?.destination || ''} ${dayTitle} ${highlights.slice(0, 2).join(' ')}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Waitlist State
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  // Hero Video State
  const [videoError, setVideoError] = useState(false);

  // Sync Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const uProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Explorer',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
          provider: 'google',
        };
        setUser(uProfile);
        localStorage.setItem('vandor_user', JSON.stringify(uProfile));

        // Sync Firestore user profile
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            displayName: uProfile.name,
            email: uProfile.email,
            photoURL: uProfile.avatar,
            createdAt: new Date().toISOString(),
          }, { merge: true });

          // Fetch saved itineraries from Firestore
          const itinerariesSnap = await getDocs(collection(db, 'users', firebaseUser.uid, 'itineraries'));
          const fetchedTrips: ItineraryResult[] = [];
          itinerariesSnap.forEach((docSnap) => {
            fetchedTrips.push(docSnap.data() as ItineraryResult);
          });
          if (fetchedTrips.length > 0) {
            setSavedTrips(fetchedTrips);
            localStorage.setItem('vandor_saved_trips', JSON.stringify(fetchedTrips));
          }
        } catch (err) {
          console.error('Error syncing user data with Firestore:', err);
        }
      } else {
        setUser(null);
        localStorage.removeItem('vandor_user');
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Groq Key to LocalStorage
  const handleSaveGroqKey = (key: string) => {
    setGroqApiKey(key);
    localStorage.setItem('groq_api_key', key);
    setActiveModal(null);
  };

  // Google Firebase Login
  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setActiveModal(null);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User voluntarily closed the popup - benign action
        console.info('Sign-in popup closed by user.');
        return;
      }
      if (err.code === 'auth/cancelled-popup-request') {
        console.info('Authentication popup request was cancelled or superseded.');
        return;
      }

      console.error('Firebase Auth Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setAuthError(
          `Domain "${currentDomain}" is not authorized in Firebase Console. Please add "${currentDomain}" under Authentication > Settings > Authorized domains, or use Guest mode below.`
        );
      } else {
        setAuthError(err.message || 'Failed to sign in with Google');
      }
    }
  };

  const handleGuestLogin = () => {
    const guestUser: UserProfile = {
      uid: 'guest_' + Date.now(),
      name: 'Guest Explorer',
      email: 'guest@vandor.travel',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GuestExplorer',
      provider: 'guest',
    };
    setUser(guestUser);
    localStorage.setItem('vandor_user', JSON.stringify(guestUser));
    setActiveModal(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    localStorage.removeItem('vandor_user');
    setShowUserDropdown(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Helper to safely parse and auto-repair potentially truncated JSON from LLM
  const parseJsonSafely = (rawContent: string) => {
    let text = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = text.indexOf('{');
    if (firstBrace !== -1) {
      text = text.substring(firstBrace);
    }

    try {
      return JSON.parse(text);
    } catch {
      // Attempt auto-repair on truncated JSON
      let repaired = text;
      // Fix unclosed quotes
      const quotes = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quotes % 2 !== 0) {
        repaired += '"';
      }
      // Remove trailing commas
      repaired = repaired.replace(/,\s*$/, '');

      // Balance braces
      let openCurly = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
      let openSquare = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;

      while (openSquare > 0) {
        repaired += ']';
        openSquare--;
      }
      while (openCurly > 0) {
        repaired += '}';
        openCurly--;
      }

      try {
        return JSON.parse(repaired);
      } catch {
        // Find last complete day object inside "days"
        const lastDayObj = text.lastIndexOf('}');
        if (lastDayObj > 0) {
          let partial = text.substring(0, lastDayObj + 1);
          if (!partial.includes(']')) {
            partial += ']';
          }
          if (!partial.endsWith('}')) {
            partial += '}';
          }
          try {
            return JSON.parse(partial);
          } catch {
            // Fall through
          }
        }
        throw new Error('AI response was incomplete or truncated. Please try generating again.');
      }
    }
  };

  // Opens the Trip Architect Wizard Modal
  const handlePlanTrip = () => {
    setApiError(null);
    if (!groqApiKey || !groqApiKey.trim()) {
      setApiError('Groq API Key required! Please enter your Groq API key to generate real AI travel itineraries.');
      setTempApiKey('');
      setActiveModal('groqKey');
      return;
    }
    setWizardStep(1);
    setActiveModal('tripWizard');
  };

  // AI Itinerary Generation (Using Groq API with enriched wizard parameters)
  const executePlanTrip = async (useCustomWizard: boolean = true) => {
    setApiError(null);
    setCurrentItinerary(null);

    // 1. Check if Groq API Key is provided
    if (!groqApiKey || !groqApiKey.trim()) {
      setApiError('Groq API Key required! Please enter your Groq API key to generate real AI travel itineraries.');
      setTempApiKey('');
      setActiveModal('groqKey');
      return;
    }

    setIsGenerating(true);
    setActiveModal('itinerary');

    const basePrompt = promptText.trim() || DEFAULT_PLACEHOLDER;

    let effectivePrompt = basePrompt;
    if (useCustomWizard) {
      effectivePrompt += `\n\n[USER CUSTOM PARAMETERS & BUDGET PREFERENCES]:
- Party Size: ${travelersCount} traveler(s)
- Trip Pace: ${tripPace === 'relaxed' ? 'Relaxed & Leisurely (1-2 main spots/day)' : tripPace === 'action' ? 'Fast-Paced Action Sightseer (5+ spots/day)' : 'Balanced Explorer (3-4 spots/day)'}
- Target Budget Tier: ${budgetStyle.toUpperCase()} (${budgetStyle === 'economy' ? '$50-$100/day per person' : budgetStyle === 'luxury' ? '$450+/day per person' : '$150-$300/day per person'})${targetBudget ? `, Target Total Trip Budget: $${targetBudget}` : ''}
- Preferred Stay Type: ${accommodationStyle}
- Priority Focus & Interests: ${selectedInterests.length > 0 ? selectedInterests.join(', ') : 'All general sightseeing'}
${specialNotes.trim() ? `- Special Requirements/Dietary/Flights: ${specialNotes.trim()}` : ''}`;
    }

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are Vandor, an authoritative travel economist and real-world destination research intelligence.
Your absolute mandate is to produce 100% REAL, GROUNDED, and ACCURATE travel itineraries featuring VERIFIED real-world venues, specific street/district locations, actual current market admission fees, real restaurant names, and real local transit options.

CRITICAL REAL-WORLD VERIFICATION MANDATES:
1. STRICTLY NO GENERIC PLACEHOLDERS: Never output generic phrases like "Local Cafe", "Famous Shrine", "City Hotel", or "Traditional Restaurant". You MUST name the EXACT, real-world venue (e.g. "Kichi Kichi Omurice in Pontocho", "TeamLab Planets in Toyosu", "Meiji Jingu Shrine in Harajuku", "Ace Hotel Kyoto in Nakagyo").
2. REAL-WORLD PRICING RESEARCH for ${travelersCount} traveler(s):
   - Stay: Real current nightly rates for actual hotels/ryokans/hostels in that specific city and budget tier.
   - Dining: Real pricing for specific named restaurants, street markets, or izakayas.
   - Activities: Exact official admission ticket prices for the named sights/museums/attractions.
   - Transit: Exact transit fares (e.g. "Suica/IC Card metro pass $6.50", "JR Tokaido Shinkansen bullet train to Kyoto $98", "Airport Express $18").
3. ACCURATE DAILY SUB-TOTALS:
   - Calculate totalDayCostUSD = stay + food + activities + transit for each day.
   - Ensure expenses reflect realistic daily variation (e.g., arrival/travel days differ from full sightseeing days).
4. CLEAR & STRUCTURED HIGHLIGHTS:
   - For each day, provide 3 to 4 detailed, actionable highlights naming real locations, specific neighborhood districts, operating hours tips, and exact costs.

Return ONLY a valid, raw JSON object matching this schema:
{
  "destination": "Specific Destination & Trip Summary",
  "durationDays": 7,
  "totalCostUSD": 1450,
  "currency": "USD",
  "categoryBreakdown": { "stay": 630, "food": 420, "activities": 260, "transit": 140 },
  "days": [
    {
      "dayNumber": 1,
      "dayTitle": "Real Neighborhood & Specific Activity Focus",
      "totalDayCostUSD": 190,
      "breakdown": { "stay": 95, "food": 60, "activities": 35, "transit": 0 },
      "highlights": [
        "Visit [Exact Real Venue Name] in [District Name] (Admission: $XX) - [Specific tip/detail]",
        "Lunch at [Exact Real Restaurant Name] - famous for [dish name] (~$XX/person)",
        "Explore [Exact Real Park/Sight Name], then take [Specific Transit Line] ($XX) to [Next Area]"
      ]
    }
  ]
}`
            },
            { role: 'user', content: effectivePrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        setApiError(`Groq API Error: ${message}. Please check your API key.`);
        setIsGenerating(false);
        return;
      }

      const data = await res.json();
      const content = data.choices[0]?.message?.content || '';
      
      let parsed: any;
      try {
        parsed = parseJsonSafely(content);
      } catch (parseErr: any) {
        console.error('JSON parse error:', parseErr, 'Content:', content);
        setApiError('The AI response was incomplete or truncated. Please try generating again.');
        setIsGenerating(false);
        return;
      }

      // Dynamically calculate exact totals from day breakdowns for 100% mathematical accuracy
      let totalStay = 0;
      let totalFood = 0;
      let totalActivities = 0;
      let totalTransit = 0;

      const formattedDays = (parsed.days || []).map((d: any, idx: number) => {
        const stay = Number(d.breakdown?.stay) || 0;
        const food = Number(d.breakdown?.food) || 0;
        const activities = Number(d.breakdown?.activities) || 0;
        const transit = Number(d.breakdown?.transit) || 0;

        totalStay += stay;
        totalFood += food;
        totalActivities += activities;
        totalTransit += transit;

        const calculatedDayTotal = stay + food + activities + transit;

        return {
          dayNumber: d.dayNumber || idx + 1,
          dayTitle: d.dayTitle || `Day ${idx + 1}`,
          totalDayCostUSD: calculatedDayTotal > 0 ? calculatedDayTotal : (d.totalDayCostUSD || 150),
          breakdown: { stay, food, activities, transit },
          highlights: d.highlights || ['Explore iconic local sights', 'Authentic culinary experience'],
        };
      });

      const grandTotalUSD = totalStay + totalFood + totalActivities + totalTransit;

      const itineraryData: ItineraryResult = {
        destination: parsed.destination || 'Custom AI Travel Route',
        durationDays: parsed.durationDays || (formattedDays.length || 7),
        totalCostUSD: grandTotalUSD > 0 ? grandTotalUSD : (parsed.totalCostUSD || 1500),
        currency: parsed.currency || 'USD',
        categoryBreakdown: {
          stay: totalStay,
          food: totalFood,
          activities: totalActivities,
          transit: totalTransit,
        },
        days: formattedDays,
        createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };

      setCurrentItinerary(itineraryData);
      setIsGenerating(false);
    } catch (err: any) {
      console.error('Groq API execution error:', err);
      setApiError(`Failed to fetch AI itinerary: ${err.message || 'Network error'}. Verify your key and internet connection.`);
      setIsGenerating(false);
    }
  };

  const handleSaveCurrentItinerary = async () => {
    if (!currentItinerary) return;
    const updated = [currentItinerary, ...savedTrips];
    setSavedTrips(updated);
    localStorage.setItem('vandor_saved_trips', JSON.stringify(updated));

    if (user?.uid) {
      try {
        const itineraryId = `trip_${Date.now()}`;
        await setDoc(doc(db, 'users', user.uid, 'itineraries', itineraryId), {
          ...currentItinerary,
          userId: user.uid,
        });
      } catch (err) {
        console.error('Error saving itinerary to Firestore:', err);
      }
    }

    setActiveModal('savedTrips');
  };

  return (
    <section
      className="relative min-h-svh w-full overflow-hidden bg-stone-900 bg-cover bg-center"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2000&q=80')",
      }}
    >
      {/* Background Video with Error Handling and Poster Fallback */}
      {!videoError && (
        <video
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
          poster="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2000&q=80"
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoError(true)}
        >
          <source src="https://cdn.coverr.co/videos/coverr-flying-over-a-mountain-range-5343/1080p.mp4" type="video/mp4" />
          <source src="https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4" type="video/mp4" />
        </video>
      )}

      {/* Top Gradient Overlay */}
      <div
        className="absolute inset-x-0 top-0 h-[687px] pointer-events-none z-[1]"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
        }}
      />

      {/* Content Wrapper */}
      <div className="relative z-[2] max-w-[1360px] mx-auto min-h-svh flex flex-col justify-between">
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between px-20 pt-6 pb-4 max-md:px-6 max-md:pt-5 relative">
          {/* Left Wordmark */}
          <span className="font-display text-[40px] max-md:text-[32px] text-black leading-none select-none">
            vandor
          </span>

          {/* Center Links Group */}
          <div className="absolute left-1/2 -translate-x-1/2 flex gap-8 max-md:hidden">
            <NavButton onClick={() => setActiveModal('discover')}>Discover</NavButton>
            <NavButton onClick={() => setActiveModal('pricing')}>Pricing</NavButton>
            <NavButton onClick={() => setActiveModal('faqs')}>FAQs</NavButton>
          </div>

          {/* Right Group: Groq Key Indicator + Auth Profile + CTA */}
          <div className="flex items-center gap-4">
            {/* Groq Key Badge */}
            <button
              type="button"
              onClick={() => {
                setTempApiKey(groqApiKey);
                setActiveModal('groqKey');
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/80 backdrop-blur-md border border-gray-200/90 shadow-sm hover:bg-white hover:border-gray-300 transition-all text-gray-800 cursor-pointer active:scale-95"
              title="Groq AI Engine Status & Key Settings"
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${groqApiKey ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${groqApiKey ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="font-semibold tracking-tight text-[12px] text-gray-800">{groqApiKey ? 'Groq Llama 3.3' : 'Groq API Key'}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                groqApiKey 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {groqApiKey ? 'Active' : 'Setup'}
              </span>
            </button>

            {/* Auth / Profile Section */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1 pl-2.5 bg-white/80 border border-gray-200 rounded-full hover:bg-white transition-all shadow-sm"
                >
                  <span className="text-xs font-semibold text-gray-800 max-w-[100px] truncate">{user.name}</span>
                  <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-white" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-fade-in">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-800">{user.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        setActiveModal('savedTrips');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-wandor-prompt" /> My Saved Trips ({savedTrips.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        setTempApiKey(groqApiKey);
                        setActiveModal('groqKey');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-600" /> Groq API Key
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveModal('login')}
                className="bg-transparent border-none cursor-pointer font-sans text-[15px] font-semibold uppercase text-[#292929] tracking-[0.04em] transition-opacity hover:opacity-55 max-md:hidden"
              >
                Login
              </button>
            )}

            <button
              type="button"
              onClick={handlePlanTrip}
              className="bg-wandor-dark text-[#fafafa] border-none cursor-pointer font-sans text-[15px] font-medium uppercase tracking-[0.04em] px-5 py-3.5 rounded-full transition-all hover:bg-[#333] active:scale-95 shadow-sm"
            >
              Plan My Trip
            </button>
          </div>
        </nav>

        {/* Hero Body */}
        <div className="flex flex-col items-center px-6 pt-16 pb-24 text-center my-auto">
          <h1 className="font-sans text-[clamp(40px,6vw,68px)] font-medium text-wandor-text leading-[1.05] tracking-[-0.04em] max-w-[820px] mb-5">
            Where will you go next?
          </h1>
          <p className="font-sans text-xl font-medium text-wandor-muted leading-relaxed max-w-[500px] mb-10">
            Tell our AI where you're going and what you love. We'll create a personalized itinerary for you.
          </p>

          {/* Liquid Glass Prompt Card */}
          <div className="relative w-[701px] max-md:w-[calc(100vw-48px)] min-h-[208px] bg-white/[0.06] border-[3px] border-white rounded-[44px] shadow-[0_0_4px_0_rgba(0,0,0,0.15)] overflow-hidden backdrop-blur-[20px] transition-all duration-300 flex flex-col justify-between p-7">
            {/* Textarea with Placeholder (Clears seamlessly when user writes!) */}
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={DEFAULT_PLACEHOLDER}
              className="w-[609px] max-md:w-full h-[100px] font-sans text-xl max-md:text-[17px] font-medium text-wandor-prompt placeholder:text-wandor-prompt/70 leading-relaxed bg-transparent border-none outline-none resize-none"
            />

            {/* Bottom Card Row: Upload File Badge + Upload Button + Action CTA */}
            <div className="flex items-center justify-between w-full mt-2 relative">
              <div className="flex items-center gap-3">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-11 h-11 bg-transparent border border-white/70 rounded-full cursor-pointer flex items-center justify-center backdrop-blur-[14px] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  aria-label="Upload inspiration"
                  title="Upload flight PDF or inspiration photo"
                >
                  <Upload className="w-[18px] h-[18px] text-wandor-text flex-shrink-0" />
                </button>

                {/* Attached File Indicator */}
                {selectedFile && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/50 backdrop-blur-md rounded-full text-xs font-medium text-wandor-text max-w-[200px] truncate border border-white/60">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 text-wandor-prompt" />
                    <span className="truncate">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="hover:text-red-600 transition-colors ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Plan My Trip CTA Button */}
              <button
                type="button"
                onClick={handlePlanTrip}
                className="w-[156px] h-14 bg-black border-none rounded-[44px] shadow-[0_0_2px_0_rgba(0,0,0,0.05)] cursor-pointer flex items-center justify-center font-sans text-base font-medium text-[#fafafa] uppercase tracking-[0.02em] transition-all hover:bg-[#333] active:scale-95"
              >
                Plan My Trip
              </button>
            </div>
          </div>

          {/* Quick Prompt Selector */}
          <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-[700px]">
            {SAMPLE_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPromptText(p)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                  promptText === p
                    ? 'bg-black/80 text-white border-black'
                    : 'bg-white/40 text-wandor-text border-white/60 hover:bg-white/70'
                }`}
              >
                Sample {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Brand copyright */}
        <div className="pb-6 text-center">
          <p className="font-sans text-xs text-wandor-muted tracking-wider uppercase">
            © {new Date().getFullYear()} Vandor AI. Crafted for mindful travelers.
          </p>
        </div>
      </div>

      {/* MODAL DIALOGS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl border border-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            {/* GROQ API KEY MODAL */}
            {activeModal === 'groqKey' && (
              <div>
                <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Key className="w-4 h-4" /> Custom Groq API Key
                </div>
                <h2 className="text-2xl font-semibold text-wandor-text">Integrate your Groq API Key</h2>
                <p className="text-xs text-wandor-muted mt-1 mb-4">
                  Power your trip planning with Groq's lightning-fast Llama 3.3 70B inference engine.
                </p>

                {apiError && (
                  <div className="p-3.5 mb-5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span>{apiError}</span>
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                      Groq API Key (starts with gsk_)
                    </label>
                    <input
                      type="password"
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder="gsk_..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 font-mono text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Direct Client Integration
                    </p>
                    <p className="leading-relaxed">
                      Your API key is stored securely in your browser's local storage and used directly for Groq AI inference.
                    </p>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline pt-1"
                    >
                      Get free Groq API Key at console.groq.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  {groqApiKey && (
                    <button
                      type="button"
                      onClick={() => handleSaveGroqKey('')}
                      className="px-4 py-2.5 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Remove Key
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSaveGroqKey(tempApiKey)}
                    className="px-6 py-2.5 bg-black text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-gray-800 transition-colors"
                  >
                    Save & Activate
                  </button>
                </div>
              </div>
            )}

            {/* TRIP ARCHITECT WIZARD MODAL */}
            {activeModal === 'tripWizard' && (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4 mb-5 flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-amber-600 text-xs font-bold uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Vandor AI Architect • Smart Parameters</span>
                    </div>
                    <h2 className="text-2xl font-bold text-wandor-text mt-0.5">Configure Your Trip</h2>
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-full text-xs font-semibold text-gray-700">
                    <span className={`px-2.5 py-1 rounded-full transition-all ${wizardStep === 1 ? 'bg-black text-white shadow-sm' : 'text-gray-500'}`}>
                      1. Party & Pace
                    </span>
                    <span className={`px-2.5 py-1 rounded-full transition-all ${wizardStep === 2 ? 'bg-black text-white shadow-sm' : 'text-gray-500'}`}>
                      2. Budget & Stay
                    </span>
                    <span className={`px-2.5 py-1 rounded-full transition-all ${wizardStep === 3 ? 'bg-black text-white shadow-sm' : 'text-gray-500'}`}>
                      3. Focus & Vibe
                    </span>
                  </div>
                </div>

                {/* STEP 1: PARTY & PACE */}
                {wizardStep === 1 && (
                  <div className="space-y-6 animate-fade-in">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Number of Travelers</span>
                        <span className="text-amber-700 font-extrabold text-sm">{travelersCount} {travelersCount === 1 ? 'Guest' : 'Guests'}</span>
                      </label>

                      {/* Clean Direct Stepper & Number Input */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-300 rounded-xl bg-gray-50 p-1.5 shadow-xs">
                          <button
                            type="button"
                            onClick={() => setTravelersCount(Math.max(1, travelersCount - 1))}
                            className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer active:scale-95"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={travelersCount}
                            onChange={(e) => setTravelersCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 text-center font-bold text-sm text-gray-900 bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setTravelersCount(travelersCount + 1)}
                            className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">Enter exact traveler count (1-50 guests)</p>
                      </div>
                    </div>

                    {/* Trip Pace Selector */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                        Preferred Daily Trip Pace
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { key: 'relaxed', title: 'Relaxed & Chill', desc: '1-2 spots/day, leisure focus', icon: Compass },
                          { key: 'balanced', title: 'Balanced Explorer', desc: '3-4 spots/day, scenic & cafes', icon: Zap },
                          { key: 'action', title: 'Action Sightseer', desc: '5+ spots/day, max sights', icon: Activity },
                        ].map((pace) => {
                          const IconComp = pace.icon;
                          const isSelected = tripPace === pace.key;
                          return (
                            <button
                              key={pace.key}
                              type="button"
                              onClick={() => setTripPace(pace.key as any)}
                              className={`p-3.5 rounded-2xl border text-left transition-all ${
                                isSelected
                                  ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm'
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <IconComp className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-amber-700' : 'text-gray-500'}`} />
                              <p className="font-bold text-xs">{pace.title}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{pace.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => executePlanTrip(false)}
                        className="text-xs text-gray-500 hover:text-black font-semibold underline"
                      >
                        Skip & Quick Generate
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="px-6 py-2.5 bg-black text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        Next: Budget & Stay <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: BUDGET & STAY */}
                {wizardStep === 2 && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Budget Tier Selector */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                        Budget Style / Spending Tier
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { key: 'economy', title: 'Backpacker / Economy', range: '$50 - $100 / day', desc: 'Hostels, street food & trains', icon: Wallet },
                          { key: 'moderate', title: 'Moderate Comfort', range: '$150 - $300 / day', desc: '3-4★ Hotels, casual sit-down', icon: DollarSign },
                          { key: 'luxury', title: 'Luxury & Fine Living', range: '$450+ / day', desc: '5★ Resorts & Michelin dining', icon: CreditCard },
                        ].map((b) => (
                          <button
                            key={b.key}
                            type="button"
                            onClick={() => setBudgetStyle(b.key as any)}
                            className={`p-3.5 rounded-2xl border text-left transition-all ${
                              budgetStyle === b.key
                                ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <b.icon className="w-5 h-5 text-amber-700 mb-1" />
                            <p className="font-bold text-xs">{b.title}</p>
                            <p className="text-[11px] font-extrabold text-amber-800 mt-0.5">{b.range}</p>
                            <p className="text-[10px] text-gray-500 mt-1 leading-snug">{b.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target Total Budget Input (Optional) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                        Custom Total Target Budget Limit (Optional)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold">$</span>
                        <input
                          type="number"
                          value={targetBudget}
                          onChange={(e) => setTargetBudget(e.target.value)}
                          placeholder="e.g. 1800 (Leave empty for auto calculation)"
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-black transition-colors"
                        />
                      </div>
                    </div>

                    {/* Accommodation Style */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                        Preferred Stay Style
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          'Hostels & Airbnbs',
                          'Boutique & 3-4★ Hotels',
                          '5★ Luxury Resorts & Ryokans'
                        ].map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => setAccommodationStyle(style)}
                            className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                              accommodationStyle === style
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-black transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="px-6 py-2.5 bg-black text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        Next: Focus & Vibe <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: FOCUS & VIBE */}
                {wizardStep === 3 && (
                  <div className="space-y-6 animate-fade-in">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                        Select What You Care About Most (Multi-select)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          'Food & Dining',
                          'Culture & Sights',
                          'Scenic & Nature',
                          'Hidden Gems & Cafes',
                          'Markets & Shopping',
                          'Cocktails & Nightlife',
                          'Photography & Views',
                          'Local Transit & Walking'
                        ].map((interest) => {
                          const isSelected = selectedInterests.includes(interest);
                          return (
                            <button
                              key={interest}
                              type="button"
                              onClick={() => toggleInterest(interest)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between gap-1 ${
                                isSelected
                                  ? 'bg-amber-100/80 border-amber-400 text-amber-950'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>{interest}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-700" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Special Notes & Requirements */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                        Special Notes & Requirements
                      </label>
                      <textarea
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        placeholder="e.g., Halal food options, vegetarian, kid-friendly, flight arrives at 10 AM..."
                        className="w-full h-20 p-3 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-black transition-colors resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-black transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => executePlanTrip(true)}
                        className="px-8 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-black text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-lg hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" /> Launch AI Itinerary Engine
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeModal === 'discover' && (
              <div>
                <div className="flex items-center gap-2 text-wandor-prompt text-xs font-semibold uppercase tracking-wider mb-2">
                  <Compass className="w-4 h-4" /> Discover Destinations
                </div>
                <h2 className="text-2xl font-semibold text-wandor-text mb-4">Popular AI Curated Journeys</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {[
                    { title: 'Kyoto Hidden Temples', duration: '5 Days', tag: 'Cultural', icon: Landmark },
                    { title: 'Swiss Alps Hiking', duration: '7 Days', tag: 'Adventure', icon: Mountain },
                    { title: 'Santorini Sunset Secrets', duration: '4 Days', tag: 'Relaxation', icon: Sun },
                    { title: 'Oaxaca Culinary Tour', duration: '6 Days', tag: 'Foodie', icon: Utensils },
                  ].map((item, i) => {
                    const IconComp = item.icon;
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          setPromptText(`Plan a ${item.duration} trip for ${item.title}. Include local experiences and hidden gems.`);
                          setActiveModal(null);
                        }}
                        className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-black/20 hover:shadow-md cursor-pointer transition-all flex items-start gap-3"
                      >
                        <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-amber-700 shadow-xs">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-wandor-text text-sm">{item.title}</h3>
                          <p className="text-xs text-wandor-muted mt-0.5">{item.duration} • {item.tag}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PRICING MODAL */}
            {activeModal === 'pricing' && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-wandor-text">Simple, transparent pricing</h2>
                  <p className="text-sm text-wandor-muted mt-1">Start planning your dream journeys today</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase">Starter</span>
                      <div className="text-3xl font-bold text-wandor-text mt-2">$0</div>
                      <p className="text-xs text-wandor-muted mt-1">Perfect for casual weekend planners</p>
                      <ul className="mt-4 space-y-2 text-xs text-gray-600">
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-600" /> Unlimited Free AI Itineraries</li>
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-600" /> Groq Llama 3.3 70B AI engine</li>
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-600" /> Real-world money & budget breakdown</li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="mt-6 w-full py-2.5 rounded-xl border border-gray-300 font-semibold text-xs text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Current Plan
                    </button>
                  </div>

                  <div className="p-6 rounded-2xl bg-black text-white flex flex-col justify-between relative overflow-hidden shadow-xl">
                    <div className="absolute top-3 right-3 bg-amber-400 text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      Waitlist Open
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-300 uppercase">Vandor Pro</span>
                      <div className="text-3xl font-bold text-white mt-2">$12<span className="text-xs font-normal text-gray-400">/mo</span></div>
                      <p className="text-xs text-gray-300 mt-1">Advanced AI travel magic</p>
                      <ul className="mt-4 space-y-2 text-xs text-gray-200">
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-400" /> Priority Groq Llama 3.3 70B Inference</li>
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-400" /> PDF/File Flight & Ticket Inspiration Analysis</li>
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-400" /> Multi-Currency Export & Saved Profiles</li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setWaitlistSubmitted(false);
                        setActiveModal('waitlist');
                      }}
                      className="mt-6 w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Join Pro Waitlist
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* WAITLIST MODAL */}
            {activeModal === 'waitlist' && (
              <div className="text-center py-4 max-w-md mx-auto">
                <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto text-amber-600 mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-wandor-text">Join the Vandor Pro Waitlist</h2>
                <p className="text-xs text-wandor-muted mt-2 mb-6 leading-relaxed">
                  Be first in line when Vandor Pro launches with priority inference, offline maps export, and multi-currency budgeting.
                </p>

                {waitlistSubmitted ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-800 font-semibold flex items-center justify-center gap-2 animate-fade-in">
                    <Check className="w-4 h-4 text-green-600" /> You're on the waitlist! We'll notify you as soon as spots open.
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (waitlistEmail.trim()) {
                        setWaitlistSubmitted(true);
                      }
                    }}
                    className="space-y-3"
                  >
                    <input
                      type="email"
                      required
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-black transition-colors"
                    />
                    <button
                      type="submit"
                      className="w-full py-3 bg-black text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      Join Priority Waitlist
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* FAQS MODAL */}
            {activeModal === 'faqs' && (
              <div>
                <h2 className="text-2xl font-semibold text-wandor-text mb-4">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {[
                    { q: "How does Vandor generate personalized itineraries?", a: "Vandor analyzes your travel prompt, preferred pace, style, and uploaded inspiration files to synthesize day-by-day plans with budget breakdowns." },
                    { q: "How does Groq API key integration work?", a: "Enter your Groq API key in the top nav or settings to unlock Llama 3.3 70B inference directly in your browser with total cost breakdowns." },
                    { q: "How is money & budget calculated for each day?", a: "Vandor calculates realistic costs for accommodation, local dining, activity tickets, and transit to give you both total trip cost and daily breakdowns." },
                    { q: "How does Google Login work?", a: "Click Login to authenticate with your Google account. Your profile and saved itineraries sync locally." }
                  ].map((faq, i) => (
                    <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <h3 className="font-semibold text-sm text-wandor-text">{faq.q}</h3>
                      <p className="text-xs text-wandor-muted mt-1 leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LOGIN MODAL (Google Authentication) */}
            {activeModal === 'login' && (
              <div className="max-w-sm mx-auto text-center py-4">
                <span className="font-display text-4xl text-black">vandor</span>
                <h2 className="text-xl font-semibold text-wandor-text mt-4">Welcome to Vandor</h2>
                <p className="text-xs text-wandor-muted mb-6">Sign in with Google Firebase Auth to save your personalized itineraries</p>
                
                {authError && (
                  <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                    {authError}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full py-3.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-medium text-xs text-gray-800 shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-98"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-2 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Or</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGuestLogin}
                    className="w-full py-3 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-medium text-xs text-gray-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    Continue as Guest Explorer
                  </button>

                  <p className="text-[10px] text-gray-400 pt-1">
                    Authenticated securely via Firebase Authentication or local guest session.
                  </p>
                </div>
              </div>
            )}

            {/* SAVED TRIPS MODAL */}
            {activeModal === 'savedTrips' && (
              <div>
                <div className="flex items-center gap-2 text-wandor-prompt text-xs font-semibold uppercase tracking-wider mb-2">
                  <Bookmark className="w-4 h-4" /> User Profile
                </div>
                <h2 className="text-2xl font-semibold text-wandor-text mb-4">Your Saved Travel Itineraries</h2>
                {savedTrips.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
                    <Compass className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">No saved itineraries yet</p>
                    <p className="text-xs text-gray-500 mt-1">Generate a trip plan and click "Save Itinerary" to store it here.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {savedTrips.map((trip, idx) => (
                      <div key={idx} className="p-5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-base text-wandor-text">{trip.destination}</h3>
                            <p className="text-xs text-gray-500">{trip.durationDays} Days • Created {trip.createdDate}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-extrabold text-wandor-prompt">${trip.totalCostUSD}</span>
                            <p className="text-[10px] text-gray-500 uppercase">Total Estimated</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                          <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-gray-400" /> Stay: ${trip.categoryBreakdown.stay}</div>
                          <div className="flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-gray-400" /> Food: ${trip.categoryBreakdown.food}</div>
                          <div className="flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5 text-gray-400" /> Sights: ${trip.categoryBreakdown.activities}</div>
                          <div className="flex items-center gap-1.5"><Train className="w-3.5 h-3.5 text-gray-400" /> Transit: ${trip.categoryBreakdown.transit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ITINERARY GENERATOR & BUDGET MODAL */}
            {activeModal === 'itinerary' && (
              <div>
                {apiError ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 font-bold text-xl">
                      !
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Groq API Error</h3>
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-4 rounded-2xl max-w-md mx-auto leading-relaxed font-medium">
                      {apiError}
                    </p>
                    <div className="pt-2 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTempApiKey(groqApiKey);
                          setActiveModal('groqKey');
                        }}
                        className="px-6 py-2.5 bg-black text-white text-xs font-semibold uppercase rounded-full hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5" /> Re-enter Groq API Key
                      </button>
                    </div>
                  </div>
                ) : isGenerating ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-wandor-prompt border-t-transparent rounded-full animate-spin mx-auto" />
                    <h3 className="text-xl font-semibold text-wandor-text">
                      {groqApiKey ? 'Inferring via Groq AI...' : 'Synthesizing itinerary & budget...'}
                    </h3>
                    <p className="text-xs text-wandor-muted max-w-sm mx-auto">
                      Calculating hidden cafes, scenic hikes, optimal transit, total budget, and daily cost breakdown.
                    </p>
                  </div>
                ) : currentItinerary ? (
                  <div>
                    {/* Floating Toast Notification */}
                    {toastMessage && (
                      <div className="mb-4 p-3 bg-black text-white text-xs font-semibold rounded-xl flex items-center justify-between shadow-lg animate-fade-in">
                        <span className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400" /> {toastMessage}
                        </span>
                        <button type="button" onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between border-b pb-4 mb-5 flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-wandor-prompt text-xs font-semibold uppercase tracking-wider">
                          <Sparkles className="w-4 h-4 text-amber-500" /> Real-World Grounded Itinerary
                        </div>
                        <h2 className="text-2xl font-bold text-wandor-text mt-1">{currentItinerary.destination}</h2>
                      </div>

                      {/* Currency Selector Pill */}
                      <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
                        <Globe className="w-3.5 h-3.5 text-gray-500 ml-1" />
                        {(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] as const).map((curr) => (
                          <button
                            key={curr}
                            type="button"
                            onClick={() => setSelectedCurrency(curr)}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                              selectedCurrency === curr
                                ? 'bg-black text-white shadow-xs'
                                : 'text-gray-600 hover:text-black'
                            }`}
                          >
                            {curr}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Budget Multiplier & Money Dashboard Card */}
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-4 mb-6 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <p className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                            <Wallet className="w-3.5 h-3.5 text-amber-700" /> Total Estimated Trip Budget
                          </p>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-3xl font-extrabold text-wandor-text">
                              {formatMoney(currentItinerary.totalCostUSD)}
                            </span>
                            <span className="text-xs font-semibold text-gray-500">
                              (~{formatMoney(Math.round(currentItinerary.totalCostUSD / currentItinerary.durationDays))} / day)
                            </span>
                          </div>
                        </div>

                        {/* Interactive Budget Tier Adjuster */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Live Budget Scaling</span>
                          <div className="flex items-center gap-1 bg-white border border-amber-200 p-1 rounded-xl shadow-xs">
                            {[
                              { label: 'Saver (0.8x)', val: 0.8 },
                              { label: 'Standard (1.0x)', val: 1.0 },
                              { label: 'Comfort (1.3x)', val: 1.3 },
                            ].map((tier) => (
                              <button
                                key={tier.val}
                                type="button"
                                onClick={() => setBudgetMultiplier(tier.val)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  budgetMultiplier === tier.val
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {tier.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2.5 text-xs text-amber-900/80 pt-2 border-t border-amber-200/50 flex-wrap">
                        <span className="bg-white/80 border border-amber-200 px-2.5 py-1 rounded-xl font-semibold flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-700" /> Stay: {formatMoney(currentItinerary.categoryBreakdown.stay)}
                        </span>
                        <span className="bg-white/80 border border-amber-200 px-2.5 py-1 rounded-xl font-semibold flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-amber-700" /> Food: {formatMoney(currentItinerary.categoryBreakdown.food)}
                        </span>
                        <span className="bg-white/80 border border-amber-200 px-2.5 py-1 rounded-xl font-semibold flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-amber-700" /> Sights: {formatMoney(currentItinerary.categoryBreakdown.activities)}
                        </span>
                        <span className="bg-white/80 border border-amber-200 px-2.5 py-1 rounded-xl font-semibold flex items-center gap-1.5">
                          <Train className="w-3.5 h-3.5 text-amber-700" /> Transit: {formatMoney(currentItinerary.categoryBreakdown.transit)}
                        </span>
                      </div>
                    </div>

                    {/* Day by Day Itinerary list with Money Breakdown & Google Maps Links */}
                    <div className="space-y-4 mb-6">
                      {currentItinerary.days.map((item, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-2.5 hover:border-gray-200 transition-colors">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-black text-white text-xs font-bold rounded-lg">
                                Day {item.dayNumber}
                              </span>
                              <h4 className="font-semibold text-sm text-wandor-text">{item.dayTitle}</h4>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Open in Google Maps Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenGoogleMaps(item.dayTitle, item.highlights)}
                                className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 hover:text-black hover:border-gray-300 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                title="Open this day in Google Maps"
                              >
                                <Navigation className="w-3 h-3 text-sky-600" /> Maps
                              </button>

                              {/* Daily Cost Badge */}
                              <span className="text-xs font-bold text-amber-900 bg-amber-100/90 px-2.5 py-1 rounded-full flex items-center gap-1">
                                Day Total: {formatMoney(item.totalDayCostUSD)}
                              </span>
                            </div>
                          </div>

                          {/* Highlights */}
                          <ul className="list-disc list-inside text-xs text-wandor-muted space-y-1.5 pl-1 leading-relaxed">
                            {item.highlights.map((h, idx) => (
                              <li key={idx}>{h}</li>
                            ))}
                          </ul>

                          {/* Day Breakdown Pill */}
                          <div className="flex items-center gap-3 pt-2 mt-1 border-t border-gray-200/60 text-[11px] text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-gray-400" /> Stay: {formatMoney(item.breakdown.stay)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Utensils className="w-3 h-3 text-gray-400" /> Dining: {formatMoney(item.breakdown.food)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Ticket className="w-3 h-3 text-gray-400" /> Sights: {formatMoney(item.breakdown.activities)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Train className="w-3 h-3 text-gray-400" /> Transit: {formatMoney(item.breakdown.transit)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Action Footer with Export & Save */}
                    <div className="flex items-center justify-between pt-4 border-t flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyItineraryText}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy Text
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleSaveCurrentItinerary();
                          showToast('Trip saved to your profile!');
                        }}
                        className="px-6 py-2.5 bg-black text-white text-xs font-semibold uppercase rounded-full hover:bg-gray-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5" /> Save Itinerary
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
