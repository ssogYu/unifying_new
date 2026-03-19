/**
 * 获取数据类型
 * @param value 数据
 * @returns 数据类型
 */
const toString = Object.prototype.toString;

type DataType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'function'
  | 'undefined'
  | 'null'
  | 'array'
  | 'date'
  | 'regexp'
  | 'error'
  | 'symbol'
  | 'bigint'
  | 'unknown';

export const getDataType = (value: unknown): DataType => {
  const type = toString.call(value).slice(8, -1).toLowerCase();
  return type as DataType;
};