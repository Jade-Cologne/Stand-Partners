import { useEffect, useState, useRef, useMemo } from "react";
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

function normalizeType(type) {
  if (type === "regional") return "professional";
  return type in TYPE_COLORS ? type : "other";
}

const PAD = 4;
const SVG_SIZE = 22;
const ICON_SIZE = SVG_SIZE + PAD * 2;

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
  .orch-pin:hover { transform: scale(1.45); filter: brightness(0.72); }
  .cluster-badge {
    width: 34px; height: 34px;
    background: rgba(15, 23, 42, 0.88);
    border: 2px solid rgba(255,255,255,0.35);
    border-radius: 50%;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  }
`;

function PinCard({ pin, onClose, onBack, navigate }) {
  const hasAuditions = pin.active_audition_count > 0;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 w-64">
      <div className="flex items-start justify-between mb-1">
        <p className="font-semibold text-gray-100 leading-tight pr-2">{pin.name}</p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none flex-shrink-0">×</button>
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
    </div>
  );
}

function ClusterList({ pins, onSelect, onClose }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-72 max-h-96 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <p className="font-semibold text-gray-200 text-sm">{pins.length} orchestras</p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
      </div>
      <div className="overflow-y-auto flex-1">
        {pins.map((pin) => (
          <button
            key={pin.id}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-800 border-b border-gray-800 last:border-0 transition-colors"
            onClick={() => onSelect(pin)}
          >
            <p className="text-sm text-gray-200 leading-tight">{pin.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {pin.city}{pin.state ? `, ${pin.state}` : ""}
              <span className="ml-2 text-gray-600">· {TYPE_LABELS[normalizeType(pin.type)]}</span>
              {pin.active_audition_count > 0 && (
                <span className="ml-2 text-indigo-400">· {pin.active_audition_count} open</span>
              )}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function PinPopupOverlay({ pin, hoverTimer, closeAll, hasBack, onBack, navigate }) {
  const map = useMap();
  const toPos = () => {
    const p = map.latLngToContainerPoint([pin.lat, pin.lng]);
    return { x: p.x, y: p.y };
  };
  const [pos, setPos] = useState(toPos);
  useMapEvents({ move: () => setPos(toPos()), zoom: () => setPos(toPos()) });

  return (
    <div
      className="absolute z-[1000] pointer-events-auto"
      style={{ left: pos.x, top: pos.y, transform: "translate(-50%, calc(-100% - 14px))" }}
      onMouseEnter={() => clearTimeout(hoverTimer.current)}
      onMouseLeave={() => { hoverTimer.current = setTimeout(closeAll, 1000); }}
    >
      <PinCard pin={pin} onClose={closeAll} onBack={hasBack ? onBack : null} navigate={navigate} />
    </div>
  );
}

function UserLocationLayer({ userLocation, radiusMiles }) {
  const radiusMeters = radiusMiles * 1609.34;
  return (
    <>
      <Circle
        center={[userLocation.lat, userLocation.lng]}
        radius={radiusMeters}
        pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.12, weight: 1.5, opacity: 0.5 }}
      />
      <CircleMarker
        center={[userLocation.lat, userLocation.lng]}
        radius={6}
        pathOptions={{ color: "white", fillColor: "black", fillOpacity: 1, weight: 2 }}
      />
    </>
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

function OrchestraSidebar({
  pins, filters, setFilters,
  userLocation, setUserLocation,
  sort, setSort,
  radiusMiles, setRadiusMiles,
  perPage, setPerPage,
  page, setPage,
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
    if (sort === "az") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "za") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sort === "auditions") {
      list.sort((a, b) => b.active_audition_count - a.active_audition_count || a.name.localeCompare(b.name));
    } else if (sort === "nearest" && userLocation) {
      list.sort((a, b) =>
        haversine(userLocation.lat, userLocation.lng, a.lat, a.lng) -
        haversine(userLocation.lat, userLocation.lng, b.lat, b.lng)
      );
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [pins, sort, userLocation]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const pagePins = sorted.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="w-64 flex-shrink-0 flex flex-col bg-slate-900/95 border border-slate-700/60 rounded-xl shadow-xl overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-slate-700/60 space-y-3 flex-shrink-0">
        <p className="font-semibold text-slate-200 text-sm">Filter</p>
        <div>
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <label key={type} className="flex items-center gap-2 text-sm text-slate-300 mb-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.types.includes(type)}
                onChange={(e) => {
                  setFilters((f) => ({
                    ...f,
                    types: e.target.checked
                      ? [...f.types, type]
                      : f.types.filter((t) => t !== type),
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

        {/* Sort */}
        <div className="border-t border-slate-700/40 pt-3 space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Sort</p>
          <select
            className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
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
                type="number"
                min="10"
                max="5000"
                step="10"
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(Number(e.target.value))}
                className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
              />
              {!userLocation && (
                <p className="text-xs text-amber-500 mt-1">Requesting location…</p>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="border-t border-slate-700/40 pt-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 13 13">
              <circle cx="6.5" cy="6.5" r="5" fill="#94a3b8" fillOpacity="0.65" stroke="white" strokeWidth="1"/>
            </svg>
            <span className="text-xs text-slate-500">No openings</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 13 13">
              <polygon points="6.5,0.5 12.5,6.5 6.5,12.5 0.5,6.5" fill="#94a3b8" stroke="white" strokeWidth="1"/>
            </svg>
            <span className="text-xs text-slate-500">Open auditions</span>
          </div>
        </div>
      </div>

      {/* Orchestra list header */}
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-slate-500">{sorted.length} shown</span>
        <select
          className="text-xs bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-400 focus:outline-none"
          value={perPage}
          onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
      </div>

      {/* Orchestra list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {pagePins.map((pin) => (
          <button
            key={pin.id}
            className="w-full text-left px-3 py-2 hover:bg-slate-800 border-b border-slate-800/60 last:border-0 transition-colors"
            onClick={() => navigate(`/orchestras/${pin.id}`)}
          >
            <p className="text-xs font-medium text-slate-200 leading-tight truncate">{pin.name}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {pin.city}{pin.state ? `, ${pin.state}` : ""}
              {sort === "nearest" && userLocation && (
                <span className="ml-1 text-slate-600">
                  · {Math.round(haversine(userLocation.lat, userLocation.lng, pin.lat, pin.lng))}mi
                </span>
              )}
              {pin.active_audition_count > 0 && (
                <span className="ml-1 text-indigo-400">· {pin.active_audition_count} open</span>
              )}
            </p>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-700/60 flex-shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-xs text-slate-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30"
          >
            Next →
          </button>
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
  const [detailPin, setDetailPin] = useState(null);
  const [sort, setSort] = useState("az");
  const [radiusMiles, setRadiusMiles] = useState(100);
  const [userLocation, setUserLocation] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const hoverTimer = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.orchestras.mapPins().then(setPins).finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => pins.filter((p) => {
    if (!filters.types.includes(normalizeType(p.type))) return false;
    if (filters.openingsOnly && p.active_audition_count === 0) return false;
    return p.lat && p.lng;
  }), [pins, filters]);

  const pinByLatLng = useMemo(() => {
    const m = {};
    visible.forEach((p) => { m[`${p.lat},${p.lng}`] = p; });
    return m;
  }, [visible]);

  const showCluster = (e) => {
    clearTimeout(hoverTimer.current);
    const found = e.layer.getAllChildMarkers()
      .map((m) => pinByLatLng[`${m._latlng.lat},${m._latlng.lng}`])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (found.length) {
      setClusterPins(found);
      setDetailPin(null);
    }
  };

  const closeAll = () => { setClusterPins(null); setDetailPin(null); };

  return (
    <div className="flex gap-3 p-3 bg-slate-950" style={{ height: "calc(100vh - 56px - 41px)" }}>
      <style>{PIN_CSS}</style>

      {/* Map frame */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-700/50 shadow-lg min-w-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-[2000] bg-gray-950/60">
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
          {userLocation && (
            <UserLocationLayer userLocation={userLocation} radiusMiles={radiusMiles} />
          )}
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
            zoomToBoundsOnClick={false}
            eventHandlers={{
              clusterclick: showCluster,
              clustermouseover: showCluster,
              clustermouseout: () => { hoverTimer.current = setTimeout(closeAll, 1000); },
            }}
            iconCreateFunction={(cluster) =>
              L.divIcon({
                html: `<div class="cluster-badge">${cluster.getChildCount()}</div>`,
                className: "",
                iconSize: [34, 34],
                iconAnchor: [17, 17],
              })
            }
          >
            {visible.map((pin) => {
              const color = TYPE_COLORS[normalizeType(pin.type)];
              const hasAuditions = pin.active_audition_count > 0;
              return (
                <Marker
                  key={pin.id}
                  position={[pin.lat, pin.lng]}
                  icon={createIcon(color, hasAuditions)}
                  eventHandlers={{
                    mouseover: () => {
                      clearTimeout(hoverTimer.current);
                      setDetailPin(pin);
                      setClusterPins(null);
                    },
                    mouseout: () => {
                      hoverTimer.current = setTimeout(closeAll, 1000);
                    },
                    click: () => {
                      clearTimeout(hoverTimer.current);
                      setDetailPin(pin);
                      setClusterPins(null);
                    },
                  }}
                />
              );
            })}
          </MarkerClusterGroup>
          {detailPin && (
            <PinPopupOverlay
              key={detailPin.id}
              pin={detailPin}
              hoverTimer={hoverTimer}
              closeAll={closeAll}
              hasBack={!!clusterPins}
              onBack={() => setDetailPin(null)}
              navigate={navigate}
            />
          )}
        </MapContainer>

        {clusterPins && !detailPin && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000]"
            onMouseEnter={() => clearTimeout(hoverTimer.current)}
            onMouseLeave={() => { hoverTimer.current = setTimeout(closeAll, 1000); }}
          >
            <ClusterList pins={clusterPins} onSelect={(p) => setDetailPin(p)} onClose={closeAll} />
          </div>
        )}
      </div>

      {/* Sidebar */}
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
        navigate={navigate}
      />
    </div>
  );
}
