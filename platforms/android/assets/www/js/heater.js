window.Heater = Ember.Object.extend({
    host: null,
    port: null,
    socket: null,
    connected: false,
    status: {},
    temperature_target: 35,
    flow_rate_target: 0,
    connect: function() {
	console.log('connect');
	return when.promise(function(resolve) {
	    if (this.socket) {
		chrome.socket.disconnect(this.socket);
		chrome.socket.destroy(this.socket);
		this.socket = null;
	    }
	    chrome.socket.create('tcp', function(info) {
		resolve(info.socketId);
	    });
	}.bind(this)).then(function(socket) {
	    if (this.host && this.port) {
		this.socket = socket;
		return when.promise(function(resolve) {
		    chrome.socket.connect(this.socket, this.host, this.port, resolve);
		}.bind(this));
	    } else {
		throw "host or port invalid"
	    }
	}.bind(this)).then(function() {
	    this.set('connected', true);
	}.bind(this));
    },
    disconnect: function() {
	chrome.socket.disconnect(this.socket);
	chrome.socket.destroy(this.socket);
	this.socket = null;
    },
    send_command: function(cmd, v1, v2) {
	return when.promise(function(resolve) {
	    var data = new ArrayBuffer(6);
	    var data_view = new Uint8Array(data);
	    data_view[0] = 0xc5;
	    data_view[1] = 0xc5;
	    data_view[2] = cmd;
	    data_view[3] = v1;
	    data_view[4] = v2;
	    data_view[5] = CRC8.digest([cmd, v1, v2]);
	    chrome.socket.write(this.socket, data, resolve);
	}.bind(this));
    },
    read: function() {
	return when.promise(function(resolve) {
	    chrome.socket.read(this.socket, resolve);
	}.bind(this)).then(function(info) {
	    return new Uint8Array(info.data);
	});
    },
    sync: function() {
	return this.read().then(function(data) {
	    var i = 1;
	    while (i < data.length) {
		while (i < data.length) {
		    if (data[i - 1] == 0xaa && data[i] == 0xaa) {
			break
		    } else {
			i += 1;
		    }
		}
		var category = data[i + 1];
		// minimum 32bit
		var status = new BitArray(32, _.string.sprintf('%02x%02x',
							       data[i + 2],
							       data[i + 3]));
		var crc = data[i + 4];
		i += 5;
		// no crc checking
		this.set_status(category, status);
	    }
	}.bind(this));
    },
    set_status: function(category, status) {
	switch(category) {
	case 0x01:
	    this.set('status', _.extend(_.clone(this.status), {
		segment: status.toBinaryString().slice(16, 32).slice(0, 3),
		injection: status.toBinaryString().slice(16, 32).slice(3, 5),
		call: status.get(7),
		fire: status.get(8),
		fan: status.get(9),
		water: status.get(10),
		anti_frozen: status.get(12),
		occupy: status.toBinaryString().slice(16, 32).slice(13, 15),
	    }));
	    break;
	case 0x02:
	    this.set('status', _.extend(_.clone(this.status), {
		temperature: parseInt(status.toBinaryString().slice(16, 32).slice(0, 8), 2),
		inject_rate: parseInt(status.toBinaryString().slice(16, 32).slice(8, 16), 2),
	    }));
	    console.log('got temperature', parseInt(status.toBinaryString().slice(16, 32).slice(0, 8), 2));
	    break;
	case 0x03:
	    this.set('status', _.extend(_.clone(this.status), {
		error: parseInt(status.toBinaryString().slice(16, 32).slice(0, 8), 2),
		inject_rate: parseInt(status.toBinaryString().slice(16, 32).slice(8, 16), 2),
	    }));
	    break;
	case 0x04:
	    this.set('status', _.extend(_.clone(this.status), {
		temperature: parseInt(status.toBinaryString().slice(16, 32).slice(0, 8), 2),
		flow_rate: parseInt(status.toBinaryString().slice(16, 32).slice(8, 16), 2),
	    }));
	    break;
	case 0x05:
	    this.set('status', _.extend(_.clone(this.status), {
		water_injected: parseInt(status.toBinaryString().slice(16, 32).slice(0, 16), 2),
	    }));
	    break;
	case 0x10:
	    this.set('status', _.extend(_.clone(this.status), {
		gas_total: parseInt(status.toBinaryString().slice(16, 32).slice(0, 16), 2),
	    }));
	    break;
	case 0x11:
	    this.set('status', _.extend(_.clone(this.status), {
		water_total: parseInt(status.toBinaryString().slice(16, 32).slice(0, 16), 2),
	    }));
	    break;
	case 0x12:
	    this.set('status', _.extend(_.clone(this.status), {
		fan_rate: parseInt(status.toBinaryString().slice(16, 32).slice(0, 16), 2),
	    }));
	    break;
	case 0x13:
	    this.set('status', _.extend(_.clone(this.status), {
		water_output: parseInt(status.toBinaryString().slice(16, 32).slice(0, 16), 2),
	    }));
	    break;
	case 0x14:
	    this.set('status', _.extend(_.clone(this.status), {
		efficiency: parseInt(status.toBinaryString().slice(16, 32).slice(0, 16), 2),
	    }));
	    break;
	default:
	    throw "category error" + category + " " + status;
	}
    },
    set_temperature: function(value) {
	return this.send_command(0x40, parseInt('00011111', 2), value);
    },
    set_flow_rate: function(value) {
	return this.send_command(0x41, parseInt('00011111', 2), value);
    },
    occupy: function() {
	return this.status['occupy'];
    }.property('status'),
    anti_frozen: function() {
	return this.status['anti_frozen'];
    }.property('status'),
    water: function() {
	return this.status['water'];
    }.property('status'),
    fan: function() {
	return this.status['fan'];
    }.property('status'),
    call: function() {
	return this.status['call'];
    }.property('status'),
    injection: function() {
	return this.status['injection'];
    }.property('status'),
    segment: function() {
	return this.status['segment'];
    }.property('status'),
    error: function() {
	return this.status['error'];
    }.property('status'),
    temperature: function() {
	return this.get('status').temperature;
    }.property('status'),
    flow_rate: function() {
	return this.status['flow_rate'];
    }.property('status'),
    inject_rate: function() {
	return this.status['inject_rate'];
    }.property('status'),
    water_injected: function() {
	return this.status['water_injected'];
    }.property('status'),
    water_total: function() {
	return this.status['water_total'];
    }.property('status'),
    gas_total: function() {
	return this.status['gas_total'];
    }.property('status'),
    fan_rate: function() {
	return this.status['fan_rate'];
    }.property('status'),
    water_output: function() {
	return this.status['water_output'];
    }.property('status'),
    efficiency: function() {
	return this.status['efficiency'];
    }.property('status'),
    increase_temperature: function() {
	if (this.temperature_target < 65) {
	    this.set('temperature_target', this.temperature_target + 1);
	    this.set_temperature(this.temperature_target);
	}
    },
    decrease_temperature: function() {
	if (this.temperature_target > 35) {
	    this.set('temperature_target', this.temperature_target - 1);
	    this.set_temperature(this.temperature_target);
	}
    },
    increase_flow_rate: function() {
	if (this.flow_rate_target < 900) {
	    this.set('flow_rate_target', this.flow_rate_target + 1);
	    this.set_flow_rate(this.flow_rate_target);
	}
    },
    decrease_flow_rate: function() {
	if (this.flow_rate_target > 10) {
	    this.set('flow_rate_target', this.flow_rate_target - 1);
	    this.set_flow_rate(this.flow_rate_target);
	}
    },
});
