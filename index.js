const NodeMediaServer = require("node-media-server");
var ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
var CryptoJS = require("crypto-js");
const crypto = require("nodejs-jsencrypt");
var fs = require("fs"),
    path = require("path"),
    _ = require("underscore");

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
                hlsKeep: false, // to prevent hls file delete after end the stream
                // dash: true,
                // dashFlags: "[f=dash:window_size=3:extra_window_size=5]",
                // dashKeep: false, // to prevent dash file delete after end the stream
                mp4: true,
                mp4Flags: "[movflags=frag_keyframe+empty_moov]",
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
            console.log("TEST");
            var isValid = jsencrypt.verify(
                JSON.stringify(
                    response.data.originalData,
                    null,
                    0
                ).toLowerCase(),
                response.data.signature,
                CryptoJS.SHA256
            );
            if (isValid) {
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

nms.on("donePublish", (id, StreamPath, args) => {
    const userName = StreamPath.split("/")[2];
    axios
        .get(
            "http://localhost:5291/api/VideoStream/" + userName + "/StopStream2"
        )
        .then(function (response) {
            console.log(response.data);

            sendFile(userName);
        })
        .catch(function (error) {
            console.log(error);
        });
});

nms.run();

function sendFile(username) {
    var dir = `./stream/live/${username}/`;
    var files = fs.readdirSync(dir);

    // use underscore for max()
    var fileName = _.max(files, function (f) {
        var fullpath = path.join(dir, f);

        // ctime = creation time is used
        // replace with mtime for modification time
        return fs.statSync(fullpath).ctime;
    });

    console.log("fileName");
    console.log(fileName);

    var file = fs.readFileSync(`./stream/live/${username}/${fileName}`);

    const writeableStream = fs.createWriteStream("./StreamClient.txt");
    const fileData = "data:@file/mp4;base64," + file.toString("base64");
    writeableStream.write(fileData);

    var request = {
        title: username + "/" + fileName,
        contentType: "mp4",
        data: fileData,
    };

    var jsencrypt = new crypto.JSEncrypt();
    jsencrypt.setPrivateKey(
        "MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBAPENGEJQrppdtJyejNAUrAR0wKN13WzEt2iq3LOrIUuM/iW8Y+gqTBJgq933AkLPXnXOaijNxtis3qPV0V/GF0QykH8u2Q2moZ1nPEcQAbKogO+S6HkXI6H8kEVr3kATZ6vi6nDguLfLqPPt0EjAx/gPvRlHumiIulB9MM6qKzLBAgMBAAECgYA6k8oPY3fqv1bCsKzbbAqZUp31mxDh+7PuVYcoii+fInYoSW2l35F47dEWMY51GduEmVKm88qcoPXBrpYgxgyk5z7QSqHTHjKne3paHmHPg+AIDZ4h9tyROjdg8+eVu9d4EahAUR7jR8IU3jSMfPwXDET7BUQMRbCpAhVsP9Gh2QJBAPWp9/1QEebR91+vAGdy27wDGpGJo4BIET8NF0zyV1Ti2W3rwfmM/yY2igewovNAKFHpz1vlnBxJNBfCuXmTnb8CQQD7MXEl/emFRaOuNpwQ0Tpt1T7YL1uBNot0jqusRUnPcR3LoWNdGt5xWBshSV2SfwjMtbD0LDfeZNneXc9oPk9/AkEAu9zH1QIXPoFQf+5vC60NFkD1X1h3HRF/hsz3BZPJbxOvHF0O0EyfjdRlR64vXn+wlbuMJAV5lTPxzz3M4okdNwJAOq5MLoHoobepCzO6tbsLGUltyvcVO1RQs8P4mt/85DcarM1g9wkl2fipLdeDwotmtNvlIMWLr6qDswzbPREBZQJBAL7gXW4rjst4MB4U5cmPN16J8lrBH4uA0qGHsAWkFTP8W5EgRELAtZrhGfXmEYiE8HBDIjCHeGDGJEdC1JD4fDQ="
    );
    var test = JSON.stringify(request, null, 0).toLowerCase();
    const signature = jsencrypt.sign(test, CryptoJS.SHA256, "sha256");

    console.log(signature);

    var payload = {
        originalData: request,
        signature: signature,
    };

    axios.post("http://localhost:5291/api/vod", payload);
}
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
