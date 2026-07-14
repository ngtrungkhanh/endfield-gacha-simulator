import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const outputName = `A9EGacha_${packageJson.version}.html`;
const releaseDir = join(root, 'release');

// 1. Run build-offline.mjs to ensure we have the latest minified production files in dist/
console.log('Building production assets...');
execFileSync(process.execPath, ['scripts/build-offline.mjs'], { cwd: root, stdio: 'inherit' });

// 2. Read the built assets
const dist = join(root, 'dist');
const htmlPath = join(dist, 'index.html');
const cssPath = join(dist, 'css/style.css');
const jsPath = join(dist, 'js/bundle.js');

let html = readFileSync(htmlPath, 'utf8');
const css = readFileSync(cssPath, 'utf8');
const js = readFileSync(jsPath, 'utf8');

// 3. Inline CSS
console.log('Inlining CSS...');
const cssPattern = /<link rel="stylesheet" href="css\/style\.css">/;
if (!cssPattern.test(html)) {
    throw new Error('Could not find CSS link tag in index.html');
}
html = html.replace(cssPattern, `<style>${css}</style>`);

// 4. Inline JS
console.log('Inlining JS...');
const jsPattern = /<script src="js\/bundle\.js"><\/script>/;
if (!jsPattern.test(html)) {
    throw new Error('Could not find JS script tag in index.html');
}
// Dùng callback để nội dung bundle được chèn nguyên văn. Nếu truyền chuỗi thay thế,
// các chuỗi như "$&" trong JavaScript minified sẽ bị String.replace diễn giải
// thành toàn bộ thẻ script nguồn và làm hỏng cú pháp của file tổng hợp.
html = html.replace(jsPattern, () => `<script>${js}</script>`);

// 5. Chỉ ghi artifact tổng hợp vào thư mục release.
mkdirSync(releaseDir, { recursive: true });
const outputPath = join(releaseDir, outputName);
writeFileSync(outputPath, html, 'utf8');
console.log(`Successfully created single file release: ${outputPath}`);
