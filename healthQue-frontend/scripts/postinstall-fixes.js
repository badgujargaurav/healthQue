const fs = require('fs');
const path = require('path');

function ensureShim() {
  try {
    const dir = path.join(__dirname, '..', 'node_modules', '@react-native-vector-icons');
    if (!fs.existsSync(dir)) return;
    const file = path.join(dir, 'get-image.js');
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "// Auto-generated shim for get-image.js\nmodule.exports = function getImage() { return null; };\n");
      console.log('[postinstall-fixes] created shim:', file);
    }
  } catch (e) {
    console.error('postinstall-fixes error', e);
  }
}

ensureShim();
