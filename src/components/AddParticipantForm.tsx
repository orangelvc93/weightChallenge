// src/components/AddParticipantForm.tsx
import React, { useState } from "react";
import type { Participant } from "../types";
import { fsAddParticipant, formatDateISO } from "../firebase";
import { uid } from "../lib/utils";

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

export default function AddParticipantForm({ onAdd }: { onAdd: (p: Participant) => void }) {
    const [name, setName] = useState("");
    const [startWeight, setStartWeight] = useState<string>("");
    const [goalWeight, setGoalWeight] = useState<string>("");

    const disabled = !name || !startWeight || !goalWeight;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        const start = Number(startWeight);
        const goal = Number(goalWeight);
        if (!isFinite(start) || !isFinite(goal)) return;

        const newP: Participant = {
            id: uid(),
            name: name.trim(),
            startWeight: start,
            goalWeight: goal,
            entries: [{ date: formatDateISO(new Date()), weight: start }],
        };

        await fsAddParticipant({
            id: newP.id,
            name: newP.name,
            startWeight: newP.startWeight,
            goalWeight: newP.goalWeight,
        });

        onAdd(newP);
        setName(""); setStartWeight(""); setGoalWeight("");
    }

    return (
        <Card className="p-4">
            <SectionTitle title="Crear participante" subtitle="Define peso inicial y meta personal" />
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
                <input type="number" step="0.1" className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Peso inicial" value={startWeight} onChange={(e) => setStartWeight(e.target.value)} />
                <input type="number" step="0.1" className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Meta" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
                <button type="submit" disabled={disabled}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2">
                    Agregar
                </button>
            </form>
        </Card>
    );
}
