#!/usr/bin/env bash
#
# Take the OpenAML demo live, one step at a time, stopping at the first problem.
#
#   bash scripts/go-live.sh
#   bash scripts/go-live.sh --new-policy   # after changing the policy files
#
# Run it from anywhere; it moves to the repo itself. It asks for the owner key
# and the Newton API key once, without showing them, and keeps them in the
# macOS Keychain. They are never written to the repo.
# Safe to run again: finished steps are recorded in policy/out/ and skipped.
#
#   1. checks the repo is on GitHub and the policy can read its data
#   2. builds and simulates the policy (clean must allow, fraud and flagged must deny)
#   3. deploys the policy
#   4. deploys the block and review clients (dry run first)
#   5. runs the five real checks
#   6. sets the Vercel env vars, pushes, and deploys the site

set -euo pipefail
cd "$(dirname "$0")/.."

REPO="alazk/newton-openaml-demo"
POLICY_RECORD="policy/out/policy.sepolia.json"
CLIENT_RECORD="policy/out/clients.sepolia.json"
INDEX_COMMIT="$(sed -n 's/^const INDEX_COMMIT = "\([0-9a-f]\{40\}\)";/\1/p' policy/openaml/policy.js)"

step() { printf '\n==> %s\n' "$1"; }
stop() { printf '\nSTOP: %s\n' "$1"; exit 1; }
ask() {
  local reply
  read -r -p "$1 [y/N] " reply
  [[ "$reply" =~ ^[Yy] ]]
}
need() { command -v "$1" >/dev/null 2>&1 || stop "$1 is not installed. $2"; }

if [ "${1:-}" = "--forget-keys" ]; then
  security delete-generic-password -a "$USER" -s newton-openaml-owner-key >/dev/null 2>&1 || true
  security delete-generic-password -a "$USER" -s newton-openaml-api-key >/dev/null 2>&1 || true
  echo "Keys removed from the Keychain."; exit 0
fi

need git ""
need node "Install Node 20 or newer."
need curl ""
need newton-cli "Install it from the Newton Protocol docs, then run this again."

# ── 1. GitHub and data ─────────────────────────────────────
step "1/6  Repo and data"
origin="$(git remote get-url origin 2>/dev/null || true)"
case "$origin" in
  *"$REPO"*) echo "    origin is $origin" ;;
  *) stop "origin is '${origin:-not set}', not github.com/$REPO. Push the repo first." ;;
esac
git cat-file -e "$INDEX_COMMIT^{commit}" 2>/dev/null || stop "commit $INDEX_COMMIT is missing from this clone."

for url in \
  "https://raw.githubusercontent.com/$REPO/$INDEX_COMMIT/index/shards/000.json" \
  "https://cdn.jsdelivr.net/gh/$REPO@$INDEX_COMMIT/index/shards/000.json"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$url")"
  echo "    $code  $url"
  [ "$code" = "200" ] || stop "the policy cannot read its data from that host yet. Check the repo is public and pushed, wait a minute, and run this again."
done

# ── Keys (hidden, kept in memory only) ─────────────────────
step "Keys"
# Asked once, then kept in the macOS Keychain (encrypted, never in the repo).
# Forget them with: bash scripts/go-live.sh --forget-keys
KC_OWNER="newton-openaml-owner-key"
KC_API="newton-openaml-api-key"
have_keychain() { command -v security >/dev/null 2>&1; }
kc_get() { have_keychain && security find-generic-password -a "$USER" -s "$1" -w 2>/dev/null || true; }
kc_put() { have_keychain && security add-generic-password -U -a "$USER" -s "$1" -w "$2" >/dev/null 2>&1 || true; }
PRIVATE_KEY="$(kc_get "$KC_OWNER")"
API_KEY="$(kc_get "$KC_API")"
if [ -n "$PRIVATE_KEY" ] && [ -n "$API_KEY" ]; then
  echo "    using the keys saved in your Keychain"
else
  echo "    Paste each key and press Enter. Nothing shows while you paste."
  read -r -s -p "    Owner private key (the wallet behind the API key): " PRIVATE_KEY; echo
  read -r -s -p "    Newton API key: " API_KEY; echo
  if [ -n "$PRIVATE_KEY" ] && [ -n "$API_KEY" ] && have_keychain; then
    kc_put "$KC_OWNER" "$PRIVATE_KEY"; kc_put "$KC_API" "$API_KEY"
    echo "    saved to your Keychain, so this is the last time it asks"
  fi
fi
[ -n "$PRIVATE_KEY" ] && [ -n "$API_KEY" ] || stop "both keys are needed."
case "$PRIVATE_KEY" in 0x*) ;; *) PRIVATE_KEY="0x$PRIVATE_KEY" ;; esac
export PRIVATE_KEY API_KEY
export OWNER_PRIVATE_KEY="$PRIVATE_KEY" NEWTON_API_KEY="$API_KEY"
export RPC_URL="${RPC_URL:-https://ethereum-sepolia-rpc.publicnode.com}"
export SEPOLIA_RPC_URL="${SEPOLIA_RPC_URL:-$RPC_URL}"

