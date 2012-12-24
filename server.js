var http = require('http'),
	fs = require('fs'),
	mime = require('mime'),
	cache = {},
	cache_temp_var = {};

http.createServer(function (req, res) {
	var Template = soultemplate(req, res);
	if (req.url === '/favicon.ico') {
		Template.parse('../img/favicon.ico');
		return res.end();
	}
	if (req.method !== 'GET' || req.url.indexOf('/query') === -1) {
		Template.parse('404.html', 404);
		return res.end();
	}
	if (req.url.split('/query/')[1] == '') {
		Template.parse('index.html');
		return res.end();
	}
	Template.parse('query.html');
	res.end();
}).listen(80);

var soultemplate = function(req, res){
	var template_var = cache_temp_var[_getIP(req)];
	if( typeof template_var == 'undefined' ){
		template_var = cache_temp_var[_getIP(req)] = {};
	}
	function _getIP(req){
		return req.headers['X-Forwarded-For'] || req.connection.remoteAddress;
	}
	function _file(filename){
		return fs.readFileSync('ui/' + filename) + '';
	}
	return {
		set: function(key, value){
			return template_var[key] = value;
		},
		get: function(key){
			return template_var[key];
		},
		parse: function(file, code, headers){
			code = code || 200;
			headers = headers || {};

			if (!file) throw new Exception('Invalid templating');

			headers = ({
				'Content-type': mime.lookup(file)
			}).extend(headers);
			res.writeHead(code, headers);
			var html = _file(file);
			while( html.indexOf('{{include ') !== -1 ){
				var s1 = html.indexOf('{{include '),
					s2 = html.indexOf('}}', s1),
					txt = html.substring(s1 + 10, s2);
				html = html.replace(new RegExp('\{\{include ' + txt + '\}\}', 'g'), _file(txt));
			}
			for( var i in template_var ){
				if( !template_var.hasOwnProperty(i) )
					continue;

				if( html.indexOf('{{' + i + '}}') !== -1 ){
					html = html.replace(new RegExp('\{\{' + i + '\}\}', 'g'), template_var[i]);
				}
			}
			res.write(html);
		}
	} 
};

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