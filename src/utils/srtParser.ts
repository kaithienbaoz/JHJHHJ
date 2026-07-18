/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SubtitleBlock } from '../types';

/**
 * Parses time string in formats like "00:00:01,234" or "00:00:01.234" into seconds
 */
function parseTime(timeStr: string): number {
  const parts = timeStr.trim().replace(',', '.').split(':');
  if (parts.length < 3) return 0;
  
  const hours = parseFloat(parts[0]) || 0;
  const minutes = parseFloat(parts[1]) || 0;
  const seconds = parseFloat(parts[2]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parses SRT file content into structured subtitle blocks
 */
export function parseSRT(srtContent: string): SubtitleBlock[] {
  const normalized = srtContent.replace(/\r\n/g, '\n').trim();
  const rawSections = normalized.split(/\n\s*\n/);
  const blocks: SubtitleBlock[] = [];
  
  for (const section of rawSections) {
    const lines = section.trim().split('\n');
    if (lines.length < 2) continue;
    
    // An SRT block has: 
    // Line 0: Index (sometimes omitted or containing metadata)
    // Line 1: Timestamp range "00:00:01,000 --> 00:00:04,000"
    // Remaining lines: text
    let id = parseInt(lines[0], 10);
    let timeLineIdx = 1;
    
    // Safely check if the first line is the index. If not, it might be the timeline
    if (!lines[0].includes('-->') && lines[1] && lines[1].includes('-->')) {
      id = parseInt(lines[0], 10) || (blocks.length + 1);
      timeLineIdx = 1;
    } else if (lines[0].includes('-->')) {
      id = blocks.length + 1;
      timeLineIdx = 0;
    } else {
      // Invalid format, skip
      continue;
    }
    
    const timeLine = lines[timeLineIdx];
    const timeParts = timeLine.split('-->');
    if (timeParts.length < 2) continue;
    
    const startTime = parseTime(timeParts[0]);
    const endTime = parseTime(timeParts[1]);
    
    const textLines = lines.slice(timeLineIdx + 1);
    const text = textLines.join('\n').trim();
    
    blocks.push({
      id,
      startTime,
      endTime,
      text,
    });
  }
  
  return blocks.sort((a, b) => a.startTime - b.startTime);
}
