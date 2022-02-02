const Kafka = require('node-rdkafka');
const kafka_mock = process.env.KAFKA_MOCK;
const Metrics = require("../metrics/Metrics")
const metrics = new Metrics().getInstance();
const logger = require('../log/winston');
const AirlyticsEventValidator = require("../schema-validator/JSONSchemaValidators");
const MessageMapper = require('../model/' + process.env.KAFKA_MESSAGE_MAPPER);


class Producer {

    constructor(configuration) {
        this.id = configuration.id;
        this.name = configuration.name;
        this.kafkaProducerConfig = configuration.kafkaProducerConfig;
        this.successTopics = configuration.successTopics;
        this.errorTopic = configuration.errorTopic;
        this.productName = configuration.productName;
        this.fullErrorDescription = configuration.fullErrorDescription;
        this.partitions = configuration.partitions;
        this.validationSchemasFolder = configuration.validationSchemasFolder;
        this.schemaValidator = new AirlyticsEventValidator(this.validationSchemasFolder, configuration.id);

        if (!kafka_mock) {
            // noinspection JSCheckFunctionSignatures
            logger.info('---------------------------------');
            logger.info('Kafka.features ' + Kafka.features);

            this.kproducer = new Kafka.Producer(this.kafkaProducerConfig, null);

            this.kproducer.on('delivery-report', function (err, report) {
                logger.debug('delivery-report: ' + JSON.stringify(report));
            });

            let that = this;
            this.kproducer.on('event.error', function (err) {
                metrics.incKafkaErrorsCounterByProducer(that.id);
                logger.error('Error from producer:' + JSON.stringify(err))
            });

            this.kproducer.on('event.log', function (log) {
                logger.error('Log:' + JSON.stringify(log))
            })
        }
    }

    collectMetricsByEventType(event, producer_id, isValidEvent, errorType) {
        if (event.name === "user-attributes") {
            // in the case of user-attributes, walk though all attributes and inc metric label by type
            if (event.attributes) {
                for (var key in event.attributes) {
                    if (event.attributes.hasOwnProperty(key)) {
                        metrics.incUserAttributesCounterByProducer(producer_id, key, isValidEvent ? "success" : "failure",
                            isValidEvent ? "" : errorType);
                    }
                }
            }
        }
    }

    async processBatch(eventsBatch, httpHeaders, onEventValidationSuccess, onComplete) {
        let eventsShouldBeResent = [];
        let producer = this;
        let batchProcessingTime = Date.now();


        this.schemaValidator.validate(eventsBatch, this.id,
            httpHeaders["content-encoding"] ? httpHeaders["content-encoding"] : "",
            function (event, originalEventTimeForHeader) {

                let start = Date.now();


                if (!producer.produceInSuccessTopic(new MessageMapper(event, producer.partitions, batchProcessingTime, httpHeaders))) {
                    let errorMessage = "Produce event in topic [" + producer.successTopics + "] failed";
                    logger.error(errorMessage);
                    eventsShouldBeResent.push(event)
                } else {
                    logger.debug("Event name: [" + event.name + "]  id:[" + event.eventId + "] was sent successfully")
                }

                producer.collectMetricsByEventType(event, producer.id, true);
                onEventValidationSuccess(eventsShouldBeResent);

                metrics.setActionsLatency(producer.id, event.name, (Date.now() - start), "send-to-Kafka");

            }, function (errors) {

                errors.forEach((error) => {
                    if (error.event) {
                        producer.collectMetricsByEventType(error.event, producer.id, false);

                        if (error.isErrorEvent) {
                            metrics.incErrorEventsByProducer(producer.id, error.event.name);
                        } else {
                            metrics.incErrorsByProducer(producer.id, error.event.name,
                                (error.event.schemaVersion == null ? "unknown:" : error.event.schemaVersion), error.errorType);
                        }

                        if (!producer.produceInErrorTopic(new MessageMapper(error.event, producer.partitions, batchProcessingTime, httpHeaders, error))) {
                            let errorMessage = "Produce event in topic [" + producer.errorTopic + "] failed";
                            logger.error(errorMessage);
                            eventsShouldBeResent.push(error.event);
                        }

                        logger.debug("Event name:[" + error.event.name + "] id:[" + error.event.eventId + "] failed");
                        logger.debug(JSON.stringify(error.event));

                    }
                });
                onComplete(errors, eventsShouldBeResent);
            });
    }

