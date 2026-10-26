# openaml: OpenAML address screening policy

## Overview

Denies a transfer when the payee or payer is in an OpenAML tier listed in the
params. One policy, two clients:

| Client | Params | A deny means |
| --- | --- | --- |
| Block | `{"deny_tiers": ["sanctioned", "blocked", "fraud"]}` | Blocked |
| Review | `{"deny_tiers": ["flagged"]}` | Held for a person to review |

A Newton verdict is allow or deny, so review is expressed as a second client.
The page submits each check to both and reads the two signed verdicts.

- `policy.js` (WASM oracle) fetches the index shard for each address from this
  repo at commit `dbed7bd` (`INDEX_COMMIT`), from two of three hosts
  (raw.githubusercontent.com, jsDelivr, rawcdn.githack.com). The two answers
  must match byte for byte. It reports each address's tiers and never decides.
- `policy.rego` binds the screened addresses to `input.to` and `input.from`,
  then denies on any tier in `data.params.deny_tiers`.
- Fails closed: hosts down or disagreeing, a shard from the wrong source,
  missing or invalid params, or an address the oracle did not screen.
- Native transfers only. For a token transfer `input.to` is the token contract.
- wasm_args: `{ "to": "0x…", "from": "0x…" }`, hex-encoded UTF-8 JSON.

## Test locally

```bash
cargo install regorus --example regorus --root ./regorus-bin
REGORUS=./regorus-bin/bin/regorus node policy/openaml/test/run.mjs
```

30 cases: each tier under each client, a listed sender, one host down, every
failure that must deny, and wasm_args that try to swap the payee.

## Build and simulate

From `policy/`:

```bash
newton-cli policy build -p ./openaml

newton-cli policy simulate -p ./openaml \
  --wasm-args ./openaml/configs/wasm_args.fraud.json \
  --intent-json ./openaml/configs/intent.fraud.json \
  --policy-params-data ./openaml/configs/params.block.json
```

Fixtures in `configs/`: `clean`, `sanctioned`, `blocked`, `fraud`, `flagged`
recipients; `params.block.json` and `params.review.json`. Simulation fetches
from the real hosts, so the repo must be pushed first.

## Deploy

```bash
newton-cli policy deploy -p ./openaml
```

Reads `configs/deployment.toml` (Sepolia). `RPC_URL`, `PRIVATE_KEY` and
`API_KEY` come from the environment, never from a file in the repo.
