# Newton OpenAML Demo

Enter a recipient. Newton Protocol operators check the transfer against
364,503 addresses labeled by [OpenAML](https://github.com/finos-labs/dtcch-2025-OpenAML)
and sign the decision on Ethereum Sepolia before it would execute.

| OpenAML tier | Addresses | What happens |
| --- | --- | --- |
| Sanctioned | 182 | Blocked |
| Blocked (frozen by Tether or Circle) | 581 | Blocked |
| Fraud (exploits and hacks) | 576 | Blocked |
| Flagged (reported scams and phishing) | 363,271 | Held for review |

Flagged holds rather than blocks because OpenAML's Flagged entries are
community reports with no source attached.

## How it works

```
page ─▶ /api/check ─┬▶ newt_createTask ─▶ block client  ─▶ operators run policy/openaml ─▶ quorum signs
                    └▶ newt_createTask ─▶ review client ─▶ operators run policy/openaml ─▶ quorum signs
                                                                │
                                          index/shards at commit dbed7bd (GitHub, jsDelivr, githack)
```

- **One policy, two clients.** `policy/openaml` reports which OpenAML tiers
  each address is in; its params say which tiers deny. The block client denies
  Sanctioned, Blocked and Fraud. The review client denies Flagged. A Newton
  verdict is allow or deny, so "held for review" is the review client denying
  while the block client allows.
- **The data.** `index/` is OpenAML's three files split into 4,096 small
  shards, so the oracle fetches a few KB per check. It is a format change only,
  rebuildable byte for byte from OpenAML commit `07b2c3e` (`index/README.md`).
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
REGORUS=./regorus-bin/bin/regorus node policy/openaml/test/run.mjs   # 30 policy cases
node scripts/compile-client.mjs             # interface id 0xf67e14d6
npm i --no-save ganache @newton-xyz/sdk@1.2.2 && node scripts/rehearse-deploy.mjs
```

## Going live

Order matters: the oracle can only fetch the index once this repo is public on
GitHub at the pinned commit.

1. **Push** this repo to `github.com/alazk/newton-openaml-demo` (public) without
   rewriting history, so commit `dbed7bd` exists there.
2. **Check the index is served** from both hosts the oracle needs:
   ```bash
   curl -sI https://raw.githubusercontent.com/alazk/newton-openaml-demo/dbed7bd97c74062a2fe0a2458a26ee35693a2787/index/shards/476.json | head -1
   curl -sI https://cdn.jsdelivr.net/gh/alazk/newton-openaml-demo@dbed7bd97c74062a2fe0a2458a26ee35693a2787/index/shards/476.json | head -1
   ```
3. **Build, simulate and deploy the policy** from `policy/` with `newton-cli`
   (commands in `policy/openaml/README.md`). Simulate the `fraud` fixture with
   `params.block.json` (must deny) and `clean` (must allow) first.
4. **Deploy the two clients**, dry run first:
   ```bash
   node scripts/compile-client.mjs
   NEWTON_POLICY=<policy address> node scripts/deploy-clients.mjs
   read -rs OWNER_PRIVATE_KEY && export OWNER_PRIVATE_KEY
   NEWTON_POLICY=<policy address> EXPECTED_OWNER=<wallet behind the API key> node scripts/deploy-clients.mjs --execute
   ```
   Addresses land in `policy/out/clients.sepolia.json`. Commit it.
5. **Run real tasks** for all five fixtures listed at the top of
   `scripts/task-test.mjs`. Each must land on its expected outcome.
6. **Deploy the site** on Vercel with `NEWTON_API_KEY`, `POLICY_CLIENT_BLOCK`,
   `POLICY_CLIENT_REVIEW` (see `.env.local.example`), then `bash deploy.sh "message"`.

## Design

The page follows the `newton-demo-design` skill in `.claude/skills/`: deny is
the brand red `#9F3619` on `#F8EAE4`, and a denial caused by unreadable data is
shown grey as "Screening unavailable" (`lib/outcome.ts`), never as a match.
`newton-demo-motion` in the same folder turns the demo into an MP4 for X and
GIFs for the demo library. Claude Code loads both when working in this repo.

## Licensing

OpenAML's data is Apache 2.0, Copyright 2025 FINOS. `index/` keeps their
labels unchanged and credits the source commit.
