import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { EnvGuardError, EnvValidationError, envGuard, type EnvGuardSchema } from './envGuard';

describe('envGuard', () => {
  it('parses values from a source object and freezes the result', () => {
    const env = envGuard(
      {
        PORT: { type: 'number', default: 5000 },
        NODE_ENV: { type: 'enum', values: ['development', 'production', 'test'] as const, default: 'development' },
        ENABLE_CACHE: { type: 'boolean', default: false },
        API_URL: { type: 'url' },
        JWT_SECRET: { type: 'string', required: true, minLength: 12, secret: true },
      },
      {
        source: {
          PORT: '8080',
          NODE_ENV: 'production',
          ENABLE_CACHE: 'yes',
          API_URL: 'https://example.com',
          JWT_SECRET: 'supersecretvalue',
        },
      }
    );

    expect(env.PORT).toBe(8080);
    expect(env.NODE_ENV).toBe('production');
    expect(env.ENABLE_CACHE).toBe(true);
    expect(env.API_URL).toBe('https://example.com');
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('throws when a required value is missing', () => {
    expect(() =>
      envGuard({ MONGO_URI: { type: 'string', required: true } }, { source: {} })
    ).toThrow(/MONGO_URI.*required/i);
  });

  it('throws when a value fails type parsing', () => {
    expect(() =>
      envGuard({ PORT: { type: 'number' } }, { source: { PORT: 'abc' } })
    ).toThrow(/PORT.*number/i);
  });

  it('aggregates validation issues and redacts secret values', () => {
    try {
      envGuard(
        {
          PORT: { type: 'number' },
          MONGO_URI: { type: 'string', required: true },
          JWT_SECRET: { type: 'string', minLength: 20, secret: true },
        },
        { source: { PORT: 'not-a-number', JWT_SECRET: 'private-value' } }
      );
      throw new Error('Expected envGuard to reject invalid values');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect(error).toBeInstanceOf(EnvGuardError);
      expect(error).toMatchObject({
        code: 'ENV_VALIDATION_ERROR',
        issues: [
          { key: 'PORT', code: 'ENV_INVALID_NUMBER' },
          { key: 'MONGO_URI', code: 'ENV_REQUIRED' },
          { key: 'JWT_SECRET', code: 'ENV_STRING_TOO_SHORT' },
        ],
      });
      expect((error as Error).message).not.toContain('private-value');
    }
  });

  it('reports an unsupported URL protocol with its own issue code', () => {
    try {
      envGuard(
        { API_URL: { type: 'url', protocols: ['https'] } },
        { source: { API_URL: 'http://example.com' } }
      );
      throw new Error('Expected envGuard to reject an unsupported protocol');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect(error).toMatchObject({
        issues: [{ key: 'API_URL', code: 'ENV_UNSUPPORTED_URL_PROTOCOL' }],
      });
    }
  });

  it('infers optional and defaulted types correctly', () => {
    const schema = {
      PORT: { type: 'number', default: 3000 },
      NODE_ENV: { type: 'enum', values: ['development', 'production'] as const },
      ENABLE_CACHE: { type: 'boolean', default: false },
      API_URL: { type: 'url' },
      FEATURE_FLAG: { type: 'string' },
    } as const satisfies EnvGuardSchema;

    const env = envGuard(schema, { source: {} });

    expectTypeOf(env.PORT).toEqualTypeOf<number>();
    expectTypeOf(env.NODE_ENV).toEqualTypeOf<'development' | 'production' | undefined>();
    expectTypeOf(env.ENABLE_CACHE).toEqualTypeOf<boolean>();
    expectTypeOf(env.API_URL).toEqualTypeOf<string | undefined>();
    expectTypeOf(env.FEATURE_FLAG).toEqualTypeOf<string | undefined>();
  });

  it('supports custom onError handlers', () => {
    const handler = vi.fn();

    envGuard(
      { PORT: { type: 'number', required: true } },
      { source: { PORT: 'nope' }, onError: handler }
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(EnvValidationError);
  });
});