    getName() {
        return this.name ? this.name : "unknown"
    }

    isFullErrorDescriptionEnabled() {
        if (this.fullErrorDescription) {
            return true;
        }
        return false;
    }

    connect() {
        if (this.kproducer) {
            logger.info("connecting to " + JSON.stringify(this.kproducer.globalConfig));
            this.kproducer.connect(undefined, (err, data) => {
                if (err) {
                    logger.error(JSON.stringify(err));
                }
            });
        }
    }

    disconnect() {
        if (this.kproducer) {
            logger.info("disconnecting from " + JSON.stringify(this.kproducer.globalConfig));
            this.kproducer.disconnect();
        }
    }

    onReady(callback) {
        if (this.kproducer) {
            this.kproducer.on('ready', function () {
                logger.info("---------------------------------------------");
                logger.info("Kafka producer [" + this.name + "] connected");
                logger.info("Brokers list:");
                this._metadata.brokers.forEach((broker) => {
                    logger.info(broker.host + ":" + broker.port)
                });
                logger.info("---------------------------------------------");
                this.setPollInterval(100);
                callback()
            })
        }
    }

    getPollInterval() {
        return this.kproducer.pollInterval;
    }


    getKafkaProducer() {
        return this.kproducer;
    }

    isConnected() {
        return this.kproducer.isConnected();
    }


    /**
     * Submit notification
     *
     * @param  {KafkaMessage} message
     * @return {string|boolean}
     */
    produceInErrorTopic(message) {
        return this.produce(message, this.errorTopic);
    }


    /**
     * Submit notification
     *
     * @param  {KafkaMessage} message
     * @return {string|boolean}
     */
    produceInSuccessTopic(message) {
        return this.produce(message, this.successTopics);
    }

    /**
     * Submit notification
     *
     * @param  {KafkaMessage} message
     * @param  {string} topic
     * @return {string|boolean}
     */
    produce(message, topic) {
        if (kafka_mock) {
            return kafka_mock;
        }
        if (this.kproducer) {
            try {
                if (!this.kproducer.isConnected() || this.kproducer.pollInterval === undefined) {
                    logger.info('Producer is connected: ' + this.kproducer.isConnected());
                    logger.info('Producer pollInterval: ' + this.kproducer.pollInterval);
                    logger.error('A problem occurred when sending event, producer not ready');
                    metrics.incKafkaErrorsCounterByProducer(this.kproducer.id);
                    return false;
                }

                // noinspection JSCheckFunctionSignatures, SpellCheckingInspection
                return this.kproducer.produce(
                    // Topic to send the notification to
                    topic,
                    // optionally we can manually specify a partition for the notification
                    // this defaults to -1 - which will use librdkafka's default partitioner (consistent random for keyed messages, random for unkeyed messages)
                    message.getPartition(),
                    // Message to send. Must be a buffer
                    message.getPayload(),
                    // for keyed messages, we also specify the key - note that this field is optional
                    message.getKey(),
                    // you can send a timestamp here. If your broker version supports it,
                    // it will get added. Otherwise, we default to 0
                    message.getTime(),
                    // you can send an opaque token here, which gets passed along
                    // to your delivery reports
                    undefined,
                    message.getHeaders()
                );
            } catch (err) {
                logger.error('A problem occurred when sending event' + err.toString());
                metrics.incKafkaErrorsCounterByProducer(this.kproducer.id);
                return false
            }
        }
        return kafka_mock
    }
}

module.exports = Producer;
