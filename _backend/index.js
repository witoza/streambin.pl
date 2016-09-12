#! /usr/bin/env node

"use strict";

const http = require('http');
const express = require('express');
const fs = require('fs');
const path = require('path');
const BinaryServer = require('binaryjs').BinaryServer;
const WebSocket = require('ws');
const onFinished = require('on-finished');
const log4js = require('log4js');
const bodyParser = require('body-parser');
const archiver = require('archiver');
const Chance = require('chance'), chance = new Chance();

const startTime = new Date()
    .toISOString()
    .replace(/T/, ' ')
    .replace(/\..+/, '');

const writers = {};

const logger = log4js.getLogger();

const stats = {
    startTime: startTime,
    total_files_streamed_success: 0,
    total_files_streamed_fail: 0,
    now_streaming: 0,
    bytes_send: 0,
};

String.prototype.startsWithAny = function () {
    return Array.prototype.some.call(arguments, arg => this.startsWith(arg));
};

String.prototype.endsWithAny = function () {
    return Array.prototype.some.call(arguments, arg => this.endsWith(arg));
};

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var req_id = 0;

function is_req_static(req) {
    var url = req.originalUrl;

    var is_resource_static =
        url === "/" ||
        url.startsWithAny("/_bc/", "/_pc/", "/.well-known/") ||
        url.endsWithAny("js", "jpg", "ico", "png", "css", "html");

    return is_resource_static;
}

app.use('/', function (req, res, next) {

    if (is_req_static(req)) {
        next();
        return;
    }

    req_id++;
    req.req_id = req_id + "]";

    logger.info(req.req_id, "-----------------------------------");

    logger.info(req.req_id, ">", req.method, req.originalUrl);
    if (Object.keys(req.body).length > 0) {
        logger.info(req.req_id, "body:", req.body);
    }
    res.on('finish', function () {
        logger.info(req.req_id, "<", res.statusCode);
    });
    next();
});

function num_of_keys(obj) {
    return Object.keys(obj).length;
}

app.get("/mark_main/:key", function (req, res) {
    if (program.key != req.params.key) {
        res.json({msg: "bad key"});
        return;
    }
    send_message_to_all(
        `Dear users, please finish your downloading as in 5 minutes I'll be doing new deployment and service will not be available for couple of minutes.
Also your sharings will be lost.

--StreamBIN Team`);
    res.json({});
});

app.get('/config', function (req, res) {

    const config = {
        hostname: program.hostname
    };

    res.json(config);
});

app.get('/status', function (req, res) {

    var dir_uuid = req.query.dir_uuid;
    if (dir_uuid == null) {
        dir_uuid = 'public';
    }

    var R = [];

    for (let file_uuid in writers) {
        var D = writers[file_uuid];
        if (dir_uuid === D.data.file_meta.dir_uuid) {
            R.push(D.data);
        }
    }

    res.json(R);
});


function get_stats() {
    return {
        curr: {
            files_available: Object.keys(writers).length
        },
        stats: stats
    }
}

app.get('/stats', function (req, res) {
    res.json(get_stats());
});

