# env-guard

Validate environment variables at startup with typed values and aggregated,
actionable errors. `env-guard` has no runtime dependencies and supports Node.js 18
and newer.

## Install

```sh
npm install env-guard
```

## Validate environment variables

```ts
import { envGuard } from 'env-guard';

const env = envGuard({
  PORT: { type: 'number', default: 5000, integer: true, min: 1 },
  MONGO_URI: { type: 'string', required: true },
  JWT_SECRET: { type: 'string', required: true, minLength: 32, secret: true },
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'],
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

Invalid values are reported together in an `EnvValidationError`. Its stable
`code` is `ENV_VALIDATION_ERROR`; each item in `issues` has a variable `key`, a
specific issue `code`, and a readable `message`. Values marked `secret: true`
are redacted from error messages.

## CLI

Create a schema module, for example `env-guard.config.mjs`:

```js
export default {
  PORT: { type: 'number', default: 5000, description: 'HTTP server port' },
  MONGO_URI: { type: 'string', required: true },
};
```

Generate `.env.example` from the schema or validate variables in the current
process environment:

```sh
npx env-guard generate --schema ./env-guard.config.mjs
npx env-guard check --schema ./env-guard.config.mjs
```

Use `--output <file>` with `generate` to choose another output path. The CLI
checks `process.env`; it does not read `.env` files.
