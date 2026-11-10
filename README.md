# env-guard

A zero-dependency TypeScript library for validating `process.env` values at startup.

## Quick start

```ts
import { envGuard } from 'env-guard';

const env = envGuard({
  PORT: { type: 'number', default: 3000 },
  NODE_ENV: { type: 'enum', values: ['development', 'test', 'production'] as const, default: 'development' },
  MONGO_URI: { type: 'string', required: true },
  JWT_SECRET: { type: 'string', required: true, minLength: 32, secret: true },
});
```

## CLI

Generate a starter `.env.example` file from a schema module:

```bash
npx env-guard generate --schema ./env-schema.ts --output .env.example
```

Validate the current environment against the same schema:

```bash
npx env-guard check --schema ./env-schema.ts
```

The schema file should export a default object or a named `schema`/`env` value that matches the `EnvGuardSchema` shape.
