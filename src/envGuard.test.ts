import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { EnvGuardError, envGuard, type EnvGuardSchema } from './envGuard';

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
      envGuard(
        {
          MONGO_URI: { type: 'string', required: true },
        },
        { source: {} }
      )
    ).toThrow(/MONGO_URI.*required/i);
  });

  it('throws when a value fails type parsing', () => {
    expect(() =>
      envGuard(
        {
          PORT: { type: 'number' },
        },
        { source: { PORT: 'abc' } }
      )
    ).toThrow(/PORT.*number/i);
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

    type Expected = {
      PORT: number;
      NODE_ENV: 'development' | 'production' | undefined;
      ENABLE_CACHE: boolean;
      API_URL: string | undefined;
      FEATURE_FLAG: string | undefined;
    };

    const checked: Expected = env;
    expectTypeOf(checked.PORT).toEqualTypeOf<number>();
    expectTypeOf(checked.NODE_ENV).toEqualTypeOf<'development' | 'production' | undefined>();
    expectTypeOf(checked.ENABLE_CACHE).toEqualTypeOf<boolean>();
    expectTypeOf(checked.API_URL).toEqualTypeOf<string | undefined>();
    expectTypeOf(checked.FEATURE_FLAG).toEqualTypeOf<string | undefined>();
  });

  it('aggregates multiple issues and hides secret values', () => {
    try {
      envGuard(
        {
          MONGO_URI: { type: 'string', required: true },
          PORT: { type: 'number', required: true },
          JWT_SECRET: { type: 'string', required: true, secret: true, minLength: 20 },
        },
        {
          source: {
            PORT: 'abc',
            JWT_SECRET: 'short',
          },
        }
      );
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvGuardError);
      const guardError = error as EnvGuardError;
      expect(guardError.issues).toHaveLength(3);
      expect(guardError.issues.map((issue) => issue.code)).toEqual(['MISSING', 'INVALID_TYPE', 'TOO_SHORT']);
      expect(guardError.message).toContain('env-guard: 3 problems found');
      expect(guardError.message).toContain('JWT_SECRET');
      expect(guardError.message).not.toContain('short');
    }
  });

  it('supports custom onError handlers', () => {
    const handler = vi.fn();

    envGuard(
      {
        PORT: { type: 'number', required: true },
      },
      {
        source: { PORT: 'nope' },
        onError: handler,
      }
    );

    expect(handler).toHaveBeenCalledTimes(1);
    const error = handler.mock.calls[0]?.[0] as EnvGuardError | undefined;

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(EnvGuardError);
    expect(error?.issues[0]?.code).toBe('INVALID_TYPE');
  });
});
