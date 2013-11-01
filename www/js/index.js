document.addEventListener('deviceready', function() {
    window.App = Ember.Application.create({
	title: 'Heater',
	ready: function() {
	    console.log('ready');
	    setTimeout(function() {
		$('#deviceready > .listening').hide();
		$('#deviceready > .received').show();
	    }, 3000);
	},
    });
}, false);
