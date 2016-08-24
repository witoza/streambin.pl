var http = require('http');
var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var Writable = require('stream').Writable;
var BinaryServer = require('binaryjs').BinaryServer;
var streamBuffers = require("stream-buffers");
var WebSocket = require('ws');
var onFinished = require('on-finished');

var Chance = require('chance'),
    chance = new Chance();
	
var writers = {};

app.get('/genid', function (req, res) {
	var uid = null;
	while (true) {
		uid = chance.word({length:10});
		if (writers[uid] === undefined) {
			break;
		}
	}
	res.send(uid);
});


app.get('/genuuid', function (req, res) {
	var uid = chance.word({length:15});
	res.send(uid);
});

function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function num_of_keys(hashmap) {
	return Object.keys(hashmap).length;
}

app.get('/status', function (req, res) {

	var dir_uuid = req.query.dir_uuid;
	if (dir_uuid == null) {
		dir_uuid = 'public';
	}
	console.log("get status for Directory", dir_uuid);

	var R = [];
	var k = Object.keys(writers);
	for (var i in k) {
		var key = k[i];
		var D = writers[key];
		
		if (dir_uuid == D.data.file_meta.dir_uuid) {
			var cloned = clone(D.data);
			R.push(cloned);
		}
	}
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(R));
});


app.get('/stats', function (req, res) {
	console.log("get server stats");
	var R = {
		'current_streams' : Object.keys(writers).length
	}
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(R));
});


app.get('/d/:file_uuid', function(req, res) {
	
	var did = chance.word({length:5});
	var file_uuid = req.params.file_uuid;

	console.log(file_uuid, did,": new downloading request");

	var D = writers[file_uuid];
	if (file_uuid === undefined || D === undefined) {
		console.log("file " + file_uuid + "not found");
		res.write("file " + file_uuid + " not found");
		res.end();
		return;
	}
	
	var R = {
		download_start : Date.now(),
		id : did,
		req : req,
		res : res,
		total_received : 0,
		closed : false,
		close : function(send_ack) {
			if (R.closed) {
				return;
			}
			R.closed = true;
			console.log(file_uuid, did,": closing downloader");
			var reason = null;
			if (D.data.file_meta.size == R.total_received) {
				D.data.num_of_download_ok ++;
				console.log(file_uuid,did,": gentle close reader - all data received");
				reason = 'download completed';
				R.res.end();
			} else {
				D.data.num_of_download_fail ++;
				console.log(file_uuid, did,": connection broke");
				reason = 'client cancelled';
				R.res.destroy();
			}
			if (send_ack) {
				try {
					D.func.do_close(did, reason);
				} catch(err) {
					console.log(file_uuid, did,": can't send info to client about that event: ", err);
				}
			}
			console.log(file_uuid, did,": removing downloader from registry");
			delete D.downloaders[did];
		}
	};

	D.downloaders[did] = R;
	
	var file = D.data.file_meta.name;
	var filename = path.basename(file);

	res.setHeader('Content-type', 'application/octet-stream');
	res.setHeader('Content-disposition', 'attachment; filename=\"' + filename+'\"');
	res.setHeader('Content-Transfer-Encoding', 'binary');
	res.setHeader('Expires', '0');
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Content-length', D.data.file_meta.size);
	
	console.log(file_uuid, did, ": ready to download");
	D.func.do_stream(did);
});

app.use(express.static(__dirname + '/../_frontend/app'));
app.set('port', (process.env.PORT || 9001));
var server = http.createServer(app).listen(app.get('port'), function() {
	console.log("StreamBin backend is running at: " + app.get('port'));
});

