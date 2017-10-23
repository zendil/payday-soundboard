const EventEmitter = require('events').EventEmitter;
const Discord = require('discord.js');
const fs = require('fs');

class DiscordBot extends EventEmitter {
	constructor() {
		super();
		
		this.client = new Discord.Client();
		this.token = fs.readFileSync('google.key', 'utf8');
		
		this.client.login(this.token);
	}
	
	playSound(data) {
		var ret = {
			success : false,
			message : ''
		}
		return new Promise((resolve, reject) => {
			if(this.client.voiceConnections !== undefined) {
				this.client.voiceConnections.forEach((connection) => {
					if(connection.speaking === false) {
						connection.playStream(data);
						ret.success = true;
						resolve(ret);
					}
					else {
						ret.message = 'The bot is already speaking.';
						resolve(ret);
					}
				});
			}
			else {
				ret.message = 'The bot is not in any voice channels.';
				resolve(ret);
			}
		});
		
	}
}

module.exports = DiscordBot;