// This file exists to support the monorepo setup where expo's AppEntry.js
// is hoisted to the root node_modules and imports "../../App"
// It simply re-exports the actual App from apps/mobile
export { default } from './apps/mobile/App';

