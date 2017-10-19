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
	
	checkToken() {
		
	}
}

module.exports = GoogleCloud;