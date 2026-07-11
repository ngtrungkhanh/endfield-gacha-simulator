import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const singleHtmlPath = join(root, 'release', 'A9EGacha.html');
const allowlist = [
    'css/style.css',
    'index.html',
    'js/bundle.js'
];

function listFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const fullPath = join(directory, entry.name);
        return entry.isDirectory()
            ? listFiles(fullPath)
            : relative(dist, fullPath).replaceAll('\\', '/');
    });
}

execFileSync(process.execPath, ['scripts/build-offline.mjs'], { cwd: root, stdio: 'pipe' });

test('offline dist contains only the release allowlist', () => {
    assert.deepEqual(listFiles(dist).sort(), allowlist);
});

test('runtime files contain no network dependency, fetch, or source map', () => {
    for (const file of ['index.html', 'css/style.css', 'js/bundle.js']) {
        const contents = readFileSync(join(dist, file), 'utf8');
        assert.doesNotMatch(contents, /https?:\/\/|\/\/cdn|fonts\.googleapis|fonts\.gstatic|jsdelivr|fetch\s*\(|sourceMappingURL/i, file);
    }
});

test('all local HTML references exist in dist', () => {
    const html = readFileSync(join(dist, 'index.html'), 'utf8');
    const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
    for (const reference of references) {
        assert.doesNotMatch(reference, /^(?:[a-z]+:)?\/\//i);
        assert.equal(reference.startsWith('/'), false, `absolute path: ${reference}`);
        assert.equal(existsSync(join(dist, reference)), true, `missing: ${reference}`);
    }
});

test('single file release matches inlined source and checksum is valid', { skip: process.env.TEST_RELEASE_PACKAGE !== '1' }, () => {
    assert.equal(existsSync(singleHtmlPath), true, 'singleHtmlPath exists');
    const singleHtml = readFileSync(singleHtmlPath, 'utf8');

    // Verify CSS is inlined
    const css = readFileSync(join(dist, 'css/style.css'), 'utf8');
    assert.equal(singleHtml.includes(`<style>${css}</style>`), true, 'CSS is inlined');

    // Verify JS is inlined
    const js = readFileSync(join(dist, 'js/bundle.js'), 'utf8');
    assert.equal(singleHtml.includes(`<script>${js}</script>`), true, 'JS is inlined');

    // Verify single HTML contains no local file references
    const references = [...singleHtml.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
    for (const reference of references) {
        assert.doesNotMatch(reference, /^(?:css\/style\.css|js\/bundle\.js)$/);
    }

    // Verify checksum
    const expected = readFileSync(`${singleHtmlPath}.sha256`, 'utf8').split(/\s+/)[0];
    const actual = createHash('sha256').update(readFileSync(singleHtmlPath)).digest('hex');
    assert.equal(actual, expected);
});
