# OpenAML lookup index

A copy of OpenAML's labeled address lists, split into small files so a Newton
Protocol oracle can look up one address without downloading all of them.

Source: [finos-labs/dtcch-2025-OpenAML](https://github.com/finos-labs/dtcch-2025-OpenAML),
`Data/` folder, commit `07b2c3e9ca9849eb29ab2ee2c679c3bc4945cc35`. Apache-2.0.
Copyright 2025 FINOS. The labels are OpenAML's. This folder changes their
format and nothing else.

| Tier | OpenAML file and label | Addresses |
| --- | --- | --- |
| `sanctioned` | `address_sanctioned`, label Sanctioned | 182 |
| `blocked` | `address_sanctioned`, label Blocked (frozen by Tether or Circle) | 581 |
| `fraud` | `address_fraud`, label Fraud (exploits and hacks) | 576 |
| `flagged` | `address_flagged`, label Flagged (reported scams and phishing) | 363,271 |

364,503 unique addresses in all. An address can sit in more than one tier.

## Layout

`shards/<abc>.json` holds every address starting `0xabc`, lowercased:

```json
{"v":1,"source":"finos-labs/dtcch-2025-OpenAML@07b2c3e…","prefix":"abc",
 "entries":{"0xabc0…":{"fraud":["bsc"],"flagged":["Arbitrum"]}}}
```

Each tier lists the chains OpenAML recorded it on. All 4,096 shards exist, even
empty ones, so a missing file is always an error and never reads as "not
listed".

## Checking it

```bash
git clone https://github.com/finos-labs/dtcch-2025-OpenAML /tmp/openaml
git -C /tmp/openaml checkout 07b2c3e9ca9849eb29ab2ee2c679c3bc4945cc35
node index/build.mjs /tmp/openaml
git status --short index   # no output means the index matches OpenAML exactly
```

`manifest.json` records the sha256 of each OpenAML source file.

## Updating

When OpenAML publishes new data: check out their new commit, rerun the build,
commit, then change `INDEX_COMMIT` in `policy/openaml/policy.js` to the new
commit and redeploy the policy. The deployed policy reads only the commit it
was built with, so an update never changes a policy silently.
