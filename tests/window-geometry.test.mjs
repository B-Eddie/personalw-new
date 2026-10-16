import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveWindow, resizeWindow } from '../js/window-geometry.mjs';

const start = { x: 200, y: 100, width: 810, height: 628 };
const bounds = { width: 1358, height: 873 };

test('successive drags start from the committed position, without accumulating offsets', () => {
  let current = { ...start };
  for (let i = 0; i < 100; i++) {
    current = { ...current, ...moveWindow(current, 40, 25, bounds) };
    current = { ...current, ...moveWindow(current, -40, -25, bounds) };
  }
  assert.deepEqual(current, start);
});
test('dragging beyond the viewport keeps the titlebar reachable', () => {
  assert.deepEqual(moveWindow(start, -5000, -5000, bounds), { x: 0, y: 0 });
  assert.deepEqual(moveWindow(start, 5000, 5000, bounds), { x: 548, y: 829 });
});
test('northwest resizing holds the opposite corner and enforces minimum size', () => {
  const resized = resizeWindow(start, 5000, 5000, 'nw', bounds);
  assert.deepEqual(resized, { x: 630, y: 468, width: 380, height: 260 });
  assert.equal(resized.x + resized.width, start.x + start.width);
  assert.equal(resized.y + resized.height, start.y + start.height);
});
test('southeast resizing stops at available desktop bounds', () => {
  assert.deepEqual(resizeWindow(start, 5000, 5000, 'se', bounds),
    { x: 200, y: 100, width: 1158, height: 773 });
});
test('northwest resize cannot lose a window above or left of the screen', () => {
  assert.deepEqual(resizeWindow(start, -5000, -5000, 'nw', bounds),
    { x: 0, y: 0, width: 1010, height: 728 });
});
