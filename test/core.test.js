import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RollingWindow, RollingWindowStats } from '../src/index.js';

test('constructor rejects invalid sizes', () => {
  assert.throws(() => new RollingWindow(0), RangeError);
  assert.throws(() => new RollingWindow(-1), RangeError);
  assert.throws(() => new RollingWindow(1.5), RangeError);
  assert.throws(() => new RollingWindow('3'), RangeError);
});

test('empty window throws on stats queries', () => {
  const w = new RollingWindow(3);
  assert.throws(() => w.stats(), /empty/);
  assert.throws(() => w.min(), /empty/);
  assert.throws(() => w.max(), /empty/);
  assert.throws(() => w.average(), /empty/);
});

test('tracks min, max, average while filling', () => {
  const w = new RollingWindow(4);
  w.push(5);
  assert.deepEqual(w.stats(), new RollingWindowStats(5, 5, 5, 1));
  w.push(1);
  assert.deepEqual(w.stats(), new RollingWindowStats(1, 5, 3, 2));
  w.push(3);
  assert.deepEqual(w.stats(), new RollingWindowStats(1, 5, 3, 3));
  w.push(2);
  assert.deepEqual(w.stats(), new RollingWindowStats(1, 5, 2.75, 4));
});

test('evicts oldest when full', () => {
  const w = new RollingWindow(3);
  w.push(10);
  w.push(20);
  w.push(30);
  assert.equal(w.min(), 10);
  assert.equal(w.max(), 30);
  assert.equal(w.average(), 20);
  w.push(5); // evicts 10
  assert.equal(w.min(), 5);
  assert.equal(w.max(), 30);
  assert.equal(w.average(), (20 + 30 + 5) / 3);
  w.push(40); // evicts 20
  assert.equal(w.min(), 5);
  assert.equal(w.max(), 40);
  assert.equal(w.average(), (30 + 5 + 40) / 3);
});

test('min and max update correctly when evicting the min', () => {
  const w = new RollingWindow(3);
  w.push(1);
  w.push(2);
  w.push(3);
  assert.equal(w.min(), 1);
  w.push(4); // evicts 1, min becomes 2
  assert.equal(w.min(), 2);
  assert.equal(w.max(), 4);
  assert.equal(w.average(), 3);
});

test('min and max update correctly when evicting the max', () => {
  const w = new RollingWindow(3);
  w.push(10);
  w.push(5);
  w.push(1);
  assert.equal(w.max(), 10);
  w.push(7); // evicts 10, max becomes 7
  assert.equal(w.min(), 1);
  assert.equal(w.max(), 7);
  assert.equal(w.average(), (5 + 1 + 7) / 3);
});

test('duplicate values are handled correctly', () => {
  const w = new RollingWindow(4);
  w.push(2);
  w.push(2);
  w.push(2);
  w.push(2);
  assert.equal(w.min(), 2);
  assert.equal(w.max(), 2);
  assert.equal(w.average(), 2);
  w.push(2); // evicts one 2
  assert.equal(w.min(), 2);
  assert.equal(w.max(), 2);
  assert.equal(w.average(), 2);
  w.push(5); // evicts another 2, now [2,2,2,5]
  assert.equal(w.min(), 2);
  assert.equal(w.max(), 5);
  assert.equal(w.average(), (2 + 2 + 2 + 5) / 4);
});

test('rejects non-finite and non-number values', () => {
  const w = new RollingWindow(2);
  assert.throws(() => w.push(NaN), TypeError);
  assert.throws(() => w.push(Infinity), RangeError);
  assert.throws(() => w.push(-Infinity), RangeError);
  assert.throws(() => w.push('1'), TypeError);
  assert.throws(() => w.push(null), TypeError);
  assert.throws(() => w.push(undefined), TypeError);
});

test('count and size reflect state', () => {
  const w = new RollingWindow(3);
  assert.equal(w.size, 3);
  assert.equal(w.count, 0);
  w.push(1);
  assert.equal(w.count, 1);
  w.push(2);
  w.push(3);
  assert.equal(w.count, 3);
  w.push(4);
  assert.equal(w.count, 3);
});

test('average is exact for simple values', () => {
  const w = new RollingWindow(3);
  w.push(1);
  w.push(2);
  w.push(3);
  assert.equal(w.average(), 2);
  w.push(4);
  assert.equal(w.average(), 3);
});

test('single-element window works', () => {
  const w = new RollingWindow(1);
  w.push(42);
  assert.equal(w.min(), 42);
  assert.equal(w.max(), 42);
  assert.equal(w.average(), 42);
  w.push(7);
  assert.equal(w.min(), 7);
  assert.equal(w.max(), 7);
  assert.equal(w.average(), 7);
});
