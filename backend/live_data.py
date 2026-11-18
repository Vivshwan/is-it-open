import overpy
import urllib.request
from opening_hours import OpeningHours
from datetime import datetime, timedelta

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

def fetch_places_from_osm(lat=28.6315, lon=77.2167, radius=300, tz_offset=0):
    """Fetches real places from OpenStreetMap near a coordinate."""
    
    query = f"""
    [out:json][timeout:60];
    (
      node(around:{radius},{lat},{lon})["amenity"]["name"];
      way(around:{radius},{lat},{lon})["amenity"]["name"];
      node(around:{radius},{lat},{lon})["shop"]["name"];
      way(around:{radius},{lat},{lon})["shop"]["name"];
    );
    out center;
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

    # Calculate the user's local time based on their offset
    # JS getTimezoneOffset() is minutes behind UTC. (IST is -330).
    # So we subtract the offset to get local time.
    user_local_time = datetime.utcnow() - timedelta(minutes=tz_offset)

    for element in all_elements:
        tags = element.tags
        name = tags.get("name")
        opening_hours_str = tags.get("opening_hours")
        
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

        if not opening_hours_str:
            is_open = False
            status_message = "Hours unknown"
            time_info = "Call to check" if phone else "Status unavailable"
        else:
            try:
                oh = OpeningHours(opening_hours_str)
                # Check status based on the USER'S local time
                status = oh.state(user_local_time) 
                next_change = oh.next_change(user_local_time)
                
                if status == "unknown":
                    is_open = False
                    status_message = "Hours unknown"
                    time_info = "Call to check" if phone else "Status unavailable"
                elif status == "open":
                    is_open = True
                    status_message = "Open Now"
                    time_info = f"Closes at {next_change.strftime('%H:%M')}" if next_change else "Open 24h"
                else:
                    is_open = False
                    status_message = "Closed"
                    if next_change:
                        # UX Fix: Show 'tomorrow' if the next opening is on a different date
                        if next_change.date() > user_local_time.date():
                            time_info = f"Opens tomorrow at {next_change.strftime('%H:%M')}"
                        else:
                            time_info = f"Opens at {next_change.strftime('%H:%M')}"
                    else:
                        time_info = "Closed"
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
            "phone": phone,
            "lat": place_lat,
            "lon": place_lon
        })

    places.sort(key=lambda x: x["name"])
    return places[:50]