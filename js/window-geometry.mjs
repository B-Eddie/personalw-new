export const clamp = (value, min, max) => Math.max(min, Math.min(Math.max(min, max), value));

export function moveWindow(start, dx, dy, bounds) {
  return {
    x: clamp(start.x + dx, 0, bounds.width - start.width),
    y: clamp(start.y + dy, 0, bounds.height - 44),
  };
}

export function resizeWindow(start, dx, dy, direction, bounds) {
  const minWidth = Math.min(380, bounds.width);
  const minHeight = Math.min(260, bounds.height);
  let { x, y, width, height } = start;
  const right = x + width;
  const bottom = y + height;
  if (direction.includes('e')) width = clamp(width + dx, minWidth, bounds.width - x);
  if (direction.includes('s')) height = clamp(height + dy, minHeight, bounds.height - y);
  if (direction.includes('w')) {
    x = clamp(x + dx, 0, right - minWidth);
    width = right - x;
  }
  if (direction.includes('n')) {
    y = clamp(y + dy, 0, bottom - minHeight);
    height = bottom - y;
  }
  return { x, y, width, height };
}