[ -d node_modules ] || { step "Installing packages"; npm install; }
EXPECTED_OWNER="$(node --input-type=module -e "import { privateKeyToAccount } from 'viem/accounts'; console.log(privateKeyToAccount(process.env.PRIVATE_KEY).address)")" \
  || stop "that does not look like a private key."
export EXPECTED_OWNER
echo "    owner wallet: $EXPECTED_OWNER"

# ── 2-3. Policy ────────────────────────────────────────────
NEWTON_POLICY="$(node -p "try{require('./$POLICY_RECORD').address||''}catch{''}")"
# --new-policy: deploy the policy again (after a change to the policy files)
# and move both clients to it.
if [ "${1:-}" = "--new-policy" ]; then NEWTON_POLICY=""; fi
if [ -n "$NEWTON_POLICY" ]; then
  step "2-3/6  Policy already deployed at $NEWTON_POLICY, skipping"
else
  step "2/6  Build and simulate the policy"
  (
    cd policy
    newton-cli policy build -p ./openaml
    # Clean first: a policy that denies everything would also "pass" the others.
    echo; echo "    1. Clean recipient, block rule (should ALLOW):"
    newton-cli policy simulate -p ./openaml \
      --wasm-args ./openaml/configs/wasm_args.clean.json \
      --intent-json ./openaml/configs/intent.clean.json \
      --policy-params-data ./openaml/configs/params.block.json
    echo; echo "    2. Fraud recipient, block rule (should DENY):"
    newton-cli policy simulate -p ./openaml \
      --wasm-args ./openaml/configs/wasm_args.fraud.json \
      --intent-json ./openaml/configs/intent.fraud.json \
      --policy-params-data ./openaml/configs/params.block.json
    echo; echo "    3. Flagged recipient, review rule (should DENY):"
    newton-cli policy simulate -p ./openaml \
      --wasm-args ./openaml/configs/wasm_args.flagged.json \
      --intent-json ./openaml/configs/intent.flagged.json \
      --policy-params-data ./openaml/configs/params.review.json
  )
  ask "Did 1 allow, and 2 and 3 deny?" || stop "the simulation did not match. Send Claude the output above."

  step "3/6  Deploy the policy"
  (cd policy && newton-cli policy deploy -p ./openaml)
  echo
  read -r -p "    Paste the policy address it printed: " NEWTON_POLICY
  [[ "$NEWTON_POLICY" =~ ^0x[0-9a-fA-F]{40}$ ]] || stop "'$NEWTON_POLICY' is not an address."
  mkdir -p policy/out
  printf '{\n  "chainId": 11155111,\n  "address": "%s"\n}\n' "$NEWTON_POLICY" > "$POLICY_RECORD"
  echo "    saved to $POLICY_RECORD"
fi
export NEWTON_POLICY

# ── 4. Clients ─────────────────────────────────────────────
step "4/6  Block and review clients"
node scripts/compile-client.mjs
node scripts/deploy-clients.mjs
if ask "The dry run above looks right. Send the transactions?"; then
  node scripts/deploy-clients.mjs --execute
else
  stop "clients not deployed."
fi
[ -f "$CLIENT_RECORD" ] || stop "$CLIENT_RECORD was not written."

# ── 5. Real checks ─────────────────────────────────────────
step "5/6  Five real checks"
check() {
  EXPECT="$2" node scripts/task-test.mjs "$1" \
    || stop "that check did not come back as $2. Nothing was sent to Vercel. Send Claude the output above."
}
check 0x1111111111111111111111111111111111111111 "ALLOWED"
check 0x7F367cC41522cE07553e823bf3be79A889DEbe1B "BLOCKED"
check 0x1723eb6c8fb98d2678ed186c48db11bbd12a80eb "BLOCKED"
check 0x47666fab8bd0ac7003bce3f5c3585383f09486e2 "BLOCKED"
check 0x1265bc855fd628aff6fed3fe4857a1b3b3597cfe "HELD FOR REVIEW"
echo "    all five came back as expected"

# ── 6. Site ────────────────────────────────────────────────
step "6/6  Vercel"
[ -d .vercel ] || npx vercel link
BLOCK="$(node -p "require('./$CLIENT_RECORD').block.address")"
REVIEW="$(node -p "require('./$CLIENT_RECORD').review.address")"
setenv() {
  npx vercel env rm "$1" production -y >/dev/null 2>&1 || true
  printf '%s' "$2" | npx vercel env add "$1" production
}
setenv NEWTON_API_KEY "$API_KEY"
setenv POLICY_CLIENT_BLOCK "$BLOCK"
setenv POLICY_CLIENT_REVIEW "$REVIEW"

bash deploy.sh "Record the deployed OpenAML policy and clients"

step "Done"
echo "    policy  $NEWTON_POLICY"
echo "    block   $BLOCK"
echo "    review  $REVIEW"
