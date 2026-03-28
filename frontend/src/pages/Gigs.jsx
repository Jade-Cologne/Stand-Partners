import { useState } from "react";

const INSTRUMENTS = ["All", "Violin", "Viola", "Cello", "Bass", "Flute", "Oboe", "Clarinet", "Bassoon", "Horn", "Trumpet", "Trombone", "Tuba", "Percussion", "Piano", "Harp", "Voice", "Multiple"];
const GIG_TYPES = ["All", "Performance", "Wedding/Event", "Recording", "Teaching", "Pit Orchestra", "Sub Work"];

const SAMPLE_GIGS = [
  {
    id: 1,
    title: "Violin II needed — wedding string quartet",
    type: "Wedding/Event",
    instrument: "Violin",
    location: "Chicago, IL",
    date: "2026-04-19",
    pay: "$220",
    postedBy: "Lake Shore String Quartet",
    description: "Need a reliable Violin II for a Saturday afternoon wedding ceremony and cocktail hour. Standard quartet repertoire, parts provided in advance.",
    contact: "lakeshore.quartet@example.com",
    posted: "2026-03-25",
  },
  {
    id: 2,
    title: "Cellist for studio recording session",
    type: "Recording",
    instrument: "Cello",
    location: "Nashville, TN",
    date: "2026-04-22",
    pay: "$350",
    postedBy: "Third Rail Studios",
    description: "Looking for an experienced cellist for a 3-hour recording session. Contemporary classical/crossover material. Sight-reading required.",
    contact: "booking@thirdrailstudios.example.com",
    posted: "2026-03-26",
  },
  {
    id: 3,
    title: "Sub needed — Principal Oboe",
    type: "Sub Work",
    instrument: "Oboe",
    location: "Denver, CO",
    date: "2026-04-25",
    pay: "AFM Scale",
    postedBy: "Centennial Chamber Orchestra",
    description: "One service (rehearsal + concert) on April 25. Mahler 4 and Mendelssohn Italian Symphony. Must be available for afternoon rehearsal.",
    contact: "personnel@centennialchamber.example.com",
    posted: "2026-03-24",
  },
  {
    id: 4,
    title: "Pianist for piano trio concert series",
    type: "Performance",
    instrument: "Piano",
    location: "Boston, MA",
    date: "2026-05-08",
    pay: "Revenue share",
    postedBy: "Beacon Hill Chamber Series",
    description: "We have a violinist and cellist and are looking for a committed pianist for a 3-concert series this spring. Beethoven Op. 1 No. 3 and Brahms Op. 8.",
    contact: "beaconhillchamber@example.com",
    posted: "2026-03-22",
  },
  {
    id: 5,
    title: "Brass quintet — corporate event",
    type: "Wedding/Event",
    instrument: "Multiple",
    location: "New York, NY",
    date: "2026-05-02",
    pay: "$300/player",
    postedBy: "Premier Event Music",
    description: "Need a full brass quintet (2 trumpets, horn, trombone, tuba) for a 90-minute corporate dinner. Background music, light classical and jazz standards.",
    contact: "gigs@premiereventmusic.example.com",
    posted: "2026-03-27",
  },
  {
    id: 6,
    title: "Pit orchestra — community theater production",
    type: "Pit Orchestra",
    instrument: "Multiple",
    location: "Portland, OR",
    date: "2026-05-14",
    pay: "$150/service",
    postedBy: "Westside Community Theater",
    description: "Seeking strings (2 violins, viola, cello), woodwinds, and piano for Into the Woods. 3 rehearsals + 4 performances. Scores provided.",
    contact: "music@westsidetheater.example.com",
    posted: "2026-03-20",
  },
];

const TYPE_COLORS = {
  "Performance":    "bg-indigo-900/60 text-indigo-300",
  "Wedding/Event":  "bg-amber-900/60 text-amber-300",
  "Recording":      "bg-cyan-900/60 text-cyan-300",
  "Teaching":       "bg-green-900/60 text-green-300",
  "Pit Orchestra":  "bg-purple-900/60 text-purple-300",
  "Sub Work":       "bg-rose-900/60 text-rose-300",
};

function GigCard({ gig }) {
  const date = new Date(gig.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const posted = new Date(gig.posted + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[gig.type] ?? "bg-slate-700 text-slate-300"}`}>
              {gig.type}
            </span>
            <span className="text-xs text-slate-500">Posted {posted}</span>
          </div>
          <h3 className="font-semibold text-slate-100 leading-snug">{gig.title}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{gig.postedBy} · {gig.location}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-emerald-400">{gig.pay}</p>
          <p className="text-xs text-slate-500 mt-0.5">{date}</p>
        </div>
      </div>

      <p className="text-sm text-slate-400 leading-relaxed">{gig.description}</p>

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-xs text-slate-500">{gig.instrument}</span>
        <a
          href={`mailto:${gig.contact}`}
          className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          Contact →
        </a>
      </div>
    </div>
  );
}

export default function Gigs() {
  const [instrument, setInstrument] = useState("All");
  const [type, setType] = useState("All");

  const filtered = SAMPLE_GIGS.filter((g) => {
    if (instrument !== "All" && g.instrument !== instrument && g.instrument !== "Multiple") return false;
    if (type !== "All" && g.type !== type) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Gig Board</h1>
        <p className="text-slate-500 text-sm mt-1">One-off performances, recording sessions, sub work, and event playing opportunities.</p>
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
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Type</label>
          <select
            className="text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {GIG_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col justify-end ml-auto">
          <p className="text-xs text-slate-500 pb-1.5">{filtered.length} listing{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Sample data notice */}
      <div className="mb-5 px-4 py-2.5 bg-amber-900/20 border border-amber-700/40 rounded-lg text-xs text-amber-400">
        Showing sample listings — live gig postings coming soon.
      </div>

      {/* Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((g) => <GigCard key={g.id} gig={g} />)}
        {filtered.length === 0 && (
          <p className="col-span-full text-slate-500 text-sm py-8 text-center">No listings match these filters.</p>
        )}
      </div>

      {/* Post gig CTA */}
      <div className="mt-10 p-6 bg-slate-800/60 border border-slate-700 rounded-xl text-center">
        <p className="text-slate-300 font-medium mb-1">Post a gig</p>
        <p className="text-slate-500 text-sm mb-4">Free listings for ensembles and individuals. Accounts coming soon.</p>
        <button className="px-4 py-2 text-sm bg-indigo-700/50 text-indigo-300 border border-indigo-600/50 rounded-lg opacity-60 cursor-not-allowed">
          Post a Listing
        </button>
      </div>
    </div>
  );
}
