import { useState } from "react";

const INSTRUMENTS = ["All", "Violin", "Viola", "Cello", "Bass", "Flute", "Oboe", "Clarinet", "Bassoon", "Horn", "Trumpet", "Trombone", "Tuba", "Percussion", "Piano", "Harp", "Voice"];
const SEEKING = ["All", "Sub Work", "String Quartet", "Piano Trio", "Piano Quartet", "Wind Quintet", "Brass Quintet", "Accompanist", "Chamber (General)", "Teaching"];

const SAMPLE_MUSICIANS = [
  {
    id: 1,
    name: "Sarah Chen",
    instrument: "Violin",
    location: "Chicago, IL",
    level: "Professional",
    seeking: ["String Quartet", "Chamber (General)"],
    bio: "Section violinist, 8 years orchestral experience. Looking for an established quartet for regular rehearsals and occasional concerts.",
    available: true,
  },
  {
    id: 2,
    name: "Marcus Williams",
    instrument: "Cello",
    location: "New York, NY",
    level: "Professional",
    seeking: ["Sub Work", "Piano Trio", "String Quartet"],
    bio: "Freelance cellist based in Manhattan. Available for sub work on short notice. Happy to read anything.",
    available: true,
  },
  {
    id: 3,
    name: "Jennifer Park",
    instrument: "Piano",
    location: "Los Angeles, CA",
    level: "Professional",
    seeking: ["Accompanist", "Piano Trio", "Piano Quartet"],
    bio: "Collaborative pianist specializing in strings and voice. Have my own studio and am available most weekday evenings.",
    available: true,
  },
  {
    id: 4,
    name: "Daniel Torres",
    instrument: "Viola",
    location: "Boston, MA",
    level: "Professional",
    seeking: ["String Quartet", "Piano Quartet", "Sub Work"],
    bio: "Principal viola with a regional orchestra. Looking to fill out a quartet with committed, serious players at a similar level.",
    available: true,
  },
  {
    id: 5,
    name: "Mei Lin",
    instrument: "Flute",
    location: "Seattle, WA",
    level: "Professional",
    seeking: ["Wind Quintet", "Chamber (General)", "Sub Work"],
    bio: "Freelance flutist with 12 years of professional experience. Open to a regular wind quintet or flexible chamber opportunities.",
    available: false,
  },
  {
    id: 6,
    name: "Robert Hayes",
    instrument: "Horn",
    location: "Houston, TX",
    level: "Community",
    seeking: ["Brass Quintet", "Sub Work"],
    bio: "Amateur horn player, conservatory-trained but currently outside the professional circuit. Looking for a brass quintet for fun.",
    available: true,
  },
  {
    id: 7,
    name: "Aiko Tanaka",
    instrument: "Violin",
    location: "San Francisco, CA",
    level: "Professional",
    seeking: ["String Quartet", "Piano Trio"],
    bio: "Currently between orchestras after relocating from NYC. Have recordings available on request.",
    available: true,
  },
  {
    id: 8,
    name: "Thomas Reeves",
    instrument: "Bass",
    location: "Chicago, IL",
    level: "Professional",
    seeking: ["Sub Work", "Chamber (General)"],
    bio: "Orchestral bassist, comfortable in modern and baroque styles. Available for sub work throughout the Midwest.",
    available: true,
  },
];

const LEVEL_COLORS = {
  Professional: "bg-indigo-900/60 text-indigo-300",
  Community: "bg-amber-900/60 text-amber-300",
  Student: "bg-green-900/60 text-green-300",
};

function MusicianCard({ musician }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-100">{musician.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLORS[musician.level]}`}>
              {musician.level}
            </span>
            {musician.available
              ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 font-medium">Available</span>
              : <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-500 font-medium">Unavailable</span>
            }
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{musician.instrument} · {musician.location}</p>
        </div>
      </div>

      <p className="text-sm text-slate-400 leading-relaxed">{musician.bio}</p>

      <div className="flex flex-wrap gap-1.5">
        {musician.seeking.map((s) => (
          <span key={s} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{s}</span>
        ))}
      </div>

      <button
        className="mt-auto text-sm text-center py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:border-indigo-500 hover:text-indigo-300 transition-colors"
        title="Requires account — coming soon"
      >
        Contact
      </button>
    </div>
  );
}

export default function Connect() {
  const [instrument, setInstrument] = useState("All");
  const [seeking, setSeeking] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(false);

  const filtered = SAMPLE_MUSICIANS.filter((m) => {
    if (instrument !== "All" && m.instrument !== instrument) return false;
    if (seeking !== "All" && !m.seeking.includes(seeking)) return false;
    if (availableOnly && !m.available) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Find Musicians</h1>
        <p className="text-slate-500 text-sm mt-1">Connect with players looking for quartets, trios, sub work, accompanists, and more.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Instrument</label>
          <select
            className="text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
          >
            {INSTRUMENTS.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Looking for</label>
          <select
            className="text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
            value={seeking}
            onChange={(e) => setSeeking(e.target.value)}
          >
            {SEEKING.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col justify-end gap-1">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer pb-1.5">
            <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
            Available only
          </label>
        </div>
        <div className="flex flex-col justify-end ml-auto">
          <p className="text-xs text-slate-500 pb-1.5">{filtered.length} musician{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Sample data notice */}
      <div className="mb-5 px-4 py-2.5 bg-amber-900/20 border border-amber-700/40 rounded-lg text-xs text-amber-400">
        Showing sample profiles — accounts and live listings coming soon.
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((m) => <MusicianCard key={m.id} musician={m} />)}
        {filtered.length === 0 && (
          <p className="col-span-full text-slate-500 text-sm py-8 text-center">No musicians match these filters.</p>
        )}
      </div>

      {/* Post profile CTA */}
      <div className="mt-10 p-6 bg-slate-800/60 border border-slate-700 rounded-xl text-center">
        <p className="text-slate-300 font-medium mb-1">Add your profile</p>
        <p className="text-slate-500 text-sm mb-4">Let other musicians find you. Accounts coming soon.</p>
        <button className="px-4 py-2 text-sm bg-indigo-700/50 text-indigo-300 border border-indigo-600/50 rounded-lg opacity-60 cursor-not-allowed">
          Create Profile
        </button>
      </div>
    </div>
  );
}
