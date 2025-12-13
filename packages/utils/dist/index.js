// src/index.ts
var isEmpty = (value) => {
  return value === null || value === void 0;
};
var isNumber = (value) => {
  return typeof value === "number" && !Number.isNaN(value);
};
var formatNumber = (num, decimals = 2) => {
  return num.toFixed(decimals);
};
export {
  formatNumber,
  isEmpty,
  isNumber
};
//# sourceMappingURL=index.js.map