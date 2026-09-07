/// <reference types="../website/node_modules/vitest/globals" />
/// <reference types="../website/node_modules/@testing-library/jest-dom/vitest" />

declare module "react/jsx-runtime" {
    export default any;
}
declare module "react/jsx-dev-runtime" {
    export default any;
}