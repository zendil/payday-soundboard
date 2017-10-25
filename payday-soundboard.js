const GoogleCloud = require('./GoogleCloud.js');
const WebServer = require('./WebServer.js');
const DiscordBot = require('./DiscordBot.js');

const GC = new GoogleCloud();
const D = new DiscordBot();
const WS = new WebServer(GC, D);

const operatingPort = process.env.PORT || 8080;

GC.refreshToken();
GC.updateCache();

WS.listen(operatingPort);
