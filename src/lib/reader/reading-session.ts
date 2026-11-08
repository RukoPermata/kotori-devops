export interface ReadingSample {
  charsRead: number;
  timestamp: number;
}

export interface PaceOptions {
  minDeltaChars?: number;
  maxDeltaSeconds?: number;
  minPace?: number;
  maxPace?: number;
}

const DEFAULTS: Required<PaceOptions> = {
  minDeltaChars: 20,
  maxDeltaSeconds: 300,
  minPace: 50,
  maxPace: 1500,
};

interface PaceDelta {
  chars: number;
  seconds: number;
}

function usableDeltas(samples: ReadingSample[], options: PaceOptions): PaceDelta[] {
  const minDeltaChars = options.minDeltaChars ?? DEFAULTS.minDeltaChars;
  const maxDeltaSeconds = options.maxDeltaSeconds ?? DEFAULTS.maxDeltaSeconds;

  if (!Array.isArray(samples) || samples.length < 2) return [];

  const sorted = samples
    .filter(
      (sample) =>
        Number.isFinite(sample?.charsRead) && Number.isFinite(sample?.timestamp)
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  const deltas: PaceDelta[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const chars = sorted[i].charsRead - sorted[i - 1].charsRead;
    const seconds = (sorted[i].timestamp - sorted[i - 1].timestamp) / 1000;

    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > maxDeltaSeconds) continue;
    if (!Number.isFinite(chars) || chars < minDeltaChars) continue;

    deltas.push({ chars, seconds });
  }

  return deltas;
}

export function charsPerMinute(samples: ReadingSample[], options: PaceOptions = {}): number {
  const deltas = usableDeltas(samples, options);
  if (deltas.length === 0) return 0;

  const paces = deltas
    .map((delta) => (delta.chars / delta.seconds) * 60)
    .sort((a, b) => a - b);

  const middle = Math.floor(paces.length / 2);
  const median = paces.length % 2 === 0
    ? (paces[middle - 1] + paces[middle]) / 2
    : paces[middle];

  const minPace = options.minPace ?? DEFAULTS.minPace;
  const maxPace = options.maxPace ?? DEFAULTS.maxPace;
  return Math.round(Math.min(maxPace, Math.max(minPace, median)));
}

export function movingAveragePace(
  samples: ReadingSample[],
  window = 5,
  alpha = 0.35
): number {
  const deltas = usableDeltas(samples, {});
  if (deltas.length === 0) return 0;

  const recent = deltas
    .map((delta) => (delta.chars / delta.seconds) * 60)
    .slice(-Math.max(1, window));

  let average = recent[0];
  for (let i = 1; i < recent.length; i++) {
    average = alpha * recent[i] + (1 - alpha) * average;
  }

  return Math.round(average);
}

export function estimateRemainingMinutes(
  charsRemaining: number,
  charsPerMinuteValue: number
): number | null {
  if (!Number.isFinite(charsRemaining)) return null;

  const remaining = Math.max(0, charsRemaining);
  if (remaining === 0) return 0;
  if (!Number.isFinite(charsPerMinuteValue) || charsPerMinuteValue <= 0) return null;

  return remaining / charsPerMinuteValue;
}

export function formatDuration(
  minutes: number,
  language: "ID" | "EN" = "EN"
): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "—";

  const rounded = Math.round(minutes);
  if (rounded < 1) return "<1m";

  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  const hourSuffix = language === "ID" ? "j" : "h";

  return hours > 0 ? `${hours}${hourSuffix} ${remainder}m` : `${remainder}m`;
}
