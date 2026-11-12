import { describe, expect, it } from 'vitest';

import { checkEnvironment, generateEnvExample } from './cliCore';

describe('cli helpers', () => {
  it('builds a .env.example preview from a schema', () => {
    const schema = {
      PORT: { type: 'number', default: 5000 },
      NODE_ENV: { type: 'enum', values: ['development', 'production'] as const, default: 'development' },
      JWT_SECRET: { type: 'string', required: true, secret: true, minLength: 32 },
      API_URL: { type: 'url', default: 'https://example.com' },
    } as const;

    const example = generateEnvExample(schema);

    expect(example).toContain('PORT=5000');
    expect(example).toContain('NODE_ENV=development');
    expect(example).toContain('JWT_SECRET=replace_me');
    expect(example).toContain('API_URL=https://example.com');
  });

  it('validates environment values using a schema', () => {
    const schema = {
      PORT: { type: 'number', default: 3000 },
      NODE_ENV: { type: 'enum', values: ['development', 'test'] as const, default: 'development' },
    } as const;

    const env = checkEnvironment(schema, {
      PORT: '8080',
      NODE_ENV: 'test',
    });

    expect(env.PORT).toBe(8080);
    expect(env.NODE_ENV).toBe('test');
  });
});
