import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const release = join(root, 'release');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const releaseName = `A9EGacha_${packageJson.version}.html`;
const srcHtmlPath = join(root, releaseName);
const destHtmlPath = join(release, releaseName);

// 1. Run build-single-file.mjs to compile assets and inline them
execFileSync(process.execPath, ['scripts/build-single-file.mjs'], { cwd: root, stdio: 'inherit' });

// 2. Create release folder and copy the versioned HTML artifact.
await mkdir(release, { recursive: true });
await copyFile(srcHtmlPath, destHtmlPath);

// 3. Generate SHA-256 checksum
const fileBytes = await readFile(destHtmlPath);
const checksum = createHash('sha256').update(fileBytes).digest('hex');
await writeFile(`${destHtmlPath}.sha256`, `${checksum}  ${releaseName}\n`);

console.log(`Package created: ${destHtmlPath}`);
console.log(`SHA-256: ${checksum}`);
