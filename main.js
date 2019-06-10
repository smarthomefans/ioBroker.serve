"use strict";

/*
 * Created with @iobroker/create-adapter v1.11.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
// copy from https://github.com/tj/serve/blob/master/bin/serve
//
const utils = require("@iobroker/adapter-core");
const connect = require('connect');
const compression = require('compression');
const serveStatic = require('serve-static');
const serveIndex = require('serve-index');
const fs = require('fs');
const path = require('path');


/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter;
let server;
let dataDir;
let bind ;
let port;

/**
 * Starts the adapter instance
 * @param {Partial<ioBroker.AdapterOptions>} [options]
 */
function startAdapter(options) {
	// Create the adapter and define its methods
	dataDir = path.normalize(utils.controllerDir + '/iobroker-data/')

	return adapter = utils.adapter(Object.assign({}, options, {
		name: "serve",

		// The ready callback is called when databases are connected and adapter received configuration.
		// start here!
		ready: main, // Main method defined below for readability

		// is called when adapter shuts down - callback has to be called under any circumstances!
		unload: (callback) => {
			try {
				adapter.log.info("cleaned everything up...");
				callback();
			} catch (e) {
				callback();
			}
		},

		// is called if a subscribed object changes
		objectChange: (id, obj) => {
			if (obj) {
				// The object was changed
				adapter.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
			} else {
				// The object was deleted
				adapter.log.info(`object ${id} deleted`);
			}
		},

		// is called if a subscribed state changes
		stateChange: (id, state) => {
			if (state) {
				// The state was changed
				adapter.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			} else {
				// The state was deleted
				adapter.log.info(`state ${id} deleted`);
			}
		},
		
	}));
}

function main() {

	// The adapters config (in the instance object everything under the attribute "native") is accessible via
	// adapter.config:
	adapter.log.info("config bind: " + adapter.config.bind);
	adapter.log.info("config port: " + adapter.config.port);
	bind = adapter.config.bind;
	port = adapter.config.port;

	serve()
}

function serve() {
	// path
	let path = dataDir + "/" + adapter.namespace.replace('.', '_');
	try {
		if (!fs.existsSync(path) ) {
			fs.mkdirSync(path)
		}
	}
	catch ( /* not found */_a) { /* not found */ }

	// setup the server
	server = connect();

	// CORS access for files
	server.use(function(req, res, next){
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, x-csrf-token, origin');
		if ('OPTIONS' == req.method) return res.end();
		next();
	  });
	// compression
	server.use(compression());

	// static files
	server.use(serveStatic(path));

	server.use(serveIndex(path, {
		hidden: false
	  , icons: true
	}));

	launch(port)
}

function onError (err) {
	switch (err.code) {
	  case 'EADDRINUSE':
		adapter.log.error(`Port ${err.port}  is already in use.`);
		launch(err.port + 1);
		break;
	  default:
		throw err;
	}
}


function launch (port) {
	return server.listen(port, !bind || bind == "0.0.0.0" ? undefined : bind || undefined ,function () {
	  // Successful message
	  adapter.log.info(`Serving  on port ${port} .`);
	  // open the browser window to this server
	}).on('error', onError);
}


if (module.parent) {
	// Export startAdapter in compact mode
	module.exports = startAdapter;
} else {
	// otherwise start the instance directly
	startAdapter();
}