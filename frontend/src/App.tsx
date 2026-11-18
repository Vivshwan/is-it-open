import { useState, useEffect } from "react";
import { MapPin, Search, Navigation, Clock, AlertCircle, Phone } from "lucide-react";

interface Place {
  id: number;
  name: string;
  category: string;
  is_open: boolean;
  status_message: string;
  time_info: string;
  phone?: string | null;
}

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [locationName, setLocationName] = useState("Locating you...");

  const API_BASE = "http://127.0.0.1:8000"; 

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationName("Near You");
          fetchPlaces(position.coords.latitude, position.coords.longitude);
        },
        () => {
          setLocationName("Connaught Place, New Delhi (Default)");
          fetchPlaces(28.6315, 77.2167);
        }
      );
    } else {
      setLocationName("Connaught Place, New Delhi (Default)");
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
      setError("Could not load places. The map service might be busy.");
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(places.map((p) => p.category)))];

  const filteredPlaces = places.filter((place) => {
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || place.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-sans selection:bg-brand-500/30">
      <header className="bg-[#12121c] border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-500/20 rounded-lg">
              <MapPin className="w-6 h-6 text-brand-500" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Is It Open?</h1>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
            <Navigation size={12} className="text-brand-500" />
            {locationName}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search for a cafe, pharmacy, restaurant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#12121c] border border-gray-800 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? "bg-brand-600 text-white border border-brand-500"
                    : "bg-[#12121c] text-gray-400 border border-gray-800 hover:border-gray-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm animate-pulse">Scanning your neighborhood...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-400">Oops, something went wrong.</h3>
              <p className="text-sm text-gray-400 mt-1">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-3 text-sm font-medium text-white bg-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/30">
                Try Again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && filteredPlaces.length === 0 && (
          <div className="text-center py-20">
            <Search className="mx-auto text-gray-600 mb-4" size={40} />
            <h3 className="text-lg font-semibold text-gray-300">No places found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or category filter.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!loading && !error && filteredPlaces.map((place) => (
            <div 
              key={place.id} 
              className={`bg-[#12121c] border rounded-2xl p-5 transition-all flex flex-col ${
                place.is_open ? "border-gray-800 hover:border-brand-500/50" : "border-gray-800/50 opacity-80"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-900 px-2 py-1 rounded">
                  {place.category}
                </span>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  place.is_open ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}>
                  {place.status_message}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{place.name}</h3>
              
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-4">
                <Clock size={14} className={place.is_open ? "text-green-400" : "text-gray-500"} />
                {place.time_info}
              </div>

              {/* Phone Number Display */}
              {place.phone ? (
                <a 
                  href={`tel:${place.phone}`} 
                  className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg w-full transition-colors"
                >
                  <Phone size={14} />
                  Call Shop
                </a>
              ) : (
                 !place.time_info.includes("Closes") && !place.time_info.includes("Opens") && (
                   <p className="mt-3 text-xs text-gray-500 italic text-center">No contact info available</p>
                 )
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}