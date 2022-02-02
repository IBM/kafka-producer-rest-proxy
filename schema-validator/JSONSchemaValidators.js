const Ajv = require('ajv');
const ajv = new Ajv({passContext: true});
const logger = require('../log/winston');
const Metrics = require("../metrics/Metrics");
const metrics = new Metrics().getInstance();
const NINETY_DAY_IN_MILLISECONDS = 7776000000;
const TEN_MINUTES_IN_MILLISECONDS = 60 * 1000 * 10;

const Configuration = require("../config/Configuration");
const configuration = new Configuration().getInstance();

ajv.addKeyword('sessionDuration', {
    type: 'integer',
    validate: function validate (schema, data) {
        validate.errors = [{keyword: 'sessionDuration', message: 'BG session should be longer than FG', params: {keyword: 'sessionDuration'}}];
        return data >= this.attributes.sessionForegroundDuration;
    }
});

ajv.addKeyword('eventTime', {
    type: 'integer',
    errors: true,
    validate: function validate (schema, data) {
        validate.errors = [{keyword: 'eventTime', message: 'time too old', params: {keyword: 'eventTime'}}];
        return data < (Date.now() + TEN_MINUTES_IN_MILLISECONDS) &&
            data > (Date.now() - NINETY_DAY_IN_MILLISECONDS)
    }
});

class JSONSchemaValidators {

    constructor(schemasFolder, producerId) {
        this.availableSchemas = {}; // holds the list of all event-schemas which could be loaded
        this.validators = {};
        this.schemasLastModifiedDate = {};
        this.schemasFolder = schemasFolder;
        this.errorEvents = configuration.getErrorEventsMap(producerId);
        configuration.addOnConfigurationChange(this, this.onConfigurationChange);
        this.loadAllAvailableSchemas().then();
    }


    async loadAllAvailableSchemas() {
        let schemasListResult = await configuration.getValidationJSONSchemas(this.schemasFolder);

        if (!schemasListResult.error) {
            for (let schema of schemasListResult.schemas) {
                this.availableSchemas[schema.name] = schema;

                for (let schemaNameVersion in this.schemasLastModifiedDate) {
                    if (schema.data) {
                        if (schema.lastModified !== this.schemasLastModifiedDate[schemaNameVersion]) {
                            logger.info("[" + schemaNameVersion + "] schema has been updated");
                            this.schemasLastModifiedDate[schemaNameVersion] = schema.lastModified;
                            this.validators[schemaNameVersion] = ajv.compile(JSON.parse(schema.data));
                            logger.info("new schema validator for [" + schemaNameVersion + "] schema has been updated");
                        }
                    }
                }
            }
        }
    }

    async onConfigurationChange(object) {
        object.loadAllAvailableSchemas().then();
    }

    async validate(eventsBatch, producerApiKey, encoding,
                   onEventValidationSuccess, onComplete) {

        if (!eventsBatch.events) {
            onComplete({error: "events array is missing"});
            return;
        }

        let errors = [];

        metrics.setBatchSizes(producerApiKey, eventsBatch.events.length);
        try {

            for (let i = 0; i < eventsBatch.events.length; i++) {

                let event = eventsBatch.events[i];
                // if nothing changed the originalEventTime header won't be added
                let originalEventTimeForHeader = null;

                let preValidation = Date.now();
                // if one of essential attribute is missed, then the validation fails
                if (!event.userId || !event.eventId) {
                    let message = !event.userId ? 'userId' : 'eventId'
                        + ' is missing '
                    logger.error('Event validation failed, ' + message + ' is missing ' + JSON.stringify(event));
                    errors.push({
                        eventId: event.eventId,
                        event: event,
                        errorType: (!event.userId ? 'userId' : 'eventId ') + ' not found',
                        message: message
                    });
                    continue;
                }

                //check if a current event in the error events list
                if (this.errorEvents && this.errorEvents.has(event.name)) {
                    errors.push({
                        eventId: event.eventId,
                        event: event,
                        errorType: "errorEvent",
                        isErrorEvent: true,
                        message: "Event is errorEvent type"
                    });
                    continue;
                }

                metrics.setActionsLatency(producerApiKey, event.name, (Date.now() - preValidation), "pre-validation");

                try {
                    let validator;

                    if (event.schemaVersion) {
                        // add event counter
                        metrics.incEventByProducer(producerApiKey, event.name, encoding, event.schemaVersion);

                        if (!this.validators[event.name + "-" + event.schemaVersion]) {

                            if (this.availableSchemas[event.name + "-" + event.schemaVersion]) {

                                let schema = this.availableSchemas[event.name + "-" + event.schemaVersion];

                                if (schema.lastModified) {
                                    this.schemasLastModifiedDate[event.name + "-" + event.schemaVersion] = schema.lastModified;
                                }

                                if (schema.data) {
                                    this.validators[event.name + "-" + event.schemaVersion] = ajv.compile(JSON.parse(schema.data));
                                } else {
                                    errors.push({
                                        eventId: event.eventId,
                                        event: event,
                                        errorType: "Validator not found",
                                        message: schema.error
                                    })
                                }
                            } else {
                                errors.push({
                                    eventId: event.eventId,
                                    event: event,
                                    errorType: "Schema not found",
                                    message: event.name + "-" + event.schemaVersion + " not found"
                                })
                            }
                        }
                        validator = this.validators[event.name + "-" + event.schemaVersion];
                    } else {
                        // add event counter
                        metrics.incEventByProducer(producerApiKey, event.name, encoding, "unknown");

                        // can't determine validation schema version is not provided, consider validation failed
                        errors.push({
                            eventId: event.eventId,
                            event: event,
                            errorType: "schemaVersion missed",
                            message: "schemaVersion attribute is missing can't determine the validation schema"
                        });
                    }

                    if (validator) {
                        let startJsonValidationRules = Date.now();
                        if (validator.call(event, event)) {
                            metrics.setActionsLatency(producerApiKey, event.name, (Date.now() - startJsonValidationRules), "json-schema-validation");
                        } else {
                            metrics.setActionsLatency(producerApiKey, event.name, (Date.now() - startJsonValidationRules), "json-schema-validation");
                            let errorType = "unknown";

                            errors.push({
                                eventId: event.eventId,
                                event: event,
                                errorType: errorType,
                                message: validator.errors,
                            })
                        }
                    }
                } catch (e) {
                    errors.push({
                        eventId: event.eventId,
                        event: event,
                        errorType: "wrong schema",
                        isErrorEvent: true,
                        eventsShouldBeResent: true,
                        message: e.toString()
                    });
                    continue;
                }
            }
        } catch (e) {
            logger.error(e);
            // throw 505 error unexpected error
            throw new Error(e);
        }
        onComplete(errors);
    }


    getVersions() {
        return Object.keys(this.validators)
    }


    addSchema(version, schema) {
        this.validators[version] = ajv.compile(schema.schema);
    }
}


module.exports = JSONSchemaValidators;


