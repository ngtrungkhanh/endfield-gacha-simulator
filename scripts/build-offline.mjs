import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const files = [
    'index.html',
    'css/style.css'
];

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, 'js'), { recursive: true });
execFileSync(process.execPath, ['scripts/build.mjs', '--production'], {
    cwd: root,
    env: { ...process.env, BUILD_OUTFILE: join(dist, 'js', 'bundle.js') },
    stdio: 'inherit'
});

for (const relativePath of files) {
    const destination = join(dist, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await cp(join(root, relativePath), destination);
}

console.log(`Offline build created at ${dist}`);
