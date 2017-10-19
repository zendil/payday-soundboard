const EventEmitter = require('events').EventEmitter;
const btoa = require('btoa');
const crypto = require('crypto');

class GoogleCloud extends EventEmitter {
	constructor() {
		super();
		
		this.token = {
			value : '',
			expires : ''
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
}

module.exports = GoogleCloud;