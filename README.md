# envguard-config

A zero-dependency TypeScript library for validating `process.env` values at
startup. It returns typed values, aggregates actionable errors, and supports
Node.js 18 and newer.

## Install

```sh
npm install envguard-config
```

## Quick start

```ts
import { envGuard } from 'envguard-config';

const env = envGuard({
  PORT: { type: 'number', default: 5000, integer: true, min: 1 },
  MONGO_URI: { type: 'string', required: true },
  JWT_SECRET: { type: 'string', required: true, minLength: 32, secret: true },
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'] as const,
    default: 'development',
  },
  ENABLE_CACHE: { type: 'boolean', default: false },
  API_URL: { type: 'url', protocols: ['https'] },
});

env.PORT; // number
```

Supported field types are `string`, `number`, `boolean`, `enum`, and `url`.
Fields may be optional, required, or have a default. String fields support
`minLength`, `maxLength`, and `pattern`; number fields support `min`, `max`, and
`integer`. Boolean values accept `true`/`false`, `1`/`0`, `yes`/`no`, and
`on`/`off`.

Invalid values are reported together in an `EnvValidationError`, which extends
`EnvGuardError`. Its stable `code` is `ENV_VALIDATION_ERROR`; each item in
`issues` has a variable `key`, a specific issue `code`, and a readable
`message`. Values marked `secret: true` are redacted from error messages.

## CLI

Create a schema module, for example `envguard-config.config.mjs`:

```js
export default {
  PORT: { type: 'number', default: 5000, description: 'HTTP server port' },
  MONGO_URI: { type: 'string', required: true },
};
```

The schema module may also export the object as a named `schema` or `env`
export. Generate `.env.example` or validate variables in the current process
environment:

```sh
npx envguard-config generate --schema ./envguard-config.config.mjs
npx envguard-config check --schema ./envguard-config.config.mjs
```

Use `--output <file>` with `generate` to choose another output path. The CLI
checks `process.env`; it does not read `.env` files.
