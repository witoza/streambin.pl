#! /usr/bin/env node

"use strict";

const http = require('http');
const express = require('express');
const fs = require('fs');
const path = require('path');
const mime = require('mime');
const Writable = require('stream').Writable;
const BinaryServer = require('binaryjs').BinaryServer;
const streamBuffers = require("stream-buffers");
const WebSocket = require('ws');
const onFinished = require('on-finished');
const Chance = require('chance'), chance = new Chance();
const log4js = require('log4js');
const jsonutil = require('jsonutil');
const bodyParser = require('body-parser');

const writers = {};

const logger = log4js.getLogger();

const stats = {
    total_files_streamed: 0,
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
        url.startsWithAny("/_bc/", "/_pc/") ||
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

app.get('/genid', function (req, res) {
    var uid = null;
    while (true) {
        uid = chance.word({length: 10});
        if (writers[uid] === undefined) {
            break;
        }
    }
    res.send(uid);
});

app.get('/genuuid', function (req, res) {
    var uid = chance.word({length: 15});
    res.send(uid);
});

function num_of_keys(obj) {
    return Object.keys(obj).length;
}

app.get('/status', function (req, res) {

    var dir_uuid = req.query.dir_uuid;
    if (dir_uuid == null) {
        dir_uuid = 'public';
    }
    logger.info("get status for directory", dir_uuid);

    var R = [];
    var k = Object.keys(writers);
    for (var i in k) {
        var key = k[i];
        var D = writers[key];

        if (dir_uuid == D.data.file_meta.dir_uuid) {
            R.push(jsonutil.deepCopy(D.data));
        }
    }

    res.json(R);
});

app.get('/stats', function (req, res) {
    logger.info("get server stats");
    const R = {
        curr: {
            current_streams: Object.keys(writers).length
        },
        stats: stats
    };
    res.json(R);
});

var archiver = require('archiver');

app.get('/d/:file_uuid', function (req, res) {

    const rid = req.req_id;

    var file_uuid = req.params.file_uuid;

    logger.info(rid, file_uuid, ": new downloading request");

    var D = writers[file_uuid];
    if (file_uuid === undefined || D === undefined) {
        logger.info(rid, "file " + file_uuid + "not found");

        const files = [];
        for (let uuid in writers) {
            if (writers[uuid].data.file_meta.dir_uuid === file_uuid) {
                files.push(uuid);
            }
        }
        if (files.length == 0) {
            res.status(404).send("file not found");
            return;
        }

        logger.info(rid, "looks like this is a dir, files belonged", files);

        res.setHeader('Content-type', 'application/zip');
        res.setHeader('Content-disposition', 'attachment; filename=\"' + file_uuid + '.zip\"');

        var arch = archiver('zip');
        arch.pipe(res);

        var remaining_files = files.length;

        var stream_file = function (file_uuid, did) {

            const D = writers[file_uuid];
            const R = {
                download_start: Date.now(),
                id: did,
                req: req,
                total_received: 0,
                closed: false,
                onstream: function (input) {
                    arch.append(input, {name: D.data.file_meta.name})
                },
                close: function () {
                    if (R.closed) {
                        return;
                    }
                    R.closed = true;
                    stats.total_files_streamed++;
                    logger.info(rid, file_uuid, did, ": closing downloader");
                    var reason = null;
                    if (D.data.file_meta.size == R.total_received) {
                        logger.info(rid, file_uuid, did, ": gentle close reader - all data received");
                        reason = 'download completed';
                    } else {
                        const msg = "connection broke, downloaded [b]: " + R.total_received + "/" + D.data.file_meta.size;
                        logger.info(rid, file_uuid, did, msg);
                        reason = msg;
                    }
                    try {
                        D.func.do_close(did, reason);
                    } catch (err) {
                        logger.warn(rid, file_uuid, did, ": can't send info to client about that event: ", err);
                    }
                    delete D.downloaders[did];
                    remaining_files -= 1;
                    logger.info(rid, "still waiting for remaining", remaining_files, "files");
                    if (remaining_files == 0) {
                        logger.info(rid, "all files has been downloaded");
                        arch.finalize(function (err, bytes) {
                            if (err) {
                                throw err;
                            }
                            logger.info(rid, bytes + ' total bytes');
                        });
                    }
                }
            };
            D.downloaders[did] = R;

            logger.info(rid, file_uuid, did, ": ready to download");
            D.func.do_stream(did);

        };

        for (var file_uuid of files) {
            stream_file(file_uuid, chance.word({length: 5}));
        }

        return;
    }

    var did = chance.word({length: 5});

    const R = {
        download_start: Date.now(),
        id: did,
        req: req,
        res: res,
        total_received: 0,
        closed: false,
        close: function () {
            if (R.closed) {
                return;
            }
            R.closed = true;
            stats.total_files_streamed++;
            logger.info(rid, file_uuid, did, ": closing downloader");
            var reason = null;
            if (D.data.file_meta.size == R.total_received) {
                logger.info(rid, file_uuid, did, ": gentle close reader - all data received");
                reason = 'download completed';
                R.res.end();
            } else {
                const msg = "connection broke, downloaded [b]: " + R.total_received + "/" + D.data.file_meta.size;
                logger.info(rid, file_uuid, did, msg);
                reason = msg;
            }
            try {
                D.func.do_close(did, reason);
            } catch (err) {
                logger.warn(rid, file_uuid, did, ": can't send info to client about that event: ", err);
            }
            delete D.downloaders[did];
        }
    };

    D.downloaders[did] = R;

    const file = D.data.file_meta.name;
    const filename = path.basename(file);

    res.setHeader('Content-type', 'application/octet-stream');
    res.setHeader('Content-disposition', 'attachment; filename=\"' + filename + '\"');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'max-age=5');
    res.setHeader('Content-length', D.data.file_meta.size);

    logger.info(rid, file_uuid, did, ": ready to download");
    D.func.do_stream(did);
});

