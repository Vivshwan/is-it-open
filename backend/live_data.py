import overpy
import urllib.request
from opening_hours import OpeningHours

def _query_overpass(url, query):
    """Helper function to query a specific Overpass server."""
    try:
        # Set a custom User-Agent
        opener = urllib.request.build_opener()
        opener.addheaders = [
            ("User-Agent", "IsItOpen-Assessment/1.0 (https://github.com/your-username/is-it-open)")
        ]
        urllib.request.install_opener(opener)

        # Initialize API with specific URL and longer timeout (60s)
        api = overpy.Overpass(url=url, timeout=60)
        return api.query(query)
    except Exception as e:
        print(f"⚠️ Failed to query {url}: {e}")
        return None

def fetch_places_from_osm(lat=28.6315, lon=77.2167, radius=500):
    """Fetches real places from OpenStreetMap near a coordinate."""
    
    query = f"""
    [out:json];
    (
      node(around:{radius},{lat},{lon})["amenity"~"cafe|restaurant|pharmacy|bar|fast_food|pub|library|bank|hospital|fuel|cinema"];
      way(around:{radius},{lat},{lon})["amenity"~"cafe|restaurant|pharmacy|bar|fast_food|pub|library|bank|hospital|fuel|cinema"];
      node(around:{radius},{lat},{lon})["shop"];
      way(around:{radius},{lat},{lon})["shop"];
    );
    out center;
    """

    # List of Overpass mirrors to try in order
    mirrors = [
        "https://overpass-api.de/api/interpreter",        # Primary
        "https://overpass.kumi.systems/api/interpreter",  # Mirror 1
        "https://overpass.private.coffee/api/interpreter" # Mirror 2
    ]

    result = None
    for url in mirrors:
        print(f"Attempting to fetch from: {url}")
        result = _query_overpass(url, query)
        
        # If we got a result and it actually contains elements, break the loop
        if result and (len(result.nodes) > 0 or len(result.ways) > 0):
            print(f"✅ Success with {url}. Found {len(result.nodes) + len(result.ways)} elements.")
            break
        else:
            print(f"⚠️ No results from {url}. Trying next mirror...")

    if not result or (len(result.nodes) == 0 and len(result.ways) == 0):
        print("❌ All Overpass servers failed or returned empty results.")
        return []

    places = []
    all_elements = result.nodes + result.ways

    for element in all_elements:
        tags = element.tags
        name = tags.get("name")
        opening_hours_str = tags.get("opening_hours")
        
        if not name:
            continue

        # Extract and clean phone number
        raw_phone = tags.get("phone") or tags.get("contact:phone")
        phone = raw_phone.replace(" ", "").replace("-", "") if raw_phone else None

        category_raw = tags.get("amenity") or tags.get("shop") or "place"
        category = category_raw.replace("_", " ").capitalize()

        # Status Logic
        if not opening_hours_str:
            is_open = False
            status_message = "Hours unknown"
            time_info = "Call to check" if phone else "Status unavailable"
        else:
            try:
                oh = OpeningHours(opening_hours_str)
                status = oh.state() 
                
                if status == "unknown":
                    is_open = False
                    status_message = "Hours unknown"
                    time_info = "Call to check" if phone else "Status unavailable"
                elif status == "open":
                    is_open = True
                    status_message = "Open Now"
                    next_change = oh.next_change()
                    time_info = f"Closes at {next_change.strftime('%H:%M')}" if next_change else "Open 24h"
                else:
                    is_open = False
                    status_message = "Closed"
                    next_change = oh.next_change()
                    time_info = f"Opens at {next_change.strftime('%H:%M')}" if next_change else "Closed"
            except Exception:
                is_open = False
                status_message = "Hours unparseable"
                time_info = opening_hours_str 

        places.append({
            "id": element.id,
            "name": name,
            "category": category,
            "is_open": is_open,
            "status_message": status_message,
            "time_info": time_info,
            "phone": phone
        })

    places.sort(key=lambda x: x["name"])
    return places[:100]