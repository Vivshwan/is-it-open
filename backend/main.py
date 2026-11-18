"""
main.py  -  FastAPI backend for "Is It Open?"
=============================================

What this file does:
    Exposes two HTTP endpoints:
        GET /api/places  -> returns nearby places (from OpenStreetMap)
        GET /health      -> simple "is the server alive?" check

How it fits together:
    React frontend  ->  GET /api/places?lat=..&lon=..  ->  this file
        -> calls fetch_places_from_osm() in live_data.py
        -> validates the data with the PlaceResponse model
        -> returns JSON to the frontend

Interactive API docs are generated automatically at /docs (Swagger UI).
"""

from fastapi import FastAPI, Query, Response
from fastapi.middleware.cors import CORSMiddleware   # lets the browser frontend call this API
from pydantic import BaseModel                       # defines/validates the shape of responses
from typing import List, Optional
from live_data import fetch_places_from_osm          # our OpenStreetMap data fetcher

# Create the FastAPI application (the title shows up in /docs)
app = FastAPI(title="Is It Open API")

# ---------------------------------------------------------------------------
# CORS (Cross-Origin Resource Sharing)
# ---------------------------------------------------------------------------
# The frontend (is-it-open-smoky.vercel.app) and the backend
# (is-it-open-7g44.vercel.app) live on DIFFERENT domains. Browsers block such
# requests unless the backend explicitly allows them.
# For security, only our own frontend URL is allowed (not "*" for everyone).
# NOTE: for local development, add "http://localhost:5173" to this list.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://is-it-open-smoky.vercel.app"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# RESPONSE MODEL
# ---------------------------------------------------------------------------
# Describes exactly what one place looks like in the API response.
# FastAPI uses this to validate the data and to generate the /docs page.
#
# Design decision: the backend returns RAW data only. Fields like is_open,
# status_message and time_info were REMOVED from here because open/closed is
# now calculated in the frontend using the user's current time. (If the server
# calculated it, the 5-minute cache could show an outdated status.)
class PlaceResponse(BaseModel):
    id: int
    name: str
    category: str
    phone: Optional[str] = None           # None when OSM has no phone number
    lat: float
    lon: float
    opening_hours: Optional[str] = None   # raw OSM text, e.g. "Mo-Su 09:00-22:00"

# ---------------------------------------------------------------------------
# ENDPOINT: GET /api/places
# ---------------------------------------------------------------------------
# Example: /api/places?lat=28.6315&lon=77.2167
# `lat` and `lon` are typed as floats, so FastAPI automatically rejects invalid
# input (e.g. lat=abc) with a clear 422 error. Defaults point to Connaught Place.
@app.get("/api/places", response_model=List[PlaceResponse])
def get_places(
    response: Response,
    lat: float = Query(28.6315, description="Latitude"), 
    lon: float = Query(77.2167, description="Longitude")
):
    # Caching header:
    #   s-maxage=300             -> Vercel's CDN may reuse this response for 5 minutes
    #   stale-while-revalidate   -> for 10 more minutes, serve the old response
    #                               instantly while refreshing it in the background
    # Benefit: repeat searches are fast and we avoid hammering the free public
    # Overpass servers.
    response.headers["Cache-Control"] = "public, s-maxage=300, stale-while-revalidate=600"
    
    # Fetch and clean places from OpenStreetMap (see live_data.py)
    places = fetch_places_from_osm(lat=lat, lon=lon)
    return places

# ---------------------------------------------------------------------------
# ENDPOINT: GET /health
# ---------------------------------------------------------------------------
# Lightweight check to confirm the server is running (useful for monitoring
# and for waking up a sleeping free-tier server).
@app.get("/health")
def health():
    return {"status": "ok"}