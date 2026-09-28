export type HeaderScrollState = {
  y: number;
  anchor: number;
  direction: -1 | 0 | 1;
  hidden: boolean;
};

export function visibleHeaderAt(y: number): HeaderScrollState {
  return { y, anchor: y, direction: 0, hidden: false };
}

export function nextHeaderScroll(
  previous: HeaderScrollState,
  position: number,
  options: { maximum: number; topBoundary: number; locked: boolean },
): HeaderScrollState {
  // Clamp elastic overscroll so reaching either edge cannot reverse direction.
  const y = Math.max(0, Math.min(position, Math.max(0, options.maximum)));
  if (options.locked || y <= options.topBoundary) return visibleHeaderAt(y);
  const delta = y - previous.y;
  if (delta === 0) return previous;
  const direction = delta > 0 ? 1 : -1;
  const anchor =
    direction === previous.direction ? previous.anchor : previous.y;
  const threshold = direction === 1 ? 20 : 10;
  return {
    y,
    anchor,
    direction,
    hidden:
      Math.abs(y - anchor) >= threshold ? direction === 1 : previous.hidden,
  };
}
