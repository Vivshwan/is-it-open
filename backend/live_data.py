"""
live_data.py  -  Fetches real places from OpenStreetMap (OSM)
=============================================================

What this file does:
    1. Builds an Overpass QL query ("give me named amenities and shops
       within X metres of this point").
    2. Sends the query to a public Overpass server. If a server fails or
       returns nothing, it automatically tries the next one (3 mirrors).
    3. Cleans the raw OSM data into a simple list of dictionaries that the
       FastAPI backend (main.py) can return as JSON.

Why OpenStreetMap / Overpass?
    It is free and needs no API key or billing, so the project is easy to
    run and reproduce. The trade-off: data is crowd-sourced, so many places
    have no opening hours or phone number.
"""

import overpy                # Python client for the Overpass API
import urllib.request        # Used here only to set a custom User-Agent header


def _query_overpass(url, query):
    """Helper function to query a specific Overpass server.

    Returns the result object on success, or None if anything goes wrong
    (server down, timeout, rate limit, bad response...). Returning None
    instead of crashing lets the caller try the next mirror.
    """
    try:
        # Public Overpass servers ask clients to identify themselves.
        # We set a User-Agent header so requests look like they come from a
        # real, identifiable app and are less likely to be blocked.
        opener = urllib.request.build_opener()
        opener.addheaders = [
            ("User-Agent", "IsItOpen-Assessment/1.0 (https://github.com/your-username/is-it-open)")
        ]
        urllib.request.install_opener(opener)

        # Point the overpy client at this specific server and run the query
        api = overpy.Overpass(url=url)
        return api.query(query)
    except Exception as e:
        # Log the failure (visible in Vercel logs) and signal failure with None
        print(f"⚠️ Failed to query {url}: {e}")
        return None


def fetch_places_from_osm(lat=28.6315, lon=77.2167, radius=500):
    """Fetches real places from OpenStreetMap near a coordinate.

    Args:
        lat, lon : centre point of the search (defaults to Connaught Place, Delhi)
        radius   : search radius in metres (default 500 m)

    Returns:
        A list of up to 50 place dictionaries, sorted by name.
        Returns an empty list if all servers fail or nothing is found.
    """

    # ---- 1. BUILD THE OVERPASS QUERY ----
    # Overpass QL explained:
    #   [out:json]      -> return JSON
    #   [timeout:25]    -> server gives up after 25 seconds
    #   node(...)/way(...) -> OSM objects: a node is a point (e.g. a small shop),
    #                         a way is a shape (e.g. a building outline)
    #   around:R,lat,lon   -> within R metres of the coordinate
    #   ["amenity"]["name"] -> must have an 'amenity' tag (cafe, pharmacy, bank...)
    #                          AND a name (nameless places are useless to users)
    #   ["shop"]["name"]    -> same idea for shops
    #   out center 50   -> return at most 50 results; for ways, include a
    #                      centre point so we have one lat/lon to show
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

    # ---- 2. MIRROR SERVERS (reliability) ----
    # Overpass is a FREE, SHARED public service. Any single server can be slow,
    # overloaded, rate-limited or temporarily down. Instead of depending on one
    # URL, we keep three independent servers and try them in order.
    mirrors = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.private.coffee/api/interpreter"
    ]

    # ---- 3. TRY EACH MIRROR UNTIL ONE WORKS ----
    result = None
    for url in mirrors:
        print(f"Attempting to fetch from: {url}")
        result = _query_overpass(url, query)
        
        # Success = we got a result AND it contains at least one node or way.
        if result and (len(result.nodes) > 0 or len(result.ways) > 0):
            print(f"✅ Success with {url}.")
            break  # stop trying more servers
        else:
            # Failed or returned nothing -> move on to the next mirror
            print(f"⚠️ No results from {url}. Trying next mirror...")

    # If every mirror failed or returned nothing, give up gracefully with an
    # empty list (the frontend will then show its "No places found" state).
    if not result or (len(result.nodes) == 0 and len(result.ways) == 0):
        print("❌ All Overpass servers failed or returned empty results.")
        return []

    # ---- 4. CLEAN THE RAW OSM DATA ----
    places = []
    all_elements = result.nodes + result.ways  # combine points and shapes into one list

    for element in all_elements:
        tags = element.tags              # OSM key/value info (name, phone, opening_hours...)
        name = tags.get("name")
        
        # Skip anything without a name (extra safety; the query already requires it)
        if not name:
            continue

        # -- Get the coordinates --
        # A Node has its own lat/lon. A Way (a shape) only has a "centre" point.
        if isinstance(element, overpy.Node):
            place_lat = element.lat
            place_lon = element.lon
        elif isinstance(element, overpy.Way):
            place_lat = element.center_lat
            place_lon = element.center_lon
        else:
            continue

        # Skip places where we couldn't determine a location
        if place_lat is None or place_lon is None:
            continue

        # -- Clean the phone number --
        # OSM stores phones under either "phone" or "contact:phone".
        # Remove spaces and dashes so the `tel:` link works on mobile.
        # If neither tag exists, phone stays None (many places have no number).
        raw_phone = tags.get("phone") or tags.get("contact:phone")
        phone = raw_phone.replace(" ", "").replace("-", "") if raw_phone else None

        # -- Make a readable category --
        # e.g. "fast_food" -> "Fast food", "pharmacy" -> "Pharmacy"
        category_raw = tags.get("amenity") or tags.get("shop") or "place"
        category = category_raw.replace("_", " ").capitalize()

        # -- Build the final record --
        # We pass the RAW opening_hours text to the frontend. The frontend
        # calculates open/closed using the user's current time, which keeps the
        # status accurate even though this API response is cached for 5 minutes.
        places.append({
            "id": element.id,
            "name": name,
            "category": category,
            "phone": phone,
            "lat": place_lat,
            "lon": place_lon,
            "opening_hours": tags.get("opening_hours") 
        })

    # ---- 5. SORT AND LIMIT ----
    # Sort alphabetically by name and return at most 50 places to keep the
    # response small and the UI fast.
    places.sort(key=lambda x: x["name"])
    return places[:50]