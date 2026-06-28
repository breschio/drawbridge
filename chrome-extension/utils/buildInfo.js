// Shared build id — keep DRAWBRIDGE_FEATURE_BUILD in sync across content + background
const DRAWBRIDGE_FEATURE_BUILD = 'deep-select-v1';

function getContentScriptBuild(manifestVersion) {
  return `${manifestVersion}-${DRAWBRIDGE_FEATURE_BUILD}`;
}

if (typeof module !== 'undefined' && module.exports) {
  const api = {
    DRAWBRIDGE_FEATURE_BUILD,
    getContentScriptBuild
  };
  module.exports = api;
  if (typeof globalThis !== 'undefined') {
    globalThis.DrawbridgeBuildInfo = api;
  }
} else {
  const api = {
    DRAWBRIDGE_FEATURE_BUILD,
    getContentScriptBuild
  };
  self.DrawbridgeBuildInfo = api;
  globalThis.DrawbridgeBuildInfo = api;
}
