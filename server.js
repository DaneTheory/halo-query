var dgram = require('dgram'),
	soul = require('../soul.js');

exports.query = function(req, res){
	// Global Templating utility
	var Template = soul.template(req, res);

	// Differentiate between homepage and info request
	var server = req.url.substring(req.url.indexOf('/query') + 7);
	if (server == '') {
		Template.parse('index.html');
		return res.end();
	}

	// Important UDP variables
	var server_ip = server.split(':')[0],
		server_port = parseInt(server.split(':')[1]),
		info_message = new Buffer([254, 253, 0, 51, 143, 2, 0, 255, 255, 255]),
		client = dgram.createSocket('udp4'),
		flag = false;

	// Listener
	client.on('message', function (msg) {
		Template.set('message', msg.toString());
		Template.parse('query.html');
		res.end();
	});

	// Shoot proper message
	client.send(info_message, 0, info_message.length, server_port, server_ip, function (e, b) {
		if (e) {
			Template.parseJson({error: 'Error code ' + e});
			res.end();
		}
	});

	// 10-second timeout check
	(function () {
		if (flag && !res.finished) {
			Template.parseJson({error: 'Timed out'});
			return res.end();
		} else {
			flag = true;
		}
		setTimeout(arguments.callee, 10000);
	})();
}

// Custom templating utility
// ==========================
// {{varname}} replacements
// {{include filename}} inclusions

// Useful deep object extend
// http://andrewdupont.net/2009/08/28/deep-extending-objects-in-javascript/
Object.prototype.extend = function (destination, source) {
	for (var property in source) {
		if (source[property] && source[property].constructor && source[property].constructor === Object) {
			destination[property] = destination[property] || {};
			arguments.callee(destination[property], source[property]);
		} else {
			destination[property] = source[property];
		}
	}
	return destination;
};