import { createHmac, timingSafeEqual } from "node:crypto";
import { decodeJSON } from "./db.mjs";
import { AppError, fromTypeform, llmJSON } from "./providers.mjs";
import { topics } from "./domain.mjs";
export function verifyTypeformSignature(raw, signature, secret) {
  if (!secret || typeof signature !== "string") return false;
  const expected = Buffer.from(
    "sha256=" + createHmac("sha256", secret).update(raw).digest("base64"),
  );
  const received = Buffer.from(signature);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
export async function importTypeformResponse(
  store,
  w,
  item,
  definition,
  config,
  { classify = true } = {},
) {
  const id = w.id;
  if (w.state !== "published") return "closed";
  const externalId = item.response_id || item.token;
  if (
    await store.db
      .prepare("SELECT 1 FROM accepted WHERE form_id=? AND external_id=?")
      .get(w.form_id, externalId)
  )
    return "duplicate";
  try {
    const responseId = await store.accept(
      id,
      item.hidden?.delivery,
      item.response_id || item.token,
      fromTypeform(item, w.survey, definition),
      "typeform",
      Date.parse(item.submitted_at),
    );
    // Classificació sense tokens ni pseudònims; una fallada conserva la resta de la resposta.
    if (classify && (config.groqKey || config.openaiKey)) {
      const row = await store.db
          .prepare("SELECT answers FROM accepted WHERE id=?")
          .get(responseId),
        answers = decodeJSON(row.answers);
      const texts = Object.entries(answers).filter(([, a]) => a.text);
      if (texts.length) {
        for (const [, a] of texts) a.temes = [];
        await store.db
          .prepare("UPDATE accepted SET answers=? WHERE id=?")
          .run(JSON.stringify(answers), responseId);
        try {
          const classified = await llmJSON(
            "classification",
            {
              elements: texts.map(([qid, a], i) => ({
                id: `t${i}`,
                text: a.text,
              })),
            },
            config,
          );
          if (
            !Array.isArray(classified.elements) ||
            classified.elements.length !== texts.length
          )
            throw new Error();
          for (const [i, [qid, a]] of texts.entries()) {
            const item = classified.elements.find((x) => x.id === `t${i}`);
            if (
              !item ||
              !Array.isArray(item.temes) ||
              item.temes.some((t) => !Object.hasOwn(topics, t))
            )
              throw new Error();
            answers[qid].temes = [...new Set(item.temes)];
          }
          await store.db
            .prepare("UPDATE accepted SET answers=? WHERE id=?")
            .run(JSON.stringify(answers), responseId);
        } catch {}
      }
    }
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
    return "rejected";
  }
  return "accepted";
}
