import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const production = process.argv.includes('--production');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function commitSha() {
    try {
        return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
    } catch {
        return 'unknown';
    }
}

await build({
    entryPoints: ['js/app.js'],
    bundle: true,
    outfile: process.env.BUILD_OUTFILE || 'js/bundle.js',
    format: 'iife',
    minify: production,
    sourcemap: false,
    legalComments: 'none',
    define: {
        __APP_VERSION__: JSON.stringify(packageJson.version),
        __BUILD_COMMIT__: JSON.stringify(commitSha()),
        __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    }
});

console.log(`Built ${production ? 'production' : 'development'} bundle v${packageJson.version}.`);
