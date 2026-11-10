export const version = '0.0.0';

export function getVersion(): string {
  return version;
}

export { EnvGuardError, envGuard, defineSchema } from './envGuard';
export type { EnvGuardIssue, EnvGuardIssueCode, OnErrorHandler, EnvGuardOptions } from './envGuard';
export { checkEnvironment, cli, generateEnvExample } from './cli';
export type { CliCommand, CliOptions, EnvExampleOptions } from './cli';
export type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';
