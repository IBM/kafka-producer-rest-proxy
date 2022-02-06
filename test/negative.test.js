const fs = require('fs')
const dotenv = require('dotenv')
const envConfig = dotenv.parse(fs.readFileSync('.env.test'))

for (const k in envConfig) {
    process.env[k] = envConfig[k]
}

const buildFastify = require('../app')

describe('negative', () => {
    afterAll(() => {
        buildFastify.fastify.gracefulShutdown((signal, next) => {
            next()
        });
    });

    test('wrong request', async (done) => {

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': 'Z2lsLmZ1Y2hzQGdtYWlsLmNvbTpmaGdqdGp5anl0'
            },
            payload: {}
        }, (err, response) => {
            expect(err).toBe(null)
            expect(response.statusCode).toBe(400);
            expect(response.payload).toBe("argument is not formatted properly");
            done();
        })
    });

    test('api key is missing', async (done) => {
        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
            },
            payload: {}
        }, (err, response) => {
            expect(err).toBe(null)
            expect(response.statusCode).toBe(401);
            expect(response.payload).toBe("x-api-key is missing in the request or wrong");
            done();
        })
    });

    test('api key is wrong', async (done) => {
        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
            },
            payload: {}
        }, (err, response) => {
            expect(err).toBe(null)
            expect(response.statusCode).toBe(401);
            expect(response.payload).toBe("x-api-key is missing in the request or wrong");
            done();
        })
    });

    test('event has not schema should return 202', async (done) => {
        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': 'Z2lsLmZ1Y2hzQGdtYWlsLmNvbTpmaGdqdGp5anl0'
            },
            payload: {
                "events": [
                    {
                        "name": "user-attributes",
                        "userId": "21bc2aF5-a14c-4475-a491-0d3d190b2841",
                        "sessionId": "5f8bba5a-d03b-4503-bb05-9ba463199ab1",
                        "eventId": "4aa8bb41-1b5a-11ea-a826-e5b72de0e096",
                        "productId": "bc479db5-ff58-4138-b5e4-a8400a1f78d5",
                        "appVersion": "1.0",
                        "eventTime": 1574846378853,
                        "platform": "ios",
                        "attributes": {
                            "installDate": 633823100000,
                            "premiumStartDate": 633823100000,
                            "pushToken": "optional. can be a very long string, no specific format. It can also be null in case the pushid has been cancelled",
                            "premium": true
                        }
                    }]
            }
        }, (err, response) => {
            expect(err).toBe(null)
            expect(response.statusCode).toBe(202);
            done();
        })
    });
})