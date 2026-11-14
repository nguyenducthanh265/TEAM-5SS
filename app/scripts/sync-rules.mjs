// Chép rules/qd87.json vào app/src/assets/qd87.json. Chạy lại nhiều lần cho cùng kết quả.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = resolve(__dirname, '../../rules/qd87.json');
const destPath = resolve(__dirname, '../src/assets/qd87.json');

if (!existsSync(srcPath)) {
  console.error(`sync-rules: không tìm thấy file nguồn ${srcPath}`);
  process.exit(1);
}

mkdirSync(dirname(destPath), { recursive: true });
copyFileSync(srcPath, destPath);
console.log('sync-rules: đã đồng bộ rules/qd87.json -> app/src/assets/qd87.json');
