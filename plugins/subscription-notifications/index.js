'use strict'

const Prometheus = require('prom-client');
const Base64 = require('js-base64').Base64;
const AndroidNotificationTypes = require("./AndroidNotificationTypes");
const androidNotificationTypes = new AndroidNotificationTypes();
const fp = require('fastify-plugin');
const {BroadcastChannel} = require('broadcast-channel');
const broadcastChannel = new BroadcastChannel('errors');
const AndroidNotificationKafkaMessage = require('./AndroidNotificationKafkaMessage');
const IOSNotificationKafkaMessage = require('./IOSNotificationKafkaMessage');


const notificationErrorsCounter = new Prometheus.Counter({
    name: 'subscription_notification_errors',
    help: 'Counter for subscription notification errors occurred during the processing',
    labelNames: ['product', 'env']
});

const notificationsCounter = new Prometheus.Counter({
    name: 'subscription_notifications_counter',
    help: 'The counter for subscription  notification the proxy is processed',
    labelNames: ['product', 'notification_type', 'env']
});

const notificationsResponseTime = new Prometheus.Histogram({
    name: 'subscription_notification_request_response_time',
    help: 'Duration of HTTP requests processing in ms',
    labelNames: ['product', 'env'],
    // buckets for response time from 0.1 ms to 500 millisecond
    buckets: [5, 10, 50, 100, 200, 300, 400, 500]
});


