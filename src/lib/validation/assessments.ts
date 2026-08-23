import {
  ASSESSMENT_STATUSES,
  ASSESSMENT_TYPES,
  QUESTION_TYPES,
  type AssessmentAnswerValue,
  type AssessmentQuestion,
  type AssessmentStatus,
  type AssessmentTemplateSchema,
  type AssessmentType,
  type ChoiceOption,
  type LocalizedText,
  type MeasurementAnswer,
} from "@/lib/domain/assessments";

const BCP_47 = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const KEY = /^[a-z][a-z0-9_]{1,63}$/;
const OPTION_VALUE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const UNIT = /^[A-Za-z][A-Za-z0-9_%/.-]{0,31}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLocalizedText(value: unknown, field: string): LocalizedText {
  if (!isRecord(value) || Object.keys(value).length === 0) throw new Error(`${field} must contain localized text.`);
  const parsed: LocalizedText = {};
  for (const [locale, text] of Object.entries(value)) {
    if (!BCP_47.test(locale) || typeof text !== "string" || text.trim().length < 1 || text.trim().length > 1000) {
      throw new Error(`${field} contains an invalid locale or value.`);
    }
    parsed[locale] = text.trim();
  }
  return parsed;
}

function parseOptions(value: unknown, field: string): ChoiceOption[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) throw new Error(`${field} must contain options.`);
  const options = value.map((option, index) => {
    if (!isRecord(option) || typeof option.value !== "string" || !OPTION_VALUE.test(option.value)) {
      throw new Error(`${field}[${index}] is invalid.`);
    }
    return { value: option.value, label: parseLocalizedText(option.label, `${field}[${index}].label`) };
  });
  if (new Set(options.map((option) => option.value)).size !== options.length) throw new Error(`${field} has duplicate values.`);
  return options;
}

function parseQuestion(value: unknown, index: number): AssessmentQuestion {
  if (!isRecord(value)) throw new Error(`questions[${index}] must be an object.`);
  if (typeof value.key !== "string" || !KEY.test(value.key)) throw new Error(`questions[${index}].key is invalid.`);
  if (typeof value.type !== "string" || !QUESTION_TYPES.includes(value.type as (typeof QUESTION_TYPES)[number])) {
    throw new Error(`questions[${index}].type is unsupported.`);
  }
  if (typeof value.required !== "boolean") throw new Error(`questions[${index}].required must be boolean.`);
  const base = {
    key: value.key,
    required: value.required,
    label: parseLocalizedText(value.label, `questions[${index}].label`),
    ...(value.description === undefined
      ? {}
      : { description: parseLocalizedText(value.description, `questions[${index}].description`) }),
  };

  switch (value.type) {
    case "SINGLE_CHOICE":
      return { ...base, type: value.type, options: parseOptions(value.options, `questions[${index}].options`) };
    case "MULTI_CHOICE":
      return { ...base, type: value.type, options: parseOptions(value.options, `questions[${index}].options`) };
    case "SCALE": {
      if (!isRecord(value.scale) || typeof value.scale.min !== "number" || typeof value.scale.max !== "number"
        || value.scale.min >= value.scale.max || value.scale.max - value.scale.min > 100) {
        throw new Error(`questions[${index}].scale is invalid.`);
      }
      return { ...base, type: value.type, scale: { min: value.scale.min, max: value.scale.max } };
    }
    case "MEASUREMENT": {
      if (!isRecord(value.measurement) || typeof value.measurement.code !== "string" || !KEY.test(value.measurement.code)
        || !Array.isArray(value.measurement.unit_codes) || value.measurement.unit_codes.length < 1
        || !value.measurement.unit_codes.every((unit) => typeof unit === "string" && UNIT.test(unit))) {
        throw new Error(`questions[${index}].measurement is invalid.`);
      }
      const unitCodes = value.measurement.unit_codes as string[];
      if (new Set(unitCodes).size !== unitCodes.length) throw new Error(`questions[${index}].measurement has duplicate units.`);
      return { ...base, type: value.type, measurement: { code: value.measurement.code, unitCodes } };
    }
    case "SHORT_TEXT":
    case "LONG_TEXT":
    case "NUMBER":
    case "BOOLEAN":
    case "DATE":
    case "PHOTO_REQUEST":
      return { ...base, type: value.type };
    default:
      throw new Error(`questions[${index}].type is unsupported.`);
  }
}

export function parseAssessmentTemplateSchema(value: unknown): AssessmentTemplateSchema {
  if (!isRecord(value) || !Array.isArray(value.questions) || value.questions.length < 1 || value.questions.length > 100) {
    throw new Error("Assessment template schema must contain 1-100 questions.");
  }
  const questions = value.questions.map(parseQuestion);
  if (new Set(questions.map((question) => question.key)).size !== questions.length) throw new Error("Question keys must be unique.");
  const measurementCodes = questions.filter((question) => question.type === "MEASUREMENT").map((question) => question.measurement.code);
  if (new Set(measurementCodes).size !== measurementCodes.length) throw new Error("Measurement codes must be unique per template.");
  if (value.metadata !== undefined && !isRecord(value.metadata)) throw new Error("Template metadata must be an object.");
  return { questions, ...(value.metadata === undefined ? {} : { metadata: value.metadata }) };
}

export function serializeAnswerValue(value: AssessmentAnswerValue): unknown {
  if (isRecord(value) && "unitCode" in value && "measuredAt" in value) {
    const measurement = value as MeasurementAnswer;
    return { value: measurement.value, unit_code: measurement.unitCode, measured_at: measurement.measuredAt };
  }
  if (isRecord(value) && "mediaId" in value) return { media_id: value.mediaId };
  return value;
}

export function parseAssessmentStatus(value: unknown): AssessmentStatus {
  if (typeof value !== "string" || !ASSESSMENT_STATUSES.includes(value as AssessmentStatus)) throw new Error("Invalid assessment status.");
  return value as AssessmentStatus;
}

export function parseAssessmentType(value: unknown): AssessmentType {
  if (typeof value !== "string" || !ASSESSMENT_TYPES.includes(value as AssessmentType)) throw new Error("Invalid assessment type.");
  return value as AssessmentType;
}

export function assertUuid(value: string, field: string): void {
  if (!UUID.test(value)) throw new Error(`${field} must be a UUID.`);
}

export function assertQuestionKey(value: string): void {
  if (!KEY.test(value)) throw new Error("questionKey is invalid.");
}

export function assertFutureIsoTimestamp(value: string | null | undefined, field: string): void {
  if (value == null) return;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) throw new Error(`${field} must be a future ISO timestamp.`);
}

export function assertTrainerFeedback(value: string): void {
  if (value.trim().length < 1 || value.trim().length > 5000) throw new Error("Trainer feedback must contain 1-5000 characters.");
}
