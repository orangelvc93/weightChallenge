// src/components/ManageParticipants.tsx
import React, { useState } from "react";
import type { Participant } from "../types";
import { fsUpdateParticipant, fsDeleteParticipant } from "../firebase";

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

export default function ManageParticipants({
    participants, onUpdated, onDeleted,
}: { participants: Participant[]; onUpdated: (p: Participant) => void; onDeleted: (id: string) => void; }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<Participant | null>(null);
    const [busy, setBusy] = useState(false);

    function startEdit(p: Participant) { setForm({ ...p }); setOpen(true); }
    function close() { setOpen(false); setForm(null); }

    async function submitEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!form) return;
        setBusy(true);
        try {
            await fsUpdateParticipant({
                id: form.id,
                name: form.name.trim(),
                startWeight: Number(form.startWeight),
                goalWeight: Number(form.goalWeight),
            });
            onUpdated({ ...form, name: form.name.trim() });
            close();
        } finally { setBusy(false); }
    }

    async function remove(id: string, name: string) {
        if (!window.confirm(`¿Eliminar a "${name}" y TODAS sus entradas?`)) return;
        setBusy(true);
        try {
            await fsDeleteParticipant(id);
            onDeleted(id);
        } finally { setBusy(false); }
    }

    return (
        <Card className="p-4">
            <SectionTitle title="Gestionar participantes" subtitle="Edita o elimina participantes" />
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-slate-600">
                            <th className="py-2">Nombre</th>
                            <th className="py-2">Inicio (kg)</th>
                            <th className="py-2">Meta (kg)</th>
                            <th className="py-2 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {participants.map((p) => (
                            <tr key={p.id} className="border-t">
                                <td className="py-2">{p.name}</td>
                                <td className="py-2">{p.startWeight}</td>
                                <td className="py-2">{p.goalWeight}</td>
                                <td className="py-2 text-right">
                                    <button onClick={() => startEdit(p)} className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 mr-2">Editar</button>
                                    <button onClick={() => remove(p.id, p.name)} className="px-3 py-1 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                        {participants.length === 0 && (<tr><td colSpan={4} className="py-4 text-center text-slate-500">Sin participantes</td></tr>)}
                    </tbody>
                </table>
            </div>

            {open && form && (
                <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
                    <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-5">
                        <h3 className="text-lg font-bold text-emerald-800 mb-3">Editar participante</h3>
                        <form onSubmit={submitEdit} className="grid gap-3">
                            <input className="border rounded-xl px-3 py-2" value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" />
                            <input type="number" step="0.1" className="border rounded-xl px-3 py-2" value={form.startWeight}
                                onChange={(e) => setForm({ ...form, startWeight: Number(e.target.value) })} placeholder="Peso inicial" />
                            <input type="number" step="0.1" className="border rounded-xl px-3 py-2" value={form.goalWeight}
                                onChange={(e) => setForm({ ...form, goalWeight: Number(e.target.value) })} placeholder="Meta" />
                            <div className="flex justify-end gap-2 mt-2">
                                <button type="button" onClick={close} className="px-3 py-2 rounded-xl border">Cancelar</button>
                                <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50">
                                    {busy ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Card>
    );
}
