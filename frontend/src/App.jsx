import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import Auditions from "./pages/Auditions";
import OrchestraDetail from "./pages/OrchestraDetail";
import Excerpts from "./pages/Excerpts";
import ExcerptDetail from "./pages/ExcerptDetail";
import AddEnsemble from "./pages/AddEnsemble";

function Nav() {
  const linkClass = ({ isActive }) =>
    `text-sm font-medium px-3 py-1.5 rounded transition-colors ${
      isActive
        ? "bg-indigo-700 text-white"
        : "text-gray-400 hover:text-white hover:bg-gray-800"
    }`;

  return (
    <header className="bg-slate-950 border-b border-indigo-900/40 sticky top-0 z-[1000]">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-14">
        <NavLink to="/" className="font-bold text-indigo-400 text-lg mr-4 hover:text-indigo-300">
          stand.partners
        </NavLink>
        <NavLink to="/auditions" className={linkClass}>Auditions</NavLink>
        <NavLink to="/excerpts" className={linkClass}>Excerpts</NavLink>
        <div className="flex-1" />
        <NavLink to="/add-ensemble" className={linkClass}>Add Ensemble</NavLink>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-slate-950">
        <Nav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auditions" element={<Auditions />} />
            <Route path="/orchestras/:id" element={<OrchestraDetail />} />
            <Route path="/excerpts" element={<Excerpts />} />
            <Route path="/excerpts/:id" element={<ExcerptDetail />} />
            <Route path="/add-ensemble" element={<AddEnsemble />} />
          </Routes>
        </main>
        <footer className="text-center text-xs text-gray-500 py-4 border-t border-indigo-900/40 bg-slate-950">
          stand.partners — audition listings updated daily
        </footer>
      </div>
    </BrowserRouter>
  );
}
