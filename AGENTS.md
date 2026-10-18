# Working on OMEGA

OMEGA is an ETH/Hyperliquid research terminal with browser paper trading, manual exchange orders and delegated execution in the browser or an optional local Node service. This file is the entry point for coding agents. Product documentation is in French; keep existing language and naming conventions.

## Read first

1. [README.md](README.md): purpose, modes and quick start.
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): ownership, data flows, source map and contracts.
3. [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): commands, checks and task recipes.
4. [docs/STATUS.md](docs/STATUS.md): verified capabilities, gaps and next work.
5. For network/signing/account changes, read [docs/NETWORKS.md](docs/NETWORKS.md). Use `frontend/core/networks.js` as the only endpoint/signing-network configuration. Preserve session revision guards, explicit network response validation and per-network ledger identities.
6. Read [docs/OPERATIONS.md](docs/OPERATIONS.md) for lifecycle/API changes, or [docs/STRATEGY.md](docs/STRATEGY.md) for rules/risk changes.

Only `main` is the maintained version. Source code and the lockfile establish implemented behavior; update documentation when it disagrees. Do not reintroduce superseded versions.

## Orientation

- `frontend/`: canonical Vite frontend, DOM UI, pure strategy modules, replay worker and visualizations.
- `shared/`: runtime-independent LiveEngine, policy and ledger validation, imported by both adapters.
- `runner/`: Node-only HTTP service, filesystem persistence and WASM loading.
- `frontend/web/`: browser delegated execution, encrypted IndexedDB vault and per-network execution locks; read docs/WEB.md before changes.
- `rust-core/`: risk math; its generated WASM is embedded in `frontend/legacy/risk-core.js`.
- Root Python modules: retained paper/MCP compatibility implementation. They do not execute live exchange orders.
- `docs/`: current documentation only.
- `dist/` and `runner-dist/`: generated output. Edit their sources instead.

The frontend is TypeScript + JavaScript + CSS, not React/Next.js. Do not introduce a framework or migrate the trading engines as incidental work.

## Contracts to preserve

- Distinguish public market data, paper balances, exchange account reads, wallet signatures and delegated automation. A connected market feed is not an authorized trading account. A browser diagnostic is not runner status.
- Mainnet/testnet transports, signers and state must remain isolated. Display only confirmed runtime state; an unreachable service is not confirmation of an inactive service.
- Never use a funded exchange account or arm a real runner to validate documentation, UI or refactoring. Automated checks use mocked transports and temporary runtime directories.
- Preserve write-ahead pending orders/quota, uncertainty handling, nonce ownership, no automatic entry retries and reduce-only exit semantics. Do not weaken guards to make a test pass.
- Intraday policy lives in `frontend/core/session.js`: four attempts, one position, 30-minute cooldown, realized daily target, consecutive-loss stop. Preserve durable attempt counters and uncertain-send handling on restart. Python compatibility remains a separate paper implementation.
- Preserve the Daily limits and timing contracts described in STRATEGY.md; change them only as intentional strategy work with corresponding tests and docs.
- Keys/tokens/runtime state stay outside source, bundles, screenshots and logs. Do not read or print `.omega-runtime/`, personal `config.json`, token files or environment secrets during routine work. Use examples and isolated fixtures.
- `Snapshot.time`, `context.updatedAt`, `candleStatus.fetchedAt`: seconds. Candle `t/T`, `lastClosedTime`, book `time`, runner heartbeat/events: milliseconds. Confirm units before comparing timestamps.
- Retain `axiom-*` storage/profile keys for compatibility. Branding changes are not data migrations.

Browser agent keys may exist only in memory and the authenticated encrypted IndexedDB vault; never put them in localStorage, status responses, exports or logs. Await every durable checkpoint and nonce before transmission, preserve revision checks and the final transport/visibility/lock guard. A page restart must remain disarmed. Preserve idempotent agent preparation and the confirmed-approval marker; only an unused, unconfirmed preparation younger than 24 hours may be reused before approval. Approval read failures must never rotate keys. The shared authorization module owns the explicit duration and names.

For persistence, read [docs/DATA.md](docs/DATA.md). Preserve corrupted files/values, block mutations and never automatically restore a nonce, quota or pending from an older generation. Browser exports use an allowlist excluding keys, sessions and permissions.

## Implementation practice

- Keep cross-runtime execution in `shared/`; never import `runner/` from frontend or shared code. Keep pure rules in `frontend/core/`; DOM/event handling belongs in UI modules. Share Daily rules/indicators/risk between replay, browser and runner rather than copying them.
- Keep stable HTML IDs: legacy bindings, dynamic modules and tests depend on them. Use `textContent` for market/service values, never raw HTML from remote data.
- Add UI code through deferred modules in `frontend/main.ts`. Reuse existing market snapshots through `frontend/shared/market-store.ts`; use the runner store for confirmed service status. Visuals must not open extra exchange connections.
- Preserve tab/panel keyboard navigation, dark contrast, reduced-motion handling and animation suspension outside the viewport or hidden document.
- Do not hand-edit generated WASM. Change Rust and regenerate with `node scripts/build-rust.mjs` when that toolchain is available.
- Keep Python imports/entrypoints at the root until an explicit compatibility migration updates their callers and tests. `frontend/legacy/` also contains active code; the directory name does not mean it is disposable.

## Verify and deliver

Run `npm run check` for a cross-cutting change. For bounded work, use the check matrix in DEVELOPMENT.md; `npm run check:docs` is the minimum for documentation-only changes. Do not claim Python, Rust, mobile visual QA, funded wallet execution or profitability checks unless actually performed.

Report what changed, checks and limits. Update STATUS.md when capabilities or evidence change. Keep public Sites source and GitHub source aligned through the supported publishing workflow; preserve `.openai/hosting.json` project identity and audience. Documentation-only updates require no new application deployment.
