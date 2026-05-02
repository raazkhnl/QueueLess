/**
 * Lightweight honeypot anti-spam for public POST endpoints.
 *
 * Strategy: the public form ships an invisible field named `_hp` (CSS-hidden,
 * tab-index -1, autocomplete off). A real human leaves it empty; most naïve
 * bots dutifully fill every input they see. If `_hp` arrives non-empty, we
 * 204-OK the request to make the bot think it succeeded while quietly dropping
 * it. We also enforce a minimum form-render-to-submit gap of 1.5s using a
 * timestamp signed-ish field `_t` (millis-since-render); too-fast = bot.
 *
 * This is best-effort; not a replacement for reCAPTCHA in high-risk deploys,
 * but catches the long tail of mass-form spam without any external dependency.
 */
const MIN_FILL_MS = 1500;

function honeypot(req, res, next) {
  const hp = req.body?._hp;
  if (hp && String(hp).trim() !== '') {
    // Bot detected — pretend success
    return res.status(204).end();
  }
  const t = Number(req.body?._t);
  if (t && Number.isFinite(t)) {
    const elapsed = Date.now() - t;
    if (elapsed >= 0 && elapsed < MIN_FILL_MS) {
      return res.status(204).end();
    }
  }
  // Strip helper fields so they don't pollute downstream payloads
  if (req.body) { delete req.body._hp; delete req.body._t; }
  next();
}

module.exports = { honeypot };
