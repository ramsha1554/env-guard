import { parseFieldValue } from './parsers';
import { EnvGuardError, EnvValidationError, type EnvValidationIssue } from './errors';
import type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';

export type OnErrorHandler = (error: EnvGuardError) => unknown;

export type EnvGuardOptions = {
  source?: EnvSource | Record<string, unknown>;
  onError?: 'throw' | 'exit' | OnErrorHandler;
};

export function envGuard<T extends EnvGuardSchema>(
  schema: T,
  options: EnvGuardOptions = {}
): InferEnv<T> {
  const source = options.source ?? process.env;
  const result = {} as Record<string, unknown>;
  const issues: EnvValidationIssue[] = [];

  for (const [key, field] of Object.entries(schema) as [string, EnvField][]) {
    const rawValue = source[key];
    const hasExplicitValue = rawValue !== undefined && rawValue !== null;

    let value: unknown;
    if (hasExplicitValue) {
      value = rawValue;
    } else if ('default' in field && field.default !== undefined) {
      value = field.default;
    } else {
      if (field.required === true) {
        issues.push({ key, code: 'ENV_REQUIRED', message: 'is required but missing' });
        continue;
      }

      result[key] = undefined;
      continue;
    }

    try {
      result[key] = parseFieldValue(key, field, value);
    } catch (error) {
      if (error instanceof EnvValidationError) {
        issues.push(...error.issues);
      } else {
        throw error;
      }
    }
  }

  if (issues.length > 0) {
    const error = new EnvValidationError(issues);

    if (options.onError === 'exit') {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }

    if (typeof options.onError === 'function') {
      options.onError(error);
      return undefined as unknown as InferEnv<T>;
    }

    throw error;
  }

  return Object.freeze(result) as InferEnv<T>;
}

export function defineSchema<T extends EnvGuardSchema>(schema: T): T {
  return schema;
}

export { EnvGuardError, EnvValidationError };
export type {
  EnvGuardIssue,
  EnvGuardIssueCode,
  EnvValidationIssue,
  EnvValidationIssueCode,
} from './errors';
export type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';
