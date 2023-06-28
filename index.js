const NodeMediaServer = require("node-media-server");
var ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
var CryptoJS = require("crypto-js");
const crypto = require("nodejs-jsencrypt");
// const fs = require("fs");
// var ffmpegPath = "C:\\ffmpeg\\bin\\ffmpeg.exe";
// if (fs.existsSync(ffmpegPath)) {
//     ffmpeg.setFfmpegPath(ffmpegPath);
//     console.log("ffmpeg found at", ffmpegPath);
// } else {
//     console.error("ffmpeg not found at", ffmpegPath);
// }

// const config = {
//     logType: 3,
//     rtmp: {
//         port: 1935,
//         chunk_size: 60000,
//         gop_cache: true,
//         ping: 30,
//         ping_timeout: 60,
//     },
//     http: {
//         port: 8000,
//         allow_origin: "*",
//     },
// };

// var nms = new NodeMediaServer(config);
// nms.on("postPublish", (id, StreamPath, args) => {
//     ffmpeg("rtmp://localhost/live/test", { timeout: 10000 })
//         .addOptions(["-f hls", "-hls_time 2"])
//         .output("C:\\dev\\NodeMediaServer\\stream\\henk.m3u8")
//         .on("error", (err) => {
//             console.log(err);
//         })
//         .run();
// });
// nms.run();

// // TODO
// // Stel die m3u8 of folder? beschikbaar met een api en load die in hls.js

const config = {
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
    },
    http: {
        port: 8000,
        mediaroot: "./stream",
        allow_origin: "*",
    },
    trans: {
        ffmpeg: "C:\\ffmpeg\\bin\\ffmpeg.exe",
        tasks: [
            {
                app: "live",
                hls: true,
                hlsFlags:
                    "[hls_time=2:hls_list_size=3:hls_flags=delete_segments]",
                hlsKeep: true, // to prevent hls file delete after end the stream
                // dash: true,
                // dashFlags: "[f=dash:window_size=3:extra_window_size=5]",
                // dashKeep: false, // to prevent dash file delete after end the stream
            },
        ],
    },
};
var nms = new NodeMediaServer(config);

// nms.on("postPublish", (id, StreamPath, args) => {
//     console.log("postPublish");
// });

nms.on("prePublish", (id, StreamPath, args) => {
    const streamKey = args.sign;
    const signature = streamKey.split("-")[0].replaceAll(" ", "+");
    const timeStamp = streamKey.split("-")[1];
    const userName = StreamPath.split("/")[2];
    console.log(signature);
    console.log(timeStamp);
    console.log(userName);
    var jsencrypt = new crypto.JSEncrypt();
    jsencrypt.setPublicKey(
        "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCXn1KW/Kxp3+1olLQuH7p71io4C0CKF61GySLQ29kOQ6uDQGmDLYof9oquHgAQp/ZHm/jVnthdmXG8iO4i8I/lIi1aQn34I9wn6HmBMRNUai59UuQlyPZDCTWk7EFz0gPwZ46aV/uWdMwCPk2Xn+OAejcESLBP3WG9HbTHo0/lQIDAQAB"
    );

    const originalData = {
        userName: userName,
        timeStamp: timeStamp,
    };

    const request = {
        originalData: originalData,
        signature: signature,
    };

    console.log(request);
    var isSameUser = false;
    axios
        .post("http://localhost:5291/api/VideoStream/ValidateStream", request)
        .then(function (response) {
            //console.log(response.data);
            if (
                jsencrypt.verify(
                    response.data.originalData,
                    response.data.signature,
                    CryptoJS.SHA256
                )
            ) {
                isSameUser = response.data.originalData;
            }

            if (!isSameUser) {
                nms.stop();
            }
        })
        .catch(function (error) {
            console.log("BAD REQUEST");
            nms.stop();
        });

    //nms.stop();
});

nms.run();
// const henk = {
//     henk: "henk",
// };
// const verified = test.verify(
//     JSON.stringify(henk, null, 0).toLowerCase(),
//     "lKN7STf/rifCukQWEAY0BLkWv0OTITN0OBwd85WKp9zMV2KCQ7gEZCAESPBIreXi38Vx5tYqPs19CSQ/yMyglbJ794wjtDb9MM6kBrVRGJbKSsP96KsDPRs/cFRaQqcXEX25mtRPS+bZZI7gVMJde0/RDdkL0SlHI/YmJTCUIoc=",
//     CryptoJS.SHA256
// );
// console.log("EXPECTING TRUE");
// console.log(verified);
