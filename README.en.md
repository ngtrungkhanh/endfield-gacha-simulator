# A9E Gacha Simulator

[Tiếng Việt](README.md) · **English**

A9E Gacha Simulator is an **Arknights: Endfield** gacha simulation app. It supports interactive pulls, Monte Carlo strategy comparisons, and detailed single-player traces across multiple banners.

The app runs fully offline, sends no data externally, and can switch instantly between Vietnamese and English.

## What's new in 1.4.0

- All character strategies share a conservative formula for the current tickets required to reach 30/60/120 milestones and short cross-banner routes.
- Pull 60 now has separate checks at banner start, pull 30, and pull 60, allowing actual Quota outcomes to unlock the next step.
- Roll Meta uses a 95/105-ticket rolling reserve and only forecasts as far as the next Meta banner.
- Budget checks occur before the optional Dossier → Urgent optimization can spend wallet tickets.

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

Strategies make budget decisions from the current state. Pull 60 rechecks at milestones 30 and 60, while Roll Meta protects the nearest Meta reserve instead of forecasting exact gacha outcomes across many distant banners.

### Gacha Simulator — single player

This mode runs exactly one player and shows every banner in detail:

- Strategy roll and skip decisions.
- Standard, Limited, Urgent, and Dossier pulls.
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

Some ownership pools, Bond Quota values, and off-banner Limited probabilities are model assumptions rather than confirmed official rules. The documentation identifies these assumptions explicitly.

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
