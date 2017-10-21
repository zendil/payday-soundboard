const GoogleCloud = require('./GoogleCloud.js');
const WebServer = require('./WebServer.js');

const GC = new GoogleCloud();
const WS = new WebServer(GC);

GC.refreshToken();
GC.updateCache();

WS.listen(8080);