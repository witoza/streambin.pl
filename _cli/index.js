#! /usr/bin/env node

"use strict";

const Chance = require('chance'), chance = new Chance();
const fs = require('fs');
const log4js = require('log4js');
const jsonutil = require('jsonutil');
const W3CWebSocket = require('websocket').w3cwebsocket;
const logger = log4js.getLogger();
logger.setLevel('INFO');

const BinaryClient = require('binaryjs').BinaryClient;
const ProgressBar = require('progress');
const walk = require('walk');
const pretty = require('prettysize');

function gen_uuid() {
    return chance.string({
        length: 8,
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    });
}

var host;
var dir_uuid;

function publish(file_names) {

    const file_items = [];

    for (var file_name of file_names) {

        const stat = fs.statSync(file_name);

        if (stat.isDirectory()) {

            var emitter = walk.walkSync(file_name, {
                listeners: {
                    file: function (path, stat, next) {
                        try {

                            var relativePath = path.replace(/\\/g, "/") + "/";

                            file_items.push(make_file_item({
                                relativePath: relativePath + stat.name,
                                name: relativePath + stat.name
                            }, stat));
                            next();
                        } catch (err) {
                            logger.error(err);
                        }
                    },
                }
            });

        } else {
            file_items.push(make_file_item({
                name: file_name
            }, stat));
        }
    }

    logger.info("Download url, file name");
    var total_size = 0;
    for (var f of file_items) {
        logger.info(host + "d/" + f.metadata.file_uuid, "|", f.metadata.name);
        total_size += f.metadata.size;
    }

    logger.info("--");
    logger.info("Total", file_items.length, "file(s) of size", pretty(total_size));
    logger.info("All files are being published under: " + (host + "d/" + dir_uuid));

    const binaryJsClient_ulr = host.replace(/^http/, 'ws') + "binary-uploader-stream";

    const binaryJsClient = new BinaryClient(binaryJsClient_ulr);
    binaryJsClient.on('error', function (err) {
        logger.error("error in bjs", err);
    });

    const socket = new W3CWebSocket(binaryJsClient_ulr + "/sync");

    function make_file_item(fileItem_file, stat) {
        const fileItem = {};
        fileItem.metadata = {
            file_uuid: gen_uuid(),
            dir_uuid: dir_uuid,
            relativePath: fileItem_file.relativePath,
            name: fileItem_file.name,
            size: stat.size
        };
        fileItem.instances = [];
        return fileItem;
    }

    function get_item_by_uuid(file_uuid) {
        return file_items.find(function (item) {
            return item.metadata.file_uuid === file_uuid;
        });
    }

    function send_availability(item) {
        if (socket.readyState != 1) {
            throw new Error("invalid socket state");
        }
        logger.debug("sending availability", item.metadata);
        var S = {
            action: 'register',
            meta: item.metadata
        };
        socket.send(JSON.stringify(S));
    }

    function open_bjs_and_stream(item, did) {
        logger.debug("opening stream for, file:", item.metadata.file_uuid, "client:", did);

        var ins = {
            did: did,
            total_received: 0,
            progress: 0,
            status: 'Active',
        };

        item.instances.unshift(ins);

        const m = Object.assign({}, item.metadata);
        m.did = ins.did;

        var bar = new ProgressBar('Downloading: ' + item.metadata.name + ' [:bar] :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 40,
            total: m.size
        });

        const readStream = fs.createReadStream(m.name);
        const stream = binaryJsClient.send(readStream, m);
        stream.on('data', function (data) {
            bar.tick(data.total_received - ins.total_received);

            ins.total_received = data.total_received;
            ins.progress = Math.round((ins.total_received / item.metadata.size) * 100);

            if (ins.total_received === item.metadata.size) {
                ins.progress = 100;
            }

        });

        ins.stream = stream;
    }

    function close_bjs(item, did, reason) {

        const ins = item.instances.find(function (instance) {
            return instance.did === did;
        });

        if (ins.status != 'Active') {
            logger.info("closed already");
            return;
        }

        logger.debug("closing stream", item.metadata.file_uuid, did, "because:", reason);

        ins.status = reason;

        setTimeout(function () {
            //give it some time
            ins.stream.end();
            ins.stream.destroy();

        }, 1000);

        if (reason === "download completed") {
            logger.debug("file has been downloaded");
        } else {
            logger.warn("file has not been downloaded");
        }

    }

    socket.onopen = function (evt) {
        logger.debug("connection has been opened");

        file_items.forEach(function (file_item) {
            send_availability(file_item);
        });

        function send_ping() {
            logger.debug("sending ping");
            var S = {
                action: 'ping',
                meta: {}
            };
            socket.send(JSON.stringify(S));
        }

        socket.ping_timer = setInterval(send_ping, 15000);
    };

    socket.onmessage = function (evt) {
        var cmd = JSON.parse(evt.data);

        if (cmd.action === "do_stream") {
            logger.debug("do_stream cmd received", cmd);

            var item = get_item_by_uuid(cmd.file_uuid);
            open_bjs_and_stream(item, cmd.did);

        } else if (cmd.action === "do_close") {
            logger.debug("do_close cmd received", cmd);

            var item = get_item_by_uuid(cmd.file_uuid);
            close_bjs(item, cmd.did, cmd.reason);

        } else if (cmd.action === "do_error") {
            logger.error("error on backend", cmd);
        }

    };

    socket.onclose = function (evt) {
        logger.info("onclose", evt);
        console.info("sync connection to server has been closed");
    };

}

var files = [];

var program = require('commander');
program
    .option('-a, --addr [streambin_address]', 'StreamBIN address, default is https://streambin.pl/')
    .option('-d, --dir_uuid [dir_uuid]', 'directory UUID, default random UUID')
    .command('share <dir> [otherDirs...]')
    .action(function (dir, otherDirs) {
        files.push(dir);
        if (otherDirs) {
            otherDirs.forEach(function (oDir) {
                files.push(oDir);
            });
        }
    });
program.parse(process.argv);

var host = program.addr;
if (host == null) {
    host = "https://streambin.pl/";
}

var dir_uuid = program.dir_uuid;
if (dir_uuid == null) {
    dir_uuid = gen_uuid();
}

logger.info("host=", host);
logger.info("dir_uuid=", dir_uuid);
logger.info("files=", files);

var file_names = [];
for (var fname of files) {
    if (!fs.existsSync(fname)) {
        logger.warn("file", fname, "does not exists");
        continue;
    }
    file_names.push(fname);
}

if (file_names.length == 0) {
    logger.warn("Nothing to publish - exiting");
} else {
    publish(file_names);
}


