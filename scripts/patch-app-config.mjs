// Chỉnh package.json, app.json, tsconfig.json của app/ cho EcoHanoi. Chạy từ thư mục app/: node ../scripts/patch-app-config.mjs
// Chạy lại nhiều lần cho cùng kết quả.
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');

// package.json: expo-router làm điểm vào, đồng bộ file luật trước khi chạy/build, jest
const pkg = readJson('package.json');
pkg.name = 'ecohanoi';
pkg.main = 'expo-router/entry';
pkg.scripts = {
  ...pkg.scripts,
  'sync-rules': 'node scripts/sync-rules.mjs',
  prestart: 'node scripts/sync-rules.mjs',
  preandroid: 'node scripts/sync-rules.mjs',
  'eas-build-post-install': 'node scripts/sync-rules.mjs',
  typecheck: 'tsc --noEmit',
  test: 'jest',
};
pkg.jest = {
  preset: 'jest-expo',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
};
writeJson('package.json', pkg);

// app.json
const cfg = readJson('app.json');
const expo = cfg.expo ?? (cfg.expo = {});
expo.name = 'EcoHanoi';
expo.slug = 'ecohanoi';
expo.scheme = 'ecohanoi';
expo.orientation = 'portrait';
expo.userInterfaceStyle = 'light';
expo.android = { ...(expo.android ?? {}), package: 'com.fivess.ecohanoi' };
expo.ios = { ...(expo.ios ?? {}), bundleIdentifier: 'com.fivess.ecohanoi' };
const plugins = (expo.plugins ?? []).filter((p) => {
  const name = Array.isArray(p) ? p[0] : p;
  return name !== 'expo-router' && name !== 'expo-camera';
});
plugins.push('expo-router');
plugins.push([
  'expo-camera',
  { cameraPermission: 'EcoHanoi dùng camera để chụp món rác và gợi ý nhóm phân loại.', recordAudioAndroid: false },
]);
expo.plugins = plugins;
writeJson('app.json', cfg);

// tsconfig.json: alias @/ -> src/
const ts = readJson('tsconfig.json');
ts.compilerOptions = {
  ...(ts.compilerOptions ?? {}),
  strict: true,
  resolveJsonModule: true,
  baseUrl: '.',
  paths: { '@/*': ['./src/*'] },
};
ts.include = ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'];
writeJson('tsconfig.json', ts);

// File của template trống không dùng với expo-router
for (const f of ['App.tsx', 'index.ts', 'index.js']) if (existsSync(f)) rmSync(f);
console.log('patch-app-config: xong');
