import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Circle, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { api } from "../api";

const TYPE_COLORS = {
  major:        "#4f46e5",
  professional: "#0891b2",
  community:    "#d97706",
  youth:        "#16a34a",
  other:        "#9333ea",
};

const TYPE_LABELS = {
  major:        "Major",
  professional: "Professional",
  community:    "Community",
  youth:        "Youth",
  other:        "Other",
};

const TYPE_CHIP_CLASSES = {
  major:        "bg-indigo-900/60 text-indigo-300",
  professional: "bg-cyan-900/60 text-cyan-300",
  community:    "bg-amber-900/60 text-amber-300",
  youth:        "bg-green-900/60 text-green-300",
  other:        "bg-purple-900/60 text-purple-300",
};

function normalizeType(type) {
  if (type === "regional") return "professional";
  return type in TYPE_COLORS ? type : "other";
}

const PAD = 4;
const SVG_SIZE = 22;
const ICON_SIZE = SVG_SIZE + PAD * 2;
const HOVER_CLOSE_MS = 150;
const CLOSE_ANIM_MS = 130;
const PANEL_WIDTH = 300;

function createIcon(color, hasAuditions) {
  const svg = hasAuditions
    ? `<svg width="${SVG_SIZE}" height="${SVG_SIZE}" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
         <polygon points="11,1 21,11 11,21 1,11" fill="${color}" stroke="white" stroke-width="1.5"/>
       </svg>`
    : `<svg width="${SVG_SIZE}" height="${SVG_SIZE}" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
         <circle cx="11" cy="11" r="8" fill="${color}" fill-opacity="0.65" stroke="white" stroke-width="1.5"/>
       </svg>`;
  return L.divIcon({
    html: `<div class="orch-pin" style="padding:${PAD}px;">${svg}</div>`,
    className: "",
    iconSize: [ICON_SIZE, ICON_SIZE],
    iconAnchor: [ICON_SIZE / 2, ICON_SIZE / 2],
    popupAnchor: [0, -(ICON_SIZE / 2)],
  });
}

const PIN_CSS = `
  .orch-pin { cursor: pointer; transition: transform 0.12s ease, filter 0.12s ease; }
  .orch-pin:hover, .orch-pin-active { transform: scale(1.45); filter: brightness(0.72); }
  .cluster-badge {
    width: 34px; height: 34px;
    background: rgba(255, 255, 255, 0.93);
    border: 2px solid rgba(255,255,255,0.5);
    border-radius: 50%;
    color: #0f172a;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 6px rgba(0,0,0,0.4);
    cursor: pointer;
    transition: transform 0.12s ease, filter 0.12s ease;
  }
  .cluster-badge:hover, .cluster-badge-active { transform: scale(1.35); filter: brightness(0.82); }
  @keyframes popup-in {
    from { opacity: 0; transform: translateY(5px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }
  @keyframes popup-out {
    from { opacity: 1; transform: translateY(0)   scale(1); }
    to   { opacity: 0; transform: translateY(5px) scale(0.96); }
  }
  .popup-open    { animation: popup-in  0.15s ease-out; transform-origin: bottom center; }
  .popup-closing { animation: popup-out 0.13s ease-in forwards; transform-origin: bottom center; pointer-events: none; }
`;

function PopupArrow({ direction = "down" }) {
  if (direction === "left") {
    return (
      <>
        <div style={{ position: "absolute", left: -7, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderRight: "7px solid #4b5563" }} />
        <div style={{ position: "absolute", left: -5, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "5px solid #1f2937" }} />
      </>
    );
  }
  return (
    <>
      <div style={{ position: "absolute", bottom: -7, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "7px solid #4b5563" }} />
      <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1f2937" }} />
    </>
  );
}

function PinIcon({ filled }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22"/>
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
    </svg>
  );
}

