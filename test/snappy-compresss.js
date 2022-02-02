let snappy = require('snappy')
let fs = require('fs');


let data1 = fs.readFileSync('../test-data/compressed-samples/batch-3-event.json');
let data2 = fs.readFileSync('../test-data/compressed-samples/batch-4-events.json');
let data3 = fs.readFileSync('../test-data/compressed-samples/notification-received.json');
let data4 = fs.readFileSync('../test-data/compressed-samples/probe.json');



snappy.compress('beep boop', function (err, compressed) {
    console.log('compressed is a Buffer', compressed)
    // return it as a string
    snappy.uncompress(compressed, { asBuffer: false }, function (err, original) {
        console.log('the original String', original)
    })
})

snappy.compress(data1, function (err, zipped) {
    if (err) {
        console.log(err)
    } else {
        fs.writeFileSync('../test-data/compressed-samples/batch-3-event.json.snappy', zipped)
    }
})


snappy.compress(data2, function (err, zipped) {
    if (err) {
        console.log(err)
    } else {
        fs.writeFileSync('../test-data/compressed-samples/batch-4-events.json.snappy', zipped)
    }
})

snappy.compress(data3, function (err, zipped) {
    if (err) {
        console.log(err)
    } else {
        fs.writeFileSync('../test-data/compressed-samples/notification-received.json.snappy', zipped)
    }
})

snappy.compress(data4, function (err, zipped) {
    if (err) {
        console.log(err)
    } else {
        fs.writeFileSync('../test-data/compressed-samples/probe.json.snappy', zipped)
    }
})


// snappy.compress(data2, function (err, zipped) {
//     if (err) {
//         console.log(err)
//     } else {
//         let start = Date.now();
//         for (i = 0; i < 10000; i++) {
//             snappy.uncompress(zipped)
//         }
//         console.log(Date.now() - start)
//     }
// })




