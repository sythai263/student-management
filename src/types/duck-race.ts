import type { Student } from "./student";

export interface RaceState {
  speeds: number[][];
  positions: number[];
  trackLength: number;
  winnerName: string;
}

export interface DuckRaceData {
  students: Student[];
  winnerId: string;
}
