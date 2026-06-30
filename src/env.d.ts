// Ambient declarations for non-code asset imports. TypeScript 6 errors on
// side-effect imports (e.g. `import "./index.css"`) without a module type.
declare module "*.css";
