import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";

export default function ExcerptDetail() {
  const { id } = useParams();
  const [excerpt, setExcerpt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.excerpts.get(id)
      .then(setExcerpt)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-gray-500 text-sm">Loading...</div>;
  if (!excerpt) return <div className="p-8 text-gray-500">Excerpt not found.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/excerpts" className="text-sm text-indigo-400 hover:underline mb-4 inline-block">
        ← Back to excerpt library
      </Link>

      <h1 className="text-2xl font-bold text-gray-100 mt-2">{excerpt.title}</h1>
      <p className="text-gray-400 mt-1">{excerpt.work}</p>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Composer</p>
          <p className="text-gray-200">{excerpt.composer}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Instrument</p>
          <p className="text-gray-200 capitalize">{excerpt.instrument}</p>
        </div>
        {excerpt.movement && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Movement / Passage</p>
            <p className="text-gray-200">{excerpt.movement}</p>
          </div>
        )}
      </div>

      {excerpt.notes && (
        <div className="mt-4 bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm text-gray-400">
          {excerpt.notes}
        </div>
      )}

      <div className="mt-6">
        {excerpt.pdf_path ? (
          <a
            href={`/${excerpt.pdf_path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Download PDF
          </a>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No PDF available yet for this excerpt.
          </p>
        )}
      </div>
    </div>
  );
}
