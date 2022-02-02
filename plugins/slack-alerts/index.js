'use strict'

const Prometheus = require('prom-client');
const fp = require('fastify-plugin');
const {BroadcastChannel} = require('broadcast-channel');
const {IncomingWebhook} = require('@slack/webhook');


function slackAlerts(fastify, opts, next) {
    const logger = fastify.log.child({plugin: 'slack-alerts'});
    let configuration = opts.configuration;
    let broadcastChannel = new BroadcastChannel('errors');
    let slackWebHooks = new Map();
    let excludeSlackWebHooksEventType = new Map();


    configuration.producersConfiguration.producersConfig.forEach((producerConfig) => {
        // noinspection JSUnresolvedVariable
        if (!slackWebHooks.get(producerConfig.id) && producerConfig.slackWebHook) {
            slackWebHooks.set(producerConfig.id, new IncomingWebhook(producerConfig.slackWebHook));
            excludeSlackWebHooksEventType.set(producerConfig.id, producerConfig.excludeSlackWebHooksEventType);
        }
    });


    broadcastChannel.onmessage = msg => {
        if (slackWebHooks.get(msg.apiKey)
            && !excludeSlackWebHooksEventType.get(msg.apiKey).includes(msg.errorType)) {
            //Send the notification
            (async () => {
                try {
                    await slackWebHooks.get(msg.apiKey).send({
                        text: JSON.stringify(msg.payload, null, 4)
                    });
                } catch (e) {
                    logger.error("Sending notification to slack failed:" + e.toString())
                    console.error("Sending notification to slack failed:" + e.toString())
                }
            })();
        }
    };

    next()
}

module.exports = fp(slackAlerts, {
    fastify: '^3.0.0',
    name: 'slack-alerts',
})