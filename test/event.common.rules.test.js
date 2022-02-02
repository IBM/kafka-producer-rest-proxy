const fs = require('fs')
const dotenv = require('dotenv')
const envConfig = dotenv.parse(fs.readFileSync('.env.test'))
const DATE_31_JAN_1990_IN_MILLISECONDS = 633823200000;
const NINETY_DAY_IN_MILLISECONDS = 7776000000;
const TWO_YEARS_IN_MILLISECONDS = 63072000000;
const CENTURY_IN_MILLISECONDS = TWO_YEARS_IN_MILLISECONDS * 50;
const TEN_MINUTES_IN_MILLISECONDS = 60 * 1000 * 10;

for (const k in envConfig) {
    process.env[k] = envConfig[k]
}

const buildFastify = require('../app')
const apiKey = 'YizUYE1fgAL3tUcjnZho2f62mWQo6CjAd7cSAmHp';

describe('common rules test', () => {
    afterAll(() => {
        buildFastify.fastify.gracefulShutdown((signal, next) => {
            next()
        });
    });

    test('max age exceeded', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('../test-data/negative/old-events-batch.json');

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey
            },
            payload: data
        }, (err, response) => {
            expect(response.statusCode).toBe(202);
            expect(JSON.parse(response.payload)[0].eventId).toBe("4aa8bb40-1b5a-11ea-a826-e5b72de0e096");
            expect(JSON.parse(response.payload)[0].errorType).toBe("Old event");
            done();
        })
    });

    test('wrong eventTime', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('../test-data/sampleBatch.json');
        let jsonData =  JSON.parse(new String(data));
        jsonData.events[0].eventTime = new Date().getTime() + 20 * 60 * 1000

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey
            },
            payload: jsonData
        }, (err, response) => {
            expect(response.statusCode).toBe(202);
            expect(JSON.parse(response.payload)[0].eventId).toBe("4aa8bb40-1b5a-11ea-a826-e5b72de0e096");
            expect(JSON.parse(response.payload)[0].errorType).toBe("Future event");
            done();
        })
    });
    test('installDate userAttributesInstallDate', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('../test-data/eventValidationRulesSampleBatch.json');
        let jsonData =  JSON.parse(new String(data));

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey
            },
            payload: jsonData
        }, (err, response) => {
            expect(response.statusCode).toBe(202);
            expect(JSON.parse(response.payload)[0].eventId).toBe("4aa8bb41-1b5a-11ea-a826-e5b72de0e096");
            expect(JSON.parse(response.payload)[0].errorType).toBe("Install date");
            done();
        })
    });

    test('session-end sessionDuration => sessionForegroundDuration', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('../test-data/eventSessionDurationRulesSampleBatch.json');
        let jsonData =  JSON.parse(new String(data));

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey
            },
            payload: jsonData
        }, (err, response) => {
            expect(response.statusCode).toBe(202);
            expect(JSON.parse(response.payload)[0].eventId).toBe("4aa8bb42-1b5a-11ea-a826-e5b72de0e096");
            expect(JSON.parse(response.payload)[0].errorType).toBe("FG session > BG");
            done();
        })
    });

    test('user-attributes premiumStartDate null should be OK', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('../test-data/eventPremiumStartDateNull.json');
        let jsonData =  JSON.parse(new String(data));

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey
            },
            payload: jsonData
        }, (err, response) => {
            expect(response.statusCode).toBe(200);
            expect(response.payload).toBe("");
            done();
        })
    });

    test('negative user-attributes premiumStartDate should not be more than 2 years from now ', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('../test-data/negative/eventPremiumStartDate.json');
        let jsonData =  JSON.parse(new String(data));

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey
            },
            payload: jsonData
        }, (err, response) => {
            expect(response.statusCode).toBe(202);
            expect(JSON.parse(response.payload)[0].eventId).toBe("4aa8bb40-1b5a-11ea-a826-e5b72de0e096");
            expect(JSON.parse(response.payload)[0].errorType).toBe("Premium Start Date");
            done();
        })
    });

    test('prositive user-attributes premiumStartDate should not be more than 2 years from now ', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('../test-data/eventPremiumStartDate.json');
        let jsonData =  JSON.parse(new String(data));

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey
            },
            payload: jsonData
        }, (err, response) => {
            expect(response.statusCode).toBe(200);
            expect(response.payload).toBe("");
            done();
        })
    });


    test('negative user-attributes PremiumExpirationDate should be < 100 years from now ', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('../test-data/negative/eventPremiumExpirationDate.json');
        let jsonData =  JSON.parse(new String(data));

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey
            },
            payload: jsonData
        }, (err, response) => {
            expect(response.statusCode).toBe(202);
            expect(JSON.parse(response.payload)[0].eventId).toBe("4aa8bb40-1b5a-11ea-a826-e5b72de0e096");
            expect(JSON.parse(response.payload)[0].errorType).toBe("Premium Expiration Date");
            done();
        })
    });

    test('prositive user-attributes  PremiumExpirationDate should be < 100 years from now ', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('../test-data/eventPremiumExpirationDate.json');
        let jsonData =  JSON.parse(new String(data));

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey
            },
            payload: jsonData
        }, (err, response) => {
            expect(response.statusCode).toBe(200);
            expect(response.payload).toBe("");
            done();
        })
    });

    test('negative user-attributes VersionInstallDate should be > 1990 and < 10 minutes from now ', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('../test-data/negative/eventVersionInstallDate.json');
        let jsonData =  JSON.parse(new String(data));

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey
            },
            payload: jsonData
        }, (err, response) => {
            expect(response.statusCode).toBe(202);
            expect(JSON.parse(response.payload)[0].eventId).toBe("4aa8bb40-1b5a-11ea-a826-e5b72de0e096");
            expect(JSON.parse(response.payload)[0].errorType).toBe("Version Install Date");
            done();
        })
    });

    test('negative user-attributes  Expiration Date should be > 1990 and < 2 years from now', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('../test-data/negative/eventExpirationDate.json');
        let jsonData =  JSON.parse(new String(data));

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey
            },
            payload: jsonData
        }, (err, response) => {
            expect(response.statusCode).toBe(202);
            expect(JSON.parse(response.payload)[0].eventId).toBe("4aa8bb40-1b5a-11ea-a826-e5b72de0e096");
            expect(JSON.parse(response.payload)[0].errorType).toBe("Expiration Date");
            done();
        })
    });
});