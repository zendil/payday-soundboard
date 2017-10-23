const EventEmitter = require('events').EventEmitter;
const btoa = require('btoa');
const crypto = require('crypto');
const fs = require('fs');
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const path = require('path');

class GoogleCloud extends EventEmitter {
	constructor() {
		super();
		
		this.privateKey = fs.readFileSync('google.key', 'utf8');
		
		this.token = {
			value : '',
			expires : 0
		};
		
		this.cache =  {
            folders : {},
            updated : 0
        };
		
        this.forceUpdateTime = 24 * 60 * 60; //1 day
		this.forceUpdate = setTimeout(this.updateCache, this.forceUpdateTime);
	}
	
	isTokenGood() {
		if(this.token.value === '') {
            //There is no token
            return false;
        }
        else if(this.token.expires < Math.round(Date.now() / 1000)) {
            //The token is expired
            return false;
        }
        else {
            //Token is good to go
            return true;
        }
	}
    
    refreshToken() {
        var jwtHeader = {
            alg : "RS256",
            typ : "jwt",
        };
        jwtHeader = btoa(JSON.stringify(jwtHeader));
        var jwtClaims = {
            iss : "serviceaccount@teak-component-181319.iam.gserviceaccount.com",
            scope : "https://www.googleapis.com/auth/devstorage.read_write",
            aud : "https://www.googleapis.com/oauth2/v4/token",
            exp : Math.round((Date.now() / 1000)) + 3600,
            iat : Math.round((Date.now() / 1000)),
        };
        jwtClaims = btoa(JSON.stringify(jwtClaims));
        var jwtSignature = jwtHeader+'.'+jwtClaims;
        var sign = crypto.createSign('sha256');
        sign.write(jwtSignature);
        sign.end();
        jwtSignature = sign.sign(this.privateKey, 'base64');
        var jwt = jwtHeader+'.'+jwtClaims+'.'+jwtSignature;
        jwt = encodeURIComponent(jwt);
        var a = new XMLHttpRequest();
        a.open('POST', 'https://www.googleapis.com/oauth2/v4/token', false);
        a.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        a.send('grant_type='+encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')+'&assertion='+jwt);
        var ret = JSON.parse(a.responseText);
        this.token.value = ret.access_token;
        this.token.expires = Math.round((Date.now() / 1000)) + ret.expires_in;
    }
    
    updateCache() {
        this.cache = {
            folders : {},
            updated : 0
        };
        
		return new Promise((resolve, reject) => {
			this.getSoundFolders().then((folders) => {
				var i = 0;
				var j = Object.keys(folders).length;
				Object.keys(folders).forEach((e) => {
					this.getSoundsInFolder(e).then((sounds) => {
						this.cache.folders[e] = sounds;
						i++;
						if(i == j) {
							//Last folder just returned and completed
							this.cache.updated = Date.now();
							
							clearTimeout(this.forceUpdate);
							this.forceUpdate = setTimeout(this.updateCache, this.forceUpdateTime);
							
							resolve();
						}
					},
					() => {
						reject();
					});
				}); 
			},
			() => {
				reject();
			});
		});
    }
    
    getSoundFolders() {
        var ret = {};
        var obj;
		
		return new Promise((resolve, reject) => {
			this.request('/b/paydaysoundboard/o/?delimiter=/&prefix=sounds/', 'GET').then((req) => {
				obj = req.prefixes;
				if(obj instanceof Object) {
					Object.keys(obj).forEach((key) => {
						ret[path.basename(obj[key])] = {};
					});
					resolve(ret);
				}
				else {
					reject();
				}
			},
			() => {
				reject();
			});
		});
    }
    
    getSoundsInFolder(folder) {
        var ret = {};
        var obj;
		
		return new Promise((resolve, reject) => {
			this.request('/b/paydaysoundboard/o/?delimiter=/&prefix=sounds/'+folder+'/', 'GET').then((req) => {
				obj = req.items;
				if(obj instanceof Object) {
					Object.keys(obj).forEach((key) => {
						ret[obj[key].name] = obj[key].mediaLink;
					});
					resolve(ret);
				}
				else {
					reject();
				}
			},
			() => {
				reject();
			});
		});
    }
    
    request(path, type, post) {
        if(!this.isTokenGood()) {
            this.refreshToken();
        }
		
		return new Promise((resolve, reject) => {
			var a = new XMLHttpRequest();
			var data;
			a.open(type, 'https://www.googleapis.com/storage/v1'+path);
			a.setRequestHeader('Authorization', 'Bearer '+this.token.value);
			if(typeof(post) !== undefined) {
				a.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				data = post;
			}
			a.send(data);
			a.onreadystatechange = function() {
				if(a.readyState == 4) {
					if(a.status == 200) {
						resolve(JSON.parse(a.responseText));
					}
					else {
						reject();
					}
				}
			};
		});
    }
	
	getCache() {
		return this.cache.folders;
	}
	
	isCacheGood() {
		if(this.cache.updated < Math.round((Date.now() / 1000)) + this.forceUpdateTime) {
			//Need to update
			return false;
		}
		else {
			return true;
		}
	}
	
	streamFile(path) {
		if(!this.isTokenGood()) {
            this.refreshToken();
        }
		
		return new Promise((resolve, reject) => {
			var parser = new URL();
			parser.parse(path);
			var req = https.request({
				protocol : 'https:',
				hostname : parser.hostname,
				port : 443,
				method : 'GET',
				path : parser.path,
				headers : {
					'Authorization' : 'Bearer '+this.token.value,
					'Accept' : '*/*'
				},
				agent: new https.Agent({rejectUnauthorized : false}),
				followAllRedirects : true
			});
			req.on('response', (res) => {
				if(res.statusCode === 200) {
					var data = new Buffer([]);
					res.on('data', (chunk) => {
						data = Buffer.concat([data, chunk]);
					});
					res.on('end', () => {
						resolve(data);
					});
				}
				else {
					reject();
				}
			});
			req.on('timeout', () => {
				req.abort();
				reject();
			});
			req.end();
		});
	}
}

module.exports = GoogleCloud;