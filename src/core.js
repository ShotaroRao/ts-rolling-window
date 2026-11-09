// RollingWindow: tracks min, max, and average over a sliding window of numbers.
//
// Design decision: the window holds the last `size` numbers pushed. It reports
// min, max, and average over those numbers. When the window is not yet full,
// stats are computed over however many numbers have been pushed. This is the
// common interpretation for streaming stats and avoids special-casing startup.
//
// The class is intentionally not generic: it works on numbers only. NaN is
// rejected at push time because silently poisoning min/max/average is worse
// than a loud error.

export class RollingWindowStats {
  /**
   * @param {number} min
   * @param {number} max
   * @param {number} average
   * @param {number} count
   */
  constructor(min, max, average, count) {
    this.min = min;
    this.max = max;
    this.average = average;
    this.count = count;
  }
}

export class RollingWindow {
  /**
   * @param {number} size Number of elements in the sliding window. Must be a positive integer.
   */
  constructor(size) {
    if (!Number.isInteger(size) || size <= 0) {
      throw new RangeError('RollingWindow size must be a positive integer');
    }
    this._size = size;
    this._buffer = new Array(size);
    this._start = 0; // index of the oldest element
    this._count = 0; // number of elements currently stored (<= size)
    this._sum = 0;
    this._min = Infinity;
    this._max = -Infinity;
    // We track a multiset of values to support O(1) amortized removal of the
    // oldest value when the window is full. A plain array scan would be O(n).
    // For simplicity and zero dependencies we use a Map from value -> count.
    // Values are numbers, so Map keys work (including -0 vs 0? Map uses SameValueZero,
    // so -0 and 0 are the same key; that's fine for min/max/average).
    this._counts = new Map();
  }

  /**
   * Push a new number into the window. If the window is full, the oldest number
   * is evicted first.
   * @param {number} value
   */
  push(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError('RollingWindow only accepts finite numbers');
    }
    if (!Number.isFinite(value)) {
      throw new RangeError('RollingWindow only accepts finite numbers');
    }

    if (this._count === this._size) {
      this._evictOldest();
    }

    const idx = (this._start + this._count) % this._size;
    this._buffer[idx] = value;
    this._count++;
    this._sum += value;

    // Update counts map
    const prev = this._counts.get(value) || 0;
    this._counts.set(value, prev + 1);

    // Update min/max
    if (value < this._min) this._min = value;
    if (value > this._max) this._max = value;
  }

  /**
   * @returns {number} Number of elements currently in the window.
   */
  get count() {
    return this._count;
  }

  /**
   * @returns {number} Configured maximum window size.
   */
  get size() {
    return this._size;
  }

  /**
   * @returns {RollingWindowStats} Current statistics over the window.
   * @throws {Error} if the window is empty.
   */
  stats() {
    if (this._count === 0) {
      throw new Error('Cannot compute stats on an empty RollingWindow');
    }
    return new RollingWindowStats(
      this._min,
      this._max,
      this._sum / this._count,
      this._count
    );
  }

  /**
   * @returns {number} Minimum value in the window.
   * @throws {Error} if the window is empty.
   */
  min() {
    if (this._count === 0) {
      throw new Error('Cannot compute min on an empty RollingWindow');
    }
    return this._min;
  }

  /**
   * @returns {number} Maximum value in the window.
   * @throws {Error} if the window is empty.
   */
  max() {
    if (this._count === 0) {
      throw new Error('Cannot compute max on an empty RollingWindow');
    }
    return this._max;
  }

  /**
   * @returns {number} Average of values in the window.
   * @throws {Error} if the window is empty.
   */
  average() {
    if (this._count === 0) {
      throw new Error('Cannot compute average on an empty RollingWindow');
    }
    return this._sum / this._count;
  }

  /**
   * Remove the oldest element from the window and update aggregates.
   * @private
   */
  _evictOldest() {
    const oldest = this._buffer[this._start];
    this._start = (this._start + 1) % this._size;
    this._count--;
    this._sum -= oldest;

    const remaining = this._counts.get(oldest) - 1;
    if (remaining === 0) {
      this._counts.delete(oldest);
    } else {
      this._counts.set(oldest, remaining);
    }

    // Recompute min/max only if the evicted value was the current min or max.
    // This keeps the common case O(1) while still being correct.
    if (oldest === this._min || oldest === this._max) {
      this._recomputeMinMax();
    }
  }

  /**
   * Recompute min and max from the current counts map.
   * @private
   */
  _recomputeMinMax() {
    let min = Infinity;
    let max = -Infinity;
    for (const value of this._counts.keys()) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    this._min = min;
    this._max = max;
  }
}
