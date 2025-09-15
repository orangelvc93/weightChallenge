// src/components/HistoryModal.tsx
import { useMemo, useState } from "react";
import type { Participant } from "../types";
import { computeProgress, trendLabel } from "../lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function HistoryModal({ participant, onClose }: { participant: Participant; onClose: () => void }) {
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");

    const entries = useMemo(() => {
        const all = [...participant.entries].sort((a, b) => a.date.localeCompare(b.date));
        return all.filter((e) => (!from || e.date >= from) && (!to || e.date <= to));
    }, [participant, from, to]);

    const chartData = useMemo(() => entries.map((e) => ({ date: e.date.slice(5), weight: e.weight })), [entries]);

    const stats = useMemo(() => {
        if (entries.length === 0) return null;
        const first = entries[0].weight;
        const last = entries[entries.length - 1].weight;
        const delta = last - first;
        const progreso = computeProgress(participant.startWeight, participant.goalWeight, last);
        return {
            first, last, delta,
            progresoPct: Math.round(progreso * 100),
            direccion: trendLabel(participant.startWeight, participant.goalWeight),
            meta: participant.goalWeight,
            inicio: participant.startWeight,
        };
    }, [participant, entries]);

    function exportCSV() {
        const rows = [
            ["participantId", "name", "date", "weight(kg)"],
            ...entries.map((e) => [participant.id, participant.name, e.date, String(e.weight)]),
        ];
        const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `historico_${participant.name.replace(/\s+/g, "_")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-[95vw] max-w-3xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-emerald-800">Histórico · {participant.name}</h3>
                    <button onClick={onClose} className="px-3 py-1 rounded-lg border">Cerrar</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                    <input type="date" className="border rounded-xl px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
                    <input type="date" className="border rounded-xl px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
                    <button className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2" onClick={() => { setFrom(""); setTo(""); }}>
                        Limpiar filtros
                    </button>
                    <button className="rounded-xl border border-emerald-300 text-emerald-800 hover:bg-emerald-50 px-4 py-2" onClick={exportCSV}>
                        Exportar CSV
                    </button>
                </div>

                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
                        <div className="p-3 rounded-xl bg-slate-50 border"><div className="text-slate-500">Inicio</div><div className="font-semibold">{stats.inicio} kg</div></div>
                        <div className="p-3 rounded-xl bg-slate-50 border"><div className="text-slate-500">Meta</div><div className="font-semibold">{stats.meta} kg</div></div>
                        <div className="p-3 rounded-xl bg-slate-50 border"><div className="text-slate-500">Último</div><div className="font-semibold">{stats.last} kg</div></div>
                        <div className="p-3 rounded-xl bg-slate-50 border"><div className="text-slate-500">Δ desde primer registro</div>
                            <div className={`font-semibold ${stats.delta >= 0 ? "text-amber-700" : "text-emerald-700"}`}>{stats.delta.toFixed(1)} kg</div>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 col-span-2 md:col-span-1">
                            <div className="text-slate-500">Progreso</div>
                            <div className="font-semibold">{stats.direccion} · {stats.progresoPct}%</div>
                        </div>
                    </div>
                )}

                <div className="h-64 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-600">
                                <th className="py-2">Fecha</th>
                                <th className="py-2">Peso (kg)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e) => (
                                <tr key={e.date} className="border-t">
                                    <td className="py-2">{e.date}</td>
                                    <td className="py-2">{e.weight}</td>
                                </tr>
                            ))}
                            {entries.length === 0 && (
                                <tr><td className="py-4 text-center text-slate-500" colSpan={2}>Sin registros en el rango seleccionado</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
