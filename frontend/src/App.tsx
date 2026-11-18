import { useState, useEffect } from "react";
import { MapPin, Search, Navigation, Clock, Phone, CheckCircle2, ChevronRight } from "lucide-react";

interface Place {
  id: number;
  name: string;
  category: string;
  is_open: boolean;
  status_message: string;
  time_info: string;
  phone?: string | null;
  lat: number;
  lon: number;
}

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [locationName, setLocationName] = useState("Locating you...");
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);

  // Ensure this points to your live backend
  const API_BASE = "https://is-it-open-7g44.vercel.app"; 

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationName("Near You");
          const { latitude, longitude } = position.coords;
          fetchPlaces(latitude, longitude);
        },
        () => {
          setLocationName("Connaught Place, New Delhi");
          fetchPlaces(28.6315, 77.2167);
        }
      );
    } else {
      setLocationName("Connaught Place, New Delhi");
      fetchPlaces(28.6315, 77.2167);
    }
  }, []);

  const fetchPlaces = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/places?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPlaces(data);
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

  const handleGetDirections = (place: Place) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-sans selection:bg-brand-500/30 pb-10">
      
      {/* Mobile-First Header */}
      <header className="bg-[#12121c] border-b border-gray-800 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-500/20 rounded-lg">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-brand-500" />
            </div>
            <h1 className="font-bold text-lg sm:text-xl tracking-tight">Is It Open?</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Toggle open only */}
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
            
            {/* Location Label */}
            <div className="hidden xs:flex items-center gap-1 text-[10px] text-gray-400 bg-gray-900 px-2.5 py-1.5 rounded-full border border-gray-800">
              <Navigation size={10} className="text-brand-500" />
              <span className="truncate max-w-[80px]">{locationName}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search cafes, pharmacies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12121c] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>

        {/* Horizontal Scrolling Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? "bg-brand-600 text-white border border-brand-500"
                  : "bg-[#12121c] text-gray-400 border border-gray-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-xs animate-pulse">Scanning your neighborhood...</p>
          </div>
        )}

        {/* Error / Empty States */}
        {!loading && error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && filteredPlaces.length === 0 && (
          <div className="text-center py-16 bg-[#12121c] rounded-xl border border-gray-800">
            <Search className="mx-auto text-gray-600 mb-3" size={32} />
            <h3 className="text-sm font-semibold text-gray-300">No places found</h3>
            <p className="text-xs text-gray-500 mt-1">Try adjusting your filters.</p>
          </div>
        )}

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!loading && !error && filteredPlaces.map((place) => (
            <div 
              key={place.id} 
              className={`bg-[#12121c] border rounded-xl p-4 transition-all flex flex-col ${
                place.is_open ? "border-gray-800" : "border-gray-800/50 opacity-70"
              }`}
            >
              {/* Category & Status */}
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-900 px-2 py-0.5 rounded">
                  {place.category}
                </span>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  place.is_open ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {place.status_message}
                </div>
              </div>
              
              {/* Name & Time */}
              <h3 className="text-base font-bold text-white mb-1 leading-tight line-clamp-1">{place.name}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-4 mt-1">
                <Clock size={12} className={place.is_open ? "text-green-400" : "text-gray-500"} />
                {place.time_info}
              </div>

              {/* Action Buttons (Mobile Optimized) */}
              <div className="mt-auto flex gap-2">
                {place.phone ? (
                  <a 
                    href={`tel:${place.phone}`} 
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-400 bg-brand-500/10 active:bg-brand-500/20 py-2.5 rounded-lg transition-colors"
                  >
                    <Phone size={14} /> Call
                  </a>
                ) : (
                   <div className="flex-1 py-2.5 text-xs text-center text-gray-600 border border-gray-800 rounded-lg">
                     No Phone
                   </div>
                )}
                
                <button 
                  onClick={() => handleGetDirections(place)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-blue-600 active:bg-blue-700 py-2.5 rounded-lg transition-colors"
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