function PinCard({ pin, onClose, onBack, navigate, isPinned, onTogglePin, arrowDirection = "down" }) {
  const hasAuditions = pin.active_audition_count > 0;
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 w-64 relative">
      <div className="flex items-start justify-between mb-1">
        <p className="font-semibold text-gray-100 leading-tight pr-2">{pin.name}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`transition-colors ${isPinned ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
              title={isPinned ? "Unpin" : "Pin on map"}
            >
              <PinIcon filled={isPinned} />
            </button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-2">
        {pin.city}{pin.state ? `, ${pin.state}` : ""}
        {" · "}{TYPE_LABELS[normalizeType(pin.type)]}
      </p>
      {hasAuditions ? (
        <span className="inline-block bg-indigo-900 text-indigo-300 text-xs font-medium px-2 py-0.5 rounded-full mb-3">
          {pin.active_audition_count} open audition{pin.active_audition_count !== 1 ? "s" : ""}
        </span>
      ) : (
        <span className="inline-block text-xs text-gray-500 mb-3">No current openings</span>
      )}
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300">← Back</button>
        )}
        <button
          className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
          onClick={() => navigate(`/orchestras/${pin.id}`)}
        >
          View orchestra →
        </button>
      </div>
      <PopupArrow direction={arrowDirection} />
    </div>
  );
}

// Shared position hook — recomputes from live map state every render
function useLatLngPosition(latlng) {
  const map = useMap();
  const [, setTick] = useState(0);
  useMapEvents({
    move:    () => setTick((n) => n + 1),
    zoom:    () => setTick((n) => n + 1),
    zoomend: () => setTick((n) => n + 1),
  });
  const p = map.latLngToContainerPoint(latlng);
  return { x: p.x, y: p.y };
}

function usePinPosition(pin) {
  return useLatLngPosition([pin.lat, pin.lng]);
}

function PinPopupOverlay({ pin, hoverTimer, closeAll, hasBack, onBack, navigate, pinnedPins, togglePin, isClosing = false }) {
  const pos = usePinPosition(pin);
  const isPinned = pinnedPins.has(pin.id);

  return (
    <div
      className={`absolute pointer-events-auto ${isClosing ? "z-[999]" : "z-[1000]"}`}
      style={{ left: pos.x, top: pos.y, transform: "translate(-50%, calc(-100% - 7px))" }}
      onMouseEnter={isClosing ? undefined : () => clearTimeout(hoverTimer.current)}
      onMouseLeave={isClosing ? undefined : () => { hoverTimer.current = setTimeout(closeAll, HOVER_CLOSE_MS); }}
    >
      <div className={isClosing ? "popup-closing" : "popup-open"}>
        <PinCard
          pin={pin}
          onClose={closeAll}
          onBack={hasBack ? onBack : null}
          navigate={navigate}
          isPinned={isPinned}
          onTogglePin={() => { togglePin(pin.id); closeAll(); }}
        />
      </div>
    </div>
  );
}

function PinnedPopupOverlay({ pin, navigate, togglePin }) {
  const pos = usePinPosition(pin);
  return (
    <div
      className="absolute z-[1001] pointer-events-auto"
      style={{ left: pos.x, top: pos.y, transform: "translate(-50%, calc(-100% - 7px))" }}
    >
      <div className="popup-open">
        <PinCard
          pin={pin}
          onClose={() => togglePin(pin.id)}
          navigate={navigate}
          isPinned={true}
          onTogglePin={() => togglePin(pin.id)}
        />
      </div>
    </div>
  );
}

// Cluster list panel (visual only — no map hooks)
function ClusterListPanel({ pins, onHoverPin, onSelectPin, onClose, pinnedPins, togglePin }) {
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl w-72 max-h-72 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <p className="font-semibold text-gray-200 text-sm">{pins.length} orchestras</p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
      </div>
      <div className="overflow-y-auto flex-1">
        {pins.map((pin) => (
          <div
            key={pin.id}
            className="flex items-center px-4 py-2.5 hover:bg-gray-700 border-b border-gray-700/60 last:border-0 transition-colors cursor-pointer"
            onMouseEnter={() => onHoverPin(pin)}
            onMouseLeave={() => onHoverPin(null)}
            onClick={() => onSelectPin(pin)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 leading-tight truncate">{pin.name}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {pin.city}{pin.state ? `, ${pin.state}` : ""}
                <span className="ml-2 text-gray-600">· {TYPE_LABELS[normalizeType(pin.type)]}</span>
                {pin.active_audition_count > 0 && (
                  <span className="ml-2 text-indigo-400">· {pin.active_audition_count} open</span>
                )}
              </p>
            </div>
            <button
              className={`ml-3 flex-shrink-0 transition-colors ${pinnedPins.has(pin.id) ? "text-indigo-400" : "text-gray-600 hover:text-gray-400"}`}
              onClick={(e) => { e.stopPropagation(); togglePin(pin.id); }}
              title={pinnedPins.has(pin.id) ? "Unpin" : "Pin on map"}
            >
              <PinIcon filled={pinnedPins.has(pin.id)} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cluster list — positioned above the cluster marker using map coordinates
function ClusterListOverlay({ pins, latlng, hoverTimer, closeAll, onSelectPin, pinnedPins, togglePin, navigate }) {
  const pos = useLatLngPosition(latlng);
  const [hoveredPin, setHoveredPin] = useState(null);
  const hoverPinTimer = useRef(null);

  const handlePinHover = (pin) => {
    clearTimeout(hoverPinTimer.current);
    if (pin) {
      setHoveredPin(pin);
    } else {
      hoverPinTimer.current = setTimeout(() => setHoveredPin(null), HOVER_CLOSE_MS);
    }
  };

  return (
    <div
      className="absolute z-[1000] pointer-events-auto popup-open"
      style={{ left: pos.x, top: pos.y, transform: "translate(-50%, calc(-100% - 8px))" }}
      onMouseEnter={() => clearTimeout(hoverTimer.current)}
      onMouseLeave={() => { hoverTimer.current = setTimeout(closeAll, HOVER_CLOSE_MS); }}
    >
      <div className="relative flex items-start">
        <div className="relative">
          <ClusterListPanel
            pins={pins}
            onHoverPin={handlePinHover}
            onSelectPin={onSelectPin}
            onClose={closeAll}
            pinnedPins={pinnedPins}
            togglePin={togglePin}
          />
          <PopupArrow direction="down" />
        </div>
        {hoveredPin && (
          <div
            className="absolute top-0 popup-open"
            style={{ left: "calc(100% + 8px)" }}
            onMouseEnter={() => clearTimeout(hoverPinTimer.current)}
            onMouseLeave={() => { hoverPinTimer.current = setTimeout(() => setHoveredPin(null), HOVER_CLOSE_MS); }}
          >
            <PinCard
              pin={hoveredPin}
              onClose={() => setHoveredPin(null)}
              navigate={navigate}
              isPinned={pinnedPins.has(hoveredPin.id)}
              onTogglePin={() => togglePin(hoveredPin.id)}
              arrowDirection="left"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function UserLocationLayer({ userLocation, radiusMiles }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane("userLocationPane")) {
      const pane = map.createPane("userLocationPane");
      pane.style.zIndex = "650";
    }
  }, [map]);

  if (!userLocation) return null;
  const radiusMeters = radiusMiles * 1609.34;
  return (
    <>
      <Circle
        center={[userLocation.lat, userLocation.lng]}
        radius={radiusMeters}
        pane="userLocationPane"
        pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.12, weight: 1.5, opacity: 0.5 }}
      />
      <CircleMarker
        center={[userLocation.lat, userLocation.lng]}
        radius={6}
        pane="userLocationPane"
        pathOptions={{ color: "white", fillColor: "black", fillOpacity: 1, weight: 2 }}
      />
    </>
  );
}

function CenterOnUserButton({ userLocation }) {
  const map = useMap();
  if (!userLocation) return null;
  return (
    <div className="absolute top-3 right-3 z-[999] pointer-events-auto">
      <button
        className="w-8 h-8 bg-slate-800/90 border border-slate-600 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 shadow-md transition-colors"
        onClick={() => map.flyTo([userLocation.lat, userLocation.lng], 9)}
        title="Center on my location"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <line x1="12" y1="2" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
        </svg>
      </button>
    </div>
  );
}

function InfoPanel({ expanded, navigate }) {
  if (!expanded) return null;
  return (
    <div
      className="flex-shrink-0 flex flex-col bg-slate-800/95 border border-slate-600/60 rounded-xl shadow-xl overflow-hidden"
      style={{ width: PANEL_WIDTH }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 flex-shrink-0">
        <p className="font-semibold text-slate-200 text-sm">About</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm text-slate-300">
        <div>
          <p className="font-semibold text-slate-100 mb-1">stand.partners</p>
          <p className="text-slate-400 leading-relaxed">
            A directory for orchestral musicians. We track audition listings,
            sub-list information, and excerpt requirements across professional,
            community, and youth ensembles — updated daily from orchestra websites.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Features</p>
          <ul className="space-y-1.5 text-slate-400">
            <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span>Interactive map of 400+ ensembles</li>
            <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span>Open audition listings with deadlines</li>
            <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span>Sub-list contacts and procedures</li>
            <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">•</span>Excerpt library with required PDFs</li>
          </ul>
        </div>
        <div className="border-t border-slate-700/40 pt-3 text-slate-400 text-xs leading-relaxed">
          <p>Pins are colored by ensemble type. Diamond shapes indicate open auditions. Hover or click any pin for details.</p>
        </div>
      </div>
      <div className="flex-shrink-0 px-4 py-3 border-t border-slate-700/60">
        <button
          onClick={() => navigate("/add-ensemble")}
          className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
        >
          Submit an ensemble →
        </button>
      </div>
    </div>
  );
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PER_PAGE_OPTIONS = [10, 25, 50];

function SidebarDetail({ pin, onBack, navigate, pinnedPins, togglePin }) {
  const typeKey = normalizeType(pin.type);
  const isPinned = pinnedPins.has(pin.id);
  return (
    <div className="p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 mb-4 transition-colors">
        ← Back to list
      </button>
      <div className="flex items-start justify-between mb-2">
        <h2 className="font-bold text-slate-100 text-sm leading-tight pr-2">{pin.name}</h2>
        <button
          onClick={() => togglePin(pin.id)}
          className={`flex-shrink-0 transition-colors mt-0.5 ${isPinned ? "text-indigo-400" : "text-slate-600 hover:text-slate-400"}`}
          title={isPinned ? "Unpin from map" : "Pin on map"}
        >
          <PinIcon filled={isPinned} />
        </button>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_CHIP_CLASSES[typeKey] ?? "bg-gray-700 text-gray-300"}`}>
        {TYPE_LABELS[typeKey]}
      </span>
      <p className="text-sm text-slate-500 mt-2">{pin.city}{pin.state ? `, ${pin.state}` : ""}</p>
      {pin.active_audition_count > 0 ? (
        <span className="inline-block bg-indigo-900 text-indigo-300 text-xs font-medium px-2 py-0.5 rounded-full mt-3">
          {pin.active_audition_count} open audition{pin.active_audition_count !== 1 ? "s" : ""}
        </span>
      ) : (
        <p className="text-xs text-slate-600 mt-3">No current openings</p>
      )}
      <button
        className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 hover:underline block"
        onClick={() => navigate(`/orchestras/${pin.id}`)}
      >
        Full details →
      </button>
    </div>
  );
}

