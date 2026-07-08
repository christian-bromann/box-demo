import { createMiddleware } from "langchain";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";

/**
 * Works around a bug in `@langchain/openai`'s Responses API converter that
 * surfaces on the *second* turn of a thread.
 *
 * The LangGraph server persists AI messages with standard content blocks and
 * `response_metadata.output_version === "v1"`. When such a message is fed back
 * into `ChatOpenAI({ useResponsesApi: true })`, the converter routes it through
 * `convertStandardContentMessageToResponsesInput`, which serializes the
 * assistant's text as `input_text`. The Responses API only accepts
 * `output_text`/`refusal` for assistant content, so the request 400s with:
 *
 *   Invalid value: 'input_text'. Supported values are: 'output_text' and 'refusal'.
 *
 * Dropping the `output_version` marker on the messages we send to the model
 * makes the converter use the correct path (it replays the raw provider output,
 * keeping reasoning/message items properly paired and text as `output_text`).
 * We only mutate copies passed to the model; persisted state keeps its content
 * blocks so the UI can still render reasoning.
 */
export const responsesHistoryFix = createMiddleware({
  name: "ResponsesHistoryFix",
  wrapModelCall: (request, handler) => {
    let changed = false;
    const messages = request.messages.map((msg: BaseMessage) => {
      if (!AIMessage.isInstance(msg)) return msg;
      const metadata = msg.response_metadata as Record<string, unknown> | undefined;
      if (!metadata || metadata.output_version == null) return msg;
      changed = true;
      const { output_version: _dropped, ...rest } = metadata;
      const Ctor = msg.constructor as new (fields: Record<string, unknown>) => BaseMessage;
      return new Ctor({ ...msg, response_metadata: rest });
    });
    return handler(changed ? { ...request, messages } : request);
  },
});
