# Newton OpenAML Demo

Newton Protocol × FINOS. Enter a recipient. Newton Protocol operators check the
transfer against 364,486 addresses labeled by
[OpenAML](https://github.com/finos-labs/dtcch-2025-OpenAML), a FINOS Labs
project, and sign the decision on Ethereum Sepolia before it would execute.

| OpenAML tier | Addresses | What happens |
| --- | --- | --- |
| Sanctioned | 182 | Blocked |
| Blocked (frozen by Tether or Circle) | 564 | Blocked |
| Fraud (exploits and hacks) | 576 | Blocked |
| Flagged (reported scams and phishing) | 363,271 | Held for review |

Flagged holds rather than blocks because OpenAML's Flagged entries are
community reports with no source attached.

## How it works

```
page ─▶ /api/check ─┬▶ newt_createTask ─▶ block client  ─▶ operators run policy/openaml ─▶ quorum signs
                    └▶ newt_createTask ─▶ review client ─▶ operators run policy/openaml ─▶ quorum signs
                                                                │
                                          index/shards at commit e44a6dd (GitHub, jsDelivr, githack)
```

- **One policy, two clients.** `policy/openaml` reports which OpenAML tiers
  each address is in; its params say which tiers deny. The block client denies
  Sanctioned, Blocked and Fraud. The review client denies Flagged. A Newton
  verdict is allow or deny, so "held for review" is the review client denying
  while the block client allows.
- **The data.** `index/` is OpenAML's three files split into 4,096 small
  shards, so the oracle fetches a few KB per check. It changes their format and
  drops 17 addresses no one can own (the zero address, precompiles and decoding
  leftovers in their Blocked list); nothing is added or relabeled. It rebuilds
  byte for byte from OpenAML commit `07b2c3e` (`index/README.md`).
  The oracle reads the shards at one pinned commit of this repo, from two hosts
  that must agree. Newton does no labeling or upkeep: when OpenAML publishes new
  data, rerun the build and move the pin.
- **Fails closed.** Hosts down or disagreeing, bad params, or an address the
  oracle did not screen all deny.
- **The page explains, the attestation decides.** After the verdicts, the page
  looks the recipient up in the same index to say which tier matched. If the
  lookup and the verdict disagree, the page says so.
- **Native transfers only.** `input.to` is the recipient. For a token transfer
  it would be the token contract.

## Layout

| Path | What |
| --- | --- |
| `index/` | OpenAML lookup index, build script, manifest |
| `policy/openaml/` | WASM oracle, Rego, schema, fixtures, tests |
| `policy/OpenAMLDemoClient.sol` | v0.7 policy client (copy of the live sanctions client) |
| `scripts/` | compile, deploy, rehearse, task test, consistency check |
| `app/`, `components/`, `lib/` | Next.js site, sanctions demo design system |

## Tests

```bash
npm install
node scripts/check-consistency.mjs          # pins, samples and counts agree
node --experimental-strip-types scripts/test-outcome.mjs   # outcome and fail-closed rules
cargo install regorus --example regorus --root ./regorus-bin
REGORUS=./regorus-bin/bin/regorus node policy/openaml/test/run.mjs   # 37 policy cases
node scripts/compile-client.mjs             # interface id 0xf67e14d6
npm i --no-save ganache @newton-xyz/sdk@1.2.2 && node scripts/rehearse-deploy.mjs
```

## Going live

Order matters: the oracle can only fetch the index once this repo is public on
GitHub at the pinned commit (`e44a6dd`). Push without rewriting history.

Then, on a Mac with `newton-cli` installed:

```bash
bash scripts/go-live.sh
```

It runs every step in order and stops at the first problem: checks the index is
served from GitHub and jsDelivr, asks for the owner key and Newton API key
without showing them, builds and simulates the policy (clean must allow, fraud
and flagged must deny), deploys it, deploys the two clients after a dry run, runs the five
fixtures in `scripts/task-test.mjs`, sets the Vercel env vars and deploys the
site. Finished steps are recorded in `policy/out/` and skipped on a rerun.

## Design

The page follows the `newton-demo-design` skill in `.claude/skills/`: deny is
the brand red `#9F3619` as a glow and wash on black, and a denial caused by unreadable data is
shown grey as "Screening unavailable" (`lib/outcome.ts`), never as a match.
`newton-demo-motion` in the same folder turns the demo into an MP4 for X and
GIFs for the demo library. Claude Code loads both when working in this repo.

## Licensing

OpenAML's data is Apache 2.0, Copyright 2025 FINOS. `index/` keeps their
labels unchanged and credits the source commit.

The FINOS name and logo are trademarks of FINOS, the Fintech Open Source
Foundation. The Newton name and logo belong to Newton Protocol.
