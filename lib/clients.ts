/**
 * Which deployed client enforces a chosen set of tiers.
 *
 * Each set of tiers has its own client contract, with that set written into
 * its on-chain policy params. The visitor picks a set; the server picks the
 * client. Nothing the visitor sends reaches the policy as a rule.
 *
 * The addresses are public and live in the committed deploy record, so the
 * site needs no per-client environment variables.
 */
import record from "@/policy/out/clients.sepolia.json";
import { comboKey, type Tier } from "./openaml";

type Entry = { address?: string; params?: { deny_tiers?: string[] } };
const RECORD = record as Record<string, Entry>;

export function clientFor(tiers: Tier[]): string | null {
  const key = comboKey(tiers);
  const entry = RECORD[key];
  // Belt and braces: the record must say this client denies exactly this set.
  if (!entry?.address || comboKey(entry.params?.deny_tiers ?? []) !== key) return null;
  return /^0x[0-9a-fA-F]{40}$/.test(entry.address) ? entry.address : null;
}
