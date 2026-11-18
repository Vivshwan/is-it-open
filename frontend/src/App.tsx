import { useState, useEffect } from "react";
import { MapPin, Search, Navigation, Clock, Phone, CheckCircle2, AlertCircle } from "lucide-react";

interface Place {
  id: number;
  name: string;
  category: string;
  phone?: string | null;
  lat: number;
  lon: number;
  opening_hours?: string | null;
}

interface ProcessedPlace extends Place {
  is_open: boolean;
  status_message: string;
  time_info: string;
}

// Simple helper to parse OSM hours on the frontend
function calculateStatus(opening_hours: string | null | undefined, phone: string | null | undefined) {
  if (!opening_hours) {
    return { is_open: false, status_message: "Hours unknown", time_info: phone ? "Call to check" : "Status unavailable" };
  }
  
  try {
    if (opening_hours === "24/7") {
      return { is_open: true, status_message: "Open 24h", time_info: "Always open" };
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const timeMatch = opening_hours.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    
    if (timeMatch) {
      const openTime = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
      const closeTime = parseInt(timeMatch[3]) * 60 + parseInt(timeMatch[4]);
      
      const isOpen = currentTime >= openTime && currentTime <= closeTime;
      
      if (isOpen) {
        return { 
          is_open: true, 
          status_message: "Open Now", 
          time_info: `Closes at ${timeMatch[3]}:${timeMatch[4]}` 
        };
      } else {
        return { 
          is_open: false, 
          status_message: "Closed", 
          time_info: currentTime < openTime ? `Opens today at ${timeMatch[1]}:${timeMatch[2]}` : "Opens tomorrow"
        };
      }
    }
    
    return { is_open: false, status_message: "Hours unparseable", time_info: opening_hours };
  } catch (e) {
    return { is_open: false, status_message: "Hours unparseable", time_info: opening_hours };
  }
}

export default function App() {
  const [places, setPlaces] = useState<ProcessedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [locationMode, setLocationMode] = useState<"default" | "user" | null>(null);

  const API_BASE = "https://is-it-open-7g44.vercel.app";

  useEffect(() => {
    if (locationMode === null) {
      setLocationMode("default");
      fetchPlaces(28.6315, 77.2167);
    }
  }, [locationMode]);

  const handleUserLocation = () => {
    setLocationMode("user");
    setLoading(true);
    setError(null);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchPlaces(latitude, longitude);
        },
        () => {
          setError("Location access denied. Showing default location.");
          setLocationMode("default");
          fetchPlaces(28.6315, 77.2167);
        }
      );
    } else {
      setError("Geolocation not supported. Showing default location.");
      setLocationMode("default");
      fetchPlaces(28.6315, 77.2167);
    }
  };

  const fetchPlaces = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/places?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: Place[] = await res.json();
      
      const processedData = data.map(p => {
        const status = calculateStatus(p.opening_hours, p.phone);
        return { ...p, ...status };
      });

      setPlaces(processedData);
    } catch (err: any) {
      setError("Could not load places. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(places.map((p) => p.category)))];

  const filteredPlaces = places.filter((place) => {
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || place.category === activeCategory;
    const matchesOpen = showOnlyOpen ? place.is_open : true;
    return matchesSearch && matchesCategory && matchesOpen;
  });

  const handleGetDirections = (place: ProcessedPlace) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-sans selection:bg-brand-500/30 pb-10">
      
      {/* Header */}
      <header className="bg-[#12121c] border-b border-gray-800 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-500/20 rounded-lg">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-brand-500" />
            </div>
            <h1 className="font-bold text-lg sm:text-xl tracking-tight hidden sm:block">Is It Open?</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOnlyOpen(!showOnlyOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                showOnlyOpen 
                  ? "bg-green-500/20 text-green-400 border-green-500/30" 
                  : "bg-gray-900 text-gray-400 border-gray-800"
              }`}
            >
              <CheckCircle2 size={14} />
              <span className="hidden sm:block">Open Now</span>
              <span className="sm:hidden">Open</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        
        {/* Intro Section */}
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
            Find what's open <span className="text-brand-500">right now.</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-lg mx-auto leading-relaxed">
            Skip the Google Maps clutter. Instantly see real-time open/closed statuses for cafes, pharmacies, and shops near you. 
            <br/>
            <span className="text-xs text-gray-500 mt-2 inline-block">
              (Currently showing results for Connaught Place, New Delhi by default)
            </span>
          </p>
        </div>

        {/* Location Selector Toggle */}
        <div className="flex bg-[#12121c] p-1 rounded-xl border border-gray-800 mb-6 w-full sm:w-fit mx-auto shadow-lg">
          <button
            onClick={() => { setLocationMode("default"); fetchPlaces(28.6315, 77.2167); }}
            className={`flex-1 sm:flex-none sm:px-6 py-2 rounded-lg text-xs font-semibold transition-all ${
              locationMode === "default" ? "bg-brand-600 text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            Connaught Place (Default)
          </button>
          <button
            onClick={handleUserLocation}
            className={`flex-1 sm:flex-none sm:px-6 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              locationMode === "user" ? "bg-brand-600 text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            <Navigation size={12} /> My Location
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-5 max-w-2xl mx-auto">
          <Search className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search cafes, pharmacies, restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12121c] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-all shadow-lg"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? "bg-brand-600 text-white border border-brand-500"
                  : "bg-[#12121c] text-gray-400 border border-gray-800 hover:border-gray-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading State - Radar Animation */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-6 animate-fade-in-up">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-2 border-brand-500/30 rounded-full animate-ping"></div>
              <div className="absolute inset-0 border-2 border-brand-500/50 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-brand-500/20 rounded-full flex items-center justify-center">
                <Navigation className="text-brand-500 animate-spin-slow" size={28} />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-brand-500 font-bold text-lg">Scanning neighborhood...</h3>
              <p className="text-gray-500 text-xs mt-1">Fetching live data from OpenStreetMap</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center max-w-lg mx-auto animate-fade-in-up">
            <AlertCircle className="mx-auto text-red-400 mb-3" size={32} />
            <p className="text-red-400 font-medium mb-2">Oops, something went wrong</p>
            <p className="text-sm text-gray-400">{error}</p>
            <button onClick={() => fetchPlaces(28.6315, 77.2167)} className="mt-4 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors">
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPlaces.length === 0 && (
          <div className="text-center py-24 bg-[#12121c] rounded-2xl border border-gray-800 max-w-lg mx-auto animate-fade-in-up">
            <Search className="mx-auto text-gray-600 mb-4" size={40} />
            <h3 className="text-lg font-semibold text-gray-300">No places found</h3>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or removing filters.</p>
          </div>
        )}

        {/* Places Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
          {!loading && !error && filteredPlaces.map((place) => (
            <div 
              key={place.id} 
              className={`bg-[#12121c] border rounded-xl p-5 transition-all flex flex-col ${
                place.is_open ? "border-gray-800 hover:border-brand-500/50 hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]" : "border-gray-800/50 opacity-70"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-900 px-2 py-1 rounded">
                  {place.category}
                </span>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  place.is_open ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}>
                  {place.is_open && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
                  {place.status_message}
                </div>
              </div>
              
              <h3 className="text-base font-bold text-white mb-2 leading-tight line-clamp-1">{place.name}</h3>
              
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5 mt-auto">
                <Clock size={14} className={place.is_open ? "text-green-400" : "text-gray-500"} />
                {place.time_info}
              </div>

              <div className="flex gap-2">
                {place.phone ? (
                  <a 
                    href={`tel:${place.phone}`} 
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-400 bg-brand-500/10 active:bg-brand-500/20 hover:bg-brand-500/20 py-2.5 rounded-lg transition-colors"
                  >
                    <Phone size={14} /> Call
                  </a>
                ) : (
                   <div className="flex-1 py-2.5 text-xs text-center text-gray-600 border border-gray-800 rounded-lg bg-gray-900/50">
                     No Phone
                   </div>
                )}
                
                <button 
                  onClick={() => handleGetDirections(place)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-blue-600 active:bg-blue-700 hover:bg-blue-500 py-2.5 rounded-lg transition-colors"
                >
                  <MapPin size={14} /> Directions
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}