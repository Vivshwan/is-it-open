<div align="center">

# 📍 Is It Open?

**Find what's open near you, right now. No clutter, no sign-up.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-22c55e?style=for-the-badge)](https://is-it-open-smoky.vercel.app/)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![OpenStreetMap](https://img.shields.io/badge/Data-OpenStreetMap-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white)

[**Live App**](https://is-it-open-smoky.vercel.app/) · [**Report a Bug**](https://github.com/Vivshwan/is-it-open/issues) · [**Request a Feature**](https://github.com/Vivshwan/is-it-open/issues)

<!-- Add a screenshot or GIF here: ![Is It Open? screenshot](docs/screenshot.png) -->

</div>

---

## ✨ Overview

Opening a maps app just to check whether a pharmacy or cafe is open means wading through pins, reviews, photos and ads. **Is It Open?** does one thing instead: it shows nearby places with a clear **Open / Closed** status, when they close or open next, and two actions, **Call** and **Directions**.

> **One Task, Zero Friction:** open the app, see what's open, tap Call or Directions.

## 🚀 Features

- **Instant results:** loads Connaught Place, New Delhi by default, so the screen is never empty
- **My Location:** one tap to use browser geolocation
- **Open / Closed badge** with context like *"Closes at 22:00"* or *"Opens today at 09:00"*
- **"Open Now" filter**, **live search** and **auto-generated category chips**
- **One-tap actions:** `Call` (`tel:`) and `Directions` (Google Maps)
- **All states handled:** loading, empty, error with retry, geolocation denied, missing hours
- **Responsive:** 1 / 2 / 3 column grid across mobile, tablet and desktop

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, lucide-react |
| Backend | Python, FastAPI, Pydantic, [overpy](https://github.com/DinoTools/python-overpy) |
| Data | OpenStreetMap via the Overpass API (no API key needed) |
| Hosting | Vercel (frontend and backend) |

## 🏗️ How It Works

```
React App ──GET /api/places?lat&lon──▶ FastAPI ──Overpass QL──▶ Overpass API (3 mirrors)
    ▲                                     │
    └──────── JSON (raw opening_hours) ◀──┘
    │
    └─ Open/Closed status computed in the browser using local time
```

1. The frontend sends the user's coordinates to `/api/places`.
2. The backend queries Overpass for named `amenity` and `shop` elements within **500 m**.
3. Results are cleaned, sorted by name and capped at **50**.
4. The frontend receives the raw `opening_hours` string and works out the status at render time, so it stays accurate even when responses are cached.

**Reliability:** automatic fallback across three Overpass mirrors, and `Cache-Control: s-maxage=300, stale-while-revalidate=600` on responses.

## 📡 API

### `GET /api/places`

| Param | Type | Default |
|---|---|---|
| `lat` | float | `28.6315` |
| `lon` | float | `77.2167` |

```json
[
  {
    "id": 123456789,
    "name": "Sample Pharmacy",
    "category": "Pharmacy",
    "phone": "+911123456789",
    "lat": 28.6321,
    "lon": 77.2188,
    "opening_hours": "Mo-Su 09:00-22:00"
  }
]
```

`phone` and `opening_hours` are `null` when OSM has no data.

### `GET /health`
Returns `{"status": "ok"}`.

## 🛠️ Getting Started

**Prerequisites:** Node.js 18+ and Python 3.10+

```bash
# Clone
git clone https://github.com/Vivshwan/is-it-open.git
cd is-it-open
```

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install fastapi uvicorn overpy pydantic
uvicorn main:app --reload --port 8000
```
Interactive docs: http://localhost:8000/docs

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
For local development, set `API_BASE` in `App.tsx` to `http://localhost:8000`.

> Folder names above assume `backend/` and `frontend/`. Adjust if your structure differs.

## ⚠️ Known Limitations

- The hours parser reads the first `HH:MM-HH:MM` range only. Weekday rules (`Mo-Fr`), multiple ranges, overnight hours and holidays aren't handled yet.
- Status uses the browser's local time zone.
- Many OSM places have no `opening_hours` tag and show as *"Hours unknown"*.
- Results are limited to 50 places within 500 m.
- CORS is open (`*`); restrict it to the production frontend URL.

## 🗺️ Roadmap

- [ ] Robust hours parsing (e.g. `opening_hours.js`)
- [ ] Sort by distance and adjustable radius
- [ ] "Closing soon" indicator
- [ ] Skeleton loaders
- [ ] Saved favourites and PWA support
- [ ] `VITE_API_BASE` environment variable

---

## 📝 Assessment Submission Notes

*Built for the Aconic Technologies assessment, "Think Like a User. Build Like an Engineer."*

### Product summary
- **Problem:** checking if a place is open on a general maps app is slow and cluttered.
- **Target users:** people on the move, travellers, and anyone who wants a quick answer.
- **Primary task:** see what's open nearby, then call or get directions.

### UX decisions
1. **Answer the one question first.** A high-contrast status badge leads every card, with time context beneath. Closed places are dimmed.
2. **Never show an empty screen.** A default location loads instantly; geolocation is opt-in, with a clear fallback if denied.
3. **Design every state.** Loading, empty, error and missing-data states all have clear messaging and a next step.

### 30-second test: improvements made
- Moved Open/Closed calculation to the frontend so cached API responses never show stale status (the API now returns raw data only).
- Fixed category chip layout so desktop users can reach every category (scroll on mobile, wrap on desktop).
- Labelled the default location so users know what they're looking at before tapping **My Location**.

### AI disclosure
- **Tools used:** _[e.g. Claude, ChatGPT, GitHub Copilot]_
- **How:** _[e.g. scaffolding the Overpass integration, layout ideas, debugging CORS and mirror fallback]_
- **My own work:** product decisions, reviewing and modifying generated code, the 30-second test and fixes, and deployment.

---

<div align="center">

Made by [Vishwan](https://github.com/Vivshwan) · Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors

</div>