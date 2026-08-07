const offerRepository = require("../repositories/offerRepository");
const offerEngineService = require("./offerEngineService");

// BR-05/BR-06 · NFR-02: quét offer 'sent' đã quá expires_at, chu kỳ mặc định 30 giây.
const DEFAULT_INTERVAL_MS = Number(process.env.OFFER_SWEEP_INTERVAL_SECONDS || 30) * 1000;

let timer = null;

async function sweepOnce() {
  const expired = await offerRepository.findExpired();
  for (const offer of expired) {
    try {
      await offerEngineService.expireOffer(offer.id);
    } catch (error) {
      console.error(`[offerExpirySweeper] offer ${offer.id} thất bại: ${error.message}`);
    }
  }
  return expired.length;
}

function start(intervalMs = DEFAULT_INTERVAL_MS) {
  if (timer) return timer;
  timer = setInterval(() => {
    sweepOnce().catch((error) => console.error("[offerExpirySweeper]", error));
  }, intervalMs);
  if (timer.unref) timer.unref();
  console.log(`[offerExpirySweeper] started interval=${intervalMs}ms`);
  return timer;
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { sweepOnce, start, stop };
