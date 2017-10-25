const EventEmitter = require('events').EventEmitter;
const http = require('http');
const qs = require('querystring');
const URL = require('url').Url;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class WebServer extends EventEmitter {
	constructor(GoogleCloud, DiscordBot) {
		super();
		
		this.ws = http.createServer();
		this.googleCloud = GoogleCloud;
		this.discordBot = DiscordBot;
		
		this.css = '<style type="text/css">'+fs.readFileSync('web-style.css', 'utf8')+'</style>';
		this.js = '<script type="text/javascript">'+fs.readFileSync('web-js.js', 'utf8')+'</script>';
		
		this.header = '<!DOCTYPE html><html><head>'+this.css+this.js+'</head><body>';
		this.footer = '</body></html>';
		
		this.timeouts = [];
		this.speakingTimeout = 15 * 1000; //15 seconds
		
		this.ws.on('request', (req, res) => {
			var body = '';
			req.on('data', (data) => {
				body += data;
			});
			req.on('end', () => {
				req.sessionId = this.getSessionId(req.socket.remoteAddress);
				if(req.method === 'GET') {
					this.getRequest(req.url).then((ret) => {
						res.statusCode = ret.status;
						res.statusMessage = ret.message;
						res.end(ret.body);
					},
					() => {
						res.statusCode = 500;
						res.statusMessage = 'Internal Server Error';
						res.end();
					});
				}
				else if(req.method === 'POST') {
					this.postRequest(req, body).then((ret) => {
						res.statusCode = ret.status;
						res.statusMessage = ret.message;
						if(ret.header !== undefined) {
							res.setHeader('X-Timeleft', ret.header);
						}
						res.end(ret.body);
					},
					() => {
						res.statusCode = 500;
						res.statusMessage = 'Internal Server Error';
						res.end();
					});
				}
				else {
					res.statusCode = 400;
					res.statusMessage = 'Bad Request';
					res.end();
				}
			});
		});
	}
	
	listen(port) {
		this.ws.listen(port);
	}
	
	getRequest(url) {
		var ret = {
			body : '',
			status : 0,
			message : ''
		};
		return new Promise((resolve, reject) => {
			switch(url) {
			case '/':
				ret.status = 200;
				ret.message = 'OK';
				if(this.googleCloud.isCacheGood) {
					ret.body = this.generateBotPage();
					resolve(ret);
				}
				else {
					this.googleCloud.updateCache().then(() => {
						ret.body = this.generateBotPage();
						resolve(ret);
					},
					() => {
						ret.status = 500;
						ret.message = 'Internal Server Error';
						resolve(ret);
					});
				}
				break;
			case '/post.php':
				ret.status = 400;
				ret.message = 'Bad Request';
				resolve(ret);
				break;
			case '/refresh.php':
				this.googleCloud.updateCache().then(() => {
					ret.status = 200;
					ret.message = 'OK';
					ret.body = 'Refresh successful.';
					resolve(ret);
				},
				() => {
					ret.status = 200;
					ret.message = 'OK';
					ret.body = 'Refresh failed.';
					resolve(ret);
				});
				break;
			default:
				ret.status = 404;
				ret.message = 'Not Found';
				resolve(ret);
				break;
		}
		});
	}
	
	postRequest(req, body) {
		var ret = {
			body : '',
			status : 0,
			message : '',
		};
		return new Promise((resolve, reject) => {
			switch(req.url) {
				case '/post.php':
					var post = qs.parse(body);
					var sess;
					console.log(req.rawHeaders);
					if(req.headers.session !== undefined) {
						sess = req.headers.session;
					}
					else {
						sess = 0;
					}
					var mediapath = this.googleCloud.getCache()[path.basename(path.dirname(post.file))][post.file];
					
					if(mediapath === undefined) {
						ret.status = 400;
						res.message = 'Bad Request';
						resolve(ret);
					}
					else if(post.canada === 'true') {
						//Canadian - play
						ret.status = 200;
						ret.message = 'OK';
						this.emit('play', mediapath);
						resolve(ret);
					}
					else if(post.ignoretimeout === 'true') {
						//Ignore timeout - play
						ret.status = 200;
						ret.message = 'OK';
						this.emit('play', mediapath);
						resolve(ret);
					}
					else {
						if(this.timeouts[post.sess] !== undefined) {
							if(this.timeouts[post.sess] > Date.now() - this.speakingTimeout) {
								//15 second timeout not met - don't play
								ret.status = 432;
								ret.message = 'Did not satisfy timeout';
								ret.header = this.timeouts[post.sess] - Date.now() + this.speakingTimeout;
								resolve(ret);
							}
							else {
								//timeout met - reset and play
								this.timeouts[post.sess] = Date.now();
								ret.status = 200;
								ret.message = 'OK';
								this.emit('play', mediapath);
								resolve(ret);
							}
						}
						else {
							//Play the sound - new timeout
							this.timeouts[post.sess] = Date.now();
							ret.status = 200;
							ret.message = 'OK';
							this.emit('play', mediapath);
							resolve(ret);
						}
					}
					break;
				default:
					ret.status = 404;
					ret.message = 'Not Found';
					resolve(ret);
					break;
			}
		});
	}
	
	getNewSessionId() {
		return 0;
	}
	
	generateBotPage() {
		var ignore = '';
		
		var ret = this.header;
		
		ret += '<div id="banner"><img src="https://storage.googleapis.com/paydaysoundboard/img/banner.png" /></div>';
		ret += '<ul id="menu">';
		
		var cache = this.googleCloud.getCache();
		
		Object.keys(cache).sort().forEach((folder) => {
			ret += '<li id="li-'+folder+'" onclick="showTab(\''+folder+'\')">'+folder+'</li>';
		});
		
		ret += '</ul>';
		
		const perrow = 5;
		var i;
		
		Object.keys(cache).sort().forEach((folder) => {
			ret += '<table id="table-'+folder+'" class="button-table">';
			i = 0;
			Object.keys(cache[folder]).sort().forEach((file) => {
				if(file.substr(-5) == '.opus') {
					if(i % perrow === 0) ret += '<tr>';
					ret += '<td onclick="ajaxSound(\'sounds/'+folder+'/'+encodeURIComponent(path.basename(file))+'\', \''+ignore+'\')">'+path.basename(file, '.opus')+'</td>';
					if(i % perrow === perrow - 1) ret += '</tr>';
					i++;
				}
			});
			ret += '</table>';
		});
		
		ret += this.footer;
		return ret;
	}
}

module.exports = WebServer;