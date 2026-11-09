import { parseFieldValue } from './parsers';
import type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';

export type EnvGuardOptions = {
  source?: EnvSource | Record<string, unknown>;
};

export function envGuard<T extends EnvGuardSchema>(schema: T, options: EnvGuardOptions = {}): InferEnv<T> {
  const source = options.source ?? process.env;
  const result = {} as Record<string, unknown>;

  for (const [key, field] of Object.entries(schema) as [string, EnvField][]) {
    const rawValue = source[key];
    const hasExplicitValue = rawValue !== undefined && rawValue !== null;

    if (hasExplicitValue) {
      result[key] = parseFieldValue(key, field, rawValue);
      continue;
    }

    if ('default' in field && field.default !== undefined) {
      result[key] = parseFieldValue(key, field, field.default);
      continue;
    }

    if (field.required === true) {
      throw new Error(`${key} is required but missing`);
    }

    result[key] = undefined;
  }

  return Object.freeze(result) as InferEnv<T>;
}

export function defineSchema<T extends EnvGuardSchema>(schema: T): T {
  return schema;
}

export type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';
