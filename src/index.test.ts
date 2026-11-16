import { describe, expect, it } from 'vitest';

import { getVersion, version } from './index';

describe('env-guard package', () => {
  it('exports the current package version', () => {
    expect(version).toBe('1.0.4');
    expect(getVersion()).toBe('1.0.4');
  });
});
