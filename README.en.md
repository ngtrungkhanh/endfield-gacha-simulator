# A9E Gacha Simulator

[Tiếng Việt](README.md) · **English**

A9E Gacha Simulator is an **Arknights: Endfield** gacha simulation app. It supports interactive pulls, Monte Carlo strategy comparisons, and detailed single-player traces across multiple banners.

The app runs fully offline, sends no data externally, and can switch instantly between Vietnamese and English.

## What's new in 1.4.1

- Save & Commit finishes a nearby pull-30/60 milestone after Featured only when next-banner pull 120 remains protected; Yolo still takes it whenever the current wallet can pay.
- Pull 60 goes directly to 60 when affordable at banner start. Its fallback reaches 30 only when next-banner pull 60 remains protected and never rechecks to upgrade at pull 30.
- After missing Featured at pull 60, an upgrade must always protect the route `current 120 → next 60`.
- Future-protection checks on the final simulated banner use one virtual next banner with normal income, avoiding an end-of-run liquidation exception.

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## Quick start

### Use a release build

1. Download the latest `A9EGacha_<version>.html` from `release/` or the GitHub Releases page.
2. Open it in a modern browser such as Chrome, Edge, or Firefox.
3. No Node.js, local server, or network connection is required.

### Run directly from the repository

Clone the repository and open `index.html`. The repository includes `js/bundle.js`, so the page works without building first.

## Main modes

### Interactive Pulls

Use this mode to pull character and weapon banners manually:

- Perform x1, x10, and Weapon Issue pulls.
- Track 5★ pity, 6★ pity, the Featured 120 guarantee, and banner milestones.
- Manage character tickets, Dossier, Bond Quota, and Arsenal.
- Review pull history, owned items, and luck ratings.
- Switch banners while preserving the states that are allowed to carry over.

### Strategy Simulator

Use this mode to compare five resource strategies under the same configuration:

- Save & Commit.
- Save & Commit — Singles.
- Yolo / Spend All.
- Pull 60.
- Roll Meta.

Enter the player count, banner count, starting resources, and per-banner income, then select **Run simulation**. Results include average Featured acquisitions, ticket efficiency, weapon results, full Limited completion rate, and distribution charts.

Monte Carlo results describe averages across many randomized runs. They are not guarantees for a real account.

Strategies make budget decisions from the current state. Pull 60 goes straight to 60 when initially affordable; its pull-30 fallback runs only when next-banner pull 60 remains protected and always stops at 30. Roll Meta protects the nearest Meta reserve instead of forecasting exact gacha outcomes across many distant banners.

### Gacha Simulator — single player

This mode runs exactly one player and shows every banner in detail:

- Strategy roll and skip decisions.
- Standard, Limited, Urgent, and Dossier pulls, including the model's automatic 15 free Standard + 10 free Limited pulls per banner.
- Pity, Bond Quota, Arsenal, and ending wallet changes.
- Exact Featured Operator and Featured Weapon positions.

Reuse the same seed and configuration to reproduce a result.

## Language and saved data

- Select `VI` or `EN` in the upper-right corner to change the interface language.
- Settings, interactive state, and the latest results are stored in browser `localStorage`.
- Reset controls restore the relevant settings to their defaults.

## Rules and simulation assumptions

- [Gacha rules — Vietnamese](docs/gacha_rules.md)
- [Strategy details — Vietnamese](docs/strategies.md)
- [Income data snapshot](data/bookkeeping.md)

The 15 free Standard pulls per simulated banner, ownership pools, Bond Quota values, and off-banner Limited probabilities are model inputs or assumptions rather than confirmed official rules. The documentation identifies these conventions explicitly.

## Development

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm test
```

After changing any JavaScript source file under `js/`, rebuild the committed browser bundle so `index.html` remains directly runnable:

```bash
npm run build
```

For automatic rebuilds during development:

```bash
npm run watch
```

Only create or update files under `release/` for a version bump or when a release is explicitly requested:

```bash
npm run package
```

Build outputs:

- `js/bundle.js`: committed browser bundle used by `index.html`.
- `dist/`: disposable intermediate production build.
- `release/A9EGacha_<version>.html`: standalone offline release with a SHA-256 checksum.

## Project structure

```text
css/       Interface styles and responsive layout
data/      Reference data snapshots
docs/      Gacha rules and strategy documentation
js/        Application source and browser bundle
scripts/   Build and packaging tools
test/      Automated tests
dist/      Disposable production build, not committed
release/   Release HTML and checksum, not committed
```

## Disclaimer

This is a community simulation tool and is not an official Hypergryph product. Simulation results must not be treated as guarantees for obtaining any particular character or weapon.
