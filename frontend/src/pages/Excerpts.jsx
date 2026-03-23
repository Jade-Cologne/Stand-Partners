import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const INSTRUMENTS = [
  "", "flute", "oboe", "clarinet", "bassoon", "saxophone",
  "trumpet", "horn", "trombone", "tuba",
  "violin", "viola", "cello", "bass", "harp",
  "timpani", "percussion", "piano",
];

export default function Excerpts() {
  const [excerpts, setExcerpts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [instrument, setInstrument] = useState("");

  useEffect(() => {
    setLoading(true);
    api.excerpts.list({ q: search, instrument })
      .then(setExcerpts)
      .finally(() => setLoading(false));
  }, [search, instrument]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Excerpt Library</h1>
      <p className="text-sm text-gray-500 mb-6">
        Excerpts referenced in active audition listings. PDFs added as available.
      </p>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by title, composer, or work..."
          className="flex-1 min-w-48 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
        >
          <option value="">All instruments</option>
          {INSTRUMENTS.filter(Boolean).map((i) => (
            <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading excerpts...</p>
      ) : excerpts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No excerpts found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Composer</th>
                <th className="px-4 py-3">Instrument</th>
                <th className="px-4 py-3">Movement</th>
                <th className="px-4 py-3">PDF</th>
              </tr>
            </thead>
            <tbody>
              {excerpts.map((exc) => (
                <tr key={exc.id} className="border-b border-gray-100 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <Link to={`/excerpts/${exc.id}`} className="text-indigo-600 hover:underline font-medium">
                      {exc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{exc.composer}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{exc.instrument}</td>
                  <td className="px-4 py-3 text-gray-500">{exc.movement || "—"}</td>
                  <td className="px-4 py-3">
                    {exc.pdf_path ? (
                      <a
                        href={`/${exc.pdf_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">Not yet available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
