const fs = require('fs')
const dotenv = require('dotenv')
const envConfig = dotenv.parse(fs.readFileSync('.env.test'))
jest.setTimeout(30000);
for (const k in envConfig) {
    process.env[k] = envConfig[k]
}

const buildFastify = require('../app')

describe('sanity test', () => {
    afterAll(() => {
        buildFastify.fastify.gracefulShutdown((signal, next) => {
            next()
        });
    });

    test('base track test', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('./test-data/sampleBatch.json');

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-type': 'application/json',
                'x-api-key': 'Z2lsLmZ1Y2hzQGdtYWlsLmNvbTpmaGdqdGp5anl0'
            },
            payload: data
        }, (err, response) => {
            expect(response.statusCode).toBe(200);
            expect(response.payload).toBe("");
            done();
        })
    });
});