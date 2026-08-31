// Credentials are supplied by the CI/maintainer environment, never committed
// to the source tree. Keep the object shape stable for existing callers.
module.exports = {
  secretId: process.env.VISONCUBE_COS_SECRET_ID || '',
  secretKey: process.env.VISONCUBE_COS_SECRET_KEY || '',
  bucket: process.env.VISONCUBE_COS_BUCKET || '',
  region: process.env.VISONCUBE_COS_REGION || '',
  prefix: process.env.VISONCUBE_COS_PREFIX || '',
}
