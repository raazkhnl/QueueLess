const Webhook = require('../models/Webhook');
const logger = require('../config/logger');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const triggerWebhooks = async (orgId, event, payload) => {
  try {
    const webhooks = await Webhook.find({
      organization: orgId, isActive: true, events: event,
    });

    for (const wh of webhooks) {
      try {
        const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
        const signature = wh.secret ? crypto.createHmac('sha256', wh.secret).update(body).digest('hex') : '';

        const url = new URL(wh.url);
        const isHttps = url.protocol === 'https:';
        const options = {
          hostname: url.hostname, port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search, method: 'POST',
          headers: {
            'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
            'X-QueueLess-Event': event, 'X-QueueLess-Signature': signature,
            ...(wh.headers ? Object.fromEntries(wh.headers) : {}),
          },
          timeout: 10000,
        };

        const transport = isHttps ? https : http;
        const req = transport.request(options, (res) => {
          wh.lastTriggered = new Date();
          wh.lastStatus = res.statusCode;
          if (res.statusCode >= 200 && res.statusCode < 300) { wh.failCount = 0; }
          else { wh.failCount += 1; }
          wh.save().catch(() => {});
          logger.info(`Webhook ${wh.name} triggered: ${event} → ${res.statusCode}`);
        });
        req.on('error', (err) => {
          wh.failCount += 1; wh.lastTriggered = new Date(); wh.save().catch(() => {});
          logger.error(`Webhook ${wh.name} failed: ${err.message}`);
        });
        req.write(body);
        req.end();
      } catch (err) {
        logger.error(`Webhook trigger error: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`Webhook service error: ${err.message}`);
  }
};

module.exports = { triggerWebhooks };
