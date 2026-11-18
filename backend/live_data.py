import overpy
import urllib.request
import sqlite3
import json
import time
import os

# --- CACHE SETUP ---
CACHE_DB = "places_cache.db"
CACHE_TTL = 600  # 10 minutes in seconds

def init_cache():
    """Creates the cache database if it doesn't exist."""
    conn = sqlite3.connect(CACHE_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cache (
            key TEXT PRIMARY KEY,
            data TEXT,
            timestamp INTEGER
        )
    """)
    conn.commit()
    conn.close()

def get_from_cache(key):
    """Fetches data from cache if it exists and is not expired."""
    try:
        conn = sqlite3.connect(CACHE_DB)
        cursor = conn.execute("SELECT data, timestamp FROM cache WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            data, timestamp = row
            # Check if the data is older than the TTL (10 minutes)
            if time.time() - timestamp < CACHE_TTL:
                print(f"✅ Cache Hit for {key}! (Skipped Overpass)")
                return json.loads(data)
    except Exception as e:
        print(f"⚠️ Cache read error: {e}")
    return None

def save_to_cache(key, data):
    """Saves fresh data to the cache."""
    try:
        conn = sqlite3.connect(CACHE_DB)
        conn.execute(
            "REPLACE INTO cache (key, data, timestamp) VALUES (?, ?, ?)",
            (key, json.dumps(data), int(time.time()))
        )
        conn.commit()
        conn.close()
        print(f"💾 Saved to cache for {key}.")
    except Exception as e:
        print(f"⚠️ Cache write error: {e}")

# Initialize the cache on load
init_cache()


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

def fetch_places_from_osm(lat=28.6315, lon=77.2167, radius=350):
    """Fetches real places from OpenStreetMap near a coordinate."""
    
    # --- 1. CHECK CACHE FIRST ---
    # We round the lat/lon to 3 decimals to reuse cache for nearby users
    cache_key = f"{round(lat, 3)}_{round(lon, 3)}"
    cached_data = get_from_cache(cache_key)
    if cached_data:
        return cached_data

    # --- 2. FETCH FROM OVERPASS IF CACHE MISSES ---
    print(f"❌ Cache Miss for {cache_key}. Hitting Overpass...")
    
    # Reduced radius from 500 to 350 for speed
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

    # Prioritized the fastest mirrors
    mirrors = [
        "https://overpass.private.coffee/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass-api.de/api/interpreter"
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

    # --- 3. PROCESS THE DATA ---
    places = []
    all_elements = result.nodes + result.ways

    for element in all_elements:
        tags = element.tags
        name = tags.get("name")
        
        if not name:
            continue

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

        raw_phone = tags.get("phone") or tags.get("contact:phone")
        phone = raw_phone.replace(" ", "").replace("-", "") if raw_phone else None

        category_raw = tags.get("amenity") or tags.get("shop") or "place"
        category = category_raw.replace("_", " ").capitalize()

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
    final_result = places[:50]

    # --- 4. SAVE TO CACHE BEFORE RETURNING ---
    if final_result:
        save_to_cache(cache_key, final_result)

    return final_result