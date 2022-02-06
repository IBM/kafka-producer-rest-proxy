const KafkaMessage = require('../../model/KafkaMessage')
const murmur = require("murmurhash-js");
const HASH_SEED = 894157739;

/**
 * Kafka notification interface.
 */

class IOSNotificationKafkaMessage extends KafkaMessage {

    constructor(notification, partitions, error) {
        super();
        this.notification = notification;
        this.partitions = partitions;
        this.error = error;
    }

    /**
     * @return {number|null} partition - The partition number to produce to.
     */
    getPartition() {
        return  murmur.murmur2(notification.unified_receipt.latest_receipt_info[0].original_transaction_id, HASH_SEED) % this.partitions;
    }

    /**
     *  {Buffer|null} notification - The notification to produce.
     */
    getPayload() {
        // Message to send. Must be a buffer
        return Buffer.from(JSON.stringify(this.notification));
    }

    /**
     *  {string} key - The key associated with the notification.
     */
    getKey() {
        // for keyed messages, we also specify the key - note that this field is optional
        return "";
    }

    /**
     *  {number|null} timestamp - Timestamp to send with the notification.
     */
    getTime() {
        // you can send a timestamp here. If your broker version supports it,
        // it will get added. Otherwise, we default to 0
        return Date.now();
    }

    /**
     * {object} headers - A list of custom key value pairs that provide notification metadata.
     */
    getHeaders() {

        let kafkaMessageHeaders = [];

        if (this.error) {
            //add error details to kafka header
            if (error.message) {
                kafkaMessageHeaders.push({
                    "error-message":
                        typeof error.message === "string" ? error.message : JSON.stringify(error.message)
                });
            }
            //add error type to kafka header
            if (error.message) {
                kafkaMessageHeaders.push({"error-type": error.errorType});
            }
        }


        return kafkaMessageHeaders;
    }
}


module.exports = IOSNotificationKafkaMessage;