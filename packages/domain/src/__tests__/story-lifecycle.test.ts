import { describe, expect, it } from 'vitest';
import { nextStoryStatus, type StoryLifecycleSignals } from '../story-lifecycle.js';

const base: StoryLifecycleSignals = {
  currentStatus: 'DISCOVERED',
  sourceCount: 1,
  hoursSinceLastUpdate: 0,
  articleVelocityRatio: 1,
  dormantAfterHours: 48,
  archiveAfterHours: 14 * 24,
};

describe('nextStoryStatus', () => {
  it('promotes DISCOVERED to ACTIVE once a second source corroborates', () => {
    expect(nextStoryStatus({ ...base, sourceCount: 1 })).toBe('DISCOVERED');
    expect(nextStoryStatus({ ...base, sourceCount: 2 })).toBe('ACTIVE');
  });

  it('promotes ACTIVE to DEVELOPING on a spike in article velocity', () => {
    expect(
      nextStoryStatus({ ...base, currentStatus: 'ACTIVE', sourceCount: 3, articleVelocityRatio: 2 }),
    ).toBe('DEVELOPING');
  });

  it('demotes ACTIVE to DORMANT after the configured inactivity window', () => {
    expect(
      nextStoryStatus({ ...base, currentStatus: 'ACTIVE', hoursSinceLastUpdate: 49 }),
    ).toBe('DORMANT');
  });

  it('lets a DORMANT story wake back up to ACTIVE on fresh activity', () => {
    expect(
      nextStoryStatus({ ...base, currentStatus: 'DORMANT', hoursSinceLastUpdate: 0.5 }),
    ).toBe('ACTIVE');
  });

  it('archives regardless of current status once the archive threshold is hit', () => {
    expect(
      nextStoryStatus({ ...base, currentStatus: 'STABLE', hoursSinceLastUpdate: 15 * 24 }),
    ).toBe('ARCHIVED');
  });

  it('never revives an ARCHIVED story automatically', () => {
    expect(
      nextStoryStatus({ ...base, currentStatus: 'ARCHIVED', hoursSinceLastUpdate: 0 }),
    ).toBe('ARCHIVED');
  });
});
