import { describe, expect, expectTypeOf, it } from 'vitest';

import { envGuard, type EnvGuardSchema } from './envGuard';

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
});