var wss = new WebSocket.Server({ server: server, path: '/binary-uploader-stream/sync' });
wss.on('connection', function connection(ws) {
	
	console.log("new ws client connected");

	ws.on('message', function incoming(message) {
		var S = JSON.parse(message);
		var file_uuid = S.meta.file_uuid;
		
		if (S.action == 'register') {
			console.log(file_uuid,": registering file with meta", message);
			if (writers[file_uuid] != null) {
				console.log(file_uuid,": info in registry already exist for that key - skipping. THAT SHOULD NOT HAPPEN");
				return;
			}
			//throttling
			if (num_of_keys(writers) > 10) {
				var cmd = {
					action : 'do_error',
					reason : 'too many concurrent clients. come back later',
				}
				var str = JSON.stringify(cmd);
				console.log(file_uuid,": sending", str);
				ws.send(str);
				return;
			}
			var D = {
				data : {
					publish_time : Date.now(),
					file_meta : S.meta,
					num_of_download_ok : 0,
					num_of_download_fail : 0,
				},
				downloaders : {},
				func : {
					ws : ws,
					_send : function(cmd) {
						cmd.file_uuid = file_uuid;
						var str = JSON.stringify(cmd);
						console.log(file_uuid,": sending", str);
						ws.send(str);
					},
					do_stream : function (did) {
						var cmd = {
							action : 'do_stream',
							did : did
						}
						D.func._send(cmd);
					},
					do_close : function (did, reason) {
						var cmd = {
							action : 'do_close',
							reason : reason,
							did : did
						}
						D.func._send(cmd);
					}
				}
			};
			writers[file_uuid] = D;
		} else if (S.action == 'ping') {
			var cmd = {
				action : 'do_pong',
				reason : 'ping',
			}
			var str = JSON.stringify(cmd);
			console.log(file_uuid,": sending", str);
			ws.send(str);
		} else if (S.action == 'cancel') {
			console.log(file_uuid,": cancelling by user");
			writers[file_uuid].downloaders[S.did].close(false);
		} else if (S.action == 'chnage_dir_uuid') {
			console.log(file_uuid,": changing dir_uuid", S);			
			writers[file_uuid].data.desc = S.desc;
			writers[file_uuid].data.file_meta.dir_uuid = S.meta.dir_uuid;
		} else {
			console.log("unknovn WS command:", S.action)
		}
	});
	
	function closeAllConnections() {
		console.log("ending all connected to that ws");
		var k = Object.keys(writers);
		for (var i in k) {
			var D = writers[k[i]];
			if (D.func.ws == ws) {
				var k2 = Object.keys(D.downloaders);
				for (var i2 in k2) {
					var D2 = D.downloaders[k2[i2]];
					D2.close(true);
				}
				console.log(k[i], "removing info about availability");
				delete writers[k[i]];
			}
		}
	};
	
	ws.on('close', function(e) {
		console.log('ws socket closed', e);
		closeAllConnections();
	});
	
	ws.on('error', function(e) {
		console.log('ws socket error', e);
		closeAllConnections();
	});

});

var bs = new BinaryServer({server: server, path: '/binary-uploader-stream'});
bs.on('connection', function(client){
		
	console.log("new stream client connected");
	
	client.on('error', function (msg) {
		console.log("client Error:", msg);
	});
	
	client.on('close', function (e) {
		console.log("client Close:", e);
	});
	
	client.on('stream', function(stream, meta) {
		var file_uuid = meta.file_uuid;
		var did = meta.did;
		console.log(file_uuid, did, ': received stream');
		
		var M = writers[file_uuid].data.file_meta;
		var D = writers[file_uuid].downloaders[did];
		D.stream_time = Date.now();
		
		stream.on('data', function(data) {		
			if (D.closed) {
				return;
			}
			if (onFinished.isFinished(D.req)) {
				console.log(file_uuid, did,": reader has closed");
				D.close(true);
				return ;
			}
			
			D.total_received += data.length;
			console.log(file_uuid, did,': rcv[b]:', data.length, '; total rcv[%]:', Math.round( (D.total_received/M.size) * 100), "; missing[b]:", M.size - D.total_received);
			D.res.write(data);
				
			var progress = {
				total_received: D.total_received, 
				did : did
			};
			stream.write(progress);
			
		});
		stream.on('end', function(){
			if (D.closed) {
				return;
			}
			console.log(file_uuid, did,": end of input stream");
			D.close(true);
		});
		
	});
	
});
