const loadtest = require('loadtest');
const should = require('should');
const fs = require('fs')
const uuidv4 = require('uuid/v4');
const dotenv = require('dotenv')
const envConfig = dotenv.parse(fs.readFileSync('../.env.test'))


const DATE_31_JAN_1990_IN_MILLISECONDS = 633823200000;
const NINETY_DAY_IN_MILLISECONDS = 7776000000;
const TWO_YEARS_IN_MILLISECONDS = 63072000000;
const CENTURY_IN_MILLISECONDS = TWO_YEARS_IN_MILLISECONDS * 50;
const TEN_MINUTES_IN_MILLISECONDS = 60 * 1000 * 10;

for (const k in envConfig) {
    process.env[k] = envConfig[k]
}
const testedHost = "airlytics-internal.airlock.twcmobile.weather.com";

if (testedHost === 'localhost') {
    require('../app')
}


// Expiration Date should be > 1990 and < 2 years from now
const expirationDate = (event) => {
    if (event.attributes.expirationDate === null || event.attributes.expirationDate === undefined) {
        return true;
    }
    return event.attributes.expirationDate > DATE_31_JAN_1990_IN_MILLISECONDS && event.attributes.expirationDate < (event.eventTime + TWO_YEARS_IN_MILLISECONDS);
};

const CsvReadableStream = require('csv-reader');
let inputStream = fs.createReadStream('../test-data/sample-events.csv', 'utf8');
const sample_events_array = [];
let errorsCounter = 0;

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function generateEventsWithError(event) {

    let errorType = getRandomInt(11);
    let shouldBeError = getRandomInt(11);

    if (shouldBeError < 9) {
        return event;
    }
    errorsCounter++;
    if (errorsCounter % 100 == 0) {
        console.log('So far were sent ' + errorsCounter + ' errors');
    }
    switch (errorType) {
        case 0:
            // eventTimeValidator
            event.eventTime = Date.now() + TEN_MINUTES_IN_MILLISECONDS * 2
            break;
        case 1:
            // eventAgeValidator
            event.eventTime = (Date.now() - NINETY_DAY_IN_MILLISECONDS * 2)
            break;
        case 2:
            // sessionEndDurationGreaterEqualsForegroundDuration
            if (event.name === 'session-end') {
                event.attributes.sessionForegroundDuration = event.attributes.sessionDuration + 1000;
            }
            break;
        case 3:
            // InstallDate
            if (event.name === 'user-attributes') {
                event.attributes.installDate = event.eventTime + TEN_MINUTES_IN_MILLISECONDS * 2
            }
            break;
        case 4:
            // PremiumStartDate
            if (event.name === 'user-attributes') {
                event.attributes.premiumStartDate = event.eventTime + TWO_YEARS_IN_MILLISECONDS * 2;
            }
            break;
        case 5:
            // PremiumExpirationDate
            if (event.name === 'user-attributes') {
                event.attributes.premiumExpirationDate = (event.eventTime + CENTURY_IN_MILLISECONDS * 2)
            }
            break;
        case 6:
            // VersionInstallDate
            if (event.name === 'user-attributes') {
                event.attributes.versionInstallDate = (event.eventTime + TEN_MINUTES_IN_MILLISECONDS * 2)
            }
            break;
        case 8:
            // session null
            event.sessionId = null;
            break;
        case 9:
            // session null
            event.schemaVersion = null;
            break;
        case 10:
            // userId null
            event.platform = null;
            break;
        default:
            break;
    }

    return event;
}

describe("Proxy performance test", function () {
    var noRequestPerHour = 10;
    var avgRequestTime = 10;

    var host = 'http://' + testedHost + ''

    it("performance testing /eventproxy/track", function (done) {

        this.timeout(10000 * 1000);

        inputStream
            .pipe(new CsvReadableStream({parseNumbers: true, parseBooleans: true, trim: true}))
            .on('data', function (row) {
                sample_events_array.push(row)
            })
            .on('end', function (data) {
                console.log('No more rows! read ' + sample_events_array.length + ' rows');

                let index = 0;
                var options = {
                    url: host + '/eventproxy/track',
                    maxSeconds: 1000,
                    concurrency: 20,
                    statusCallback: statusCallback,
                    method: 'POST',
                    contentType: 'application/json',
                    requestGenerator: function (params, options, client, callback) {
                        var message = JSON.stringify({events: [generateEventsWithError(JSON.parse(sample_events_array[index][0]))]});
                        index++;
                        options.headers['Content-Length'] = message.length;
                        options.url = host + '/eventproxy/track';
                        options.method = 'POST';
                        options.headers['Content-Type'] = 'application/json';
                        options.headers['x-api-key'] = 'MoA7w7H6I8rbtjNLk81ndhVKqrzE9AoMNOJ7Lg1h';
                        var request = client(options, callback);
                        request.write(message);
                        return request;
                    }
                };

                var gLatency;

                function statusCallback(result, error, latency) {
                    gLatency = latency;
                }

                var operation = loadtest.loadTest(options, function (error) {
                    if (error) {
                        console.error('Got an error: %s', error);
                    } else if (operation.running == false) {
                        console.info("\n=========================================================================================================\n")
                        console.info("\tThreshold : No of request per hour = " + noRequestPerHour + ", Avg request time in millis = " + avgRequestTime)
                        console.info("\n=========================================================================================================\n")
                        console.info("Total Requests :", gLatency.totalRequests);
                        console.info("Total Failures :", gLatency.totalErrors);
                        console.info("Requests Per Second :", gLatency.rps);
                        console.info("Requests Per Hour :", (gLatency.rps * 3600));
                        console.info("Average Request Time(Mills) :", gLatency.meanLatencyMs);
                        console.info("Minimum Request Time(Mills) :", gLatency.minLatencyMs);
                        console.info("Maximum Request Time(Mills) :", gLatency.maxLatencyMs);
                        console.info("Percentiles :", gLatency.percentiles)
                        console.info("\n=========================================================================================================\n")

                        gLatency.totalErrors.should.equal(0);
                        (gLatency.rps * 3600).should.be.greaterThan(noRequestPerHour);
                        (gLatency.meanLatencyMs).should.be.below(avgRequestTime);

                        done();
                    }
                });
            });

    });
})