function OrchestraSidebar({
  pins, filters, setFilters,
  userLocation, setUserLocation,
  sort, setSort,
  radiusMiles, setRadiusMiles,
  perPage, setPerPage,
  page, setPage,
  sidebarView, setSidebarView,
  sidebarPin, setSidebarPin,
  pinnedPins, togglePin,
  navigate,
}) {
  const geoRequested = useRef(false);

  useEffect(() => {
    if (sort === "nearest" && !userLocation && !geoRequested.current) {
      geoRequested.current = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, [sort, userLocation, setUserLocation]);

  const sorted = useMemo(() => {
    const list = [...pins];
    if (sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "za") list.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === "auditions") list.sort((a, b) => b.active_audition_count - a.active_audition_count || a.name.localeCompare(b.name));
    else if (sort === "nearest" && userLocation) {
      list.sort((a, b) =>
        haversine(userLocation.lat, userLocation.lng, a.lat, a.lng) -
        haversine(userLocation.lat, userLocation.lng, b.lat, b.lng)
      );
    } else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [pins, sort, userLocation]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const pagePins = sorted.slice((page - 1) * perPage, page * perPage);

  const sidebarClass = "flex-shrink-0 bg-slate-800/95 border border-slate-600/60 rounded-xl shadow-xl overflow-hidden";

  if (sidebarView === "detail" && sidebarPin) {
    return (
      <div className={sidebarClass} style={{ width: PANEL_WIDTH }}>
        <SidebarDetail
          pin={sidebarPin}
          onBack={() => setSidebarView("list")}
          navigate={navigate}
          pinnedPins={pinnedPins}
          togglePin={togglePin}
        />
      </div>
    );
  }

  return (
    <div className={`${sidebarClass} flex flex-col`} style={{ width: PANEL_WIDTH }}>
      <div className="p-5 border-b border-slate-700/60 space-y-3 flex-shrink-0">
        <p className="font-semibold text-slate-200 text-sm">Filter</p>
        <div>
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <label key={type} className="flex items-center gap-2 text-sm text-slate-300 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.types.includes(type)}
                onChange={(e) => {
                  setFilters((f) => ({
                    ...f,
                    types: e.target.checked ? [...f.types, type] : f.types.filter((t) => t !== type),
                  }));
                  setPage(1);
                }}
              />
              <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[type] }} />
              {label}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.openingsOnly}
            onChange={(e) => { setFilters((f) => ({ ...f, openingsOnly: e.target.checked })); setPage(1); }}
          />
          Open auditions only
        </label>
        <div className="border-t border-slate-700/40 pt-3 space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Sort</p>
          <select
            className="w-full text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
          >
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
            <option value="auditions">Most auditions</option>
            <option value="nearest">Nearest first</option>
          </select>
          {sort === "nearest" && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Radius (miles)</label>
              <input
                type="number" min="10" max="5000" step="10"
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(Number(e.target.value))}
                className="w-full text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
              />
              {!userLocation && <p className="text-xs text-amber-500 mt-1">Requesting location…</p>}
            </div>
          )}
        </div>
        <div className="border-t border-slate-700/40 pt-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 13 13"><circle cx="6.5" cy="6.5" r="5" fill="#94a3b8" fillOpacity="0.65" stroke="white" strokeWidth="1"/></svg>
            <span className="text-xs text-slate-500">No openings</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 13 13"><polygon points="6.5,0.5 12.5,6.5 6.5,12.5 0.5,6.5" fill="#94a3b8" stroke="white" strokeWidth="1"/></svg>
            <span className="text-xs text-slate-500">Open auditions</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-slate-700/60 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-slate-500">{sorted.length} shown</span>
        <select
          className="text-xs bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-slate-400 focus:outline-none"
          value={perPage}
          onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
        >
          {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {pagePins.map((pin) => (
          <button
            key={pin.id}
            className="w-full text-left px-4 py-2.5 hover:bg-slate-700 border-b border-slate-700/60 last:border-0 transition-colors"
            onClick={() => { setSidebarPin(pin); setSidebarView("detail"); }}
          >
            <p className="text-sm font-medium text-slate-200 leading-tight truncate">{pin.name}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {pin.city}{pin.state ? `, ${pin.state}` : ""}
              {sort === "nearest" && userLocation && (
                <span className="ml-1 text-slate-600">
                  · {Math.round(haversine(userLocation.lat, userLocation.lng, pin.lat, pin.lng))}mi
                </span>
              )}
              {pin.active_audition_count > 0 && <span className="ml-1 text-indigo-400">· {pin.active_audition_count} open</span>}
            </p>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-700/60 flex-shrink-0">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30">← Prev</button>
          <span className="text-xs text-slate-500">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    types: ["major", "professional", "community", "youth", "other"],
    openingsOnly: false,
  });
  const [clusterPins, setClusterPins] = useState(null);
  const [clusterLatLng, setClusterLatLng] = useState(null);
  const [detailPin, setDetailPin] = useState(null);
  const [closingPin, setClosingPin] = useState(null);
  const [pinnedPins, setPinnedPins] = useState(new Set());
  const [sort, setSort] = useState("az");
  const [radiusMiles, setRadiusMiles] = useState(100);
  const [userLocation, setUserLocation] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sidebarView, setSidebarView] = useState("list");
  const [sidebarPin, setSidebarPin] = useState(null);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const hoverTimer = useRef(null);
  const closingTimer = useRef(null);
  const activePinEl = useRef(null);
  const activeClusterEl = useRef(null);
  const closeAllRef = useRef(null);
  const pinByLatLngRef = useRef({});
  const navigate = useNavigate();

  // Stable DOM helpers — refs only, no deps
  const setActivePinDom = useCallback((el) => {
    if (activePinEl.current && activePinEl.current !== el) {
      activePinEl.current.classList.remove("orch-pin-active");
    }
    activePinEl.current = el || null;
    if (el) el.classList.add("orch-pin-active");
  }, []);

  const setActiveClusterDom = useCallback((el) => {
    if (activeClusterEl.current && activeClusterEl.current !== el) {
      activeClusterEl.current.classList.remove("cluster-badge-active");
    }
    activeClusterEl.current = el || null;
    if (el) el.classList.add("cluster-badge-active");
  }, []);

  useEffect(() => {
    api.orchestras.mapPins().then(setPins).finally(() => setLoading(false));
  }, []);

  const togglePin = (id) => {
    setPinnedPins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const visible = useMemo(() => pins.filter((p) => {
    if (!filters.types.includes(normalizeType(p.type))) return false;
    if (filters.openingsOnly && p.active_audition_count === 0) return false;
    return p.lat && p.lng;
  }), [pins, filters]);

  const pinnedVisible   = useMemo(() => visible.filter((p) =>  pinnedPins.has(p.id)), [visible, pinnedPins]);
  const unpinnedVisible = useMemo(() => visible.filter((p) => !pinnedPins.has(p.id)), [visible, pinnedPins]);

  const pinByLatLng = useMemo(() => {
    const m = {};
    unpinnedVisible.forEach((p) => { m[`${p.lat},${p.lng}`] = p; });
    return m;
  }, [unpinnedVisible]);

  const startClosingPin = (pin) => {
    if (!pin || pinnedPins.has(pin.id)) return;
    clearTimeout(closingTimer.current);
    setClosingPin(pin);
    closingTimer.current = setTimeout(() => setClosingPin(null), CLOSE_ANIM_MS);
  };

  const closeAll = () => {
    startClosingPin(detailPin);
    setActivePinDom(null);
    setActiveClusterDom(null);
    setClusterPins(null);
    setClusterLatLng(null);
    setDetailPin(null);
  };
  closeAllRef.current = closeAll;

  // Keep pinByLatLng accessible in stable callbacks via ref
  pinByLatLngRef.current = pinByLatLng;

  // Stable handlers — same reference across renders so MarkerClusterGroup
  // never sees prop changes, which would trigger refreshClusters() and loop the animation
  const stableShowCluster = useCallback((e) => {
    clearTimeout(hoverTimer.current);
    setClusterLatLng(e.layer.getLatLng());
    setActiveClusterDom(e.layer.getElement()?.querySelector(".cluster-badge"));
    setActivePinDom(null);
    const found = e.layer.getAllChildMarkers()
      .map((m) => pinByLatLngRef.current[`${m._latlng.lat},${m._latlng.lng}`])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (found.length) { setClusterPins(found); setDetailPin(null); }
  }, [setActiveClusterDom, setActivePinDom]);

  const stableClusterMouseOut = useCallback(() => {
    hoverTimer.current = setTimeout(() => closeAllRef.current?.(), HOVER_CLOSE_MS);
  }, []);

  const clusterIconCreate = useCallback((cluster) =>
    L.divIcon({
      html: `<div class="cluster-badge">${cluster.getChildCount()}</div>`,
      className: "",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    }), []);

  const clusterEventHandlers = useMemo(() => ({
    clusterclick: stableShowCluster,
    clustermouseover: stableShowCluster,
    clustermouseout: stableClusterMouseOut,
  }), [stableShowCluster, stableClusterMouseOut]);

  return (
    <div className="flex gap-3 p-3 bg-slate-900" style={{ height: "calc(100vh - 56px - 41px)" }}>
      <style>{PIN_CSS}</style>

      <InfoPanel expanded={infoExpanded} navigate={navigate} />

      {/* Map frame */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-600/50 shadow-lg min-w-0">
        {/* Info panel toggle — top-left of map */}
        <button
          className="absolute top-3 left-3 z-[999] w-8 h-8 bg-slate-800/90 border border-slate-600 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 shadow-md transition-colors pointer-events-auto"
          onClick={() => setInfoExpanded((v) => !v)}
          title={infoExpanded ? "Close info panel" : "About stand.partners"}
        >
          {infoExpanded ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          )}
        </button>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-[2000] bg-slate-900/60">
            <span className="text-gray-400">Loading orchestras...</span>
          </div>
        )}
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
          wheelPxPerZoomLevel={120}
          zoomSnap={0.5}
          zoomDelta={0.5}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <UserLocationLayer userLocation={userLocation} radiusMiles={radiusMiles} />
          <CenterOnUserButton userLocation={userLocation} />
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
            zoomToBoundsOnClick={false}
            eventHandlers={clusterEventHandlers}
            iconCreateFunction={clusterIconCreate}
          >
            {unpinnedVisible.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                icon={createIcon(TYPE_COLORS[normalizeType(pin.type)], pin.active_audition_count > 0)}
                eventHandlers={{
                  mouseover: (e) => {
                    clearTimeout(hoverTimer.current);
                    setActivePinDom(e.target.getElement()?.querySelector(".orch-pin"));
                    setActiveClusterDom(null);
                    startClosingPin(detailPin?.id !== pin.id ? detailPin : null);
                    setDetailPin(pin);
                    setClusterPins(null);
                  },
                  mouseout: () => { hoverTimer.current = setTimeout(closeAll, HOVER_CLOSE_MS); },
                  click: () => {
                    clearTimeout(hoverTimer.current);
                    setDetailPin(pin);
                    setClusterPins(null);
                    setSidebarPin(pin);
                    setSidebarView("detail");
                  },
                }}
              />
            ))}
          </MarkerClusterGroup>

          {/* Pinned markers — always visible, never clustered */}
          {pinnedVisible.map((pin) => (
            <Marker
              key={`pinned-${pin.id}`}
              position={[pin.lat, pin.lng]}
              icon={createIcon(TYPE_COLORS[normalizeType(pin.type)], pin.active_audition_count > 0)}
              eventHandlers={{
                click: () => { setSidebarPin(pin); setSidebarView("detail"); },
              }}
            />
          ))}

          {/* Closing animation popup (briefly visible while fading out) */}
          {closingPin && !pinnedPins.has(closingPin.id) && closingPin.id !== detailPin?.id && (
            <PinPopupOverlay
              key={`closing-${closingPin.id}`}
              pin={closingPin}
              hoverTimer={hoverTimer}
              closeAll={closeAll}
              hasBack={false}
              onBack={null}
              navigate={navigate}
              pinnedPins={pinnedPins}
              togglePin={togglePin}
              isClosing={true}
            />
          )}

          {/* Active hover popup */}
          {detailPin && !pinnedPins.has(detailPin.id) && (
            <PinPopupOverlay
              key={detailPin.id}
              pin={detailPin}
              hoverTimer={hoverTimer}
              closeAll={closeAll}
              hasBack={!!clusterPins}
              onBack={() => setDetailPin(null)}
              navigate={navigate}
              pinnedPins={pinnedPins}
              togglePin={togglePin}
            />
          )}

          {/* Permanent popups for pinned pins */}
          {pinnedVisible.map((pin) => (
            <PinnedPopupOverlay key={`popup-${pin.id}`} pin={pin} navigate={navigate} togglePin={togglePin} />
          ))}

          {/* Cluster list — positioned above the cluster marker */}
          {clusterPins && !detailPin && clusterLatLng && (
            <ClusterListOverlay
              pins={clusterPins}
              latlng={clusterLatLng}
              hoverTimer={hoverTimer}
              closeAll={closeAll}
              onSelectPin={(pin) => { closeAll(); setSidebarPin(pin); setSidebarView("detail"); }}
              pinnedPins={pinnedPins}
              togglePin={togglePin}
              navigate={navigate}
            />
          )}
        </MapContainer>
      </div>

      <OrchestraSidebar
        pins={visible}
        filters={filters}
        setFilters={setFilters}
        userLocation={userLocation}
        setUserLocation={setUserLocation}
        sort={sort}
        setSort={setSort}
        radiusMiles={radiusMiles}
        setRadiusMiles={setRadiusMiles}
        perPage={perPage}
        setPerPage={setPerPage}
        page={page}
        setPage={setPage}
        sidebarView={sidebarView}
        setSidebarView={setSidebarView}
        sidebarPin={sidebarPin}
        setSidebarPin={setSidebarPin}
        pinnedPins={pinnedPins}
        togglePin={togglePin}
        navigate={navigate}
      />

    </div>
  );
}
