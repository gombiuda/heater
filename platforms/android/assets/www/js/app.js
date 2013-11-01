document.addEventListener('deviceready', function() {
    window.App = Ember.Application.create({
	title: 'Heater',
	ready: function() {
	    setTimeout(function() {
		$('#deviceready > .listening').hide();
		$('#deviceready > .received').show();
	    }, 3000);
	},
    });
    window.App.heater = Heater.create({
	host: '192.168.1.102',
	port: 8000,
    });
    window.App.View = Ember.View.extend({
	templateName: 'main',
	didInsertElement: function() {
	    window.connect = $('#connect');
	    window.host = $("[name='host']");
	    window.port = $("[name='port']");
	    $("#connect").click(function() {
		if (window.App.heater && window.App.heater.connected) {
		    window.App.heater.disconnect();
		    clearInterval(window.App.heater.syncer);
		}
		window.App.heater.set('host', $("[name='host']").val());
		window.App.heater.set('port', parseInt($("[name='port']").val()));
		window.App.heater.connect();
		window.App.heater.syncer = setInterval(function() {
		    window.App.heater.sync();
		}, 1000);
	    });
	},
    });
}, false);
