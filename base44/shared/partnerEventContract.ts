

// Business events remain evidence claims. Acceptance never authorises rewards.
const BUSINESS_TO_WIRE = Object.freeze({
  ACCOUNT_REGISTERED: 'registration_completed',
  ACCOUNT_LINKED: 'account_linked',
  ACCOUNT_DISABLED: 'account_disabled',
  VIDEO_WATCH_PROGRESS: 'video_watch_progress',
  STREAM_STARTED: 'stream_started',
  STREAM_VIEW_PROGRESS: 'stream_watch_progress',
  STREAM_ENDED: 'stream_ended',
  PURCHASE_COMPLETED: 'purchase_completed',
  PURCHASE_REFUNDED: 'purchase_refunded',
  CHARGEBACK_ISSUED: 'chargeback_issued',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled'
});
const EVIDENCE_FIELDS = Object.freeze({
  registration_completed: ['registration_reference'],
  account_linked: ['link_reference'],
  account_disabled: ['account_reference', 'disabled_at'],
  video_watch_progress: ['playback_session_id', 'content_id', 'eligible_seconds'],
  stream_started: ['stream_id', 'started_at'],
  stream_watch_progress: ['stream_id', 'viewer_session_id', 'eligible_seconds'],
  stream_ended: ['stream_id', 'ended_at'],
  purchase_completed: ['transaction_reference', 'payment_status', 'currency', 'amount_minor'],
  purchase_refunded: ['transaction_reference', 'refund_reference', 'currency', 'amount_minor'],
  chargeback_issued: ['transaction_reference', 'chargeback_reference', 'currency', 'amount_minor'],
  subscription_activated: ['subscription_reference', 'transaction_reference', 'payment_status', 'currency', 'amount_minor', 'period_start', 'period_end'],
  subscription_renewed: ['subscription_reference', 'transaction_reference', 'payment_status', 'currency', 'amount_minor', 'period_start', 'period_end'],
  subscription_cancelled: ['subscription_reference', 'cancelled_at']
});
const ALLOWED_TYPES = new Set(Object.values(BUSINESS_TO_WIRE));
const REWARD_TYPES = new Set(['registration_completed', 'account_linked', 'video_watch_progress', 'stream_watch_progress', 'purchase_completed', 'subscription_activated', 'subscription_renewed']);
const REVERSAL_TYPES = new Set(['purchase_refunded', 'chargeback_issued']);
const DATE_FIELDS = new Set(['disabled_at', 'started_at', 'ended_at', 'period_start', 'period_end', 'cancelled_at']);
function validString(value, maxLength = 191) {
  return typeof value === 'string' && value.trim().length > 0 &&
    value.length <= maxLength && !/[\x00-\x1f\x7f]/.test(value);
}
function utcDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const date = new Date(value);
  // Reject dates normalised by Date.parse, e.g. 30 February.
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,19) === value.slice(0,19);
}
function validateEvidence(type, evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return 'invalid_event_evidence';
  const fields = EVIDENCE_FIELDS[type];
  if (!fields || Object.keys(evidence).some(key => !fields.includes(key))) return 'unsupported_evidence_fields';
  if (fields.some(key => !Object.hasOwn(evidence,key))) return 'missing_event_evidence';
  for (const field of fields) {
    const value = evidence[field];
    if (field === 'eligible_seconds' || field === 'amount_minor') {
      if (!Number.isSafeInteger(value) || value < 0 || value > (field === 'eligible_seconds' ? 86400 : 100000000000)) return 'invalid_event_evidence';
    } else if (!validString(value) || (DATE_FIELDS.has(field) && !utcDate(value))) return 'invalid_event_evidence';
  }
  if (Object.hasOwn(evidence,'currency') && !/^[A-Z]{3}$/.test(evidence.currency)) return 'invalid_event_evidence';
  if (Object.hasOwn(evidence,'payment_status') && evidence.payment_status !== 'captured') return 'invalid_event_evidence';
  if (evidence.period_start && Date.parse(evidence.period_end) <= Date.parse(evidence.period_start)) return 'invalid_event_evidence';
  if (REVERSAL_TYPES.has(type) && evidence.amount_minor <= 0) return 'invalid_event_evidence';
  return null;
}
function validateEvent(body, allowedTypes, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'invalid_event';
  const fields = ['event_type','partner_event_id','partner_account_reference','occurred_at','task_reference','resource_reference','evidence'];
  if (Object.keys(body).some(key => !fields.includes(key))) return 'unsupported_event_fields';
  if (!ALLOWED_TYPES.has(body.event_type)) return 'unsupported_event_type';
  if (!Array.isArray(allowedTypes) || !allowedTypes.includes(body.event_type)) return 'event_not_allowed_for_partner';
  if (!validString(body.partner_event_id) || !validString(body.partner_account_reference)) return 'invalid_event_identifiers';
  if (!utcDate(body.occurred_at)) return 'invalid_event_timestamp';
  const occurred = Date.parse(body.occurred_at);
  if (occurred > now + 300000 || occurred < now - 86400000) return 'event_outside_time_window';
  if (['task_reference','resource_reference'].some(key => body[key] !== undefined && !validString(body[key]))) return 'invalid_event_reference';
  return validateEvidence(body.event_type,body.evidence);
}
export { BUSINESS_TO_WIRE, EVIDENCE_FIELDS, ALLOWED_TYPES, REWARD_TYPES, REVERSAL_TYPES, validateEvent, validateEvidence };
