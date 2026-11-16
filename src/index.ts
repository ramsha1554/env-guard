export const version = '0.1.0';

export function getVersion(): string {
  return version;
}

export { defineSchema, envGuard } from './envGuard';
export { EnvGuardError, EnvValidationError } from './errors';
export type {
  EnvGuardIssue,
  EnvGuardIssueCode,
  EnvValidationIssue,
  EnvValidationIssueCode,
} from './errors';
export type { EnvGuardOptions, OnErrorHandler } from './envGuard';
export type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';
