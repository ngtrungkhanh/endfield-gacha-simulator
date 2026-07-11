import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    LOCALE_STORAGE_KEY,
    catalogs,
    formatNumber,
    getLocale,
    setLocale,
    t
} from '../js/i18n.js';

test('VI and EN catalogs contain the same non-empty keys', () => {
    assert.deepEqual(Object.keys(catalogs.vi).sort(), Object.keys(catalogs.en).sort());
    for (const locale of ['vi', 'en']) {
        for (const [key, value] of Object.entries(catalogs[locale])) {
            assert.equal(typeof value, 'string', `${locale}.${key}`);
            assert.notEqual(value.trim(), '', `${locale}.${key}`);
        }
    }
});

test('t interpolates parameters and invalid locales fall back to Vietnamese', () => {
    setLocale('en', { persist: false });
    assert.equal(t('pull.free', { count: 7 }), 'Free Banner Pull (x7 Free)');
    assert.equal(setLocale('unsupported', { persist: false }), 'vi');
    assert.equal(getLocale(), 'vi');
    assert.equal(t('pull.free', { count: 7 }), 'Quay Free Banner (x7 Free)');
    const originalWarn = console.warn;
    let warning = '';
    console.warn = message => { warning = message; };
    try {
        assert.equal(t('missing.production.key'), '');
        assert.match(warning, /missing\.production\.key/);
    } finally {
        console.warn = originalWarn;
    }
});

test('numbers use the active locale', () => {
    setLocale('vi', { persist: false });
    assert.equal(formatNumber(1234.5), '1.234,5');
    setLocale('en', { persist: false });
    assert.equal(formatNumber(1234.5), '1,234.5');
});

test('locale persistence does not modify schema 1.6 storage keys', () => {
    const data = new Map([
        ['a9e_gacha_interactive_state', '{"version":"1.6"}'],
        ['a9e_gacha_interactive_inventory', '[{"rarity":6}]'],
        ['a9e_gacha_simulator_settings', '{"version":"1.6"}'],
        ['a9e_gacha_last_results', '{"version":"1.6"}'],
        ['a9e_gacha_active_banner_idx', '2']
    ]);
    globalThis.localStorage = {
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key)
    };
    const before = new Map(data);
    setLocale('en');
    assert.equal(data.get(LOCALE_STORAGE_KEY), 'en');
    for (const [key, value] of before) assert.equal(data.get(key), value, key);
    delete globalThis.localStorage;
});

test('every translation key referenced by index.html exists in both catalogs', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const keys = [...html.matchAll(/data-i18n(?:-title|-aria-label|-placeholder)?="([^"]+)"/g)].map(match => match[1]);
    assert.ok(keys.length > 50, 'expected broad static translation coverage');
    for (const key of keys) {
        assert.ok(catalogs.vi[key], `missing vi key: ${key}`);
        assert.ok(catalogs.en[key], `missing en key: ${key}`);
    }
});

test('single-run paid options exist and Interactive Pull has no Free Banner controls', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /id="single-monthly"/);
    assert.match(html, /id="single-bp"/);
    assert.doesNotMatch(html, /id="wallet-free-limited"/);
    assert.doesNotMatch(html, /id="btn-roll-free-limited"/);
    assert.doesNotMatch(html, /id="wallet-char-tickets"/);
    assert.doesNotMatch(html, /id="wallet-weapon-tickets"/);
    assert.doesNotMatch(html, /id="wallet-bond-quota"/);
    assert.doesNotMatch(html, /id="wallet-dossier-tickets"/);
    assert.doesNotMatch(html, /id="wallet-next-dossier-tickets"/);
});
