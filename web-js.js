var alertFrameDestroy;
var alertFrameDelay = 1500;
function ajaxSound(file, ignore) {
	var ajax = new XMLHttpRequest();
	ajax.open('post', 'post.php');
	ajax.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	ajax.send('file='+file+'&ignoretimeout='+ignore);
	ajax.onreadystatechange = function() {
		if(ajax.readyState === 4) {
			if(ajax.status === 200) {
				//Everything is good
			}
			else if(ajax.status === 432) {
				//Not met timeout
				var timeleft = ajax.getResponseHeader('X-Timeleft');
				timeleft = Math.round(timeleft / 1000);
				console.log(timeleft);
				alertMessage('Cooldown remaining: '+timeleft+' sec');
			}
			else if(ajax.status === 433) {
				//Not in voice channel
				alertMessage('The bot is not in any voice channels!');
			}
			else if(ajax.status === 500) {
				//Offline
				alertMessage('Uh oh...the bot is down!');
			}
		}
	};
}
function alertMessage(msg) {
	var el = document.getElementById('alert-frame');
	if(el) {
		el.innerHTML = msg;
		clearTimeout(alertFrameDestroy);
		alertFrameDestroy = setTimeout(clearAlertMessage, alertFrameDelay);
	}
	else {
		var div = document.createElement('div');
		div.id = 'alert-frame';
		var node = document.createTextNode(msg);
		div.appendChild(node);
		document.body.insertBefore(div, document.getElementById('banner'));
		clearTimeout(alertFrameDestroy);
		alertFrameDestroy = setTimeout(clearAlertMessage, alertFrameDelay);
	}
}
function clearAlertMessage() {
	var el = document.getElementById('alert-frame');
	el.parentNode.removeChild(el);
}
function checkCanada() {
	var ajax = new XMLHttpRequest();
	ajax.open('get', 'checkcanada.php');
	ajax.send();
	ajax.onreadystatechange = function() {
		if(ajax.readyState === 4) {
			if(ajax.status === 200) {
				var check = ajax.getResponseHeader('X-Canada-Check');
				if(check == 'true') {
					//Canadian
					window.location.reload();
				}
				else if(check == 'fail') {
					//Could not verify
					alertMessage('Could not verify your country');
				}
				else {
					//Not Canadian
					alertMessage('You\'re from '+check+', not Canada!');
				}
			}
		}
	};
}
function showTab(id) {
	hideAllTabs();
	document.getElementById('table-'+id).style.display = 'block';
	document.getElementById('li-'+id).setAttribute("selected", "selected");
	window.location.hash = id;
}
function hideAllTabs() {
	var collection = document.getElementsByClassName('button-table');
	Array.prototype.forEach.call(collection, function(element) {
		element.style.display = 'none';
		document.getElementById('li-'+element.id.substr(6)).setAttribute("selected", "false");
	});
}
window.onload = function() {
	if(window.location.hash !== '' && document.getElementById('table-'+window.location.hash.replace('#', ''))) {
		showTab(window.location.hash.replace('#', ''));
	}
	else {
		showTab(document.getElementsByClassName('button-table')[0].id.substr(6));
	}
};