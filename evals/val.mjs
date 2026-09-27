// An independent adapter: no app endpoint, provider router, or production imports.
export const ENDPOINT = 'https://val.rmit.edu.au/api/chat/completions';

export async function callVal({apiKey, model, system, user, fetchImpl = fetch}) {
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
      body: JSON.stringify({model, temperature: 0, messages: [
        {role: 'system', content: system}, {role: 'user', content: user},
      ]}),
      signal: AbortSignal.timeout(120_000),
      redirect: 'error',
    });
  } catch {
    throw new Error('VAL could not be reached or exceeded the two-minute timeout.');
  }
  // Do not persist provider error bodies, request headers, or credentials.
  if (!response.ok) throw new Error(`VAL request failed (HTTP ${response.status}).`);
  let body;
  try { body = await response.json(); }
  catch { throw new Error('VAL returned invalid JSON.'); }
  const choice = body.choices?.[0];
  if (choice?.finish_reason === 'length') throw new Error('VAL output was truncated.');
  if (typeof choice?.message?.content !== 'string' || !choice.message.content.trim()) throw new Error('VAL returned no text.');
  return {text: choice.message.content, model: body.model ?? model, usage: body.usage ?? null};
}
