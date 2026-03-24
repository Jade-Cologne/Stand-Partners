import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { api } from "../api";

const TYPE_COLORS = {
  professional: "#4f46e5",
  regional:     "#0891b2",
  community:    "#d97706",
  youth:        "#16a34a",
  other:        "#9333ea",
};

const TYPE_LABELS = {
  professional: "Professional",
  regional:     "Regional",
  community:    "Community",
  youth:        "Youth",
  other:        "Other",
};

function normalizeType(type) {
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

function Legend() {
  return (
    <div className="absolute bottom-8 left-4 z-[1000] bg-gray-900/90 rounded-lg shadow-lg p-3 text-sm border border-gray-700">
      <p className="font-semibold text-gray-200 mb-2">Orchestra type</p>
      {Object.entries(TYPE_LABELS).map(([type, label]) => (
        <div key={type} className="flex items-center gap-2 mb-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
          <span className="text-gray-400">{label}</span>
        </div>
      ))}
      <div className="border-t border-gray-700 mt-2 pt-2 space-y-1">
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 13 13">
            <circle cx="6.5" cy="6.5" r="5" fill="#6b7280" fillOpacity="0.65" stroke="white" strokeWidth="1"/>
          </svg>
          <span className="text-xs text-gray-500">No openings</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 13 13">
            <polygon points="6.5,0.5 12.5,6.5 6.5,12.5 0.5,6.5" fill="#6b7280" stroke="white" strokeWidth="1"/>
          </svg>
          <span className="text-xs text-gray-500">Open auditions</span>
        </div>
      </div>
    </div>
  );
}

function FilterPanel({ filters, setFilters, totalPins }) {
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-gray-900/90 rounded-lg shadow-lg p-4 w-56 border border-gray-700">
      <p className="font-semibold text-gray-200 mb-3">Filter map</p>
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">Orchestra type</label>
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <label key={type} className="flex items-center gap-2 text-sm text-gray-300 mb-1 cursor-pointer">
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
            {label}
          </label>
        ))}
      </div>
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">Openings only</label>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.openingsOnly}
            onChange={(e) => setFilters((f) => ({ ...f, openingsOnly: e.target.checked }))}
          />
          Show orchestras with open auditions
        </label>
      </div>
      <p className="text-xs text-gray-500">{totalPins} orchestras shown</p>
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
  const navigate = useNavigate();

  useEffect(() => {
    api.orchestras.mapPins().then(setPins).finally(() => setLoading(false));
  }, []);

  const visible = pins.filter((p) => {
    if (!filters.types.includes(normalizeType(p.type))) return false;
    if (filters.openingsOnly && p.active_audition_count === 0) return false;
    return p.lat && p.lng;
  });

  return (
    <div className="relative" style={{ height: "calc(100vh - 56px - 41px)" }}>
      <style>{PIN_CSS}</style>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-[2000] bg-white/60">
          <span className="text-gray-500">Loading orchestras...</span>
        </div>
      )}
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={40}
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
              >
                <Popup>
                  <div className="min-w-[160px]">
                    <p className="font-semibold text-gray-900 mb-0.5">{pin.name}</p>
                    <p className="text-xs text-gray-500 mb-2">
                      {pin.city}{pin.state ? `, ${pin.state}` : ""}
                      {" · "}{TYPE_LABELS[normalizeType(pin.type)]}
                    </p>
                    {hasAuditions ? (
                      <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full mb-2">
                        {pin.active_audition_count} open audition{pin.active_audition_count !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="inline-block text-xs text-gray-400 mb-2">No current openings</span>
                    )}
                    <br />
                    <button
                      className="text-xs text-indigo-600 hover:underline"
                      onClick={() => navigate(`/orchestras/${pin.id}`)}
                    >
                      View orchestra →
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
      <Legend />
      <FilterPanel filters={filters} setFilters={setFilters} totalPins={visible.length} />
    </div>
  );
}
