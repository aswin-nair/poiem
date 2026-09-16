// ../domain/src/calendar.ts
var DAY_MS = 864e5;
function parseCalendarDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return Number.NaN;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return Number.NaN;
  return timestamp;
}
function formatCalendarDate(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}
function isLocalDate(value) {
  return typeof value === "string" && Number.isFinite(parseCalendarDate(value));
}
function previousLocalDate(date) {
  const timestamp = parseCalendarDate(date);
  if (!Number.isFinite(timestamp)) throw new RangeError(`Invalid local date: ${date}`);
  return formatCalendarDate(timestamp - DAY_MS);
}
function isIanaTimeZone(value) {
  if (typeof value !== "string" || value.length < 3 || value.length > 64) return false;
  if (value.includes("..") || value.startsWith("/") || value.endsWith("/")) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(/* @__PURE__ */ new Date("2026-01-01T00:00:00.000Z"));
    return true;
  } catch {
    return false;
  }
}
function localDateInZone(instant, timeZone) {
  if (!isIanaTimeZone(timeZone) || Number.isNaN(instant.getTime())) {
    throw new RangeError("Instant and IANA time zone are required");
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(instant);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const date = `${year}-${month}-${day}`;
  if (!isLocalDate(date)) throw new RangeError("Zoned instant did not produce a local date");
  return date;
}

// src/calendarContext.ts
var DEVICE_ID = /^[A-Za-z0-9._:-]{8,128}$/;
var ENTITY_ID = /^[A-Za-z0-9._:-]{1,128}$/;
function isDeviceId(value) {
  return typeof value === "string" && DEVICE_ID.test(value);
}
function isEntityId(value) {
  return typeof value === "string" && ENTITY_ID.test(value);
}
function parseInstant(value) {
  if (typeof value !== "string" || !value) return null;
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

// src/entities.ts
var CONTRACT_VERSION = 1;
var ENTITY_TYPES = [
  "profile",
  "food_entry",
  "weight_entry",
  "exercise_entry",
  "favorite_meal",
  "chat_message"
];
var CALENDAR_REQUIRED_TYPES = /* @__PURE__ */ new Set([
  "food_entry",
  "weight_entry",
  "exercise_entry",
  "chat_message"
]);
var SECRET_PAYLOAD_KEYS = [
  "apiKey",
  "password",
  "password_hash",
  "password_salt",
  "token",
  "refreshToken",
  "refresh_token"
];
var MAX_ENTITY_PAYLOAD_BYTES = 16384;
function row(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function isEntityType(value) {
  return typeof value === "string" && ENTITY_TYPES.includes(value);
}
function payloadContainsSecret(payload) {
  return SECRET_PAYLOAD_KEYS.some((key) => {
    const value = payload[key];
    return typeof value === "string" ? value.trim().length > 0 : value != null;
  });
}
function validateAccountEntity(value) {
  if (!row(value)) return { ok: false, error: "Entity must be an object" };
  if (value.contractVersion !== CONTRACT_VERSION) {
    return { ok: false, error: "Unsupported contract version" };
  }
  if (!isEntityType(value.entityType)) return { ok: false, error: "Unknown entity type" };
  if (!isEntityId(value.entityId)) return { ok: false, error: "Invalid entity id" };
  if (!isDeviceId(value.deviceId)) return { ok: false, error: "Invalid device id" };
  if (!isIanaTimeZone(value.timeZone)) return { ok: false, error: "Invalid IANA time zone" };
  if (!parseInstant(value.createdAt) || !parseInstant(value.updatedAt)) {
    return { ok: false, error: "Entity timestamps must be instants" };
  }
  if (value.deletedAt !== null && !parseInstant(value.deletedAt)) {
    return { ok: false, error: "Deletion timestamp must be an instant or null" };
  }
  if (!Number.isSafeInteger(value.recordVersion) || value.recordVersion < 1) {
    return { ok: false, error: "Record version must be a positive integer" };
  }
  if (!row(value.payload)) return { ok: false, error: "Entity payload must be an object" };
  if (payloadContainsSecret(value.payload)) {
    return { ok: false, error: "Entity payload must not contain secrets" };
  }
  const bytes = new TextEncoder().encode(JSON.stringify(value.payload)).byteLength;
  if (bytes > MAX_ENTITY_PAYLOAD_BYTES) return { ok: false, error: "Entity payload is too large" };
  if (CALENDAR_REQUIRED_TYPES.has(value.entityType)) {
    if (!isLocalDate(value.localDate)) {
      return { ok: false, error: "Calendar-bearing entities require an explicit local date" };
    }
  } else if (value.localDate !== null && !isLocalDate(value.localDate)) {
    return { ok: false, error: "Optional local date must be a calendar label" };
  }
  return { ok: true };
}
function validateTombstone(value) {
  if (!row(value)) return { ok: false, error: "Tombstone must be an object" };
  if (value.contractVersion !== CONTRACT_VERSION) {
    return { ok: false, error: "Unsupported contract version" };
  }
  if (!isEntityType(value.entityType)) return { ok: false, error: "Unknown entity type" };
  if (!isEntityId(value.entityId)) return { ok: false, error: "Invalid entity id" };
  if (!isDeviceId(value.deviceId)) return { ok: false, error: "Invalid device id" };
  if (!parseInstant(value.deletedAt)) return { ok: false, error: "Tombstone needs a deletion instant" };
  if (!Number.isSafeInteger(value.recordVersion) || value.recordVersion < 1) {
    return { ok: false, error: "Record version must be a positive integer" };
  }
  return { ok: true };
}

// src/mutations.ts
var CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
var MAX_MUTATION_BATCH = 200;
function isCanonicalUuid(value) {
  return typeof value === "string" && CANONICAL_UUID.test(value);
}
function row2(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function validateEntityMutation(value) {
  if (!row2(value)) return { ok: false, error: "Mutation must be an object" };
  if (value.contractVersion !== 1) return { ok: false, error: "Unsupported contract version" };
  if (!isCanonicalUuid(value.mutationId)) return { ok: false, error: "Mutation ID must be a canonical UUID" };
  if (!isDeviceId(value.deviceId)) return { ok: false, error: "Invalid device id" };
  if (!Number.isSafeInteger(value.baseCursor) || value.baseCursor < 0) {
    return { ok: false, error: "Base cursor must be a non-negative integer" };
  }
  if (value.kind !== "upsert" && value.kind !== "delete") {
    return { ok: false, error: "Mutation kind must be upsert or delete" };
  }
  if (!row2(value.entity)) return { ok: false, error: "Mutation entity is required" };
  if (value.deviceId !== value.entity.deviceId) {
    return { ok: false, error: "Mutation device must match the entity device" };
  }
  if (value.kind === "delete") return validateTombstone(value.entity);
  return validateAccountEntity(value.entity);
}
function validateMutationBatch(value) {
  if (!Array.isArray(value)) return { ok: false, error: "Mutation batch must be an array" };
  if (value.length === 0 || value.length > MAX_MUTATION_BATCH) {
    return { ok: false, error: "Mutation batch is empty or too large" };
  }
  const seen = /* @__PURE__ */ new Set();
  for (const item of value) {
    const result = validateEntityMutation(item);
    if (!result.ok) return result;
    const id = item.mutationId;
    if (seen.has(id)) return { ok: false, error: "Mutation ID is repeated in the batch" };
    seen.add(id);
  }
  return { ok: true };
}

// src/migration.ts
var MIGRATION_STAGES = [
  "detected",
  "previewed",
  "uploading",
  "reconciling",
  "complete",
  "confirmed",
  "rolled_back",
  "failed"
];
var SOURCE_KINDS = ["web-state-v0", "mobile-sqlite-0000"];
var HEX64 = /^[0-9a-f]{64}$/;
var SOURCE_VERSION = /^[A-Za-z0-9._:-]{1,64}$/;
var STAGE_ORDER = {
  detected: 0,
  previewed: 1,
  uploading: 2,
  reconciling: 3,
  complete: 4,
  confirmed: 5,
  rolled_back: 6,
  failed: 6
};
function row3(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function nonNegative(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function isMigrationStage(value) {
  return typeof value === "string" && MIGRATION_STAGES.includes(value);
}
function canAdvanceMigration(from, to) {
  if (from === to) return true;
  if (from === "confirmed" || from === "rolled_back") return false;
  if (to === "failed" || to === "rolled_back") return true;
  return STAGE_ORDER[to] === STAGE_ORDER[from] + 1;
}
function validateMigrationAttempt(value) {
  if (!row3(value)) return { ok: false, error: "Migration attempt must be an object" };
  if (value.contractVersion !== 1) return { ok: false, error: "Unsupported contract version" };
  if (!isCanonicalUuid(value.migrationId)) return { ok: false, error: "Migration ID must be a canonical UUID" };
  if (typeof value.idempotencyKey !== "string" || !SOURCE_VERSION.test(value.idempotencyKey)) {
    return { ok: false, error: "Invalid migration idempotency key" };
  }
  if (!SOURCE_KINDS.includes(String(value.sourceKind))) {
    return { ok: false, error: "Unknown migration source" };
  }
  if (typeof value.sourceVersion !== "string" || !SOURCE_VERSION.test(value.sourceVersion)) {
    return { ok: false, error: "Invalid source version" };
  }
  if (!isDeviceId(value.deviceId)) return { ok: false, error: "Invalid device id" };
  if (!isMigrationStage(value.stage)) return { ok: false, error: "Unknown migration stage" };
  if (!row3(value.counts)) return { ok: false, error: "Migration counts are required" };
  for (const key of ["discovered", "accepted", "rejected", "reconciled"]) {
    if (!nonNegative(value.counts[key])) return { ok: false, error: "Migration counts must be non-negative integers" };
  }
  for (const key of ["sourceChecksum", "acceptedChecksum"]) {
    const digest = value[key];
    if (digest !== null && (typeof digest !== "string" || !HEX64.test(digest))) {
      return { ok: false, error: "Checksums must be SHA-256 hex or null" };
    }
  }
  return { ok: true };
}

// src/checksum.ts
var encoder = new TextEncoder();
function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Cannot canonicalize a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const object = value;
    return `{${Object.keys(object).filter((key) => object[key] !== void 0).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  throw new Error("Cannot canonicalize a non-JSON value");
}
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function checksumRecords(records) {
  return sha256Hex(canonicalJson(records));
}

// src/projectSnapshot.ts
var SNAPSHOT_COMPAT_DEVICE = "snapshot-compat";
var FOOD_SOURCES = /* @__PURE__ */ new Set(["textInput", "manual", "snapFood", "quickAdd", "recent"]);
var MEAL_TYPES = /* @__PURE__ */ new Set(["breakfast", "lunch", "dinner", "snack", "other"]);
function row4(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function text(value, max = 200) {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}
function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function entity(type, id, deviceId, timeZone, instant, localDate, payload) {
  const iso = instant.toISOString();
  const record = {
    contractVersion: CONTRACT_VERSION,
    entityType: type,
    entityId: id,
    deviceId,
    localDate,
    timeZone,
    createdAt: iso,
    updatedAt: iso,
    deletedAt: null,
    recordVersion: 1,
    payload
  };
  return validateAccountEntity(record).ok ? record : null;
}
function projectFood(value, deviceId, timeZone) {
  if (!row4(value) || !text(value.id, 128) || !text(value.name) || !finite(value.calories)) return null;
  const instant = parseInstant(value.timestamp);
  if (!instant) return null;
  if (!FOOD_SOURCES.has(String(value.source)) || !MEAL_TYPES.has(String(value.mealType))) return null;
  return entity("food_entry", value.id, deviceId, timeZone, instant, localDateInZone(instant, timeZone), {
    name: value.name,
    calories: value.calories,
    protein: value.protein,
    carbs: value.carbs,
    fat: value.fat,
    source: value.source,
    mealType: value.mealType,
    servingSizeGrams: value.servingSizeGrams,
    emoji: value.emoji
  });
}
function projectWeight(value, deviceId, timeZone) {
  if (!row4(value) || !text(value.id, 128) || !text(value.date, 10) || !finite(value.weightKg)) return null;
  const instant = parseInstant(`${value.date}T12:00:00.000Z`) ?? /* @__PURE__ */ new Date(`${value.date}T12:00:00.000Z`);
  if (Number.isNaN(instant.getTime())) return null;
  return entity("weight_entry", value.id, deviceId, timeZone, instant, value.date, {
    weightKg: value.weightKg
  });
}
function projectExercise(value, deviceId, timeZone) {
  if (!row4(value) || !text(value.id, 128) || !text(value.name) || !finite(value.caloriesBurned)) return null;
  const instant = parseInstant(value.timestamp);
  if (!instant) return null;
  return entity("exercise_entry", value.id, deviceId, timeZone, instant, localDateInZone(instant, timeZone), {
    name: value.name,
    caloriesBurned: value.caloriesBurned,
    durationMinutes: value.durationMinutes,
    emoji: value.emoji
  });
}
function projectFavorite(value, deviceId, timeZone) {
  if (!row4(value) || !text(value.id, 128) || !text(value.name) || !finite(value.calories)) return null;
  return entity("favorite_meal", value.id, deviceId, timeZone, /* @__PURE__ */ new Date("2026-01-01T00:00:00.000Z"), null, {
    name: value.name,
    calories: value.calories,
    protein: value.protein,
    carbs: value.carbs,
    fat: value.fat,
    mealType: value.mealType,
    emoji: value.emoji
  });
}
function projectChat(value, deviceId, timeZone) {
  if (!row4(value) || !text(value.id, 128) || !text(value.role, 16) || typeof value.content !== "string") {
    return null;
  }
  const instant = parseInstant(value.timestamp);
  if (!instant) return null;
  return entity("chat_message", value.id, deviceId, timeZone, instant, localDateInZone(instant, timeZone), {
    role: value.role,
    contentLength: value.content.length
  });
}
function projectProfile(value, deviceId, timeZone) {
  if (!row4(value)) return null;
  const { birthday, gender, heightCm, weightKg, activityLevel, goal } = value;
  if (!text(birthday, 10) || !text(gender, 16) || !finite(heightCm) || !finite(weightKg)) return null;
  if (!text(activityLevel, 32) || !text(goal, 16)) return null;
  return entity("profile", "profile", deviceId, timeZone, /* @__PURE__ */ new Date("2026-01-01T00:00:00.000Z"), null, {
    gender,
    birthday,
    heightCm,
    weightKg,
    activityLevel,
    goal,
    weeklyChangeKg: value.weeklyChangeKg,
    bodyFatPercentage: value.bodyFatPercentage,
    trackingPaused: value.trackingPaused
  });
}
function projectSnapshot(snapshot, options) {
  if (!row4(snapshot)) return { entities: [], rejected: 1 };
  if (!isIanaTimeZone(options.timeZone)) return { entities: [], rejected: 1 };
  const deviceId = options.deviceId ?? SNAPSHOT_COMPAT_DEVICE;
  const aiSettings = row4(snapshot.aiSettings) ? snapshot.aiSettings : {};
  if (payloadContainsSecret(aiSettings) || payloadContainsSecret(snapshot)) {
    return { entities: [], rejected: 1 };
  }
  const entities = [];
  let rejected = 0;
  const profile = projectProfile(snapshot.profile, deviceId, options.timeZone);
  if (profile) entities.push(profile);
  else if (snapshot.profile !== void 0) rejected += 1;
  const collections = [
    [snapshot.foodEntries, (value) => projectFood(value, deviceId, options.timeZone)],
    [snapshot.weightEntries, (value) => projectWeight(value, deviceId, options.timeZone)],
    [snapshot.exerciseEntries, (value) => projectExercise(value, deviceId, options.timeZone)],
    [snapshot.favoriteMeals, (value) => projectFavorite(value, deviceId, options.timeZone)],
    [snapshot.chatMessages, (value) => projectChat(value, deviceId, options.timeZone)]
  ];
  for (const [list, project] of collections) {
    if (list === void 0) continue;
    if (!Array.isArray(list)) {
      rejected += 1;
      continue;
    }
    for (const item of list) {
      const next = project(item);
      if (next) entities.push(next);
      else rejected += 1;
    }
  }
  return { entities, rejected };
}

// ../domain/src/streak.ts
var DEFAULT_AT_RISK_HOUR = 18;
function deriveLoggingStreak(input) {
  const logged = new Set(input.loggedDates);
  const counted = /* @__PURE__ */ new Set([...input.loggedDates, ...input.freezeDates ?? []]);
  const neutral = new Set(input.neutralDates ?? []);
  const covered = /* @__PURE__ */ new Set([...counted, ...neutral]);
  const loggedToday = logged.has(input.today);
  let cursor = covered.has(input.today) ? input.today : previousLocalDate(input.today);
  let count = 0;
  while (covered.has(cursor)) {
    if (counted.has(cursor) && !neutral.has(cursor)) count += 1;
    cursor = previousLocalDate(cursor);
  }
  const hour = input.localHour ?? 0;
  const atRiskHour = input.atRiskHour ?? DEFAULT_AT_RISK_HOUR;
  return {
    count,
    loggedToday,
    atRisk: !loggedToday && hour >= atRiskHour
  };
}

// src/progression.ts
function recomputeDerivedProgression(entities, today, localHour = 12) {
  if (!isLocalDate(today)) throw new RangeError(`Invalid local date: ${today}`);
  const foodDays = [];
  const freezeDates = [];
  const neutralDates = [];
  for (const entity2 of entities) {
    if (entity2.deletedAt) continue;
    if (entity2.entityType === "food_entry" && entity2.localDate) foodDays.push(entity2.localDate);
    if (entity2.entityType === "profile" && entity2.payload.trackingPaused === true && isLocalDate(today)) {
      neutralDates.push(today);
    }
  }
  const uniqueFoodDays = [...new Set(foodDays)];
  return {
    streak: deriveLoggingStreak({
      loggedDates: uniqueFoodDays,
      freezeDates,
      neutralDates,
      today,
      localHour
    }),
    acceptedFoodDays: uniqueFoodDays.length,
    acceptedFoodEvents: foodDays.length
  };
}
function calendarEntities(entities) {
  return entities.filter((entity2) => CALENDAR_REQUIRED_TYPES.has(entity2.entityType));
}

// src/telemetry.ts
var TELEMETRY_SCHEMA_VERSION = 1;
var LOG_METHODS = [
  "search",
  "recent",
  "favourite",
  "quick_add",
  "text_ai",
  "photo_ai",
  "saved",
  "manual"
];
var CLAMP_REASONS = ["rate", "deficit", "floor", "bmr"];
var TELEMETRY_ENVIRONMENTS = ["dev", "staging", "production", "test"];
var TELEMETRY_PLATFORMS = ["web", "api", "mobile"];
var DURATION_BUCKETS = ["0-100", "100-400", "400-1500", "1500+"];
var API_RESULT_CLASSES = [
  "ok",
  "client_error",
  "server_error",
  "conflict",
  "rate_limited",
  "unavailable"
];
var EVENT_ID = /^[A-Za-z0-9._:-]{8,128}$/;
var FLOW_ID = /^[A-Za-z0-9._:-]{8,128}$/;
var REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;
var ROUTE = /^\/api\/[A-Za-z0-9/_-]{1,62}$/;
var SURFACE = /^\/[A-Za-z0-9/_-]{0,63}$/;
var RELEASE = /^[A-Za-z0-9._-]{1,64}$/;
var STEP = /^[A-Za-z0-9 _-]{1,32}$/;
var QUEST_TYPE = /^(log_n_meals|log_before|log_streak)$/;
var MEAL_SLOT = /^(breakfast|lunch|dinner|snack|other)$/;
var HTTP_METHOD = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/;
var ERROR_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
var FORBIDDEN = [
  /postgres(?:ql)?:\/\//i,
  /DATABASE_URL/i,
  /\bBearer\s+[A-Za-z0-9._-]+\b/,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\./,
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /data:image\//i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/
];
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function keysOf(value) {
  return Object.keys(value).sort();
}
function expectKeys(value, required, optional = []) {
  const allowed = /* @__PURE__ */ new Set([...required, ...optional]);
  for (const key of keysOf(value)) {
    if (!allowed.has(key)) return `Unknown telemetry field: ${key}`;
  }
  for (const key of required) {
    if (!(key in value)) return `Missing telemetry field: ${key}`;
  }
  return null;
}
function durationBucket(durationMs) {
  if (durationMs < 100) return "0-100";
  if (durationMs < 400) return "100-400";
  if (durationMs < 1500) return "400-1500";
  return "1500+";
}
function resultClassForStatus(status) {
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status === 503) return "unavailable";
  if (status >= 500) return "server_error";
  if (status >= 400) return "client_error";
  return "ok";
}
function sanitizeCrashName(name) {
  const raw = typeof name === "string" ? name : "Error";
  const token = raw.trim().split(/[\s:]/)[0] ?? "Error";
  const cleaned = token.replace(/[^A-Za-z]/g, "").slice(0, 64);
  if (cleaned === "DOMException" || /^[A-Z][A-Za-z]{0,48}Error$/.test(cleaned)) return cleaned;
  return "Error";
}
function isRemoteTelemetryEnabled(flag) {
  return flag?.trim().toLowerCase() === "true";
}
function deliverRemoteTelemetry(_envelope) {
  return { delivered: false, reason: "remote_telemetry_disabled" };
}
function telemetryContainsForbiddenContent(serialized) {
  return FORBIDDEN.some((pattern) => pattern.test(serialized));
}
function validateProductEvent(value) {
  const name = value.name;
  if (typeof name !== "string") return "Telemetry event name is required";
  if (name === "welcome_viewed" || name === "age_gate_passed" || name === "age_gate_blocked" || name === "log_celebration_completed" || name === "onboarding_completed" || name === "home_primary_action_used" || name === "pause_tracking_enabled" || name === "goal_clamped" || name === "support_opened" || name === "export_completed" || name === "account_deletion_completed") {
    return expectKeys(value, ["name"]) ?? value;
  }
  if (name === "auth_method_selected") {
    const error = expectKeys(value, ["name", "method", "mode"]);
    if (error) return error;
    if (value.method !== "email" && value.method !== "google") return "Invalid auth method";
    if (value.mode !== "signin" && value.mode !== "signup") return "Invalid auth mode";
    return value;
  }
  if (name === "onboarding_step_viewed") {
    const error = expectKeys(value, ["name", "step", "step_index"]);
    if (error) return error;
    if (typeof value.step !== "string" || !STEP.test(value.step)) return "Invalid onboarding step";
    if (!Number.isInteger(value.step_index) || value.step_index < 0 || value.step_index > 20) {
      return "Invalid onboarding step index";
    }
    return value;
  }
  if (name === "target_calculated") {
    const error = expectKeys(value, ["name", "adjusted"]);
    if (error) return error;
    if (typeof value.adjusted !== "boolean") return "Invalid target adjustment flag";
    return value;
  }
  if (name === "target_adjustment_explained") {
    const error = expectKeys(value, ["name", "reasons"]);
    if (error) return error;
    if (!Array.isArray(value.reasons) || value.reasons.length > 8) return "Invalid clamp reasons";
    if (!value.reasons.every((reason) => typeof reason === "string" && CLAMP_REASONS.includes(reason))) {
      return "Invalid clamp reason";
    }
    return value;
  }
  if (name === "first_log_started") {
    const error = expectKeys(value, ["name", "flow_id"]);
    if (error) return error;
    if (typeof value.flow_id !== "string" || !FLOW_ID.test(value.flow_id)) return "Invalid flow id";
    return value;
  }
  if (name === "log_method_selected" || name === "food_search_performed") {
    const required = name === "food_search_performed" ? ["name", "flow_id", "result_count"] : ["name", "flow_id", "method"];
    const error = expectKeys(value, required);
    if (error) return error;
    if (typeof value.flow_id !== "string" || !FLOW_ID.test(value.flow_id)) return "Invalid flow id";
    if (name === "log_method_selected" && !LOG_METHODS.includes(value.method)) {
      return "Invalid log method";
    }
    if (name === "food_search_performed") {
      if (!Number.isInteger(value.result_count) || value.result_count < 0 || value.result_count > 1e3) {
        return "Invalid search result count";
      }
    }
    return value;
  }
  if (name === "ai_analysis_started" || name === "ai_analysis_completed" || name === "ai_analysis_failed") {
    const error = expectKeys(value, ["name", "method"]);
    if (error) return error;
    if (value.method !== "text_ai" && value.method !== "photo_ai") return "Invalid AI method";
    return value;
  }
  if (name === "entry_reviewed" || name === "entry_corrected") {
    const error = expectKeys(value, ["name", "method"]);
    if (error) return error;
    if (!LOG_METHODS.includes(value.method)) return "Invalid log method";
    return value;
  }
  if (name === "entry_saved") {
    const error = expectKeys(value, ["name", "method", "meal_slot", "first_log", "event_id"], ["flow_id", "duration_ms"]);
    if (error) return error;
    if (!LOG_METHODS.includes(value.method)) return "Invalid log method";
    if (typeof value.meal_slot !== "string" || !MEAL_SLOT.test(value.meal_slot)) return "Invalid meal slot";
    if (typeof value.first_log !== "boolean") return "Invalid first-log flag";
    if (typeof value.event_id !== "string" || !EVENT_ID.test(value.event_id)) return "Invalid event id";
    if (value.flow_id !== void 0 && (typeof value.flow_id !== "string" || !FLOW_ID.test(value.flow_id))) {
      return "Invalid flow id";
    }
    if (value.duration_ms !== void 0 && (!Number.isInteger(value.duration_ms) || value.duration_ms < 0 || value.duration_ms > 36e5)) {
      return "Invalid duration";
    }
    return value;
  }
  if (name === "streak_freeze_applied") {
    const error = expectKeys(value, ["name", "protected_streak"]);
    if (error) return error;
    if (!Number.isInteger(value.protected_streak) || value.protected_streak < 0 || value.protected_streak > 1e4) {
      return "Invalid protected streak";
    }
    return value;
  }
  if (name === "quest_completed") {
    const error = expectKeys(value, ["name", "type"]);
    if (error) return error;
    if (typeof value.type !== "string" || !QUEST_TYPE.test(value.type)) return "Invalid quest type";
    return value;
  }
  return `Unknown telemetry event: ${name}`;
}
function validateOperationalEvent(value) {
  const name = value.name;
  if (name === "api_request") {
    const error = expectKeys(value, [
      "name",
      "request_id",
      "route",
      "method",
      "status",
      "duration_ms",
      "duration_bucket",
      "result_class",
      "release"
    ], ["error_class"]);
    if (error) return error;
    if (typeof value.request_id !== "string" || !REQUEST_ID.test(value.request_id)) return "Invalid request id";
    if (typeof value.route !== "string" || !ROUTE.test(value.route)) return "Invalid API route";
    if (typeof value.method !== "string" || !HTTP_METHOD.test(value.method)) return "Invalid HTTP method";
    if (!Number.isInteger(value.status) || value.status < 100 || value.status > 599) {
      return "Invalid status";
    }
    if (!Number.isInteger(value.duration_ms) || value.duration_ms < 0 || value.duration_ms > 12e4) {
      return "Invalid duration";
    }
    if (!DURATION_BUCKETS.includes(value.duration_bucket)) return "Invalid duration bucket";
    if (!API_RESULT_CLASSES.includes(value.result_class)) return "Invalid result class";
    if (typeof value.release !== "string" || !RELEASE.test(value.release)) return "Invalid release";
    if (value.error_class !== void 0 && (typeof value.error_class !== "string" || !ERROR_NAME.test(value.error_class))) {
      return "Invalid error class";
    }
    return value;
  }
  if (name === "client_crash") {
    const error = expectKeys(value, ["name", "crash_id", "error_name", "handled"]);
    if (error) return error;
    if (typeof value.crash_id !== "string" || !EVENT_ID.test(value.crash_id)) return "Invalid crash id";
    if (typeof value.error_name !== "string" || !ERROR_NAME.test(value.error_name)) return "Invalid error name";
    if (typeof value.handled !== "boolean") return "Invalid handled flag";
    return value;
  }
  if (name === "managed_ai_invoked") {
    const error = expectKeys(value, ["name", "request_id", "status"]);
    if (error) return error;
    if (typeof value.request_id !== "string" || !REQUEST_ID.test(value.request_id)) return "Invalid request id";
    if (!Number.isInteger(value.status) || value.status < 100 || value.status > 599) {
      return "Invalid status";
    }
    return value;
  }
  return `Unknown operational event: ${String(name)}`;
}
function validateTelemetryEnvelope(value) {
  if (!isRecord(value)) return { ok: false, error: "Telemetry envelope must be an object" };
  const headerError = expectKeys(value, [
    "schema_version",
    "event_id",
    "occurred_at",
    "environment",
    "release",
    "platform",
    "event"
  ], ["app_surface"]);
  if (headerError) return { ok: false, error: headerError };
  if (value.schema_version !== TELEMETRY_SCHEMA_VERSION) return { ok: false, error: "Unsupported telemetry schema" };
  if (typeof value.event_id !== "string" || !EVENT_ID.test(value.event_id)) return { ok: false, error: "Invalid event id" };
  if (typeof value.occurred_at !== "string" || Number.isNaN(Date.parse(value.occurred_at))) {
    return { ok: false, error: "Invalid occurred_at" };
  }
  if (!TELEMETRY_ENVIRONMENTS.includes(value.environment)) {
    return { ok: false, error: "Invalid environment" };
  }
  if (typeof value.release !== "string" || !RELEASE.test(value.release)) return { ok: false, error: "Invalid release" };
  if (!TELEMETRY_PLATFORMS.includes(value.platform)) {
    return { ok: false, error: "Invalid platform" };
  }
  if (value.app_surface !== void 0 && (typeof value.app_surface !== "string" || !SURFACE.test(value.app_surface))) {
    return { ok: false, error: "Invalid app surface" };
  }
  if (!isRecord(value.event)) return { ok: false, error: "Telemetry event must be an object" };
  const event = value.event.name === "api_request" || value.event.name === "client_crash" || value.event.name === "managed_ai_invoked" ? validateOperationalEvent(value.event) : validateProductEvent(value.event);
  if (typeof event === "string") return { ok: false, error: event };
  const envelope = {
    schema_version: 1,
    event_id: value.event_id,
    occurred_at: value.occurred_at,
    environment: value.environment,
    release: value.release,
    platform: value.platform,
    ...value.app_surface ? { app_surface: value.app_surface } : {},
    event
  };
  const serialized = JSON.stringify(envelope);
  if (telemetryContainsForbiddenContent(serialized)) {
    return { ok: false, error: "Telemetry envelope contains forbidden content" };
  }
  return { ok: true, value: envelope };
}
function buildTelemetryEnvelope(input) {
  const eventId = input.event.name === "entry_saved" ? input.event.event_id : input.eventId ?? "";
  return validateTelemetryEnvelope({
    schema_version: 1,
    event_id: eventId,
    occurred_at: input.occurredAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    environment: input.environment,
    release: input.release,
    platform: input.platform,
    ...input.appSurface ? { app_surface: input.appSurface } : {},
    event: input.event
  });
}

// src/alerts.ts
var ALERT_CATALOG_VERSION = 1;
var ALERT_CATALOG = {
  schemaVersion: 1,
  sink: "disabled",
  privacyApproval: "pending",
  rules: [
    { id: "api-5xx", signal: "api_requests", condition: "5xx >2% for 5 minutes", owner: "UNASSIGNED", blocking: true },
    { id: "api-p95", signal: "api_latency", condition: "p95 >1.5s for 10 minutes", owner: "UNASSIGNED", blocking: true },
    { id: "db-ready", signal: "database_ready", condition: "readiness probe failed", owner: "UNASSIGNED", blocking: true },
    { id: "auth-failures", signal: "auth_failures", condition: "3x seven-day baseline or rate-limit saturation", owner: "UNASSIGNED", blocking: true },
    { id: "state-conflicts", signal: "state_conflicts", condition: ">1% of state writes for 10 minutes", owner: "UNASSIGNED", blocking: true },
    { id: "sync-backlog", signal: "sync_backlog", condition: "p95 oldest mutation >15 minutes while online", owner: "UNASSIGNED", blocking: true },
    { id: "sync-persistence", signal: "accepted_entry_persistence", condition: "below 99.95%", owner: "UNASSIGNED", blocking: true },
    { id: "migration-failure", signal: "migration_failures", condition: "any failure", owner: "UNASSIGNED", blocking: true },
    { id: "deletion-failure", signal: "destructive_deletion", condition: "any unconfirmed or failed deletion", owner: "UNASSIGNED", blocking: true },
    { id: "ai-provider-errors", signal: "ai_requests", condition: "provider error >10% for 10 minutes", owner: "UNASSIGNED", blocking: true },
    { id: "managed-ai-invoked", signal: "managed_ai_invoked", condition: "unauthorized/unentitled serving or unexpected enablement", owner: "UNASSIGNED", blocking: true },
    { id: "crash-free", signal: "crash_free_sessions", condition: "below 99.8%", owner: "UNASSIGNED", blocking: true }
  ]
};
function evaluateAlertRules(metrics) {
  const firing = [];
  if (metrics.api5xxRate != null && metrics.api5xxRate > 0.02) firing.push("api-5xx");
  if (metrics.apiP95Ms != null && metrics.apiP95Ms > 1500) firing.push("api-p95");
  if (metrics.databaseReady === false) firing.push("db-ready");
  if (metrics.authFailureMultiple != null && metrics.authFailureMultiple >= 3) firing.push("auth-failures");
  if (metrics.stateConflictRate != null && metrics.stateConflictRate > 0.01) firing.push("state-conflicts");
  if (metrics.syncBacklogMinutes != null && metrics.syncBacklogMinutes > 15) firing.push("sync-backlog");
  if (metrics.persistenceRate != null && metrics.persistenceRate < 0.9995) firing.push("sync-persistence");
  if ((metrics.migrationFailures ?? 0) > 0) firing.push("migration-failure");
  if ((metrics.deletionFailures ?? 0) > 0) firing.push("deletion-failure");
  if (metrics.aiProviderErrorRate != null && metrics.aiProviderErrorRate > 0.1) firing.push("ai-provider-errors");
  if ((metrics.managedAiUnauthorizedInvocations ?? 0) > 0) firing.push("managed-ai-invoked");
  if (metrics.crashFreeRate != null && metrics.crashFreeRate < 0.998) firing.push("crash-free");
  return firing;
}

// src/rollout.ts
var ROLLOUT_CONTRACT_VERSION = 1;
var ROLLOUT_THRESHOLDS = {
  onboardingCompletion: 0.75,
  firstSessionFirstLog: 0.65,
  p75LogSeconds: 20,
  crashFree: 0.998,
  persistence: 0.9995
};
var ROLLOUT_COHORTS = {
  internal: { id: "internal", min: 20, max: 30, inviteRequired: true, publicPercent: null },
  invite: { id: "invite", min: 50, max: 150, inviteRequired: true, publicPercent: null },
  "public-5": { id: "public-5", min: null, max: null, inviteRequired: false, publicPercent: 5 },
  "public-25": { id: "public-25", min: null, max: null, inviteRequired: false, publicPercent: 25 },
  "public-50": { id: "public-50", min: null, max: null, inviteRequired: false, publicPercent: 50 },
  "public-100": { id: "public-100", min: null, max: null, inviteRequired: false, publicPercent: 100 }
};
var PUBLIC_ROLLOUT_STEPS = ["public-5", "public-25", "public-50", "public-100"];
var KILL_SWITCHES = [
  { id: "cloud-writes", env: "ENABLE_CLOUD_WRITES", closesWhen: "false" },
  { id: "account-creation", env: "ENABLE_ACCOUNT_CREATION", closesWhen: "false" },
  { id: "local-migration", env: "ENABLE_LOCAL_MIGRATION", opensWhen: "true" },
  { id: "entity-projection", env: "ENABLE_ENTITY_PROJECTION", opensWhen: "true" },
  { id: "mobile-auth", env: "ENABLE_MOBILE_AUTH", opensWhen: "true" },
  { id: "remote-telemetry", env: "ENABLE_REMOTE_TELEMETRY", opensWhen: "true" }
];
var DOGFOOD_EXERCISES = [
  "export",
  "delete",
  "logout-all",
  "offline-logging",
  "conflict-recovery"
];
function parseRolloutCohort(value) {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  return raw in ROLLOUT_COHORTS ? raw : null;
}
function evaluateEnrollment(input) {
  const raw = input.cohort?.trim() ?? "";
  if (!raw) return { ok: true };
  const cohort = parseRolloutCohort(raw);
  if (!cohort) return { ok: false, reason: "unknown_cohort" };
  const spec = ROLLOUT_COHORTS[cohort];
  if (spec.inviteRequired && !input.inviteConfigured) {
    return { ok: false, reason: "invite_not_configured" };
  }
  if (spec.inviteRequired && !input.invited) {
    return { ok: false, reason: "not_invited" };
  }
  const cap = input.capOverride ?? spec.max ?? void 0;
  if (cap != null && input.accountCount >= cap) {
    return { ok: false, reason: "cohort_full" };
  }
  return { ok: true };
}
function evaluateRolloutHalt(signals) {
  const halt = [];
  if (signals.crossAccountWrite) halt.push("cross-account-write");
  if (signals.lostAcceptedEntry) halt.push("lost-accepted-entry");
  if (signals.secretSync) halt.push("secret-sync");
  if (signals.failedDeletion) halt.push("failed-deletion");
  if (signals.unsafeTargetBypass) halt.push("unsafe-target-bypass");
  if (signals.managedAiUnauthorized || signals.managedAiInvoked) halt.push("managed-ai-invoked");
  if (signals.unresolvedHighFinding) halt.push("unresolved-high-finding");
  if (signals.onboardingCompletion != null && signals.onboardingCompletion < ROLLOUT_THRESHOLDS.onboardingCompletion) {
    halt.push("onboarding-completion");
  }
  if (signals.firstSessionFirstLog != null && signals.firstSessionFirstLog < ROLLOUT_THRESHOLDS.firstSessionFirstLog) {
    halt.push("first-session-first-log");
  }
  if (signals.p75LogSeconds != null && signals.p75LogSeconds > ROLLOUT_THRESHOLDS.p75LogSeconds) {
    halt.push("standard-log-time");
  }
  if (signals.crashFreeRate != null && signals.crashFreeRate < ROLLOUT_THRESHOLDS.crashFree) {
    halt.push("crash-free");
  }
  if (signals.persistenceRate != null && signals.persistenceRate < ROLLOUT_THRESHOLDS.persistence) {
    halt.push("accepted-entry-persistence");
  }
  return halt;
}
function canPromoteCohort(from, to, input) {
  if (input.haltReasons.length > 0) return { ok: false, reason: "halt" };
  if (!input.reviewRecorded) return { ok: false, reason: "review_required" };
  const next = parseRolloutCohort(to);
  if (!next) return { ok: false, reason: "invalid_step" };
  const current = parseRolloutCohort(from);
  if (!current && next === "internal") return { ok: true };
  if (current === "internal" && next === "invite") return { ok: true };
  if (current === "invite" && next === "public-5") return { ok: true };
  const fromIndex = PUBLIC_ROLLOUT_STEPS.indexOf(current);
  const toIndex = PUBLIC_ROLLOUT_STEPS.indexOf(next);
  if (fromIndex >= 0 && toIndex === fromIndex + 1) return { ok: true };
  return { ok: false, reason: "invalid_step" };
}
function rolloutCertification() {
  return { certified: false, dogfoodStarted: false };
}

// src/index.ts
var CONTRACTS_PACKAGE_ID = "@fud-ai/contracts";
export {
  ALERT_CATALOG,
  ALERT_CATALOG_VERSION,
  API_RESULT_CLASSES,
  CALENDAR_REQUIRED_TYPES,
  CLAMP_REASONS,
  CONTRACTS_PACKAGE_ID,
  CONTRACT_VERSION,
  DOGFOOD_EXERCISES,
  DURATION_BUCKETS,
  ENTITY_TYPES,
  KILL_SWITCHES,
  LOG_METHODS,
  MAX_ENTITY_PAYLOAD_BYTES,
  MAX_MUTATION_BATCH,
  MIGRATION_STAGES,
  PUBLIC_ROLLOUT_STEPS,
  ROLLOUT_COHORTS,
  ROLLOUT_CONTRACT_VERSION,
  ROLLOUT_THRESHOLDS,
  SECRET_PAYLOAD_KEYS,
  SNAPSHOT_COMPAT_DEVICE,
  SOURCE_KINDS,
  TELEMETRY_ENVIRONMENTS,
  TELEMETRY_PLATFORMS,
  TELEMETRY_SCHEMA_VERSION,
  buildTelemetryEnvelope,
  calendarEntities,
  canAdvanceMigration,
  canPromoteCohort,
  canonicalJson,
  checksumRecords,
  deliverRemoteTelemetry,
  durationBucket,
  evaluateAlertRules,
  evaluateEnrollment,
  evaluateRolloutHalt,
  isCanonicalUuid,
  isDeviceId,
  isEntityId,
  isEntityType,
  isIanaTimeZone,
  isLocalDate,
  isMigrationStage,
  isRemoteTelemetryEnabled,
  localDateInZone,
  parseInstant,
  parseRolloutCohort,
  payloadContainsSecret,
  projectSnapshot,
  recomputeDerivedProgression,
  resultClassForStatus,
  rolloutCertification,
  sanitizeCrashName,
  sha256Hex,
  telemetryContainsForbiddenContent,
  validateAccountEntity,
  validateEntityMutation,
  validateMigrationAttempt,
  validateMutationBatch,
  validateTelemetryEnvelope,
  validateTombstone
};
