var dgram = require('dgram'),
    soul = require('../soul.js');

exports.query = function (req, res) {
    // Global Templating utility
    var Template = soul.template(req, res, './halo-query/ui/');

    // Differentiate between homepage and info request
    var server = req.url.substring(req.url.indexOf('/query') + 7);
    if (server == '') {
        Template.parse('index.html');
        return res.end();
    }

    // Important UDP variables
    var server_ip = server.split(':')[0],
        server_port = parseInt(server.split(':')[1]),
        info_message = new Buffer([254, 253, 0, 1337/7, 143, 2, 0, 255, 255, 255]),
        client = dgram.createSocket('udp4'),
        flag = false;

    // Listener
    client.on('message', function (msg) {
        var data = msg.toString().split('\0'),
            teams = {
                "red": 0,
                "blue": 0
            },
            // Final JSON
            result = {
                name: data[3],
                version: data[5],
                players: (function () {
                    var result = [];
                    for (i = 0; i < data[21] - 0; i++) {
                        var obj = {
                            name: data[(i * 4) + 41],
                            score: data[i * 4 + 42] - 0,
                            ping: data[i * 4 + 43] - 0,
                            team: !! (data[i * 4 + 44] - 0) ? 'red' : 'blue',
                        };
                        teams[obj['team']] += obj['score'];
                        result.push(obj);
                    }
                    return result;
                })(),
                teams: teams,
                map: data[13],
                dedicated: !! (data[15] - 0),
                password: !! (data[11] - 0),
                mode: data[17],
                teamplay: !! (data[25] - 0),
                gamevariant: data[27],
                scoreLimit: data[29] - 0,
                game: [{
                    type: 'Invalid gametype'
                }, {
                    type: 'Capture the Flag',
                    assault: !! (data[33] >> 3 & 1),
                    forceFlagReset: !! (data[33] >> 5 & 1),
                    flagAtHome: !! (data[33] >> 6 & 1),
                    singleFlag: [0, 60, 120, 180, 300, 600][data[33] >> 7 & 7]
                }, {
                    type: 'Slayer',
                    deathBonus: !(data[33] >> 3 & 1),
                    killPenalty: !(data[33] >> 5 & 1),
                    killInOrder: !! (data[33] >> 6 & 1),
                }, {
                    type: 'Oddball',
                    randomStart: !! (data[33] >> 3 & 1),
                    speedWithBall: ['Slow', 'Normal', 'Fast'][data[33] >> 5 & 3],
                    traitWithBall: ['None', 'Invisible', 'Extra Damage', 'Damage Resistant'][data[33] >> 7 & 3],
                    traitWithoutBall: ['None', 'Invisible', 'Extra Damage', 'Damage Resistant'][data[33] >> 9 & 3],
                    ballType: ['Normal', 'Reverse Tag', 'Juggernaut'][data[33] >> 11 & 3],
                    ballSpawnCount: (data[33] >> 13 & 31) + 1
                }, {
                    type: 'King of the Hill',
                    movingHill: !! (data[33] >> 3 & 1),
                }, {
                    type: 'Race',
                    racetype: ['Normal', 'Any Order', 'Rally'][data[33] >> 3 & 3],
                    teamScoring: ['Minimum', 'Maximum', 'Sum'][data[33] >> 5 & 3]
                }][data[33] & 7],
                maxplayers: data[9] - 0,

                // parsePlayerFlags
                settings: {
                    lives: ['Infinite', 1, 3, 5][(pData = data[31].split(',')[0]) & 3],
                    maxHealth: ['50%', '100%', '150%', '200%', '300%', '400%'][pData >> 2 & 7],
                    shields: !(pData >> 5 & 1),
                    respawnTime: (pData >> 6 & 3) * 5,
                    respawnGrowth: (pData >> 8 & 3) * 5,
                    oddManOut: !! (pData >> 10 & 1),
                    invisiblePlayers: !! (pData >> 11 & 1),
                    suicidePenalty: (pData >> 12 & 3) * 5,
                    infiniteNades: !! (pData >> 14 & 1),
                    weaponSet: [
                        'Normal', 'Pistols', 'Rifles', 'Plasma', 'Sniper', 'No Sniping',
                        'Rocket Launchers', 'Shotguns', 'Short Range', 'Human', 'Covenant',
                        'Classic', 'Heavy Weapons'][pData >> 15 & 15],
                    startEquipment: ['Custom', 'Generic'][pData >> 19 & 1],
                    indicator: ['Motion Tracker', 'Nav Points', 'None'][pData >> 20 & 3],
                    playersOnRadar: ['No', 'All', 0, 'Friends'][pData >> 22 & 3],
                    friendlyIndicators: !! (pData >> 24 & 1),
                    friendlyFire: [false, true, 'Shields', 'Explosives'][pData >> 25 & 3],
                    friendlyFirePenalty: (pData >> 27 & 3) * 5,
                    teamBalance: !! (pData >> 29 & 1),
                    vehicleRespawn: [0, 30, 60, 90, 120, 180, 300]
                    [(vData = data[31].split(',')[1]) & 7],
                    redVehicles: ['Default', null, 'Warthogs', 'Ghosts', 'Scorpions',
                        'Rocket Warthogs', 'Banshees', 'Gun Turrets', 'Custom'][vData >> 3 & 15],
                    blueVehicles: ['Default', null, 'Warthogs', 'Ghosts', 'Scorpions',
                        'Rocket Warthogs', 'Banshees', 'Gun Turrets', 'Custom'][vData >> 7 & 15]
                }
            };
        Template.parseJson(result);
        res.end();
    });

    // Shoot proper message
    client.send(info_message, 0, info_message.length, server_port, server_ip, function (e, b) {
        if (e) {
            Template.parseJson({
                error: 'Error code ' + e
            });
            res.end();
        }
    });

    // 10-second timeout check
    (function () {
        if (flag && !res.finished) {
            Template.parseJson({
                error: 'Timed out'
            });
            return res.end();
        } else {
            flag = true;
        }
        setTimeout(arguments.callee, 10000);
    })();
}