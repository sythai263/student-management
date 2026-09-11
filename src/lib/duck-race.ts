import type { RaceState, Student } from "@types";

type Scenario = 0 | 1 | 2;

export function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function buildRace(
  students: Student[],
  winnerId: string,
  trackLength: number,
  duration: number,
): RaceState {
  const n = students.length;
  const winnerIndex = students.findIndex((s) => s.id === winnerId);

  const raw: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let t = 0; t < duration; t++) {
      row.push(randomBetween(25, 85));
    }
    raw.push(row);
  }

  const nonWinnerIndexes = Array.from({ length: n }, (_, i) => i).filter((i) => i !== winnerIndex);
  const scenario: Scenario = Math.floor(Math.random() * 3) as Scenario;

  const pacerCount = Math.min(6, Math.max(0, nonWinnerIndexes.length));
  const pacers = new Set<number>();
  while (pacers.size < pacerCount) {
    const pick = Math.floor(Math.random() * nonWinnerIndexes.length);
    pacers.add(nonWinnerIndexes[pick]);
  }

  const weights: number[][] = raw.map(() => new Array(duration).fill(1));

  for (let i = 0; i < n; i++) {
    if (i === winnerIndex) {
      if (scenario === 0) continue;
      if (scenario === 1) {
        for (let t = 0; t < duration; t++) {
          weights[i][t] = t < duration * 0.55 ? 0.55 : 1.65;
        }
      } else {
        for (let t = 0; t < duration; t++) {
          weights[i][t] = t < duration * 0.75 ? 0.35 : 2.1;
        }
      }
    } else if (pacers.has(i)) {
      for (let t = 0; t < duration; t++) {
        weights[i][t] = t < duration * 0.65 ? 0.45 : 1.85;
      }
    } else if (scenario === 2) {
      for (let t = 0; t < duration; t++) {
        weights[i][t] = 0.85;
      }
    }
  }

  const targets = students.map((_, i) => {
    if (i === winnerIndex) return trackLength;
    if (pacers.has(i)) {
      const gap = randomBetween(80, Math.min(220, trackLength * 0.15));
      return Math.max(0, trackLength - gap);
    }
    const gap = randomBetween(250, Math.min(900, trackLength * 0.35));
    return Math.max(0, trackLength - gap);
  });

  const speeds = raw.map((row, i) => {
    const shaped = row.map((v, t) => v * weights[i][t]);
    const shapedSum = shaped.reduce((a, b) => a + b, 0);
    const target = targets[i] ?? 0;
    const scale = target / (shapedSum || 1);
    return shaped.map((v) => v * scale);
  });

  const positions = new Array(n).fill(0);
  const winner = students[winnerIndex] ?? students[0];
  return {
    speeds,
    positions,
    trackLength,
    winnerName: `${winner.lastName} ${winner.firstName}`,
  };
}
