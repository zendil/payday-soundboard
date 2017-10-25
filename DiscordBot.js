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
	
	attemptJoinVoice(message) {
		var msg;
		var rejectedMsg = 'Payday Soundboard cannot speak in channel "'+message.channel.name+'" in your server "'+message.guild.name+'". Check your server and channel permissions to ensure Payday Soundboard can send messages to this channel. The error given was "';
		if(message.member.voiceChannel instanceof Discord.VoiceChannel) {
			//Join the channel
			message.member.voiceChannel.join();
			msg = message.channel.sendMessage('Visit https://payday-soundboard.herokuapp.com/ to use the soundboard! If I\'m talking for too long, just tell me to !paydaystfu');
			msg.then(() => {}, (reason) => {
				console.log('Msg rejected :: '+message.guild.name+' - '+message.channel.name+' - '+reason.response.body.message+' :: Owner = '+message.guild.owner.user.username);
				this.messageAdmins(message.channel.guild, rejectedMsg+reason+'".');
			});
		}
		else {
			msg = message.channel.sendMessage('You\'re not in a voice channel, pal! Join one and try again.');
			msg.then(() => {}, (reason) => {
				console.log('Msg rejected :: '+message.guild.name+' - '+message.channel.name+' - '+reason.response.body.message+' :: Owner = '+message.guild.owner.user.username);
				this.messageAdmins(message.channel.guild, rejectedMsg+reason+'".');
			});
		}
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