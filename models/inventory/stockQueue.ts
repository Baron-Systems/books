export class StockQueue {
  quantity: number;
  value: number;
  queue: { rate: number; quantity: number }[];
  movingAverage: number;

  constructor() {
    this.value = 0;
    this.quantity = 0;
    this.movingAverage = 0;
    this.queue = [];
  }

  get fifo() {
    /**
     * Stock value maintained is based on the stock queue
     * ∴ FIFO by default. This returns FIFO valuation rate.
     */
    const valuation = this.value / this.quantity;
    if (!Number.isFinite(valuation)) {
      return 0;
    }

    return valuation;
  }

  inward(rate: number, quantity: number): null | number {
    if (quantity <= 0 || rate < 0) {
      return null;
    }

    const inwardValue = rate * quantity;
    /**
     * Update Moving Average valuation
     */
    this.movingAverage =
      (this.movingAverage * this.quantity + inwardValue) /
      (this.quantity + quantity);

    this.quantity += quantity;
    this.value += inwardValue;

    const last = this.queue.at(-1);
    if (last?.rate !== rate) {
      this.queue.push({ rate, quantity });
    } else {
      last.quantity += quantity;
    }

    return rate;
  }

  outward(quantity: number): null | number {
    if (this.quantity < quantity || quantity <= 0) {
      return null;
    }

    const result = this._outwardPhase1(quantity);
    if (result === null) {
      return null;
    }

    const { newQueue, totalValueRemoved, incomingRate } = result;
    this.queue.length = 0;
    this.queue.push(...newQueue);
    this.quantity -= quantity;
    this.value -= totalValueRemoved;

    return incomingRate / quantity;
  }

  /**
   * Phase 1: compute withdrawal on a temporary copy of the queue.
   * Returns null if queue runs out before covering quantity (state unchanged).
   */
  private _outwardPhase1(quantity: number): {
    newQueue: { rate: number; quantity: number }[];
    totalValueRemoved: number;
    incomingRate: number;
  } | null {
    const queueCopy = this.queue.map((e) => ({ rate: e.rate, quantity: e.quantity }));
    let totalValueRemoved = 0;
    let incomingRate = 0;
    let remaining = quantity;

    while (remaining > 0) {
      const last = queueCopy.shift();
      if (last === undefined) {
        return null;
      }

      const storedQuantity = last.quantity;
      let quantityRemoved: number;

      const quantityLeft = storedQuantity - remaining;
      if (quantityLeft > 0) {
        quantityRemoved = remaining;
        remaining = 0;
        queueCopy.unshift({ rate: last.rate, quantity: quantityLeft });
      } else {
        quantityRemoved = storedQuantity;
        remaining = remaining - storedQuantity;
      }

      totalValueRemoved += last.rate * quantityRemoved;
      incomingRate += quantityRemoved * last.rate;
    }

    return { newQueue: queueCopy, totalValueRemoved, incomingRate };
  }
}
