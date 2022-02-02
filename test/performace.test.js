const loadtest = require('loadtest');
const fs = require('fs')
const dotenv = require('dotenv')
const should = require('should');
const envConfig = dotenv.parse(fs.readFileSync('../.env.test'))

for (const k in envConfig) {
    process.env[k] = envConfig[k]
}
const testedHost = "192.168.1.11:8081";

describe("Proxy performance test", function () {
    var noRequestPerHour = 10;
    var avgRequestTime = 100;

    var host = 'http://' + testedHost + ''

    it("performance testing /eventproxy/track", function (done) {

        this.timeout(10000 * 1000);


        let index = 0;
        var options = {
            url: host + '/eventproxy/track',
            maxSeconds: 600,
            concurrency: 5,
            requestsPerSecond:500,
            agentKeepAlive:true,
            statusCallback: statusCallback,
            method: 'POST',
            contentType: 'application/json',
            requestGenerator: function (params, options, client, callback) {
                var message = JSON.stringify({"events": [{"name": "user-attributes", "userId": "21bc2aF5-a14c-4475-a491-0d3d190b2841", "sessionId": "5f8bba5a-d03b-4503-bb05-9ba463199ab1", "eventId": "4aa8bb41-1b5a-11ea-a826-e5b72de0e096", "productId": "bc479db5-ff58-4138-b5e4-a8400a1f78d5", "appVersion": "1.0", "eventTime": 1613995433333, "schemaVersion": "10.0", "platform": "android", "attributes": {} } ] });
                options.headers['Content-Length'] = message.length;
                options.url = host + '/eventproxy/track';
                options.method = 'POST';
                options.headers['Content-Type'] = 'application/json';
                options.headers['x-api-key'] = 'Z2lsLmZ1Y2hzQGdtYWlsLmNvbTpmaGdqdGp5anl0';
                var request = client(options, callback);
                request.write(message);
                return request;
            }
        };

        var gLatency;

        function statusCallback(result, error, latency) {
            gLatency = latency;
        }

        setInterval(function(){
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

        }, 10000);

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

                // gLatency.totalErrors.should.equal(0);
                // (gLatency.rps * 3600).should.be.greaterThan(noRequestPerHour);
                // (gLatency.meanLatencyMs).should.be.below(avgRequestTime);

                done();
            }
        });
    });
})