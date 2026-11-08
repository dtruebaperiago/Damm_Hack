import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError, fromTypeform } from "./providers.mjs";
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
    await store.accept(
      id,
      item.hidden?.delivery,
      item.response_id || item.token,
      fromTypeform(item, w.survey, definition),
      "typeform",
      Date.parse(item.submitted_at),
    );
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
    return "rejected";
  }
  return "accepted";
}
