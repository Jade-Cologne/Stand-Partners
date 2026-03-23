import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const INSTRUMENT_FAMILIES = [
  { label: "All", value: "" },
  { label: "Strings", value: "violin,viola,cello,bass,harp" },
  { label: "Woodwinds", value: "flute,oboe,clarinet,bassoon,piccolo,english horn,contrabassoon,bass clarinet,saxophone" },
  { label: "Brass", value: "trumpet,horn,trombone,tuba,euphonium" },
  { label: "Percussion", value: "timpani,percussion,snare,marimba,xylophone" },
  { label: "Keyboard", value: "piano,organ,harpsichord,celesta" },
];

const ORCHESTRA_TYPES = [
  { label: "All types", value: "" },
  { label: "Professional", value: "professional" },
  { label: "Regional", value: "regional" },
  { label: "Community", value: "community" },
  { label: "Youth", value: "youth" },
];

function AuditionCard({ audition }) {
  const deadline = audition.deadline
    ? new Date(audition.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{audition.position}</p>
          <Link
            to={`/orchestras/${audition.orchestra_id}`}
            className="text-sm text-indigo-600 hover:underline"
          >
            {audition.orchestra_name || `Orchestra #${audition.orchestra_id}`}
          </Link>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {audition.is_per_service && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Per-service</span>
          )}
          {audition.is_section_audition && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Section</span>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
        {deadline && (
          <span>
            <span className="font-medium text-gray-700">Deadline:</span> {deadline}
          </span>
        )}
        {audition.excerpts?.length > 0 && (
          <span>
            <span className="font-medium text-gray-700">Excerpts:</span> {audition.excerpts.length} listed
          </span>
        )}
        {audition.source_url && (
          <a
            href={audition.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline ml-auto"
          >
            Source →
          </a>
        )}
      </div>
    </div>
  );
}

export default function Auditions() {
  const [auditions, setAuditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orchestraNames, setOrchestraNames] = useState({});
  const [filters, setFilters] = useState({ instrument: "", type: "" });

  useEffect(() => {
    setLoading(true);
    const params = { active: true };
    if (filters.instrument) params.instrument = filters.instrument;
    if (filters.type) params.type = filters.type;

    api.auditions.list(params)
      .then(setAuditions)
      .finally(() => setLoading(false));
  }, [filters]);

  // Fetch orchestra names for auditions
  useEffect(() => {
    const missingIds = [...new Set(auditions.map((a) => a.orchestra_id))].filter(
      (id) => !orchestraNames[id]
    );
    missingIds.forEach((id) => {
      api.orchestras.get(id).then((o) => {
        setOrchestraNames((prev) => ({ ...prev, [id]: o.name }));
      });
    });
  }, [auditions]);

  const enriched = auditions.map((a) => ({
    ...a,
    orchestra_name: orchestraNames[a.orchestra_id],
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Open Auditions</h1>
      <p className="text-gray-500 text-sm mb-6">Updated daily from orchestra websites.</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={filters.instrument}
          onChange={(e) => setFilters((f) => ({ ...f, instrument: e.target.value }))}
        >
          {INSTRUMENT_FAMILIES.map((fam) => (
            <option key={fam.value} value={fam.value}>{fam.label}</option>
          ))}
        </select>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        >
          {ORCHESTRA_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading auditions...</p>
      ) : enriched.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No open auditions found.</p>
          <p className="text-sm mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 mb-2">{enriched.length} listing{enriched.length !== 1 ? "s" : ""}</p>
          {enriched.map((a) => (
            <AuditionCard key={a.id} audition={a} />
          ))}
        </div>
      )}
    </div>
  );
}
