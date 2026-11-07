import { describe, expect, test } from 'vitest';
import { type FormAnchors, wornPoint } from './anchors';

const anchors: FormAnchors = { head: [16, 4], face: [15, 14], neck: [14, 22], squashRow: 14 };

describe('wornPoint', () => {
  test('idle1 sinks a point above the squash row by 1 px', () => {
    expect(wornPoint(anchors, 'head', 'idle1')).toEqual([16, 5]);
  });

  test('idle1 also sinks a point exactly on the squash row', () => {
    expect(wornPoint(anchors, 'face', 'idle1')).toEqual([15, 15]);
  });

  test('idle1 keeps a point below the squash row', () => {
    expect(wornPoint(anchors, 'neck', 'idle1')).toEqual([14, 22]);
  });

  test('every other pose keeps idle0 points', () => {
    for (const pose of ['idle0', 'happy', 'eat', 'sick', 'sleep', 'sad'] as const) {
      expect(wornPoint(anchors, 'head', pose)).toEqual([16, 4]);
    }
  });
});
