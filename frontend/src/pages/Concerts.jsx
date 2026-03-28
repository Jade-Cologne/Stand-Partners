import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";

// ─── Sample data ────────────────────────────────────────────────────────────

const SAMPLE_CONCERTS = [
  {
    id: 1,
    title: "Beethoven & Brahms",
    ensemble: "Chicago Symphony Orchestra",
    venue: "Symphony Center",
    city: "Chicago, IL",
    lat: 41.8796, lng: -87.6244,
    date: "2026-04-12", time: "7:30 PM",
    genres: ["Symphony", "Concerto"],
    ensembleType: "Full Orchestra",
    description: "Beethoven Violin Concerto with Hilary Hahn, followed by Brahms Symphony No. 4.",
    price: "$32–$165",
    studentPrice: "$15",
    ticketUrl: "#",
  },
  {
    id: 2,
    title: "Pops at the Philharmonic",
    ensemble: "New York Philharmonic",
    venue: "David Geffen Hall",
    city: "New York, NY",
    lat: 40.7725, lng: -73.9836,
    date: "2026-04-14", time: "8:00 PM",
    genres: ["Pops", "Film/Media"],
    ensembleType: "Full Orchestra",
    description: "An evening of beloved film scores and Broadway favorites. Conducted by Steven Reineke.",
    price: "$29–$145",
    studentPrice: "$20",
    ticketUrl: "#",
  },
  {
    id: 3,
    title: "Schubert Cello Quintet",
    ensemble: "Boston Chamber Music Society",
    venue: "Sanders Theatre",
    city: "Boston, MA",
    lat: 42.3744, lng: -71.1163,
    date: "2026-04-15", time: "7:00 PM",
    genres: ["Chamber"],
    ensembleType: "Chamber Ensemble",
    description: "Schubert's monumental String Quintet in C major, with two performances of Beethoven Op. 18 quartets on the program.",
    price: "$25–$55",
    studentPrice: "$12",
    ticketUrl: "#",
  },
  {
    id: 4,
    title: "La Traviata",
    ensemble: "Lyric Opera of Chicago",
    venue: "Civic Opera House",
    city: "Chicago, IL",
    lat: 41.8839, lng: -87.6373,
    date: "2026-04-16", time: "7:00 PM",
    genres: ["Opera"],
    ensembleType: "Opera",
    description: "Verdi's La Traviata in a new production by director Francesca Zambello. Sung in Italian with English supertitles.",
    price: "$35–$285",
    studentPrice: "$20",
    ticketUrl: "#",
  },
  {
    id: 5,
    title: "John Williams: A Film Music Celebration",
    ensemble: "San Francisco Symphony",
    venue: "Davies Symphony Hall",
    city: "San Francisco, CA",
    lat: 37.7775, lng: -122.4196,
    date: "2026-04-18", time: "8:00 PM",
    genres: ["Film/Media", "Pops"],
    ensembleType: "Full Orchestra",
    description: "Music from Star Wars, Schindler's List, Indiana Jones, E.T., and more. A must for film music lovers of all ages.",
    price: "$45–$175",
    studentPrice: null,
    ticketUrl: "#",
  },
  {
    id: 6,
    title: "Silk Road Ensemble",
    ensemble: "Silk Road Ensemble",
    venue: "Royce Hall",
    city: "Los Angeles, CA",
    lat: 34.0728, lng: -118.4414,
    date: "2026-04-19", time: "7:30 PM",
    genres: ["World/Folk", "Chamber"],
    ensembleType: "Chamber Ensemble",
    description: "Yo-Yo Ma's Silk Road Ensemble brings together musicians and traditions from across Central Asia, the Middle East, and East Asia.",
    price: "$38–$98",
    studentPrice: "$20",
    ticketUrl: "#",
  },
  {
    id: 7,
    title: "Chicago Jazz Philharmonic: Spring Suite",
    ensemble: "Chicago Jazz Philharmonic",
    venue: "Studebaker Theater",
    city: "Chicago, IL",
    lat: 41.8773, lng: -87.6289,
    date: "2026-04-20", time: "7:00 PM",
    genres: ["Jazz", "Pops"],
    ensembleType: "Full Orchestra",
    description: "World premieres and jazz standards reimagined for large ensemble. Featuring vocal guest Dee Alexander.",
    price: "$20–$60",
    studentPrice: "$10",
    ticketUrl: "#",
  },
  {
    id: 8,
    title: "Anne-Sophie Mutter — Solo Recital",
    ensemble: "Anne-Sophie Mutter, violin",
    venue: "Benaroya Hall",
    city: "Seattle, WA",
    lat: 47.6073, lng: -122.3353,
    date: "2026-04-23", time: "7:30 PM",
    genres: ["Recital"],
    ensembleType: "Solo Recital",
    description: "An evening of Bach Partitas and Bartók Solo Sonata. With Lambert Orkis, piano.",
    price: "$55–$175",
    studentPrice: "$25",
    ticketUrl: "#",
  },
  {
    id: 9,
    title: "Carmen",
    ensemble: "Houston Grand Opera",
    venue: "Wortham Theater Center",
    city: "Houston, TX",
    lat: 29.7533, lng: -95.3677,
    date: "2026-04-25", time: "7:30 PM",
    genres: ["Opera"],
    ensembleType: "Opera",
    description: "Bizet's Carmen in the beloved Franco Zeffirelli production. Sung in French with English supertitles.",
    price: "$30–$220",
    studentPrice: "$15",
    ticketUrl: "#",
  },
  {
    id: 10,
    title: "Piano Recital: Yuja Wang",
    ensemble: "Yuja Wang, piano",
    venue: "Arlene Schnitzer Concert Hall",
    city: "Portland, OR",
    lat: 45.5185, lng: -122.6817,
    date: "2026-04-26", time: "7:30 PM",
    genres: ["Recital"],
    ensembleType: "Solo Recital",
    description: "Ravel Gaspard de la Nuit, Prokofiev Sonata No. 7, and Scriabin Études. One of the most sought-after recitalists in the world today.",
    price: "$45–$120",
    studentPrice: "$20",
    ticketUrl: "#",
  },
  {
    id: 11,
    title: "Spring Spectacular",
    ensemble: "Colorado Symphony",
    venue: "Boettcher Concert Hall",
    city: "Denver, CO",
    lat: 39.7485, lng: -104.9989,
    date: "2026-04-28", time: "7:30 PM",
    genres: ["Symphony", "Seasonal"],
    ensembleType: "Full Orchestra",
    description: "A celebration of spring featuring Vivaldi's Four Seasons, Copland Appalachian Spring, and Stravinsky Rite of Spring.",
    price: "$22–$98",
    studentPrice: "$10",
    ticketUrl: "#",
  },
  {
    id: 12,
    title: "Beethoven String Quartets — Complete Cycle I",
    ensemble: "Takács Quartet",
    venue: "Spivey Hall",
    city: "Atlanta, GA",
    lat: 33.6405, lng: -84.4294,
    date: "2026-05-02", time: "8:00 PM",
    genres: ["Chamber"],
    ensembleType: "Chamber Ensemble",
    description: "First installment of a two-night cycle of Beethoven's complete string quartets. Op. 18 Nos. 1–6.",
    price: "$28–$58",
    studentPrice: "$14",
    ticketUrl: "#",
  },
  {
    id: 13,
    title: "Nashville Symphony: Latin Rhythms",
    ensemble: "Nashville Symphony",
    venue: "Schermerhorn Symphony Center",
    city: "Nashville, TN",
    lat: 36.1559, lng: -86.7748,
    date: "2026-05-03", time: "7:30 PM",
    genres: ["Pops", "World/Folk"],
    ensembleType: "Full Orchestra",
    description: "A night of Latin American classics — Piazzolla, Ginastera, Villa-Lobos, and contemporary works for orchestra and jazz ensemble.",
    price: "$24–$85",
    studentPrice: "$12",
    ticketUrl: "#",
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const GENRES = ["All", "Symphony", "Concerto", "Pops", "Opera", "Chamber", "Recital", "Film/Media", "Jazz", "World/Folk", "Seasonal"];
const ENSEMBLE_TYPES = ["All", "Full Orchestra", "Chamber Ensemble", "Solo Recital", "Opera", "Choir"];
const SORT_OPTIONS = [
  { value: "date",     label: "Date" },
  { value: "distance", label: "Distance" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

const GENRE_COLORS = {
  "Symphony":   "bg-indigo-900/60 text-indigo-300",
  "Concerto":   "bg-violet-900/60 text-violet-300",
  "Pops":       "bg-amber-900/60 text-amber-300",
  "Opera":      "bg-rose-900/60 text-rose-300",
  "Chamber":    "bg-cyan-900/60 text-cyan-300",
  "Recital":    "bg-teal-900/60 text-teal-300",
  "Film/Media": "bg-blue-900/60 text-blue-300",
  "Jazz":       "bg-yellow-900/60 text-yellow-300",
  "World/Folk": "bg-green-900/60 text-green-300",
  "Seasonal":   "bg-emerald-900/60 text-emerald-300",
};

// ─── Map ─────────────────────────────────────────────────────────────────────

const _markerCache = {};
function concertIcon(highlighted) {
  const key = highlighted ? "on" : "off";
  if (_markerCache[key]) return _markerCache[key];
  const color = highlighted ? "#6366f1" : "#475569";
  const size  = highlighted ? 18 : 12;
  _markerCache[key] = L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid ${highlighted ? "#a5b4fc" : "#94a3b8"};box-shadow:0 0 ${highlighted ? "8px #6366f1" : "0"};transition:all 0.15s;"></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  return _markerCache[key];
}

function FlyTo({ concert }) {
  const map = useMap();
  useEffect(() => {
    if (concert) map.flyTo([concert.lat, concert.lng], 12, { duration: 0.6 });
  }, [concert, map]);
  return null;
}

function ConcertMap({ concerts, hovered, setHovered }) {
  // Invalidate cached icons so highlighted state re-renders correctly
  Object.keys(_markerCache).forEach((k) => delete _markerCache[k]);

  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FlyTo concert={hovered} />
      {concerts.map((c) => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          icon={concertIcon(hovered?.id === c.id)}
          eventHandlers={{
            mouseover: () => setHovered(c),
            mouseout:  () => setHovered(null),
          }}
        />
      ))}
    </MapContainer>
  );
}

// ─── Concert card ─────────────────────────────────────────────────────────────

function ConcertCard({ concert, hovered, onMouseEnter, onMouseLeave, userLocation, cardRef }) {
  const dist = userLocation
    ? Math.round(haversine(userLocation.lat, userLocation.lng, concert.lat, concert.lng))
    : null;

  const isHovered = hovered?.id === concert.id;

  return (
    <div
      ref={cardRef}
      className={`bg-slate-800 border rounded-xl p-4 transition-colors cursor-default ${
        isHovered ? "border-indigo-500" : "border-slate-700 hover:border-slate-500"
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {concert.genres.map((g) => (
              <span key={g} className={`text-xs px-2 py-0.5 rounded-full font-medium ${GENRE_COLORS[g] ?? "bg-slate-700 text-slate-300"}`}>{g}</span>
            ))}
          </div>
          <h3 className="font-semibold text-slate-100 leading-snug">{concert.title}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{concert.ensemble}</p>
          <p className="text-xs text-slate-500 mt-0.5">{concert.venue} · {concert.city}{dist !== null ? ` · ${dist} mi away` : ""}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-slate-200">{formatDate(concert.date)}</p>
          <p className="text-xs text-slate-500">{concert.time}</p>
          <p className="text-xs text-emerald-400 mt-1">{concert.price}</p>
          {concert.studentPrice && (
            <p className="text-xs text-indigo-400">Student: {concert.studentPrice}</p>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{concert.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-600">{concert.ensembleType}</span>
        <a
          href={concert.ticketUrl}
          className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          Get Tickets →
        </a>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Concerts() {
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [sort, setSort] = useState("date");
  const [genre, setGenre] = useState("All");
  const [ensembleType, setEnsembleType] = useState("All");
  const [studentOnly, setStudentOnly] = useState(false);
  const [freeOrLow, setFreeOrLow] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hovered, setHovered] = useState(null);
  const cardRefs = useRef({});

  const requestLocation = () => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort("distance");
        setLocationLoading(false);
      },
      () => setLocationLoading(false)
    );
  };

  // Sync list scroll when map hover changes
  useEffect(() => {
    if (hovered && cardRefs.current[hovered.id]) {
      cardRefs.current[hovered.id].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [hovered]);

  const filtered = useMemo(() => {
    let list = [...SAMPLE_CONCERTS];
    if (genre !== "All") list = list.filter((c) => c.genres.includes(genre));
    if (ensembleType !== "All") list = list.filter((c) => c.ensembleType === ensembleType);
    if (studentOnly) list = list.filter((c) => c.studentPrice !== null);
    if (sort === "date") {
      list.sort((a, b) => a.date.localeCompare(b.date));
    } else if (sort === "distance" && userLocation) {
      list.sort((a, b) =>
        haversine(userLocation.lat, userLocation.lng, a.lat, a.lng) -
        haversine(userLocation.lat, userLocation.lng, b.lat, b.lng)
      );
    }
    return list;
  }, [genre, ensembleType, studentOnly, sort, userLocation]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Concerts Near Me</h1>
          <p className="text-slate-500 text-sm mt-1">
            Orchestra, chamber, opera, recitals, jazz, and more — across all genres and ensemble types.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!userLocation ? (
            <button
              onClick={requestLocation}
              disabled={locationLoading}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-indigo-700/40 border border-indigo-600/50 text-indigo-300 hover:bg-indigo-700/60 transition-colors disabled:opacity-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
              {locationLoading ? "Locating…" : "Use my location"}
            </button>
          ) : (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Location set
            </span>
          )}
          <button
            onClick={() => setShowMap((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              showMap
                ? "bg-slate-700 border-slate-500 text-slate-200"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
            }`}
          >
            {showMap ? "Hide Map" : "Show Map"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-800/60 border border-slate-700 rounded-xl items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Sort</label>
          <select
            className="text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
            value={sort}
            onChange={(e) => {
              if (e.target.value === "distance" && !userLocation) requestLocation();
              setSort(e.target.value);
            }}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Genre</label>
          <select
            className="text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            {GENRES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Ensemble</label>
          <select
            className="text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
            value={ensembleType}
            onChange={(e) => setEnsembleType(e.target.value)}
          >
            {ENSEMBLE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex gap-4 pb-1.5">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={studentOnly} onChange={(e) => setStudentOnly(e.target.checked)} />
            Student tickets
          </label>
        </div>
        <div className="ml-auto flex flex-col justify-end">
          <p className="text-xs text-slate-500 pb-1.5">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Sample data notice */}
      <div className="mb-5 px-4 py-2.5 bg-amber-900/20 border border-amber-700/40 rounded-lg text-xs text-amber-400">
        Showing sample listings — live concert data coming soon.
      </div>

      {/* Content: list + optional map */}
      <div className={`flex gap-4 ${showMap ? "items-start" : ""}`}>
        {/* List */}
        <div className={`flex flex-col gap-3 ${showMap ? "flex-1 min-w-0 max-h-[680px] overflow-y-auto pr-1" : "w-full grid grid-cols-1 lg:grid-cols-2 gap-3"}`}
          style={showMap ? {} : { display: "grid" }}
        >
          {filtered.map((c) => (
            <ConcertCard
              key={c.id}
              concert={c}
              hovered={hovered}
              onMouseEnter={() => setHovered(c)}
              onMouseLeave={() => setHovered(null)}
              userLocation={userLocation}
              cardRef={(el) => { cardRefs.current[c.id] = el; }}
            />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-slate-500 text-sm py-8 text-center">No events match these filters.</p>
          )}
        </div>

        {/* Map */}
        {showMap && (
          <div className="w-96 flex-shrink-0 rounded-xl overflow-hidden border border-slate-700 shadow-lg sticky top-20" style={{ height: 680 }}>
            <ConcertMap concerts={filtered} hovered={hovered} setHovered={setHovered} />
          </div>
        )}
      </div>
    </div>
  );
}