app.get('/d/:file_uuid', function (req, res) {

    const did = chance.word({length: 5});

    const rid = req.req_id;

    const stream_file = function (file_uuid, onstream) {

        return new Promise(function (resolve, reject) {

            const D = writers[file_uuid];
            const R = {
                download_start: Date.now(),
                req: req,

                total_received: 0,
                closed: false,
                onstream: onstream,
                close: function () {
                    if (R.closed) {
                        return;
                    }
                    R.closed = true;
                    logger.info(rid, file_uuid, did, ": closing downloader");
                    stats.now_streaming--;
                    var reason = null;
                    var isok = true;
                    if (D.data.file_meta.size === R.total_received) {
                        logger.info(rid, file_uuid, did, ": gentle close reader - all data received");
                        reason = 'download completed';
                        stats.total_files_streamed_success++;
                    } else {
                        const msg = "connection broke, downloaded [b]: " + R.total_received + "/" + D.data.file_meta.size;
                        logger.info(rid, file_uuid, did, msg);
                        reason = msg;
                        isok = false;
                        stats.total_files_streamed_fail++;
                    }
                    try {
                        D.func.do_close(did, reason);
                    } catch (err) {
                        logger.warn(rid, file_uuid, did, ": can't send info to client about that event: ", err);
                    }
                    delete D.downloaders[did];

                    if (isok) {
                        resolve();
                    } else {
                        reject(reason);
                    }
                }
            };
            D.downloaders[did] = R;

            onFinished(req, function () {
                R.close();
            });

            logger.info(rid, file_uuid, did, ": ready to receive data");
            D.func.do_stream(did);

        });

    };

    const file_uuid = req.params.file_uuid;

    logger.info(rid, "new downloading request");

    const D = writers[file_uuid];
    if (file_uuid === undefined || D === undefined) {
        logger.info(rid, "file", file_uuid, "not found");

        const files = [];
        for (let f_uuid in writers) {
            if (writers[f_uuid].data.file_meta.dir_uuid === file_uuid) {
                files.push(f_uuid);
            }
        }
        if (files.length == 0) {
            res.status(404).send("file not found");
            return;
        }

        logger.info(rid, "this is a dir, files belonged:", files);

        res.setHeader('Content-type', 'application/zip');
        res.setHeader('Content-disposition', 'attachment; filename=\"' + file_uuid + '.zip\"');
        res.setHeader('Content-Transfer-Encoding', 'binary');
        res.setHeader('Cache-Control', 'max-age=10');

        const arch = archiver('zip');
        arch.pipe(res);

        let pr = Promise.resolve();

        for (let file_uuid of files) {
            pr = pr.then(function () {
                const onstream = function (input) {
                    const D = writers[file_uuid];

                    if (D.data.file_meta.relativePath) {
                        arch.append(input, {name: D.data.file_meta.relativePath})
                    } else {
                        arch.append(input, {name: D.data.file_meta.name})
                    }

                };
                return stream_file(file_uuid, onstream);
            });
        }

        return pr
            .then(function () {
                logger.info(rid, "all files has been downloaded");
                arch.finalize();
            }).catch(function (err) {
                logger.info("one of the files can't be downloaded, zip file is bad");
                res.destroy();
            });

    }

    const filename = path.basename(D.data.file_meta.name);
    const newFileName = encodeURIComponent(filename);
    res.setHeader('Content-type', 'application/octet-stream');
    res.setHeader('Content-disposition', `attachment; filename*=UTF-8''${newFileName}`);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'max-age=10');
    res.setHeader('Content-length', D.data.file_meta.size);

    const pipe_to_res = function (input) {
        input.pipe(res);
    };

    stream_file(file_uuid, pipe_to_res)
        .then(function () {
            res.end();
        })
        .catch(function (err) {
            logger.info("bad download:", err);
            res.destroy();
        });

});

const program = require('commander');

program
    .option('-d, --dir <dir>', 'The directory with frontend')
    .option('-h, --hostname <hostname>', 'Hostname')
    .option('-p, --port <port>', 'Port number')
    .option('-k, --key <key>', 'Admin key')
    .parse(process.argv);

const app_dir = program.dir || "/dist";

app.use(express.static(__dirname + app_dir));
logger.info("Serving frontend from", __dirname + app_dir);

const http_port = program.port || 9001;
const server = http.createServer(app).listen(http_port, function () {
    logger.info("StreamBin backend is running at: " + http_port);
});

