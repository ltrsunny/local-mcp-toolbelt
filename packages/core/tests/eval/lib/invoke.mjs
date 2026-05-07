/**
 * In-process invokers for the 5 eval tasks. Mirrors the prompts and chat()
 * options of `src/mcp/server.ts` tool handlers, but skips MCP framing
 * (no _meta, no progress notifications, no defender). The eval is about
 * model quality on the same prompt, not the bridge wrapper.
 *
 * Keep prompts in lockstep with server.ts. If server.ts changes a system
 * prompt, this file must change too.
 */

const SUMMARIZE_SYSTEM =
  'You are a precise summarizer. Produce a single-paragraph summary in plain prose. ' +
  'Do not editorialize. Do not add information not in the source. Match the language of the source text. ' +
  'If a style hint is provided, honor it (e.g. "one sentence", "for a non-technical reader", "bullet points").';

const SUMMARIZE_LONG_SYSTEM =
  'You are a careful summarizer of long documents. Produce a structured ' +
  'summary: first 1-2 sentences giving the core claim, then 3-6 short bullet points covering the supporting ' +
  'detail. Preserve the source language. Do not invent facts. If the source is very long, prioritize the ' +
  'opening, any explicit conclusion, and named entities / numbers. ' +
  'If the source is itself bullet-structured, collapse related bullets into themes — never mirror the source structure. ' +
  'Never exceed 6 bullets in the output regardless of source length.';

const CLASSIFY_SYSTEM =
  'You are a precise classifier. Given a text and a list of categories, ' +
  'assign the correct label(s) and reply with JSON matching the schema exactly. ' +
  'If a reason field is requested, write ONE brief sentence explaining your choice, ' +
  'in the same language as the source text.';

const EXTRACT_SYSTEM =
  'Extract the requested fields from the user text. Reply with JSON matching ' +
  'the schema exactly. Preserve source language inside string values. ' +
  'SCHEMA GUIDANCE: prefer z.discriminatedUnion over bare z.union when branches ' +
  'overlap on output shape — structural grammar enforcement does not guarantee ' +
  'the model picks the intended branch for bare unions.';

const TRANSFORM_SYSTEM =
  'Apply the instruction to the text. Return ONLY the transformed text, with ' +
  'no commentary, no preamble, no explanation. Preserve the source language ' +
  'unless the instruction explicitly says otherwise.';

// Per-tool maxOutputTokens — must mirror MAX_OUTPUT_TOKENS in src/mcp/server.ts
// (see comments there for rationale and Tier-D math).
const MAX_OUTPUT_TOKENS = {
  summarize: 600,
  'summarize-long': 1200,
  classify: 200,
  transform: 1200,
  extract: 2048,
};

export async function invokeSummarize(backend, { text, style, maxInputTokens, signal }) {
  const user = style ? `Style: ${style}\n\nSource:\n${text}` : `Source:\n${text}`;
  return backend.chat({
    system: SUMMARIZE_SYSTEM,
    user,
    temperature: 0.2,
    maxInputTokens,
    maxOutputTokens: MAX_OUTPUT_TOKENS.summarize,
  }, signal);
}

export async function invokeSummarizeLong(backend, { text, style, maxInputTokens, signal }) {
  const user = style ? `Style: ${style}\n\nSource:\n${text}` : `Source:\n${text}`;
  return backend.chat({
    system: SUMMARIZE_LONG_SYSTEM,
    user,
    temperature: 0.2,
    maxInputTokens,
    maxOutputTokens: MAX_OUTPUT_TOKENS['summarize-long'],
  }, signal);
}

export async function invokeClassify(backend, {
  text, categories, allowMultiple = false, explain = false, maxInputTokens, signal,
}) {
  const labelsSchema = allowMultiple
    ? { type: 'array', items: { enum: categories }, minItems: 1 }
    : { type: 'array', items: { enum: categories }, minItems: 1, maxItems: 1 };
  const formatSchema = explain
    ? { type: 'object', properties: { labels: labelsSchema, reason: { type: 'string' } }, required: ['labels', 'reason'] }
    : { type: 'object', properties: { labels: labelsSchema }, required: ['labels'] };
  return backend.chat({
    system: CLASSIFY_SYSTEM,
    user: text,
    temperature: 0.1,
    maxInputTokens,
    format: formatSchema,
    maxOutputTokens: MAX_OUTPUT_TOKENS.classify,
  }, signal);
}

export async function invokeExtract(backend, { text, schema, maxInputTokens, signal }) {
  return backend.chat({
    system: EXTRACT_SYSTEM,
    user: text,
    temperature: 0.2,
    maxInputTokens,
    format: schema,
    maxOutputTokens: MAX_OUTPUT_TOKENS.extract,
  }, signal);
}

export async function invokeTransform(backend, { text, instruction, maxInputTokens, signal }) {
  return backend.chat({
    system: TRANSFORM_SYSTEM,
    user: `Instruction: ${instruction}\n\nText:\n${text}`,
    temperature: 0.3,
    maxInputTokens,
    maxOutputTokens: MAX_OUTPUT_TOKENS.transform,
  }, signal);
}

/** Map task id prefix → invoker. */
export const INVOKERS = {
  '01-summarize-long': invokeSummarizeLong,
  '02-summarize-long-chunked': invokeSummarizeLong, // single-call mode for direct comparison; chunked path tested via runner
  '03-classify': invokeClassify,
  '04-extract': invokeExtract,
  '05-transform': invokeTransform,
};
