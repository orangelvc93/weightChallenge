// src/App.tsx
import React, { useMemo, useState } from "react";
import { useParticipants } from "./hooks/useParticipants";
import type { Participant, WeighIn } from "./types";
import AddParticipantForm from "./components/AddParticipantForm";
import WeeklyWeighIn from "./components/WeeklyWeighIn";
import ManageParticipants from "./components/ManageParticipants";
import Leaderboard from "./components/Leaderboard";
import ParticipantCard from "./components/ParticipantCard";
import HistoryModal from "./components/HistoryModal";
import { DEADLINE, mergeEntry } from "./lib/utils";

function Card({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`rounded-2xl shadow-md bg-white border border-emerald-200 ${className}`}>{children}</div>;
}

export default function App() {
  const { participants, setParticipants, loading, err } = useParticipants();

  function addParticipant(p: Participant) {
    setParticipants((prev) => [...prev, p]);
  }
  function addEntry(id: string, entry: WeighIn) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, entries: mergeEntry(p.entries, entry) } : p)));
  }
  function updateParticipantLocal(p: Participant) {
    setParticipants((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
  }
  function deleteParticipantLocal(id: string) {
    setParticipants((prev) => prev.filter((x) => x.id !== id));
  }

  // Histórico (modal)
  const [historyId, setHistoryId] = useState<string | null>(null);
  const selectedForHistory = useMemo(() => participants.find((p) => p.id === historyId) || null, [participants, historyId]);

  const daysLeft = Math.max(0, Math.ceil((DEADLINE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <header className="bg-emerald-800 text-white p-4 font-bold text-center">
        Desafío de Peso – SOLCA TICs
        <span className="ml-2 text-xs bg-emerald-600/30 px-2 py-0.5 rounded-full">
          Fecha tope: 10 de diciembre · {daysLeft} días restantes
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
        {err && <Card className="p-6 text-center text-amber-700 bg-amber-50 border-amber-200">{err}</Card>}
        {loading ? (
          <Card className="p-6 text-center">Cargando datos…</Card>
        ) : (
          <>
            <AddParticipantForm onAdd={addParticipant} />
            <WeeklyWeighIn participants={participants} onAddEntry={addEntry} />
            <ManageParticipants participants={participants} onUpdated={updateParticipantLocal} onDeleted={deleteParticipantLocal} />
            <Leaderboard participants={participants} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {participants.map((p) => (
                <ParticipantCard key={p.id} p={p} onViewHistory={(id) => setHistoryId(id)} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="text-center text-xs p-4 text-slate-500">Hecho con ❤️ para SOLCA TICs</footer>

      {selectedForHistory && (
        <HistoryModal participant={selectedForHistory} onClose={() => setHistoryId(null)} />
      )}
    </div>
  );
}
