const loadtest = require('loadtest');
const should = require('should');
const fs = require('fs')
const uuidv4 = require('uuid/v4');
const dotenv = require('dotenv')
const envConfig = dotenv.parse(fs.readFileSync('../.env.test'))


for (const k in envConfig) {
    process.env[k] = envConfig[k]
}
const testedHost = "airlytics.airlock.twcmobile.weather.com";

if (testedHost === 'localhost') {
    require('../app')
}

const CsvReadableStream = require('csv-reader');


describe("Inject failed events", function () {
    var noRequestPerHour = 10;
    var avgRequestTime = 10;

    var host = 'https://' + testedHost + ''

    it("performance testing /eventproxy/track", function (done) {

        this.timeout(100000 * 100000);

        let dataFolder = '../test-data/init-iteration/'

        fs.readdir(dataFolder, (err, files) => {
            files.forEach(file => {
                console.log(file);

                let sample_events_array = [];

                let inputStream = fs.createReadStream(dataFolder + file, 'utf8');
                inputStream
                    .pipe(new CsvReadableStream({parseNumbers: true, parseBooleans: true, trim: true}))
                    .on('data', function (row) {
                        if (row[9] !== "event") {
                            try {
                                let event = JSON.parse(row);
                                delete event.error
                                delete event.errorType
                                sample_events_array.push(event)
                            }catch (e) {
                                console.log(e.message)
                            }
                        }
                    })
                    .on('end', function (data) {
                        console.log('No more rows! read ' + sample_events_array.length + ' rows');
                        let index = 60000;
                        var options = {
                            url: host + '/eventproxy/track',
                            maxSeconds: 100000,
                            concurrency: 20,
                            statusCallback: statusCallback,
                            method: 'POST',
                            contentType: 'application/json',
                            requestGenerator: function (params, options, client, callback) {
                                if(sample_events_array[index]==null){
                                   done();
                                }
                                var message = JSON.stringify({events: [sample_events_array[index]]});
                                index++;
                                if (index % 100 == 0) {
                                    console.log("inserted " + index + " so far");
                                }
                                if (index >= sample_events_array.length) {
                                    console.log("done of " + sample_events_array.length);
                                }
                                options.headers['Content-Length'] = message.length;
                                options.url = host + '/eventproxy/track';
                                options.method = 'POST';
                                options.headers['Content-Type'] = 'application/json';
                                options.headers['x-api-key'] = 'YizUYE1fgAL3tUcjnZho2f62mWQo6CjAd7cSAmHp';
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
        });
    });
})