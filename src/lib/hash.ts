import SHA256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';

/**
 * Deterministic JSON stringification for reproducible hashing
 */
export function canonicalJson(obj: unknown): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJson((obj as Record<string, unknown>)[k])}`
  );
  return '{' + pairs.join(',') + '}';
}

/**
 * Calculates SHA256 hash of previous hash + event payload
 */
export function computeEventHash(
  prevHash: string,
  eventPayload: {
    assetCode: string;
    type: string;
    fromStatus?: string;
    toStatus?: string;
    description: string;
    userId: string;
    userName: string;
    createdAtTimestamp: number;
    data?: Record<string, unknown>;
  }
): string {
  const canonicalData = canonicalJson(eventPayload);
  const input = `${prevHash}|${canonicalData}`;
  return SHA256(input).toString(Hex);
}

export interface HashChainEvent {
  _id?: string;
  assetCode: string;
  type: string;
  fromStatus?: string;
  toStatus?: string;
  description: string;
  userId: string | { toString: () => string };
  userName: string;
  prevHash: string;
  hash: string;
  createdAt: Date | string;
  data?: Record<string, unknown>;
}

/**
 * Verifies the cryptographic integrity of an asset's event history
 */
export function verifyEventChain(events: HashChainEvent[]): {
  valid: boolean;
  totalEvents: number;
  brokenAtIndex?: number;
  message: string;
} {
  if (!events || events.length === 0) {
    return { valid: true, totalEvents: 0, message: 'No events in history' };
  }

  // Sort chronologically by createdAt (or assume chronological array)
  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const prevHash = i === 0 ? current.prevHash : events[i - 1].hash;

    // Check link to previous hash
    if (i > 0 && current.prevHash !== prevHash) {
      return {
        valid: false,
        totalEvents: events.length,
        brokenAtIndex: i,
        message: `Broken chain link at step ${i + 1}: prevHash mismatch`,
      };
    }

    const payload = {
      assetCode: current.assetCode,
      type: current.type,
      fromStatus: current.fromStatus,
      toStatus: current.toStatus,
      description: current.description,
      userId: typeof current.userId === 'object' ? current.userId.toString() : current.userId,
      userName: current.userName,
      createdAtTimestamp: new Date(current.createdAt).getTime(),
      data: current.data,
    };

    const calculatedHash = computeEventHash(current.prevHash, payload);
    if (calculatedHash !== current.hash) {
      return {
        valid: false,
        totalEvents: events.length,
        brokenAtIndex: i,
        message: `Tampered event payload at step ${i + 1} (${current.type})`,
      };
    }
  }

  return {
    valid: true,
    totalEvents: events.length,
    message: `All ${events.length} events verified successfully with valid SHA-256 cryptographic chain.`,
  };
}
