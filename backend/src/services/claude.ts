/**
 * Placeholder LLM service. If ANTHROPIC_API_KEY isn't set, returns a deterministic mock.
 * Swap in Anthropic SDK or OpenAI later.
 */
type RunOptions = { prompt: string };

export async function runClaude({ prompt }: RunOptions) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      model: "claude-mock",
      output: `MOCK_RESULT: ${prompt.slice(0, 200)}`
    };
  }

  // TODO: wire real call when ready.
  return {
    model: "claude-todo",
    output: `LIVE_CALL_NOT_WIRED: ${prompt.slice(0, 200)}`
  };
}