// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  enableIndexedDbPersistence,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  serverTimestamp,
  collectionGroup,
  writeBatch,
  deleteDoc,
  query,
  limit,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Offline (opcional)
enableIndexedDbPersistence(db).catch(() => {});

export type WeighIn = { date: string; weight: number; createdAt?: any };
export type Participant = {
  id: string;
  name: string;
  startWeight: number;
  goalWeight: number;
  createdAt?: any;
  entries: WeighIn[];
};

export function formatDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function fsListAll(): Promise<{ participants: Participant[] }> {
  const partsSnap = await getDocs(collection(db, "participants"));
  const pMap = new Map<string, Participant>();
  partsSnap.forEach((d) => {
    const data = d.data() as any;
    pMap.set(d.id, {
      id: d.id,
      name: data.name,
      startWeight: Number(data.startWeight),
      goalWeight: Number(data.goalWeight),
      createdAt: data.createdAt,
      entries: [],
    });
  });

  const entriesSnap = await getDocs(collectionGroup(db, "entries"));
  entriesSnap.forEach((d) => {
    const data = d.data() as any;
    const pid = data.participantId;
    const p = pMap.get(pid);
    if (p) {
      p.entries.push({
        date: String(data.date),
        weight: Number(data.weight),
        createdAt: data.createdAt,
      });
    }
  });

  const participants = Array.from(pMap.values()).map((p) => {
    if (!p.entries || p.entries.length === 0) {
      p.entries = [{ date: formatDateISO(), weight: p.startWeight }];
    } else {
      p.entries.sort((a, b) => a.date.localeCompare(b.date));
    }
    return p;
  });

  return { participants };
}

export async function fsAddParticipant(p: {
  id: string;
  name: string;
  startWeight: number;
  goalWeight: number;
}) {
  const ref = doc(db, "participants", p.id);
  await setDoc(ref, {
    name: p.name,
    startWeight: Number(p.startWeight),
    goalWeight: Number(p.goalWeight),
    createdAt: serverTimestamp(),
  });

  const today = formatDateISO(new Date());
  const eRef = doc(db, "participants", p.id, "entries", today);
  await setDoc(eRef, {
    participantId: p.id,
    date: today,
    weight: Number(p.startWeight),
    createdAt: serverTimestamp(),
  });

  return { id: p.id };
}

export async function fsAddEntry(entry: { participantId: string; date: string; weight: number }) {
  const pRef = doc(db, "participants", entry.participantId);
  const pSnap = await getDoc(pRef);
  if (!pSnap.exists()) throw new Error("El participante no existe");

  const eRef = doc(db, "participants", entry.participantId, "entries", entry.date);
  await setDoc(
    eRef,
    {
      participantId: entry.participantId,
      date: entry.date,
      weight: Number(entry.weight),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  return { upserted: true };
}

/** Actualiza nombre, startWeight o goalWeight del participante */
export async function fsUpdateParticipant(p: {
  id: string;
  name: string;
  startWeight: number;
  goalWeight: number;
}) {
  const ref = doc(db, "participants", p.id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("El participante no existe");

  await setDoc(
    ref,
    {
      name: p.name,
      startWeight: Number(p.startWeight),
      goalWeight: Number(p.goalWeight),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Nota: no tocamos las entradas existentes. Si necesitas alinear la entrada inicial,
  // podríamos actualizar la primera (por fecha) aparte.
  return { id: p.id, updated: true };
}

/** Elimina participante y TODAS sus entradas en lotes de hasta 500 */
export async function fsDeleteParticipant(id: string) {
  const pRef = doc(db, "participants", id);

  // Borrar subcolección entries en lotes
  while (true) {
    const batch = writeBatch(db);
    const entriesRef = collection(db, "participants", id, "entries");
    const snap = await getDocs(query(entriesRef, limit(500)));
    if (snap.empty) break;
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Borrar el documento del participante
  await deleteDoc(pRef);
  return { id, deleted: true };
}
