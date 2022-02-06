const fs = require('fs')
const dotenv = require('dotenv')
const envConfig = dotenv.parse(fs.readFileSync('.env.test'))

for (const k in envConfig) {
    process.env[k] = envConfig[k]
}

const buildFastify = require('../app')

describe('test gzip request', () => {
    afterAll(() => {
        buildFastify.fastify.gracefulShutdown((signal, next) => {
            next()
        });
    });

    test('test gzip request', async (done) => {
        let fs = require('fs');
        let data = fs.readFileSync('./test-data/sampleBatch.json.zip');

        buildFastify.fastify.inject({
            method: 'POST',
            url: '/eventproxy/track',
            headers: {
                'content-length': 834,
                'content-type': 'application/json',
                'content-encoding': 'gzip',
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
