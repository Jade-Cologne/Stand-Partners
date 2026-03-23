import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";

const TYPE_CHIP_COLORS = {
  professional: "bg-indigo-100 text-indigo-700",
  regional:     "bg-cyan-100 text-cyan-700",
  community:    "bg-amber-100 text-amber-700",
  youth:        "bg-green-100 text-green-700",
};

function SubListSection({ info, personnelManager, personnelEmail }) {
  if (!info) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-700 mb-1">Sub List</p>
        <p>
          No sub list information found on this orchestra's website.
          {personnelManager || personnelEmail ? (
            <> Consider reaching out to the personnel manager
              {personnelManager && <strong> {personnelManager}</strong>}
              {personnelEmail && (
                <> at <a href={`mailto:${personnelEmail}`} className="text-indigo-600 hover:underline">{personnelEmail}</a></>
              )}
              .
            </>
          ) : "."}
        </p>
      </div>
    );
  }

  if (info.has_sublist === null) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-700 mb-1">Sub List</p>
        <p>
          No mention of a sub list on this orchestra's website.
          {(personnelManager || personnelEmail) && (
            <> You may want to contact
              {personnelManager && <strong> {personnelManager}</strong>}
              {personnelEmail && (
                <> at <a href={`mailto:${personnelEmail}`} className="text-indigo-600 hover:underline">{personnelEmail}</a></>
              )}
              .
            </>
          )}
        </p>
      </div>
    );
  }

  if (info.has_sublist === false) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700 mb-1">Sub List</p>
        <p>This orchestra does not maintain a sub list.</p>
      </div>
    );
  }

  // has_sublist === true
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
      <p className="font-semibold text-emerald-800 mb-2">Sub List — Active</p>
      {info.has_formal_submission && (
        <div className="mb-3">
          <p className="text-emerald-700 font-medium">Formal submission required</p>
          {info.submission_details && (
            <p className="text-emerald-700 mt-1">{info.submission_details}</p>
          )}
          {info.submission_url && (
            <a
              href={info.submission_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-indigo-600 hover:underline"
            >
              Submission form / info →
            </a>
          )}
        </div>
      )}
      {(info.contact_name || info.contact_email || info.contact_phone) && (
        <div className="text-gray-700">
          <p className="font-medium mb-0.5">Contact</p>
          {info.contact_name && <p>{info.contact_name}</p>}
          {info.contact_email && (
            <a href={`mailto:${info.contact_email}`} className="text-indigo-600 hover:underline block">{info.contact_email}</a>
          )}
          {info.contact_phone && <p>{info.contact_phone}</p>}
        </div>
      )}
      {info.notes && <p className="text-gray-600 mt-2 text-xs">{info.notes}</p>}
    </div>
  );
}

function AuditionRow({ audition }) {
  const deadline = audition.deadline
    ? new Date(audition.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{audition.position}</p>
          {audition.audition_location && (
            <p className="text-xs text-gray-500">{audition.audition_location}</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-500 shrink-0">
          <p>Deadline: {deadline}</p>
          {audition.source_url && (
            <a href={audition.source_url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
              Source →
            </a>
          )}
        </div>
      </div>
      {audition.excerpts?.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-600 mb-1">Excerpts required:</p>
          <div className="flex flex-wrap gap-1">
            {audition.excerpts.map((exc) => (
              <Link
                key={exc.id}
                to={`/excerpts/${exc.id}`}
                className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors"
              >
                {exc.composer} — {exc.title}
                {exc.pdf_path && " 📄"}
              </Link>
            ))}
          </div>
        </div>
      )}
      {audition.raw_excerpt_text && audition.excerpts?.length === 0 && (
        <p className="mt-1 text-xs text-gray-500 italic">{audition.raw_excerpt_text}</p>
      )}
    </div>
  );
}

export default function OrchestraDetail() {
  const { id } = useParams();
  const [orchestra, setOrchestra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.orchestras.get(id)
      .then(setOrchestra)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;
  if (error) return <div className="p-8 text-red-500 text-sm">{error}</div>;
  if (!orchestra) return null;

  const activeAuditions = orchestra.auditions?.filter((a) => a.active) ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">{orchestra.name}</h1>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_CHIP_COLORS[orchestra.type]}`}>
            {orchestra.type}
          </span>
        </div>
        <p className="text-gray-500 text-sm">
          {orchestra.city}{orchestra.state ? `, ${orchestra.state}` : ""}
          {orchestra.country !== "US" ? `, ${orchestra.country}` : ""}
        </p>
        {orchestra.website && (
          <a
            href={orchestra.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline text-sm mt-1 inline-block"
          >
            {orchestra.website}
          </a>
        )}
      </div>

      {/* Auditions */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Current Auditions
          {activeAuditions.length > 0 && (
            <span className="ml-2 text-sm font-normal text-indigo-600">({activeAuditions.length})</span>
          )}
        </h2>
        {activeAuditions.length === 0 ? (
          <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-4">
            No current openings listed.
          </p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg px-4">
            {activeAuditions.map((a) => (
              <AuditionRow key={a.id} audition={a} />
            ))}
          </div>
        )}
      </section>

      {/* Sub List */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Sub List</h2>
        <SubListSection
          info={orchestra.sub_list_info}
          personnelManager={orchestra.personnel_manager_name}
          personnelEmail={orchestra.personnel_manager_email}
        />
      </section>
    </div>
  );
}
