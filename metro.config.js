const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');
const fs = require('node:fs');

const config = getDefaultConfig(__dirname);

// Support .glsl shader files
config.resolver.assetExts.push('glsl');
config.resolver.sourceExts.push('glsl');
config.resolver.assetExts.push('glb');
config.resolver.unstable_enablePackageExports = false;

// Serve public/ as static files (Metro doesn't do this by default).
// This lets useGLTF('/assets/models/wall.glb') resolve correctly.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Serve any request starting with /assets/ from the public/ directory
      if (req.url?.startsWith('/assets/')) {
        const publicDir = path.join(__dirname, 'public');
        const assetsRoot = path.join(publicDir, 'assets');

        // Strip query string and fragment
        const rawPath = req.url.split('?')[0].split('#')[0];

        let decodedPath;
        try {
          decodedPath = decodeURIComponent(rawPath);
        } catch (e) {
          // Malformed URI, fall back to default middleware
          return middleware(req, res, next);
        }

        // Resolve against publicDir while treating the URL path as relative
        const resolvedPath = path.resolve(publicDir, '.' + decodedPath);

        // Ensure the resolved path stays within public/assets
        const assetsRootWithSep = assetsRoot + path.sep;
        if (resolvedPath === assetsRoot || resolvedPath.startsWith(assetsRootWithSep)) {
          if (fs.existsSync(resolvedPath)) {
            const ext = path.extname(resolvedPath).toLowerCase();
            const mimeTypes = {
              '.glb': 'model/gltf-binary',
              '.gltf': 'model/gltf+json',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.bin': 'application/octet-stream',
            };
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Access-Control-Allow-Origin', '*');
            fs.createReadStream(resolvedPath).pipe(res);
            return;
          }
        }
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
