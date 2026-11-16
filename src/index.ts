export const version = '1.0.4';

export function getVersion(): string {
  return version;
}

export { envGuard, defineSchema } from './envGuard';
export { EnvValidationError } from './errors';
export type { EnvValidationIssue, EnvValidationIssueCode } from './errors';
export type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';
