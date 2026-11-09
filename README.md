# ts-rolling-window

Tracks min, max, and average over a sliding window of numbers.

```js
import { RollingWindow } from 'ts-rolling-window';

const w = new RollingWindow(3);
w.push(10);
w.push(20);
w.push(30);
console.log(w.stats()); // RollingWindowStats { min: 10, max: 30, average: 20, count: 3 }

w.push(5); // evicts 10
console.log(w.min());     // 5
console.log(w.max());     // 30
console.log(w.average()); // 18.333333333333332
```

## Why this exists

Computing min, max, and average over a sliding window is a common streaming
operation, but naive implementations either rescan the window on every query
(O(n) per query) or fail to handle eviction correctly. This library keeps the
aggregates up to date incrementally: push and eviction are O(1) amortized,
and min/max are recomputed only when the evicted value was the current min or
max. The trade-off is a small amount of extra bookkeeping (a Map of value
counts) to support fast eviction without a full scan.

## Edge case

The window reports statistics over however many elements have been pushed so
far. It does not wait until the window is full. If you need to distinguish a
partially filled window, check `count` against `size`.
