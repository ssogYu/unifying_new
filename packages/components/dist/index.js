// src/index.tsx
import { jsx } from "react/jsx-runtime";
var Button = ({
  variant = "primary",
  size = "medium",
  children,
  ...props
}) => {
  return /* @__PURE__ */ jsx("button", { className: `btn btn-${variant} btn-${size}`, ...props, children });
};
export {
  Button
};
//# sourceMappingURL=index.js.map