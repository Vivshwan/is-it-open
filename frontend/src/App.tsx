import { useState, useEffect } from "react";
import { MapPin, Search, Navigation, Clock, Phone, Map as MapIcon, List, CheckCircle2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet marker icons
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

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

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [locationName, setLocationName] = useState("Locating you...");
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6315, 77.2167]);
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [showMobileMap, setShowMobileMap] = useState(false);
  
  // NEW: State for the Open Only filter
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);

  const API_BASE = "http://127.0.0.1:8000"; 

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationName("Near You");
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          fetchPlaces(latitude, longitude);
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
      if (data.length > 0) {
        setActivePlace(data[0]);
      }
    } catch (err: any) {
      setError("Could not load places. The map service might be busy.");
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(places.map((p) => p.category)))];

  // UPDATED: Added the showOnlyOpen filter logic
  const filteredPlaces = places.filter((place) => {
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || place.category === activeCategory;
    const matchesOpen = showOnlyOpen ? place.is_open : true; // <-- New logic
    return matchesSearch && matchesCategory && matchesOpen;
  });

  const handlePlaceClick = (place: Place) => {
    setActivePlace(place);
    setMapCenter([place.lat, place.lon]);
    if (window.innerWidth < 768) {
      setShowMobileMap(true);
    }
  };

  return (
    <div className="h-screen bg-[#0a0a0f] text-gray-100 font-sans flex flex-col overflow-hidden">
      <header className="bg-[#12121c] border-b border-gray-800 shrink-0 z-20">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-500/20 rounded-lg">
              <MapPin className="w-6 h-6 text-brand-500" />
            </div>
            <h1 className="font-bold text-xl tracking-tight hidden sm:block">Is It Open?</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* NEW: Show Open Only Toggle */}
            <button
              onClick={() => setShowOnlyOpen(!showOnlyOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                showOnlyOpen 
                  ? "bg-green-500/20 text-green-400 border-green-500/30" 
                  : "bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600"
              }`}
            >
              <CheckCircle2 size={16} />
              <span className="hidden sm:block">Open Now</span>
            </button>

            <div className="hidden md:flex items-center gap-1 text-xs text-gray-400 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
              <Navigation size={12} className="text-brand-500" />
              {locationName}
            </div>

            <button 
              onClick={() => setShowMobileMap(!showMobileMap)}
              className="md:hidden flex items-center gap-2 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              {showMobileMap ? <List size={16} /> : <MapIcon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: List */}
        <div className={`w-full md:w-[450px] flex-col bg-[#0a0a0f] z-10 border-r border-gray-800 ${showMobileMap ? 'hidden md:flex' : 'flex'}`}>
          
          <div className="p-4 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#12121c] border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? "bg-brand-600 text-white border border-brand-500"
                      : "bg-[#12121c] text-gray-400 border border-gray-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && <div className="text-center text-gray-500 py-10">Scanning...</div>}
            {error && <div className="text-center text-red-400 py-10">{error}</div>}
            
            {/* Empty State if no open places found */}
            {!loading && filteredPlaces.length === 0 && (
              <div className="text-center text-gray-500 py-10">
                No places found matching your filters.
              </div>
            )}

            {!loading && filteredPlaces.map((place) => (
              <div 
                key={place.id} 
                onClick={() => handlePlaceClick(place)}
                className={`cursor-pointer border rounded-xl p-4 transition-all ${
                  activePlace?.id === place.id ? "bg-[#1f2335] border-brand-500" : "bg-[#12121c] border-gray-800 hover:border-gray-600"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-900 px-1.5 py-0.5 rounded">
                    {place.category}
                  </span>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    place.is_open ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {place.status_message}
                  </div>
                </div>
                <h3 className="font-bold text-white mb-2">{place.name}</h3>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock size={12} /> {place.time_info}
                  </div>
                  {place.phone && (
                    <a href={`tel:${place.phone}`} className="flex items-center gap-1 text-brand-400 hover:text-brand-300" onClick={e => e.stopPropagation()}>
                      <Phone size={12} /> Call
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Map */}
        <div className={`flex-1 relative ${showMobileMap ? 'block' : 'hidden md:block'}`}>
          <MapContainer 
            center={mapCenter} 
            zoom={15} 
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_5bam_1_a5bf2d4e75dfa748793ce5e9"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapUpdater center={mapCenter} />
            
            {/* Map now only renders filtered places */}
            {filteredPlaces.map((place) => (
              <Marker 
                key={place.id} 
                position={[place.lat, place.lon]}
                eventHandlers={{
                  click: () => setActivePlace(place),
                }}
              >
                <Popup>
                  <div className="text-gray-900 font-sans">
                    <strong>{place.name}</strong><br/>
                    <span className={place.is_open ? "text-green-600" : "text-red-600"}>
                      {place.status_message}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </main>
    </div>
  );
}