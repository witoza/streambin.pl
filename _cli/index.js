#! /usr/bin/env node

"use strict";

const Chance = require('chance'), chance = new Chance();
const fs = require('fs');
const log4js = require('log4js');
const jsonutil = require('jsonutil');
const W3CWebSocket = require('websocket').w3cwebsocket;
const logger = log4js.getLogger();
const BinaryClient = require('binaryjs').BinaryClient;

function gen_uuid() {
    return chance.string({
        length: 8,
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    });
}

var binaryJsClient_ulr = "wss://streambin.pl/binary-uploader-stream";
var binaryJsClient = null;

var socket = new W3CWebSocket(binaryJsClient_ulr + "/sync");

var dir_uuid = "local";
var host = "https://streambin.pl/";

function make_file_item(fileItem_file) {
    var fileItem = {};

    fileItem.metadata = {
        file_uuid: gen_uuid(),
        dir_uuid: dir_uuid,
        relativePath: "",
        name: fileItem_file.name,
        size: fileItem_file.size
    };
    fileItem.download_url = host + "d/" + fileItem.metadata.file_uuid;
    fileItem.isStreaming = false;
    fileItem.instances = [];
    return fileItem;
}

const file_items = [];

function get_item_by_uuid(file_uuid) {
    return file_items.find(function (item) {
        return item.metadata.file_uuid === file_uuid;
    });
}

file_items.push(make_file_item({
    size: 381200,
    name: 'z:/Movie-Description-Plugin-for-Torrent/img/Image_4.png'
}));

function send_availability(item) {
    if (socket.readyState != 1) {
        throw new Error("invalid socket state");
    }
    logger.info("sending availability", item.metadata);
    var S = {
        action: 'register',
        meta: item.metadata
    };
    socket.send(JSON.stringify(S));

    binaryJsClient = new BinaryClient(binaryJsClient_ulr);
}

function open_bjs_and_stream(item, did) {
    logger.info("opening stream for, file:", item.metadata.file_uuid, "client:", did);

    var ins = {
        did: did,
        total_received: 0,
        progress: 0,
        status: 'Active',
    };

    item.instances.unshift(ins);

    const m = Object.assign({}, item.metadata);
    m.did = ins.did;

    const readStream = fs.createReadStream(m.name);
    const stream = binaryJsClient.send(readStream, m);
    stream.on('data', function (data) {
        logger.info("progress report", data, binaryJsClient._socket.bufferedAmount);

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

    logger.info("closing stream", item.metadata.file_uuid, did, "because:", reason);

    ins.status = reason;

    ins.stream.end();
    ins.stream.destroy();

    if (reason === "download completed") {
        logger.info("file has been downloaded");
    } else {
        logger.warn("file has not been downloaded");
    }

}

socket.onopen = function (evt) {
    logger.info("connection has been opened");

    file_items.forEach(function (file_item) {
        send_availability(file_item);
    });

    function send_ping() {
        logger.info("sending ping");
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
    logger.info("command received", cmd);

    if (cmd.action === "do_stream") {
        var item = get_item_by_uuid(cmd.file_uuid);
        open_bjs_and_stream(item, cmd.did);

    } else if (cmd.action === "do_close") {
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