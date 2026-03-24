import { useState } from "react";
import { api } from "../api";

const ORCHESTRA_TYPES = [
  { label: "Select type...", value: "" },
  { label: "Professional", value: "professional" },
  { label: "Regional", value: "regional" },
  { label: "Community", value: "community" },
  { label: "Youth", value: "youth" },
];

export default function AddEnsemble() {
  const [form, setForm] = useState({
    name: "", type: "", website: "", city: "", state: "",
    country: "US", contact_name: "", contact_email: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.requests.submit({
        ...form,
        type: form.type || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h1 className="text-xl font-bold text-gray-100 mb-2">Request submitted</h1>
        <p className="text-gray-500 text-sm">
          Thank you! We'll review your submission and add the ensemble to the map.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full text-sm border border-gray-700 rounded-lg px-3 py-2 bg-gray-800 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelClass = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Add Your Ensemble</h1>
      <p className="text-gray-500 text-sm mb-8">
        Know of an orchestra that should be on stand.partners? Submit it here and
        we'll add it to the directory and start tracking their audition listings.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Ensemble name *</label>
          <input required className={inputClass} value={form.name} onChange={update("name")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Type</label>
            <select className={inputClass} value={form.type} onChange={update("type")}>
              {ORCHESTRA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input
              type="url"
              placeholder="https://"
              className={inputClass}
              value={form.website}
              onChange={update("website")}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className={labelClass}>City</label>
            <input className={inputClass} value={form.city} onChange={update("city")} />
          </div>
          <div>
            <label className={labelClass}>State / Province</label>
            <input className={inputClass} placeholder="e.g. NY" value={form.state} onChange={update("state")} />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input className={inputClass} value={form.country} onChange={update("country")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Your name</label>
            <input className={inputClass} value={form.contact_name} onChange={update("contact_name")} />
          </div>
          <div>
            <label className={labelClass}>Your email *</label>
            <input required type="email" className={inputClass} value={form.contact_email} onChange={update("contact_email")} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Notes (optional)</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Anything else we should know — audition page URL, personnel manager contact, etc."
            value={form.notes}
            onChange={update("notes")}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white font-medium text-sm py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </form>
    </div>
  );
}
