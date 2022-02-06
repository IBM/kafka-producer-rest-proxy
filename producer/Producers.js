const Configuration = require("../config/Configuration");
const configuration = new Configuration().getInstance();
const Producer = require("./Producer");
const logger = require('../log/winston');

class Producers {
    constructor() {
        this.producers = new Map();
        configuration.getProducersConfig().forEach((producerConfig) => {
            this.producers.set(producerConfig.id, new Producer(producerConfig))
        });
        configuration.addOnConfigurationChange(this, this.updateProducers)
    }

    updateProducers(object, configuration) {
        configuration.getProducersConfig().forEach((producerConfig) => {
            object.createUpdateProducer(producerConfig);
        })
    }

    // noinspection JSUnusedGlobalSymbols
    createUpdateProducer(producerConfig) {
        // create a new  producer
        const newProducer = new Producer(producerConfig);
        newProducer.connect();
        newProducer.onReady(() => {
            // replace the old producer once the new one is connected successfully
            // and only then disconnect the old producer if it exists
            let oldProducer = this.producers.get(producerConfig.id);
            this.producers.set(producerConfig.id, newProducer);

            if (oldProducer) {
                oldProducer.disconnect()
                logger.info("The outdated Kafka Producers [" + oldProducer.id + "] was disconnected successfully")
                logger.info("Kafka Producers [" + newProducer.id + "] was recreated with new configuration successfully")
            } else {
                logger.info("Kafka Producers [" + newProducer.id + "] was created successfully")
            }
        });
    }

    // noinspection JSUnusedGlobalSymbols
    removeProducer(producerId) {
        if (this.producers.has(producerId)) {
            this.producers.get(producerId).disconnect()
        }
    }

    getProducer(producerId) {
        return this.producers.get(producerId);
    }

    connectAll(callback) {
        const promises = [];
        let i = 0;
        for (const producer of this.producers.values()) {
            promises.push(() => {
            });
            producer.onReady(promises[i]);
            i++
        }

        for (const producer of this.producers.values()) {
            producer.connect();
        }

        Promise.all(promises).then(values => {
            logger.debug("All products [" + values + "] are connecting")
        });

        callback()
    }

    disconnect() {
        for (const producer of this.producers.values()) {
            producer.disconnect()
        }
    }
}

module.exports = Producers;