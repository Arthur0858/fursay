import { createHash } from "node:crypto";
import { basename } from "node:path";
const dateOK = v => typeof v === "string" && /T/.test(v) && Number.isFinite(Date.parse(v));
export function normalizeHistoricalReceipt(path, raw) {
 const name=basename(path), issues=[]; let kind="", observedAt="", timestampField="", state="";
 if (/^2026-09-27-koko-rolling-reconciliation-\d+\.json$/.test(name)) {
  kind="rolling_reconciliation";observedAt=raw.runAt;timestampField="runAt";state=raw.executionState;
  if(raw.channel!=="koko" || !["blocked","existing_scheduled"].includes(state)) issues.push("invalid_reconciliation_state");
  if(raw.externalActionCount!==0 || (raw.totalMutationCount ?? raw.mutationCount)!==0) issues.push("reconciliation_mutation_not_zero");
  if(state==="existing_scheduled" && (!Array.isArray(raw.scheduled)||!raw.scheduled.length)) issues.push("scheduled_inventory_missing");
  if(!raw.idempotencyKey) issues.push("idempotency_key_missing");
 } else if (raw.version===1 && raw.receiptType==="chrome-result" && raw.mode==="chrome-result" && raw.recordedAt) {
  kind="provider_readback_receipt";observedAt=raw.recordedAt;timestampField="recordedAt";state=raw.status;
  if(!["koko","arabic"].includes(raw.channel)||state!=="readback_verified") issues.push("invalid_readback_state");
  if(!raw.runId || !raw.campaignId || !raw.campaignUrl || !raw.readbackEvidence || !Number.isInteger(raw.episodeNo)) issues.push("readback_identity_or_evidence_missing");
  if(!raw.sourceGates || Object.values(raw.sourceGates).some(v=>v!=="passed")) issues.push("source_gates_missing_or_not_passed");
 } else return null;
 if(!dateOK(observedAt)) issues.push("observation_timestamp_invalid");
 return {version:1,sourcePath:path,sourceObjectSha256:createHash("sha256").update(JSON.stringify(raw)).digest("hex"),kind,channel:raw.channel,observedAt,timestampField,state,issues,historicalOnly:true,provesCurrentProviderState:false};
}
