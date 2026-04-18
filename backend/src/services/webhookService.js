const Webhook = require('../models/Webhook');
const WebhookLog = require('../models/WebhookLog');
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
            'X-QueueLess-Delivery': crypto.randomUUID(),
            ...(wh.headers ? Object.fromEntries(wh.headers) : {}),
          },
          timeout: 10000,
        };

        const startTime = Date.now();
        const transport = isHttps ? https : http;

        await new Promise((resolve) => {
          const req = transport.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk.toString().substring(0, 2000); });
            res.on('end', async () => {
              const duration = Date.now() - startTime;
              const success = res.statusCode >= 200 && res.statusCode < 300;

              wh.lastTriggered = new Date();
              wh.lastStatus = res.statusCode;
              if (success) { wh.failCount = 0; }
              else { wh.failCount += 1; }

              // Auto-disable after max retries
              if (wh.failCount >= (wh.maxRetries || 10)) {
                wh.isActive = false;
                logger.warn(`Webhook ${wh.name} auto-disabled after ${wh.failCount} failures`);
              }

              wh.save().catch(() => {});

              // Log the delivery
              WebhookLog.create({
                webhook: wh._id, event, url: wh.url,
                requestBody: body.substring(0, 2000),
                responseStatus: res.statusCode,
                responseBody: responseBody.substring(0, 2000),
                duration, success,
              }).catch(() => {});

              logger.info(`Webhook ${wh.name} triggered: ${event} → ${res.statusCode} (${duration}ms)`);
              resolve();
            });
          });

          req.on('error', async (err) => {
            const duration = Date.now() - startTime;
            wh.failCount += 1;
            wh.lastTriggered = new Date();

            if (wh.failCount >= (wh.maxRetries || 10)) {
              wh.isActive = false;
              logger.warn(`Webhook ${wh.name} auto-disabled after ${wh.failCount} failures`);
            }

            wh.save().catch(() => {});

            WebhookLog.create({
              webhook: wh._id, event, url: wh.url,
              requestBody: body.substring(0, 2000),
              error: err.message, duration, success: false,
            }).catch(() => {});

            logger.error(`Webhook ${wh.name} failed: ${err.message}`);
            resolve();
          });

          req.on('timeout', () => { req.destroy(new Error('Timeout')); });
          req.write(body);
          req.end();
        });
      } catch (err) {
        logger.error(`Webhook trigger error: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`Webhook service error: ${err.message}`);
  }
};

module.exports = { triggerWebhooks };
