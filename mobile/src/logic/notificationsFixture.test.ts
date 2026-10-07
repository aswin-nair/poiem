import { readFileSync } from 'node:fs';

import {
  eligibleNotificationKinds,
  type NotificationEligibilityInput,
} from '@fud-ai/domain/notifications';
import { describe, expect, it } from 'vitest';

const fixtureUrl = new URL(
  '../../../packages/domain/fixtures/notifications.v2.json',
  import.meta.url,
);
const fixture = JSON.parse(readFileSync(fixtureUrl, 'utf8')) as {
  schemaVersion: number;
  cases: {
    id: string;
    input: NotificationEligibilityInput;
    kinds: string[];
  }[];
};

describe('shared notifications.v2 mobile characterization', () => {
  it('uses the supported fixture schema', () => {
    expect(fixture.schemaVersion).toBe(2);
  });

  it.each(fixture.cases)('$id', (testCase) => {
    expect(eligibleNotificationKinds(testCase.input)).toEqual(testCase.kinds);
  });
});
