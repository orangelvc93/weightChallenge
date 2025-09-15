// src/components/WeeklyWeighIn.tsx
import React, { useState } from "react";
import type { Participant, WeighIn } from "../types";
import { fsAddEntry, formatDateISO } from "../firebase";
import { nextMonday, isPastDeadline } from "../lib/utils";

function Card({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
    return <div className={`rounded-2xl shadow-md bg-white border border-emerald-200 ${className}`}>{children}</div>;
}
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-emerald-800">{title}</h2>
            {subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}
        </div>
    );
}

export default function WeeklyWeighIn({
    participants, onAddEntry,
}: { participants: Participant[]; onAddEntry: (id: string, entry: WeighIn) => void }) {
    const [selectedId, setSelectedId] = useState<string>(participants[0]?.id ?? "");
    const [weight, setWeight] = useState<string>("");
    const [dateISO, setDateISO] = useState<string>(formatDateISO(nextMonday(new Date())));
    const locked = isPastDeadline(new Date(dateISO));

    async function add(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedId) return;
        const w = Number(weight);
        if (!isFinite(w) || locked) return;

        await fsAddEntry({ participantId: selectedId, date: dateISO, weight: w });
        onAddEntry(selectedId, { date: dateISO, weight: w });
        setWeight("");
    }

    return (
        <Card className="p-4">
            <SectionTitle title="Registro semanal" subtitle="Agrega el peso de cada participante (lunes)." />
            <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select className="border rounded-xl px-3 py-2" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                    {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="date" className="border rounded-xl px-3 py-2" value={dateISO} onChange={(e) => setDateISO(e.target.value)} />
                <input type="number" step="0.1" className="border rounded-xl px-3 py-2" placeholder="Peso" value={weight} onChange={(e) => setWeight(e.target.value)} />
                <button type="submit" disabled={!selectedId || !weight || locked}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 disabled:opacity-40">
                    Guardar
                </button>
                {locked && <div className="text-xs text-rose-600 self-center">La fecha supera la fecha tope (10 de diciembre).</div>}
            </form>
        </Card>
    );
}
