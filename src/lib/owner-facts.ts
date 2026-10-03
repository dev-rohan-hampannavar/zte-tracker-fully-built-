// Runtime store for owner-only personal facts (employer, handle, degree, pay, age).
// The source code contains only {{tokens}}. Real values come from the
// owner_private_facts table, which row-level security shows to the owner only,
// so they never ship in the JavaScript sent to shared users.

export interface OwnerFacts {
  employer: string;
  handle: string;
  roleTitle: string;
  roleLong: string;
  degree: string;
  payLpa: number | null;
  payMonthly: string | null;
  age: number | null;
}

export const GENERIC_FACTS: OwnerFacts = {
  employer: "your employer",
  handle: "your-handle",
  roleTitle: "your current role",
  roleLong: "your current role",
  degree: "your degree",
  payLpa: null,
  payMonthly: null,
  age: null,
};

let current: OwnerFacts = GENERIC_FACTS;

export function setOwnerFacts(next: OwnerFacts): void {
  current = next;
}

export function getOwnerFacts(): OwnerFacts {
  return current;
}

/** Build facts from the key/value rows of owner_private_facts. */
export function factsFromRows(rows: { key: string; value: string }[]): OwnerFacts {
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const num = (v: string | undefined) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
  return {
    employer: map.employer || GENERIC_FACTS.employer,
    handle: map.handle || GENERIC_FACTS.handle,
    roleTitle: map.role_title || GENERIC_FACTS.roleTitle,
    roleLong: map.role_long || GENERIC_FACTS.roleLong,
    degree: map.degree || GENERIC_FACTS.degree,
    payLpa: num(map.pay_lpa),
    payMonthly: map.pay_monthly || null,
    age: num(map.age),
  };
}

/** Replace {{tokens}} in a string with the current facts. */
export function fillFacts(text: string): string {
  const f = current;
  return text
    .replaceAll("{{employer}}", f.employer)
    .replaceAll("{{handle}}", f.handle)
    .replaceAll("{{role}}", f.roleTitle)
    .replaceAll("{{role_long}}", f.roleLong)
    .replaceAll("{{degree}}", f.degree)
    .replaceAll("{{pay_lpa}}", f.payLpa === null ? "your current pay" : String(f.payLpa))
    .replaceAll("{{pay}}", f.payLpa === null ? "your current pay" : `₹${f.payLpa}L`)
    .replaceAll("{{pay_monthly}}", f.payMonthly ? `₹${f.payMonthly}/mo` : "your current pay")
    .replaceAll("{{age}}", f.age === null ? "now" : String(f.age))
    .replaceAll("{{age+2}}", f.age === null ? "year 2" : String(f.age + 2))
    .replaceAll("{{age+4}}", f.age === null ? "year 4" : String(f.age + 4))
    .replaceAll("{{age+7}}", f.age === null ? "year 7" : String(f.age + 7))
    .replaceAll("{{age+10}}", f.age === null ? "year 10" : String(f.age + 10));
}

/** Fill every string inside an object or array, returning a copy. */
export function deepFill<T>(value: T): T {
  if (typeof value === "string") return fillFacts(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepFill(v)) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, deepFill(v)])) as T;
  }
  return value;
}
