/**
 * CircularBuffer
 *
 * Fixed-size FIFO buffer that automatically overwrites oldest items when full.
 * Provides O(1) insertion and iteration.
 *
 * Usage:
 *   const buffer = new CircularBuffer(100);
 *   buffer.push({ topic: "foo", payload: "bar" });
 *   const items = buffer.toArray();
 */
export class CircularBuffer {
  constructor(maxSize = 1000) {
    this.maxSize = Math.max(1, maxSize);
    this.items = new Array(this.maxSize);
    this.head = 0;
    this.count = 0;
  }

  /**
   * Add an item to the buffer (overwrites oldest if full)
   * @param {*} item
   */
  push(item) {
    this.items[this.head] = item;
    this.head = (this.head + 1) % this.maxSize;
    if (this.count < this.maxSize) {
      this.count++;
    }
  }

  /**
   * Get current number of items
   * @returns {number}
   */
  size() {
    return this.count;
  }

  /**
   * Convert to array (newest items first)
   * @returns {Array}
   */
  toArray() {
    if (this.count === 0) return [];

    const result = new Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - this.count + i + this.maxSize * 10) % this.maxSize;
      result[i] = this.items[idx];
    }
    return result.reverse(); // Newest first
  }

  /**
   * Clear all items
   */
  clear() {
    this.head = 0;
    this.count = 0;
    // Don't zero out items array; they'll be overwritten
  }

  /**
   * Iterate from newest to oldest
   * @param {Function} callback
   */
  forEach(callback) {
    const arr = this.toArray();
    arr.forEach(callback);
  }
}
