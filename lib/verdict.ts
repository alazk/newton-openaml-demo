/**
 * Reading a verdict out of a newt_createTask response.
 *
 * Copied from the sanctions demo (components/Wizard.tsx), where each rule was
 * paid for: an unreadable answer is undefined, never "allowed". A page once
 * showed green for every task because undefined fell through to the happy
 * branch while the explorer showed a denial.
 */

export function extractAllow(result: unknown): boolean | undefined {
  const r = result as any;
  const decoded = decodeBytes32Bool(r?.task_response?.evaluation_result ?? r?.evaluation_result);
  if (decoded !== undefined) return decoded;

  const er = r?.evaluation_result;
  if (typeof er?.result === "boolean") return er.result;
  if (typeof er?.result?.allow === "boolean") return er.result.allow;

  // Protocol 0.7: a boolean `allowed` on the attested task response. Its exact
  // nesting isn't documented, so accept it only if every `allowed` agrees.
  const found = collectBool(r, "allowed");
  if (found.length && found.every((b) => b === found[0])) return found[0];
  return undefined;
}

export function extractTaskId(result: unknown): string | null {
  const r = result as any;
  const id = r?.task_id ?? r?.taskId ?? r?.task?.task_id ?? r?.task?.taskId ?? null;
  return typeof id === "string" && id.length ? id : null;
}

function collectBool(node: unknown, key: string, out: boolean[] = [], depth = 0): boolean[] {
  if (!node || typeof node !== "object" || depth > 8) return out;
  if (Array.isArray(node)) {
    for (const n of node) collectBool(n, key, out, depth + 1);
    return out;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === key && typeof v === "boolean") out.push(v);
    else if (v && typeof v === "object") collectBool(v, key, out, depth + 1);
  }
  return out;
}

/** Exactly zero or exactly one; anything else is undefined, not "truthy". */
function decodeBytes32Bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (Array.isArray(v) && v.length && v.every((b) => typeof b === "number")) {
    if (v.every((b) => b === 0)) return false;
    if (v.slice(0, -1).every((b) => b === 0) && v[v.length - 1] === 1) return true;
    return undefined;
  }
  if (typeof v === "string" && /^0x[0-9a-fA-F]+$/.test(v)) {
    const hex = v.slice(2);
    if (/^0*$/.test(hex)) return false;
    if (/^0*1$/.test(hex)) return true;
  }
  return undefined;
}
