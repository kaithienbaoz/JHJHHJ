/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SubtitleBlock } from '../types';

/**
 * Lightweight seed-based pseudo-random number generator (Mulberry32).
 * This ensures that a given seed string ALWAYS yields the exact same sequence of random numbers,
 * which guarantees that the random selection of blocks is identical during preview playback
 * and during final video export.
 */
function getSeededRandom(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Checks if a given 1-based block number is active for a specific behavior input.
 * Supports standard comma-separated lists (e.g. "2, 4, 6") and random counts (e.g. "#3").
 * 
 * @param blockNum 1-based index/number of the block (e.g., 1, 2, 3...)
 * @param blockInput The block sequence string from user settings (e.g., "1, 3" or "#3")
 * @param subtitles The full list of subtitle blocks in the project
 * @param behaviorKey A unique identifier for the behavior to keep independent seeds (e.g., "arrow", "typewriter")
 * @param behaviorSeed An optional random seed to configure random selections differently across videos
 */
export function isBehaviorActiveForBlock(
  blockNum: number | string,
  blockInput: string | undefined,
  subtitles: SubtitleBlock[] | undefined,
  behaviorKey: string,
  behaviorSeed?: number | string
): boolean {
  if (!blockInput) return false;
  const blockNumStr = typeof blockNum === 'number' ? blockNum.toString() : blockNum;
  const blockNumInt = typeof blockNum === 'string' ? parseInt(blockNum, 10) : blockNum;

  const trimmed = blockInput.trim();
  if (trimmed.startsWith('#')) {
    // Random cyclical behavior
    const countStr = trimmed.substring(1).trim();
    const count = parseInt(countStr, 10);
    if (isNaN(count) || count <= 0 || !subtitles || subtitles.length === 0) return false;

    const total = subtitles.length;
    // If request count is at least total number of blocks, everything matches
    if (count >= total) return true;

    // Create a robust seed combining the total subtitle blocks, their texts (lengths), the behavior key, and the behaviorSeed (if provided)
    // This stabilizes selections across preview & render passes unless the underlying SRT content or the seed changes.
    const seedPrefix = behaviorSeed !== undefined ? `${behaviorSeed}_` : '';
    const seed = `${seedPrefix}${total}_${behaviorKey}_${subtitles.map(s => (s.text ? s.text.length : 0)).join(',')}`;
    const rand = getSeededRandom(seed);

    // Create array [1, 2, ..., total]
    const indices = Array.from({ length: total }, (_, i) => i + 1);

    // Shuffle using seeded Fisher-Yates
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }

    // Capture the first X elements
    const selectedIndices = indices.slice(0, count);
    return selectedIndices.includes(blockNumInt);
  }

  // Fallback to standard split-by-comma logic
  const list = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(blockNumStr);
}

/**
 * Gets the 0-based occurrence index of the current block for a given behavior.
 * For example, if a behavior is active for blocks 12, 34, and 79, then:
 * - Block 12 has occurrence index 0.
 * - Block 34 has occurrence index 1.
 * - Block 79 has occurrence index 2.
 */
export function getBehaviorOccurrenceIndex(
  blockId: string | number,
  blockInput: string | undefined,
  subtitles: SubtitleBlock[] | undefined,
  behaviorKey: string,
  behaviorSeed?: number | string
): number {
  if (!subtitles || !blockInput) return 0;
  const activeIds: (string | number)[] = [];
  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];
    const subNum = i + 1;
    if (isBehaviorActiveForBlock(subNum, blockInput, subtitles, behaviorKey, behaviorSeed)) {
      activeIds.push(sub.id);
    }
  }
  const idx = activeIds.indexOf(blockId);
  return idx >= 0 ? idx : 0;
}
