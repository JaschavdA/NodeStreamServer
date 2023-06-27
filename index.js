const NodeMediaServer = require("node-media-server");
var ffmpeg = require("fluent-ffmpeg");
const http = require("http");
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
            },
        ],
    },
};
var nms = new NodeMediaServer(config);

// nms.on("postPublish", (id, StreamPath, args) => {
//     console.log("postPublish");
// });

// nms.on("prePublish", (id, StreamPath, args) => {
//     console.log("prePublish");
//     console.log(StreamPath);
//     console.log(args.sign);
//     //nms.stop();
// });

nms.run();
