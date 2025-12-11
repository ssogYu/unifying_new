/**
 * Utility functions library
 */

export const isEmpty = (value: unknown): value is null | undefined => {
  return value === null || value === undefined;
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !Number.isNaN(value);
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals);
};
