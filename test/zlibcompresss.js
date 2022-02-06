const zlib = require("zlib");
let fs = require('fs');


let data1 = fs.readFileSync('../test-data/compressed-samples/batch-3-event.json');
let data2 = fs.readFileSync('../test-data/compressed-samples/batch-4-events.json');
let data3 = fs.readFileSync('../test-data/compressed-samples/notification-received.json');
let data4 = fs.readFileSync('../test-data/compressed-samples/probe.json');
let bigData = fs.readFileSync('../test-data/sample-events.csv');


zlib.deflateRaw(data1, function (err, zipped) {
    if (err) {
        reply.status(result.code).send(err)
    } else {
        fs.writeFileSync('../test-data/compressed-samples/batch-3-event.json.zip', zipped)
    }
})

zlib.deflateRaw(data2, function (err, zipped) {
    if (err) {
        reply.status(result.code).send(err)
    } else {
        fs.writeFileSync('../test-data/compressed-samples/batch-4-events.json.zip', zipped)
    }
})

zlib.deflateRaw(data3, function (err, zipped) {
    if (err) {
        reply.status(result.code).send(err)
    } else {
        fs.writeFileSync('../test-data/compressed-samples/notification-received.json.zip', zipped)
    }
})

zlib.deflateRaw(data4, function (err, zipped) {
    if (err) {
        reply.status(result.code).send(err)
    } else {
        zlib.inflateRaw(zipped, function (err, dezipped) {
            if (err) {
                done(err, null)
            } else {
                fs.writeFileSync('../test-data/compressed-samples/probe.json.raw', dezipped)
            }
        })
        fs.writeFileSync('../test-data/compressed-samples/probe.json.zip', zipped)
    }
})




// zlib.deflateRaw(data1, function (err, zipped) {
//     if (err) {
//         console.log(err)
//     } else {
//         let start = Date.now();
//         for (i = 0; i < 10000; i++) {
//             zlib.inflateRawSync(zipped)
//         }
//         console.log(Date.now() - start)
//     }
// })

// let zippedFile = zlib.deflateRawSync(data2,{level:zlib.constants.Z_BEST_SPEED
// });
//
// zlib.deflateRaw(bigData, function (err, zipped) {
//     if (err) {
//         console.log(err)
//     } else {
//         let start = Date.now();
//         for (i = 0; i < 100000; i++) {
//             zlib.inflateRawSync(zippedFile,{level:zlib.constants.Z_BEST_SPEED
//             })
//         }
//         console.log(Date.now() - start)
//     }
// })
//





