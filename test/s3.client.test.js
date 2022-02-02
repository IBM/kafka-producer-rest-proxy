const AWSS3Client = require("../config-providers/AWSS3ConfigProvider");
const s3Client = new AWSS3Client();
const fs = require('fs')
const dotenv = require('dotenv')

const envConfig = dotenv.parse(fs.readFileSync('.env.test'))

for (const k in envConfig) {
    process.env[k] = envConfig[k]
}
const Configuration = require("../config/Configuration");
const configuration = new Configuration().getInstance();

describe('s3 client test suite', () => {
    afterAll(() => {

    });

    test('ajv one object per event-schemas', async (done) => {
        let data = await s3Client.load(configuration.getEventSchemaFolder(), "event-event-schemas/session-end-1.0.json");
        expect(data.error).toBe(null);
        expect(data.data !== null).toBe(true);
        done();
    });

    test('ajv one object per event-schemas', async (done) => {
        let data = await s3Client.load(configuration.getEventSchemaFolder(), "session-end.json");
        expect(data.error !== null).toBe(true);
        expect(data.data).toBe(null);
        done();
    });
});