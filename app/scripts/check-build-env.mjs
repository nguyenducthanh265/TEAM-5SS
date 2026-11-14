// EAS build hook: never ship an APK pointing to a sample or local backend.
const raw = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
let valid = false;
try {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  valid = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash &&
    !/ten-backend|placeholder|example\.(com|net|test)|your[-.]/i.test(host) &&
    host !== 'localhost' && host !== '[::1]' && !host.endsWith('.local') &&
    !/^(127\.|10\.|192\.168\.|0\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
} catch {
  valid = false;
}
if (!valid) {
  console.error('FAIL EXPO_PUBLIC_API_URL: set the deployed public HTTPS backend URL before building the APK.');
  process.exit(1);
}
console.log('PASS build backend URL (configuration only; run npm run predeploy to check AI).');
