export function easeInOutCubic(progress: number) {
  const t = Math.min(1, Math.max(0, progress));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function carouselTarget(
  current: number,
  offsets: number[],
  maximum: number,
  direction: -1 | 1,
) {
  const end = Math.max(0, maximum);
  const stops = [
    ...new Set([0, ...offsets, end].map((n) => Math.min(end, Math.max(0, n)))),
  ].sort((a, b) => a - b);
  return direction === 1
    ? (stops.find((n) => n > current + 2) ?? end)
    : (stops.toReversed().find((n) => n < current - 2) ?? 0);
}
