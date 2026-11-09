import { describe, expect, it } from 'vitest';

import { getVersion, version } from './index';

describe('env-guard package', () => {
  it('exports the current package version', () => {
    expect(version).toBe('0.0.0');
    expect(getVersion()).toBe('0.0.0');
  });
});
