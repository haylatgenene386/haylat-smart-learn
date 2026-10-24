import { getCollection } from "@/integrations/firebase/db";

/**
 * Shared source of truth for the Approvals list and the sidebar badge.
 * Reads the Firestore "profiles" collection (where registration writes),
 * filters and sorts in memory so no composite indexes are needed.
 */
export async function fetchApprovalProfiles(statuses: string[], branchId: string | null) {
  let rows: any[];
  try {
    rows = await getCollection("profiles");
  } catch (err: any) {
    console.error("[approvals] query failed:", err?.code ?? err?.message);
    throw new Error("Could not load registrations. Check your admin permissions and try again.");
  }
  rows = rows.filter(
    (p) => statuses.includes(p.account_status) && !p.is_deleted
  );
  if (branchId) rows = rows.filter((p) => p.branch_id === branchId);
  const ts = (v: any) => (v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() : 0);
  rows.sort((a, b) => ts(b.created_at) - ts(a.created_at));
  return rows;
}

export const toDateLabel = (v: any) => {
  const d = v?.toDate ? v.toDate() : v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : "Unknown date";
};

/**
 * Find other accounts that submitted the same payment reference number.
 * Used by admins to spot a reference being reused across registrations.
 */
export async function findDuplicateReference(reference: string, excludeUserId: string) {
  const norm = reference.trim().toLowerCase();
  if (!norm) return [];
  const rows = await getCollection("profiles");
  return rows.filter(
    (p) =>
      p.user_id !== excludeUserId &&
      !p.is_deleted &&
      typeof p.payment_reference_number === "string" &&
      p.payment_reference_number.trim().toLowerCase() === norm
  );
}
