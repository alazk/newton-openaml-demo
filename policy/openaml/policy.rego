package newton_openaml

import future.keywords

# Screens the payee and payer of a transfer against OpenAML's address lists.
# data.wasm is the output of policy.js: the OpenAML tiers each address is in.
# data.params.deny_tiers says which tiers deny. The same policy runs on two
# clients with different params:
#
#   block client   {"deny_tiers": ["sanctioned", "blocked", "fraud"]}
#   review client  {"deny_tiers": ["flagged"]}
#
# A Newton verdict is allow or deny, so "held for review" is the review
# client denying while the block client allows.
#
# Fail closed: unreadable data, missing or bad params, or an address the
# oracle did not screen all deny. Every value is type-checked first, because
# in Regorus lower(null) is a fatal error rather than undefined.
#
# Native transfers only: input.to is the recipient. For a token transfer
# input.to is the token contract, so this does not screen ERC-20 recipients.

default allow := false

w := data.wasm

known_tiers := {"sanctioned", "blocked", "fraud", "flagged"}

deny_tiers := {t | some t in data.params.deny_tiers}

params_ok if {
	is_array(data.params.deny_tiers)
	count(data.params.deny_tiers) > 0
	every t in data.params.deny_tiers {
		is_string(t)
		t in known_tiers
	}
}

screening_ok if w.ok == true

payee_screened if {
	is_object(w.to)
	is_string(w.to.address)
	is_string(input.to)
	lower(w.to.address) == lower(input.to)
	is_array(w.to.tiers)
}

# No sender on the intent: nothing to bind.
payer_screened if not is_string(input.from)

payer_screened if {
	is_string(input.from)
	is_object(w.from)
	is_string(w.from.address)
	lower(w.from.address) == lower(input.from)
	is_array(w.from.tiers)
}

payee_hit contains t if {
	some t in w.to.tiers
	t in deny_tiers
}

payer_hit contains t if {
	is_object(w.from)
	some t in w.from.tiers
	t in deny_tiers
}

deny contains "bad_params" if not params_ok

deny contains "screening_unavailable" if not screening_ok

deny contains "payee_not_screened" if not payee_screened

deny contains "payer_not_screened" if not payer_screened

deny contains sprintf("payee_%s", [t]) if some t in payee_hit

deny contains sprintf("payer_%s", [t]) if some t in payer_hit

allow if count(deny) == 0
