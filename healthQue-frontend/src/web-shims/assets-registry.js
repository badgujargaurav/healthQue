// Minimal shim for @react-native/assets-registry/registry used by some libraries on web
// Export the named function expected by the import site.
export function getAssetByID(id) {
  // Return null or a minimal object; libraries typically only call this on native.
  return null;
}

export default { getAssetByID };
