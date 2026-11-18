from fastapi import FastAPI, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from live_data import fetch_places_from_osm

app = FastAPI(title="Is It Open API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://is-it-open-smoky.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PlaceResponse(BaseModel):
    id: int
    name: str
    category: str
    is_open: bool
    status_message: str
    time_info: str
    phone: Optional[str] = None
    lat: float
    lon: float

@app.get("/api/places", response_model=List[PlaceResponse])
def get_places(
    response: Response,
    lat: float = Query(28.6315, description="Latitude"), 
    lon: float = Query(77.2167, description="Longitude"),
    tz: int = Query(0, description="Timezone offset in minutes from JS Date.getTimezoneOffset()")
):
    response.headers["Cache-Control"] = "public, s-maxage=300, stale-while-revalidate=600"
    
    places = fetch_places_from_osm(lat=lat, lon=lon, tz_offset=tz)
    return places

@app.get("/health")
def health():
    return {"status": "ok"}