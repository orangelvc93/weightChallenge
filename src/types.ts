// src/types.ts
export type WeighIn = { date: string; weight: number };

export type Participant = {
  id: string;
  name: string;
  startWeight: number;
  goalWeight: number;
  entries: WeighIn[];
};
