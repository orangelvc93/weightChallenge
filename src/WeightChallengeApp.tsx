import React, { useEffect, useMemo, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import Confetti from "react-confetti";
import {
    fsListAll,
    fsAddParticipant,
    fsAddEntry,
    fsUpdateParticipant,
    fsDeleteParticipant,
    formatDateISO,
} from "./firebase";

// =============================================
// Weight Challenge App – SOLCA TICs (Firestore)
// =============================================

export type WeighIn = { date: string; weight: number };
export type Participant = {
    id: string;
    name: string;
    startWeight: number;
    goalWeight: number;
    entries: WeighIn[];
};

function uid() {
    return Math.random().toString(36).slice(2, 10);
}
function clamp(n: number, min = 0, max = 1) { return Math.max(min, Math.min(max, n)); }
function progressColor(p: number) { return `hsl(${clamp(p) * 120}, 80%, 45%)`; }
function parseISO(s: string) { const [y, m, d] = s.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function nextMonday(from = new Date()) { const d = new Date(from); const day = d.getDay(); const diff = (1 - day + 7) % 7; d.setDate(d.getDate() + diff); return d; }
const DEADLINE = new Date(new Date().getFullYear(), 11 - 1, 10);
function isPastDeadline(date = new Date()) { return date > DEADLINE; }
function computeProgress(start: number, goal: number, current: number) {
    if (start === goal) return 1;
    if (goal < start) return clamp((start - current) / (start - goal));
    return clamp((current - start) / (goal - start));
}
function trendLabel(start: number, goal: number) { return goal === start ? "Mantener" : goal < start ? "Bajar" : "Subir"; }
function mergeEntry(entries: WeighIn[], newEntry: WeighIn): WeighIn[] {
    const map = new Map(entries.map((e) => [e.date, e.weight]));
    map.set(newEntry.date, newEntry.weight);
    return Array.from(map.entries()).map(([date, weight]) => ({ date, weight }))
        .sort((a, b) => +parseISO(a.date) - +parseISO(b.date));
}

/* UI helpers */
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

/* Crear participante */
function AddParticipantForm({ onAdd }: { onAdd: (p: Participant) => void }) {
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

/* Registro semanal */
function WeeklyWeighIn({
    participants, onAddEntry,
}: { participants: Participant[]; onAddEntry: (id: string, entry: WeighIn) => void; }) {
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
                <input type="number" step="0.1" className="border rounded-xl px-3 py-2"
                    placeholder="Peso" value={weight} onChange={(e) => setWeight(e.target.value)} />
                <button type="submit" disabled={!selectedId || !weight || locked}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 disabled:opacity-40">
                    Guardar
                </button>
                {locked && <div className="text-xs text-rose-600 self-center">La fecha supera la fecha tope (10 de diciembre).</div>}
            </form>
        </Card>
    );
}

/* Gestionar participantes (Editar / Eliminar) */
function ManageParticipants({
    participants,
    onUpdated,
    onDeleted,
}: {
    participants: Participant[];
    onUpdated: (p: Participant) => void;
    onDeleted: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<Participant | null>(null);
    const [busy, setBusy] = useState(false);

    function startEdit(p: Participant) {
        setForm({ ...p });
        setOpen(true);
    }
    function close() {
        setOpen(false);
        setForm(null);
    }

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
            onUpdated({
                ...form,
                name: form.name.trim(),
                startWeight: Number(form.startWeight),
                goalWeight: Number(form.goalWeight),
            });
            close();
        } finally {
            setBusy(false);
        }
    }

    async function remove(id: string, name: string) {
        const ok = window.confirm(`¿Eliminar a "${name}" y TODAS sus entradas? Esta acción no se puede deshacer.`);
        if (!ok) return;
        setBusy(true);
        try {
            await fsDeleteParticipant(id);
            onDeleted(id);
        } finally {
            setBusy(false);
        }
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
                                    <button onClick={() => startEdit(p)} className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 mr-2">
                                        Editar
                                    </button>
                                    <button onClick={() => remove(p.id, p.name)} className="px-3 py-1 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200">
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {participants.length === 0 && (
                            <tr><td colSpan={4} className="py-4 text-center text-slate-500">Sin participantes</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal simple */}
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
                                <button type="submit" disabled={busy}
                                    className="px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50">
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
export default function WeightChallengeApp() {
    const { participants, setParticipants, loading, err } = useStorageState();

    function addParticipant(p: Participant) {
        setParticipants((prev) => [...prev, p]);
    }
    function addEntry(id: string, entry: WeighIn) {
        setParticipants((prev) =>
            prev.map((p) => (p.id === id ? { ...p, entries: mergeEntry(p.entries, entry) } : p))
        );
    }
    function updateParticipantLocal(p: Participant) {
        setParticipants((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
    }
    function deleteParticipantLocal(id: string) {
        setParticipants((prev) => prev.filter((x) => x.id !== id));
    }

    // NUEVO: selección para histórico
    const [historyId, setHistoryId] = useState<string | null>(null);
    const selectedForHistory = useMemo(
        () => participants.find(p => p.id === historyId) || null,
        [participants, historyId]
    );

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
                {err && <div className="text-center text-sm text-amber-700 bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl">{err}</div>}
                {loading ? (
                    <Card className="p-6 text-center">Cargando datos…</Card>
                ) : (
                    <>
                        <AddParticipantForm onAdd={addParticipant} />
                        <WeeklyWeighIn participants={participants} onAddEntry={addEntry} />
                        <ManageParticipants
                            participants={participants}
                            onUpdated={updateParticipantLocal}
                            onDeleted={deleteParticipantLocal}
                        />

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

            {/* NUEVO: modal histórico */}
            {selectedForHistory && (
                <HistoryModal
                    participant={selectedForHistory}
                    onClose={() => setHistoryId(null)}
                />
            )}
        </div>
    );
}

/* ============================
   Modal de Histórico (por participante)
   ============================ */
function HistoryModal({
    participant,
    onClose,
}: {
    participant: Participant;
    onClose: () => void;
}) {
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");

    const entries = useMemo(() => {
        const all = [...participant.entries].sort((a, b) => a.date.localeCompare(b.date));
        return all.filter(e => {
            if (from && e.date < from) return false;
            if (to && e.date > to) return false;
            return true;
        });
    }, [participant, from, to]);

    const chartData = useMemo(
        () => entries.map(e => ({ date: e.date.slice(5), weight: e.weight })),
        [entries]
    );

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
            ...entries.map(e => [participant.id, participant.name, e.date, String(e.weight)]),
        ];
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `historico_${participant.name.replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-[95vw] max-w-3xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-emerald-800">
                        Histórico · {participant.name}
                    </h3>
                    <button onClick={onClose} className="px-3 py-1 rounded-lg border">Cerrar</button>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                    <input
                        type="date"
                        className="border rounded-xl px-3 py-2"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        placeholder="Desde"
                    />
                    <input
                        type="date"
                        className="border rounded-xl px-3 py-2"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        placeholder="Hasta"
                    />
                    <button
                        className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2"
                        onClick={() => { setFrom(""); setTo(""); }}
                    >
                        Limpiar filtros
                    </button>
                    <button
                        className="rounded-xl border border-emerald-300 text-emerald-800 hover:bg-emerald-50 px-4 py-2"
                        onClick={exportCSV}
                    >
                        Exportar CSV
                    </button>
                </div>

                {/* Resumen */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
                        <div className="p-3 rounded-xl bg-slate-50 border">
                            <div className="text-slate-500">Inicio</div>
                            <div className="font-semibold">{stats.inicio} kg</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border">
                            <div className="text-slate-500">Meta</div>
                            <div className="font-semibold">{stats.meta} kg</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border">
                            <div className="text-slate-500">Último</div>
                            <div className="font-semibold">{stats.last} kg</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border">
                            <div className="text-slate-500">Δ desde primer registro</div>
                            <div className={`font-semibold ${stats.delta >= 0 ? "text-amber-700" : "text-emerald-700"}`}>
                                {stats.delta.toFixed(1)} kg
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 col-span-2 md:col-span-1">
                            <div className="text-slate-500">Progreso</div>
                            <div className="font-semibold">{stats.direccion} · {stats.progresoPct}%</div>
                        </div>
                    </div>
                )}

                {/* Gráfica */}
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

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-600">
                                <th className="py-2">Fecha</th>
                                <th className="py-2">Peso (kg)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(e => (
                                <tr key={e.date} className="border-t">
                                    <td className="py-2">{e.date}</td>
                                    <td className="py-2">{e.weight}</td>
                                </tr>
                            ))}
                            {entries.length === 0 && (
                                <tr>
                                    <td className="py-4 text-center text-slate-500" colSpan={2}>
                                        Sin registros en el rango seleccionado
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}

/* Tarjeta participante */
function ParticipantCard({ p, onViewHistory }: { p: Participant; onViewHistory: (id: string) => void }) {
    const current = p.entries[p.entries.length - 1]?.weight ?? p.startWeight;
    const progress = computeProgress(p.startWeight, p.goalWeight, current);
    const color = progressColor(progress);
    const goalReached = progress >= 1 - 1e-6;

    const [showConfetti, setShowConfetti] = useState(false);
    useEffect(() => {
        if (!goalReached) return;
        const raw = localStorage.getItem("solca-weight-challenge-celebrations") || "{}";
        let map: Record<string, boolean> = {};
        try { map = JSON.parse(raw) || {}; } catch { }
        if (!map[p.id]) {
            setShowConfetti(true);
            map[p.id] = true;
            localStorage.setItem("solca-weight-challenge-celebrations", JSON.stringify(map));
            const t = setTimeout(() => setShowConfetti(false), 5000);
            return () => clearTimeout(t);
        }
    }, [goalReached, p.id]);

    const chartData = useMemo(
        () => [...p.entries].sort((a, b) => +parseISO(a.date) - +parseISO(b.date)).map((e) => ({ date: e.date.slice(5), weight: e.weight })),
        [p.entries]
    );

    const direction = trendLabel(p.startWeight, p.goalWeight);
    const delta = Math.abs(p.goalWeight - current);
    const deltaTxt = `${delta.toFixed(1)} kg`;

    return (
        <Card className="p-4 flex flex-col gap-3 border-emerald-300 relative overflow-hidden">
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-10">
                    <Confetti numberOfPieces={200} recycle={false} width={window.innerWidth} height={window.innerHeight} />
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-emerald-800">{p.name}</h3>
                    <p className="text-xs text-slate-500">
                        Objetivo: <span className="font-medium">{direction}</span> hasta {p.goalWeight} kg · Inicio: {p.startWeight} kg
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {goalReached ? (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">🎉 ¡Meta lograda!</span>
                    ) : (
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Falta: {deltaTxt}</span>
                    )}
                    <button
                        onClick={() => onViewHistory(p.id)}
                        className="ml-2 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        title="Ver histórico"
                    >
                        Ver histórico
                    </button>
                </div>
            </div>

            {/* Barra y gráfica breve */}
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${progress * 100}%`, background: color }} className="h-full transition-all duration-700" />
            </div>
            <div className="text-xs text-slate-500 -mt-1">Progreso: {(progress * 100).toFixed(0)}%</div>

            <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="weight" stroke={color} strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}


/* Ranking */
function Leaderboard({ participants }: { participants: Participant[] }) {
    const ordered = [...participants]
        .map((p) => {
            const current = p.entries[p.entries.length - 1]?.weight ?? p.startWeight;
            return { name: p.name, progress: computeProgress(p.startWeight, p.goalWeight, current) };
        })
        .sort((a, b) => b.progress - a.progress);

    return (
        <Card className="p-4">
            <SectionTitle title="Ranking de avance" />
            {ordered.map((r, i) => (
                <div key={r.name} className="flex gap-3 items-center">
                    <div className={`w-6 h-6 text-xs grid place-items-center rounded-full ${i === 0 ? "bg-emerald-300" : "bg-emerald-100"}`}>{i + 1}</div>
                    <span className="flex-1">{r.name}</span>
                    <div className="w-1/2 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${r.progress * 100}%`, background: progressColor(r.progress) }} className="h-full" />
                    </div>
                </div>
            ))}
        </Card>
    );
}

/* Storage con Firestore */
function useStorageState() {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const { participants } = await fsListAll();
                const adapt = participants.map((p) => ({
                    id: p.id,
                    name: p.name,
                    startWeight: p.startWeight,
                    goalWeight: p.goalWeight,
                    entries: p.entries.map((e) => ({ date: e.date, weight: e.weight })),
                }));
                setParticipants(adapt);
                setErr(null);
            } catch {
                setErr("No se pudo cargar datos de Firestore.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return { participants, setParticipants, loading, err };
}

/* App */
export default function WeightChallengeApp() {
    const { participants, setParticipants, loading, err } = useStorageState();

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

    const daysLeft = Math.max(0, Math.ceil((DEADLINE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
            <header className="bg-emerald-800 text-white p-4 font-bold text-center">
                Desafío de Peso – SOLCA TICs
                <span className="ml-2 text-xs bg-emerald-600/30 px-2 py-0.5 rounded-full">Fecha tope: 10 de diciembre · {daysLeft} días restantes</span>
            </header>
            <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
                {err && <div className="text-center text-sm text-amber-700 bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl">{err}</div>}
                {loading ? (
                    <Card className="p-6 text-center">Cargando datos…</Card>
                ) : (
                    <>
                        <AddParticipantForm onAdd={addParticipant} />
                        <WeeklyWeighIn participants={participants} onAddEntry={addEntry} />
                        <ManageParticipants
                            participants={participants}
                            onUpdated={updateParticipantLocal}
                            onDeleted={deleteParticipantLocal}
                        />
                        <Leaderboard participants={participants} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {participants.map((p) => <ParticipantCard key={p.id} p={p} />)}
                        </div>
                    </>
                )}
            </main>
            <footer className="text-center text-xs p-4 text-slate-500">Hecho con ❤️ para SOLCA TICs</footer>
        </div>
    );
}
