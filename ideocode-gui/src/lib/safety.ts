export function isSafetyRuleEnabled(ruleId: string): boolean {
  const STORAGE_KEY = "idc-safety";
  try {
    const rules = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const rule = rules.find((r: { id: string; enabled: boolean }) => r.id === ruleId);
    return rule ? rule.enabled : false;
  } catch {
    return false;
  }
}

export async function confirmSafetyRule(ruleId: string): Promise<boolean> {
  if (!isSafetyRuleEnabled(ruleId)) return true;
  return window.confirm(`Are you sure? Safety rule "${ruleId}" requires confirmation.`);
}
