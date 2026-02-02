export function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value || '';
}

// Safe getter for optional vars
export function getEnvVarOptional(key: string): string | undefined {
  return process.env[key];
}