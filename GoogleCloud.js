const EventEmitter = require('events').EventEmitter;
const btoa = require('btoa');
const crypto = require('crypto');
const fs = require('fs');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
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
	
	tokenIsGood() {
		if(this.token.value == '') {
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
        this.token.expires = ret.expires_in;
    }
    
    updateCache() {
        this.cache = {
            folders : {},
            updated : 0
        };
        
        this.getSoundFolders().on('foldersReady', (folders) => {
            Object.keys(folders).forEach((e) => {
                this.getSoundsInFolder(e).on('soundsReady', (sounds) => {
                    this.cache.folders[e] = sounds;
                });
            }); 
        });
        
        this.cache.updated = Date.now();
        
        clearTimeout(this.forceUpdate);
        this.forceUpdate = setTimeout(this.updateCache, this.forceUpdateTime);
        
        this.emit('cacheUpdated');
    }
    
    getSoundFolders() {
        var ret = {};
        var obj;
        this.request('/b/paydaysoundboard/o/?delimiter=/&prefix=sounds/', 'GET').on('requestReady', (ret) => {
            obj = ret.prefixes;
			Object.keys(obj).forEach((key) => {
				ret[path.basename(obj[key])] = {};
			});
			this.emit('foldersReady', ret);
		});
    }
    
    getSoundsInFolder(folder) {
        var ret = {};
        var obj;
        this.request('/b/paydaysoundboard/o/?delimiter=/&prefix=sounds/'+folder+'/', 'GET').on('requestReady', (ret) => {
            obj = ret.items;
			Object.keys(obj).forEach((key) => {
				ret[obj[key].name] = obj[key].mediaLink;
			});
			this.emit('soundsReady', ret);
		});
    }
    
    request(path, type, post) {
        if(!this.tokenIsGood()) {
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
			}
		});
    }
	
	getCache() {
		return this.cache.folders;
	}
}

module.exports = new GoogleCloud();