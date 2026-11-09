export const version = '0.0.0';

export function getVersion(): string {
  return version;
}

export { envGuard, defineSchema } from './envGuard';
export type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';
