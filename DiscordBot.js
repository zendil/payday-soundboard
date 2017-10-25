const EventEmitter = require('events').EventEmitter;
const Discord = require('discord.js');
const fs = require('fs');

class DiscordBot extends EventEmitter {
	constructor() {
		super();
		
		this.client = new Discord.Client();
		this.token = fs.readFileSync('discord.key', 'utf8');
		
		this.client.login(this.token);
	}
	
	playSound(data) {
		var ret = {
			success : false,
			message : ''
		}
		return new Promise((resolve, reject) => {
			if(this.client.voiceConnections.size !== 0) {
				this.client.voiceConnections.forEach((connection) => {
					if(connection.speaking === false) {
						connection.playStream(data);
						ret.success = true;
					}
				});
				if(ret.success !== true) {
					//Didnt speak on any server
					ret.message = 'The bot is already speaking.';
				}
				resolve(ret);
			}
			else {
				ret.message = 'The bot is not in any voice channels.';
				resolve(ret);
			}
		});
		
	}
	messageAdmins(guild, message) {
		//Keep a list of people we have messaged - don't want to repeat anyone
		var messaged = new Map();
		//Contact server owner
		guild.owner.sendMessage(message);
		messaged.set(guild.owner.id, guild.owner.displayName);
		//Get roles and message all admins/owners/mods/etc
		guild.roles.forEach((role) => {
			if(role.name.toLowerCase().includes('admin') || role.name.toLowerCase().includes('mod') || role.name.toLowerCase().includes('owner')) {
				role.members.forEach((member) => {
					if(messaged.has(member.id) === false) {
						member.sendMessage(message);
						messaged.set(member.id, member.displayName);
					}
				});
			}
		});
		//Log people we contacted
		var contacted = '';
		messaged.forEach((name) => {
			contacted += name+', ';
		});
		console.log('Contacted: '+contacted.substring(0, contacted.length - 2))+' - Msg: '+message;
	}
	
	processMessage(message) {
		if(message.channel instanceof Discord.TextChannel) {
			//Message in a text channel, not a DM
			switch (message.content.toLowerCase()) {
				case '!paydayjoin':
					this.attemptJoinVoice(message);
					break;
				case '!paydayleave':
					if(this.client.voiceConnections.get(message.guild.id) !== undefined) {
						this.client.voiceConnections.get(message.guild.id).channel.leave();
					}
					break;
				case '!paydaystfu':
					if(this.client.voiceConnections.get(message.guild.id) !== undefined) {
						if(this.client.voiceConnections.get(message.guild.id).player.dispatcher !== undefined) {
							this.client.voiceConnections.get(message.guild.id).player.dispatcher.end();
						}
					}
					break;
				case '!feelbetter':
					//this.embedMessage(message, 'https://storage.googleapis.com/paydaysoundboard/img/feelbetter.png');
					break;
				case '!thisisthekill':
					//this.embedMessage(message, 'https://storage.googleapis.com/paydaysoundboard/img/thisisthekill.png');
					break;
				case '!healzendil':
					//this.embedMessage(message, 'https://storage.googleapis.com/paydaysoundboard/img/bestheals.png');
					break;
				case '!paydayleaveall':
					//this.disconnectAll();
					break;
			}
		}
		else {
			//DM or Group DM
			if(message.author.id !== client.user.id) {
				//Message did not originate from us
				console.log('DM recieved :: From '+message.author.username+' - '+message.content);
			}
		}
	}
}

module.exports = DiscordBot;