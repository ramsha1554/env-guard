import { describe, expect, it } from 'vitest';

import { getVersion, version } from './index';

describe('envguard-config package', () => {
  it('exports the current package version', () => {
    expect(version).toBe('0.1.0');
    expect(getVersion()).toBe('0.1.0');
  });
});
