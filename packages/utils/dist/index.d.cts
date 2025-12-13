/**
 * Utility functions library
 */
declare const isEmpty: (value: unknown) => value is null | undefined;
declare const isNumber: (value: unknown) => value is number;
declare const formatNumber: (num: number, decimals?: number) => string;

export { formatNumber, isEmpty, isNumber };
