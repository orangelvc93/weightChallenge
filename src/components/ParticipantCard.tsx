// src/components/ParticipantCard.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { Participant } from "../types";
import { computeProgress, progressColor, trendLabel, parseISO } from "../lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Confetti from "react-confetti";

function Card({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
    return <div className={`rounded-2xl shadow-md bg-white border border-emerald-200 ${className}`}>{children}</div>;
}

export default function ParticipantCard({ p, onViewHistory }: { p: Participant; onViewHistory: (id: string) => void }) {
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
