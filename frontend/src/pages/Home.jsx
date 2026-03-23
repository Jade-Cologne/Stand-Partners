import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { api } from "../api";

const TYPE_COLORS = {
  professional: "#4f46e5",  // indigo
  regional:     "#0891b2",  // cyan
  community:    "#d97706",  // amber
  youth:        "#16a34a",  // green
};

const TYPE_LABELS = {
  professional: "Professional",
  regional:     "Regional",
  community:    "Community",
  youth:        "Youth",
};

function Legend() {
  return (
    <div className="absolute bottom-8 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">Orchestra type</p>
      {Object.entries(TYPE_LABELS).map(([type, label]) => (
        <div key={type} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: TYPE_COLORS[type] }}
          />
          <span className="text-gray-600">{label}</span>
        </div>
      ))}
    </div>
  );
}

function FilterPanel({ filters, setFilters, totalPins }) {
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4 w-56">
      <p className="font-semibold text-gray-700 mb-3">Filter map</p>
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">Orchestra type</label>
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <label key={type} className="flex items-center gap-2 text-sm text-gray-700 mb-1 cursor-pointer">
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
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.openingsOnly}
            onChange={(e) => setFilters((f) => ({ ...f, openingsOnly: e.target.checked }))}
          />
          Show orchestras with open auditions
        </label>
      </div>
      <p className="text-xs text-gray-400">{totalPins} orchestras shown</p>
    </div>
  );
}

export default function Home() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    types: ["professional", "regional", "community", "youth"],
    openingsOnly: false,
  });
  const navigate = useNavigate();

  useEffect(() => {
    api.orchestras.mapPins().then(setPins).finally(() => setLoading(false));
  }, []);

  const visible = pins.filter((p) => {
    if (!filters.types.includes(p.type)) return false;
    if (filters.openingsOnly && p.active_audition_count === 0) return false;
    return p.lat && p.lng;
  });

  return (
    <div className="relative" style={{ height: "calc(100vh - 56px - 41px)" }}>
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {visible.map((pin) => (
          <CircleMarker
            key={pin.id}
            center={[pin.lat, pin.lng]}
            radius={pin.active_audition_count > 0 ? 9 : 6}
            pathOptions={{
              color: TYPE_COLORS[pin.type],
              fillColor: TYPE_COLORS[pin.type],
              fillOpacity: pin.active_audition_count > 0 ? 0.85 : 0.45,
              weight: pin.active_audition_count > 0 ? 2 : 1,
            }}
          >
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-semibold text-gray-900 mb-0.5">{pin.name}</p>
                <p className="text-xs text-gray-500 mb-2">
                  {pin.city}{pin.state ? `, ${pin.state}` : ""}
                  {" · "}{TYPE_LABELS[pin.type]}
                </p>
                {pin.active_audition_count > 0 ? (
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
          </CircleMarker>
        ))}
      </MapContainer>
      <Legend />
      <FilterPanel filters={filters} setFilters={setFilters} totalPins={visible.length} />
    </div>
  );
}
