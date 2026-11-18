import overpy
import urllib.request

def _query_overpass(url, query):
    """Helper function to query a specific Overpass server."""
    try:
        opener = urllib.request.build_opener()
        opener.addheaders = [
            ("User-Agent", "IsItOpen-Assessment/1.0 (https://github.com/your-username/is-it-open)")
        ]
        urllib.request.install_opener(opener)

        api = overpy.Overpass(url=url)
        return api.query(query)
    except Exception as e:
        print(f"⚠️ Failed to query {url}: {e}")
        return None

def fetch_places_from_osm(lat=28.6315, lon=77.2167, radius=500):
    """Fetches real places from OpenStreetMap near a coordinate."""
    
    query = f"""
    [out:json][timeout:25];
    (
      node(around:{radius},{lat},{lon})["amenity"]["name"];
      way(around:{radius},{lat},{lon})["amenity"]["name"];
      node(around:{radius},{lat},{lon})["shop"]["name"];
      way(around:{radius},{lat},{lon})["shop"]["name"];
    );
    out center 50;
    """

    mirrors = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.private.coffee/api/interpreter"
    ]

    result = None
    for url in mirrors:
        print(f"Attempting to fetch from: {url}")
        result = _query_overpass(url, query)
        
        if result and (len(result.nodes) > 0 or len(result.ways) > 0):
            print(f"✅ Success with {url}.")
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
        
        if not name:
            continue

        # Extract coordinates
        if isinstance(element, overpy.Node):
            place_lat = element.lat
            place_lon = element.lon
        elif isinstance(element, overpy.Way):
            place_lat = element.center_lat
            place_lon = element.center_lon
        else:
            continue

        if place_lat is None or place_lon is None:
            continue

        # Extract and clean phone number
        raw_phone = tags.get("phone") or tags.get("contact:phone")
        phone = raw_phone.replace(" ", "").replace("-", "") if raw_phone else None

        category_raw = tags.get("amenity") or tags.get("shop") or "place"
        category = category_raw.replace("_", " ").capitalize()

        # Pass the raw opening_hours string to the frontend
        places.append({
            "id": element.id,
            "name": name,
            "category": category,
            "phone": phone,
            "lat": place_lat,
            "lon": place_lon,
            "opening_hours": tags.get("opening_hours") 
        })

    places.sort(key=lambda x: x["name"])
    return places[:50]