function subscriptionNotificationsHandler(fastify, opts, next) {
    const logger = fastify.log.child({plugin: 'subscription-notifications'});
    let configuration = opts.configuration;
    let producers = opts.producers;
    let environment = opts.env
    let productName = opts.productName;
    let notificationProducer;


    for (const [key, producer] of producers.producers.entries()) {
        if (producer.productName === productName) {
            notificationProducer = producer;
        }
    }

    const processAndroidNotification = (product, platform, notificationEventAsJson, reply) => {
        let promises = [];
        let errorsOnProducing = [];

        //metrics.incRequestsByProducer(apiKey, "android_notification");
        promises.push(new Promise((resolve, reject) => {
            try {
                let start = Date.now();

                //validate notification struct
                if (notificationEventAsJson.message === null || notificationEventAsJson.message.data === null) {
                    notificationErrorsCounter.labels(productName).inc();
                    errorsOnProducing.push({
                        error: {"message": product + "(" + platform + "):notification event has wrong format"}
                    });
                    resolve();
                }

                //decode notification body from base64
                let notificationEvent = JSON.parse(Base64.decode(notificationEventAsJson.message.data));


                if (notificationEvent.subscriptionNotification !== null && notificationEvent.subscriptionNotification.notificationType !== null) {
                    notificationsCounter.labels(productName,
                        androidNotificationTypes.getTypeByInt(notificationEvent.subscriptionNotification.notificationType), environment).inc();
                }


                // send notification to Kafka producer
                if (!produceAndroidNotificationEvent(new AndroidNotificationKafkaMessage(notificationEvent, notificationProducer.partition))) {

                    let errorMessage = "Produce notification event in topic [" + notificationProducer.successTopics + "] failed";
                    notificationErrorsCounter.labels(productName, environment).inc();
                    logger.error(errorMessage);


                    let error = {
                        payload: errorMessage,
                        apiKey: notificationProducer.id
                    };


                    errorsOnProducing.push(error);
                    broadcastChannel.postMessage(error).then();

                } else {
                    logger.debug(product + "(" + platform + ") notification was produced successfully")
                }
                notificationsResponseTime.labels(productName, environment).observe((Date.now() - start));
                resolve();
            } catch (e) {
                notificationErrorsCounter.labels(productName, environment).inc();
                logger.error(e.toString());
                let error = {
                    payload: e.toString(),
                    apiKey: notificationProducer.id
                };

                errorsOnProducing.push(error);
                broadcastChannel.postMessage(error).then();
                resolve();
            }
        }));

        Promise.all(promises).then(value => {
            if (errorsOnProducing.length === 0) {
                reply.status(200).send("")
            } else {
                reply.status(500).send(errorsOnProducing[0]);
            }
        }, reason => {
            logger.error("App-Store notification processing failed" + reason);
        });
    };

    const getNotificationProducerApiKeysByProduct = (product, platform) => {
        let notificationProducer = [];
        configuration.producersConfiguration.producersConfig.forEach((producerConfig) => {
            if (producerConfig.type === ("notification") &&
                producerConfig.productName === product && producerConfig.platform.toLowerCase() === platform) {
                notificationProducer.push(producerConfig.id);
            }
        });
        return notificationProducer;
    };


    const processIOSNotification = (product, platform, notificationEvent, reply) => {
        let promises = [];
        let errorsOnProducing = [];
        getNotificationProducerApiKeysByProduct(product, platform).forEach((apiKey) => {
            metrics.incRequestsByProducer(apiKey, "ios_notification");
            promises.push(new Promise((resolve, reject) => {
                try {
                    let start = Date.now();

                    //validate notification struct
                    if (notificationEvent.unified_receipt === null
                        || notificationEvent.unified_receipt.latest_receipt_info === null) {
                        metrics.incNotificationErrorsByProducer(apiKey);
                        errorsOnProducing.push({
                            error: {"message": product + "(" + platform + ") notification event has wrong format"}
                        });
                        resolve();
                    }

                    if (notificationEvent.notification_type !== null) {
                        notificationsCounter.labels(productName,
                            notificationEvent.notification_type).inc();
                    }


                    if (!produceIOSNotificationEvent(new IOSNotificationKafkaMessage(notificationEvent, notificationProducer.partition))) {

                        let errorMessage = "Produce notification event in topic [" + notificationProducer.successTopics + "] failed";
                        notificationErrorsCounter.labels(productName).inc();
                        logger.error(errorMessage);


                        let error = {
                            payload: errorMessage,
                            apiKey: notificationProducer.id
                        };

                        errorsOnProducing.push(error);
                        broadcastChannel.postMessage(error).then();

                    } else {
                        logger.debug("Event name: [apple-notification]  was produced successfully")
                    }
                    notificationsResponseTime.labels(productName, environment).observe((Date.now() - start));
                    resolve();
                } catch (e) {
                    metrics.incNotificationErrorsByProducer(apiKey);
                    logger.error(e.toString());
                    let error = {
                        payload: e.toString(),
                        apiKey: notificationProducer.id
                    };

                    errorsOnProducing.push(error);
                    broadcastChannel.postMessage(error).then();
                    resolve();
                }
            }));
        });

        Promise.all(promises).then(value => {
            if (errorsOnProducing.length === 0) {
                reply.status(200).send("")
            } else {
                reply.status(500).send(errorsOnProducing[0]);
            }
        }, reason => {
            logger.error("Apple notification failed" + reason);
        });
    };


    const produceAndroidNotificationEvent = (message) => {
        if (notificationProducer) {
            try {
                if (!isProducerIsReady()) {
                    return false;
                }

                // noinspection JSCheckFunctionSignatures, SpellCheckingInspection
                return notificationProducer.getKafkaProducer().produce(
                    // Topic to send the notification to
                    notificationProducer.successTopics,
                    // optionally we can manually specify a partition for the notification
                    // this defaults to -1 - which will use librdkafka's default partitioner (consistent random for keyed messages, random for unkeyed messages)
                    message.getPartition(),
                    // Message to send. Must be a buffer
                    message.getPayload(),
                    // for keyed messages, we also specify the key - note that this field is optional
                    "",
                    // you can send a timestamp here. If your broker version supports it,
                    // it will get added. Otherwise, we default to 0
                    Date.now(),
                    // you can send an opaque token here, which gets passed along
                    // to your delivery reports
                );
            } catch (err) {
                logger.error('A problem occurred when sending event' + err.toString());
                metrics.incKafkaErrorsCounterByProducer(notificationProducer.id);
                return false
            }
        }
        return true;
    };


    const isProducerIsReady = () => {
        if (!notificationProducer.isConnected() || notificationProducer.getPollInterval() === undefined) {
            logger.info('Producer is connected: ' + notificationProducer.isConnected());
            logger.info('Producer pollInterval: ' + notificationProducer.getPollInterval());
            logger.error('A problem occurred when sending event, producer not ready');
            metrics.incKafkaErrorsCounterByProducer(notificationProducer.id);
            return false;
        }
        return true;
    }

    const produceIOSNotificationEvent = (message) => {
        if (notificationProducer) {
            try {

                if (!isProducerIsReady()) {
                    return false;
                }

                if (event.unified_receipt === null || event.unified_receipt.latest_receipt_info === null) {
                    return false;
                }

                // noinspection JSCheckFunctionSignatures, SpellCheckingInspection
                return notificationProducer.produce(
                    // Topic to send the notification to
                    this.successTopics,
                    // optionally we can manually specify a partition for the notification
                    // this defaults to -1 - which will use librdkafka's default partitioner (consistent random for keyed messages, random for unkeyed messages)
                    message.getPartition(),
                    // Message to send. Must be a buffer
                    message.getPayload(),
                    // for keyed messages, we also specify the key - note that this field is optional
                    "",
                    // you can send a timestamp here. If your broker version supports it,
                    // it will get added. Otherwise, we default to 0
                    Date.now(),
                    // you can send an opaque token here, which gets passed along
                    // to your delivery reports
                );

            } catch (err) {
                logger.error('A problem occurred when sending event' + err.toString());
                metrics.incKafkaErrorsCounterByProducer(notificationProducer.id);
                return false
            }
        }
        return kafka_mock
    };


    fastify.post('/eventproxy/play-store/notification', async function (req, reply) {
        processAndroidNotification("Android", "android", req.body, reply);
    });

    fastify.post('/eventproxy/app-store/notification', async function (req, reply) {
        processIOSNotification("iOS", "ios", req.body, reply);
    });


    if (fastify.swaggerSpecification) {
        fastify.swaggerSpecification.push(require('./subscription-notifications'));
    }

    next();
}

module.exports = fp(subscriptionNotificationsHandler, {
    fastify: '3.x',
    name: 'subscription-notifications',
})