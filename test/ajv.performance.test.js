const fs = require('fs')
const dotenv = require('dotenv')
const Ajv = require('ajv');
const ajv = new Ajv();
const ajv1 = new Ajv();
const ajv2 = new Ajv();
const ajv3 = new Ajv();

describe('ajv performance test suite', () => {
    afterAll(() => {

    });

    test('ajv one object per event-schemas', async (done) => {
        let fs = require('fs');
        let schemaStartSession = JSON.parse(fs.readFileSync('./test-data/session-start-1.0.json').toString());
        let schemaEndSession = JSON.parse(fs.readFileSync('./test-data/session-end-1.0.json'));
        let schemaUserAttribute = JSON.parse(fs.readFileSync('./test-data/user-attributes-1.0.json'));
        let batch = JSON.parse(fs.readFileSync('./test-data/sampleBatch.json').toString())

        let validators = {};

        validators["session-start"] = ajv.compile(schemaStartSession);
        validators["session-end"] = ajv1.compile(schemaEndSession);
        validators["user-attributes"] = ajv2.compile(schemaUserAttribute);

        let start = new Date().getTime();


        for (let j = 0; j < 10000; j++) {
            batch.events.forEach((event) => {
                if (!validators[event.name](event)) {
                    console.error("validation error")
                }
            })
        }

        console.log("ajv one object per event-schemas:" + (new Date().getTime() - start));
        done();
    });
});