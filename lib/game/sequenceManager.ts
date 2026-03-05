import type { GameEvent } from '@/types/game'

export interface SequenceGap {
  expectedSeq: number
  receivedSeq: number
  missingCount: number
}

export class SequenceManager {
  private lastProcessedSeq: number = -1
  private pendingEvents: Map<number, GameEvent> = new Map()
  private onGapDetected: ((gap: SequenceGap) => void) | null = null

  constructor(initialSeq: number = -1) {
    this.lastProcessedSeq = initialSeq
  }

  setGapHandler(handler: (gap: SequenceGap) => void): void {
    this.onGapDetected = handler
  }

  getLastProcessedSeq(): number {
    return this.lastProcessedSeq
  }

  setLastProcessedSeq(seq: number): void {
    this.lastProcessedSeq = seq
  }

  /**
   * Process incoming events and return ordered events ready to be processed.
   * Buffers out-of-order events and detects gaps.
   */
  processEvents(events: GameEvent[]): GameEvent[] {
    // Sort incoming events by sequence
    const sorted = [...events].sort((a, b) => a.seq - b.seq)

    // Add to pending
    for (const event of sorted) {
      if (event.seq > this.lastProcessedSeq) {
        this.pendingEvents.set(event.seq, event)
      }
    }

    // Extract consecutive events starting from lastProcessedSeq + 1
    const readyEvents: GameEvent[] = []
    let nextExpectedSeq = this.lastProcessedSeq + 1

    while (this.pendingEvents.has(nextExpectedSeq)) {
      const event = this.pendingEvents.get(nextExpectedSeq)!
      this.pendingEvents.delete(nextExpectedSeq)
      readyEvents.push(event)
      this.lastProcessedSeq = nextExpectedSeq
      nextExpectedSeq++
    }

    // Check for gaps
    if (readyEvents.length === 0 && this.pendingEvents.size > 0) {
      // We have pending events but can't process them - there's a gap
      const minPendingSeq = Math.min(...this.pendingEvents.keys())
      if (minPendingSeq > this.lastProcessedSeq + 1) {
        const gap: SequenceGap = {
          expectedSeq: this.lastProcessedSeq + 1,
          receivedSeq: minPendingSeq,
          missingCount: minPendingSeq - this.lastProcessedSeq - 1,
        }

        if (this.onGapDetected) {
          this.onGapDetected(gap)
        }
      }
    }

    return readyEvents
  }

  /**
   * Check if there are pending events that we're waiting on
   */
  hasPendingEvents(): boolean {
    return this.pendingEvents.size > 0
  }

  /**
   * Get the count of pending events
   */
  getPendingCount(): number {
    return this.pendingEvents.size
  }

  /**
   * Reset state (e.g., after receiving full game state)
   */
  reset(newSeq: number = -1): void {
    this.lastProcessedSeq = newSeq
    this.pendingEvents.clear()
  }

  /**
   * Force process all pending events (for fast-forward scenarios)
   * Returns events in sequence order, ignoring gaps
   */
  flushPending(): GameEvent[] {
    if (this.pendingEvents.size === 0) return []

    const events = Array.from(this.pendingEvents.values()).sort(
      (a, b) => a.seq - b.seq
    )

    // Update last processed to the highest seq
    if (events.length > 0) {
      this.lastProcessedSeq = events[events.length - 1].seq
    }

    this.pendingEvents.clear()
    return events
  }
}

// Factory function
export function createSequenceManager(initialSeq?: number): SequenceManager {
  return new SequenceManager(initialSeq)
}
