CRC8 = {
    digest: function(data) {
	var result = 0;
	for (var i = 0; i < data.length; i++) {
	    var c = data[i];
	    for (var j = 0; j < 8; j++) {
		if (((result ^ c) & 0x01) == 0) {
		    result >>= 1;
		} else {
		    result ^= 0x18;
		    result >>= 1;
		    result |= 0x80;
		}
		c >>= 1;
	    }
	}
	if (result == 0xaa || result == 0xc5) {
	    result += 7;
	}
	return result;
    },
};