var args = process.argv.slice(2);

logger.info("process args", args);
var app_dir = args[0];
if (!app_dir) {
    app_dir = "/dist"
}

app.use(express.static(__dirname + app_dir));
logger.info("Serving frontend from", __dirname + app_dir);

const http_port = 9001;
const server = http.createServer(app).listen(http_port, function () {
    logger.info("StreamBin backend is running at: " + http_port);
});

const wss = new WebSocket.Server({server: server, path: '/binary-uploader-stream/sync'});
wss.on('connection', function connection(ws) {

    logger.info("new sync ws client connected");

    ws.on('message', function incoming(message) {
        var S = JSON.parse(message);
        var file_uuid = S.meta.file_uuid;
        var ws_send = function (cmd) {
            cmd.file_uuid = file_uuid;
            var str = JSON.stringify(cmd);
            logger.info(file_uuid, ": sending", str);
            ws.send(str);
        };

        if (S.action === 'register') {
            logger.info(file_uuid, ": registering file with meta", message);
            if (writers[file_uuid] != null) {
                logger.info(file_uuid, ": info in registry already exist for that key - skipping. THAT SHOULD NOT HAPPEN");
                return;
            }

            //throttling
            if (num_of_keys(writers) > 10) {
                ws_send({
                    action: 'do_error',
                    reason: 'too many concurrent clients. come back later',
                });
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
            writers[file_uuid].downloaders[S.did].close();
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
            var D = writers[file_uuid];
            if (D.func.ws === ws) {
                for (let did in D.downloaders) {
                    D[did].close();
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
        var file_uuid = meta.file_uuid;
        var did = meta.did;
        logger.info(file_uuid, did, ': received stream');

        var M = writers[file_uuid].data.file_meta;
        var D = writers[file_uuid].downloaders[did];
        D.stream_time = Date.now();

        if (D.onstream != null) {
            D.onstream(stream);
        }

        stream.on('data', function (data) {
            if (D.closed) {
                return;
            }
            if (onFinished.isFinished(D.req)) {
                logger.info(file_uuid, did, ": reader has closed");
                D.close();
                return;
            }

            D.total_received += data.length;
            logger.info(file_uuid, did, ': rcv[b]:', data.length, '; total rcv[%]:', Math.round((D.total_received / M.size) * 100), "; missing[b]:", M.size - D.total_received);

            if (D.res) {
                D.res.write(data);

                // if (!D.res.write(data)) {
                //     throw new Error("not supported yet");
                // }
            }

            var progress = {
                total_received: D.total_received,
                did: did
            };
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
