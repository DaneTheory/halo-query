var http = require('http'),
    fs = require('fs'),
    mime = require('mime'),
    dgram = require('dgram'),
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
    var server = req.url.substring(req.url.indexOf('/query') + 7);
    if (server == '') {
        Template.parse('index.html');
        return res.end();
    }
    var server_ip = server.split(':')[0],
        server_port = parseInt(server.split(':')[1]),
        info_message = new Buffer([254, 253, 0, 51, 143, 2, 0, 255, 255, 255]),
        client = dgram.createSocket('udp4'),
        flag = false;

    client.on('message', function (msg) {
        Template.set('message', msg.toString());
        Template.parse('query.html');
        res.end();
    });
    client.send(info_message, 0, info_message.length, server_port, server_ip, function (e, b) {
        if (e) {
        	Template.parseJson({error: 'Error code ' + e});
            res.end();
        }
    });
    (function () {
        if (flag && !res.finished) {
        	Template.parseJson({error: 'Timed out'});
            return res.end();
        } else {
            flag = true;
        }
        setTimeout(arguments.callee, 10000);
    })();
}).listen(80);

var soultemplate = function (req, res) {
    var template_var = cache_temp_var[_getIP(req)];
    if (typeof template_var == 'undefined') {
        template_var = cache_temp_var[_getIP(req)] = {};
    }

    function _getIP(req) {
        return req.headers['X-Forwarded-For'] || req.connection.remoteAddress;
    }

    function _file(filename) {
        return fs.readFileSync('ui/' + filename) + '';
    }
    return {
        set: function (key, value) {
            return template_var[key] = value;
        },
        get: function (key) {
            return template_var[key];
        },
        parseJson: function(obj){
        	res.writeHead({'Content-type': 'application/json'});
        	res.write(JSON.stringify(obj));
        },
        parse: function (file, code, headers) {
            code = code || 200;
            headers = headers || {};

            if (!file) throw new Exception('Invalid templating');

            headers = ({
                'Content-type': mime.lookup(file)
            }).extend(headers);
            res.writeHead(code, headers);
            var html = _file(file);
            while (html.indexOf('{{include ') !== -1) {
                var s1 = html.indexOf('{{include '),
                    s2 = html.indexOf('}}', s1),
                    txt = html.substring(s1 + 10, s2);
                html = html.replace(new RegExp('\{\{include ' + txt + '\}\}', 'g'), _file(txt));
            }
            for (var i in template_var) {
                if (!template_var.hasOwnProperty(i)) continue;

                if (html.indexOf('{{' + i + '}}') !== -1) {
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