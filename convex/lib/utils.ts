export function pick<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Pick<T, K> {
  const newObj: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    newObj[key] = obj[key];
  }
  return newObj as Pick<T, K>;
}

export function defined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}