const wss = new WebSocket.Server({server: server, path: '/binary-uploader-stream/sync'});
wss.on('connection', function connection(ws) {

    logger.info("new sync ws client connected");

    ws.on('message', function incoming(message) {
        const S = JSON.parse(message);
        const file_uuid = S.meta.file_uuid;
        const ws_send = function (cmd) {
            cmd.file_uuid = file_uuid;
            const str = JSON.stringify(cmd);
            if (file_uuid) {
                logger.info(file_uuid, ": sending", str);
            } else {
                logger.info("sending", str);
            }
            ws.send(str);
        };

        if (file_uuid) {
            logger.info(file_uuid, ": new command", message);
        } else {
            logger.info("new command", message);
        }

        if (S.action === 'register') {
            logger.info(file_uuid, ": registering file");
            if (writers[file_uuid] != null) {
                logger.info(file_uuid, ": info in registry already exist for that key - skipping. THAT SHOULD NOT HAPPEN");
                return;
            }
            var D = {
                data: {
                    publish_time: Date.now(),
                    file_meta: S.meta,
                },
                downloaders: {},
                func: {
                    ws: ws,
                    do_stream: function (did) {
                        ws_send({
                            action: 'do_stream',
                            did: did
                        });
                    },
                    do_close: function (did, reason) {
                        ws_send({
                            action: 'do_close',
                            reason: reason,
                            did: did
                        });
                    }
                }
            };
            writers[file_uuid] = D;
        } else if (S.action === 'ping') {
            ws_send({
                action: 'do_pong',
                reason: 'ping',
            });
        } else if (S.action === 'cancel') {
            logger.info(file_uuid, ": cancelling by user");
            try {
                writers[file_uuid].downloaders[S.did].close();
            } catch (err) {
                logger.warn("problem while closing downloader", err);
            }
        } else if (S.action === 'chnage_dir_uuid') {
            logger.info(file_uuid, ": changing dir_uuid", S);
            writers[file_uuid].data.desc = S.desc;
            writers[file_uuid].data.file_meta.dir_uuid = S.meta.dir_uuid;
        } else {
            logger.error("unknown command:", S.action)
        }
    });

    function close_all_connections() {
        logger.info("closing all files connected to that sync ws");

        for (let file_uuid in writers) {
            const D = writers[file_uuid];
            if (D.func.ws === ws) {
                for (let did in D.downloaders) {
                    var d = D[did];
                    if (d) {
                        d.close();
                    }
                }
                delete writers[file_uuid];
            }
        }

    };

    ws.on('close', function (e) {
        logger.info('ws socket closed', e);
        close_all_connections();
    });

    ws.on('error', function (e) {
        logger.info('ws socket error', e);
        close_all_connections();
    });

});

function send_message_to_all(msg) {
    logger.info("sending message to all publishers");

    const set = new Set();

    const cmd = {
        action: 'inform',
        msg,
    };

    for (let file_uuid in writers) {
        try {
            const ws = writers[file_uuid].func.ws;
            if (set.has(ws)) {
                continue;
            }
            ws.send(JSON.stringify(cmd));
            set.add(ws);
        } catch (err) {
            logger.warn("can't send message", err);
        }
    }
}

var bs = new BinaryServer({server: server, path: '/binary-uploader-stream'});
bs.on('connection', function (client) {

    logger.info("new stream client connected");

    client.on('error', function (msg) {
        logger.info("client Error:", msg);
    });

    client.on('close', function (e) {
        logger.info("client Close:", e);
    });

    client.on('stream', function (stream, meta) {
        const file_uuid = meta.file_uuid;
        const did = meta.did;
        logger.info(file_uuid, did, ': received stream');

        const W = writers[file_uuid];
        if (W == null) {
            logger.error("file has been already unloaded");
            return;
        }

        const M = W.data.file_meta;
        const D = W.downloaders[did];
        if (D == null) {
            logger.error("stream has been received, but downloader does not exist - didn't ask for it or has been already closed");
            return;
        }

        D.stream_time = Date.now();

        stats.now_streaming++;
        D.onstream(stream);

        stream.on('data', function (data) {
            if (D.closed) {
                return;
            }

            D.total_received += data.length;
            logger.info(file_uuid, did, ': rcv[b]:', data.length, '; total rcv[%]:', Math.round((D.total_received / M.size) * 100), "; missing[b]:", M.size - D.total_received);

            const progress = {
                total_received: D.total_received,
                did: did
            };
            stats.bytes_send += data.length;
            stream.write(progress);

        });
        stream.on('end', function () {
            if (D.closed) {
                return;
            }
            logger.info(file_uuid, did, ": end of input stream");
            D.close();
        });

    });

});
