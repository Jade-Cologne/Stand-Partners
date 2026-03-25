import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
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
  if (type === "regional") return "professional"; // DB migration alias
  return type in TYPE_COLORS ? type : "other";
}

// Extra transparent padding increases the hover/click area without changing visual size
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

function MapControls({ filters, setFilters, totalPins }) {
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-slate-900/92 backdrop-blur-sm rounded-xl shadow-xl p-4 w-56 border border-slate-700/60">
      <p className="font-semibold text-slate-200 mb-3 text-sm">Filter map</p>
      <div className="mb-3">
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
              }}
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[type] }} />
            {label}
          </label>
        ))}
      </div>
      <div className="mb-3">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.openingsOnly}
            onChange={(e) => setFilters((f) => ({ ...f, openingsOnly: e.target.checked }))}
          />
          Open auditions only
        </label>
      </div>
      <div className="border-t border-slate-700/60 pt-2.5 space-y-1.5">
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
      <p className="text-xs text-slate-600 mt-2.5">{totalPins} orchestras shown</p>
    </div>
  );
}

export default function Home() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    types: ["professional", "regional", "community", "youth", "other"],
    openingsOnly: false,
  });
  const [clusterPins, setClusterPins] = useState(null);
  const [detailPin, setDetailPin] = useState(null);
  const hoverTimer = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.orchestras.mapPins().then(setPins).finally(() => setLoading(false));
  }, []);

  const visible = pins.filter((p) => {
    if (!filters.types.includes(normalizeType(p.type))) return false;
    if (filters.openingsOnly && p.active_audition_count === 0) return false;
    return p.lat && p.lng;
  });

  const pinByLatLng = useMemo(() => {
    const m = {};
    visible.forEach(p => { m[`${p.lat},${p.lng}`] = p; });
    return m;
  }, [visible]);

  const showCluster = (e) => {
    clearTimeout(hoverTimer.current);
    const found = e.layer.getAllChildMarkers()
      .map(m => pinByLatLng[`${m._latlng.lat},${m._latlng.lng}`])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (found.length) {
      setClusterPins(found);
      setDetailPin(null);
    }
  };

  const closeAll = () => { setClusterPins(null); setDetailPin(null); };

  return (
    <div className="relative" style={{ height: "calc(100vh - 56px - 41px)" }}>
      <style>{PIN_CSS}</style>
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
                  mouseover: (e) => {
                    clearTimeout(hoverTimer.current);
                    const { x, y } = e.containerPoint;
                    setDetailPin(pin);
                    setClusterPins(null);
                  },
                  mouseout: () => {
                    hoverTimer.current = setTimeout(closeAll, 1000);
                  },
                  click: (e) => {
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
            pin={detailPin}
            hoverTimer={hoverTimer}
            closeAll={closeAll}
            hasBack={!!clusterPins}
            onBack={() => setDetailPin(null)}
            navigate={navigate}
          />
        )}
      </MapContainer>
      <MapControls filters={filters} setFilters={setFilters} totalPins={visible.length} />
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
  );
}
