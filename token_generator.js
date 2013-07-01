var crypto = require('crypto');
module.exports = function(data){
		console.log(data);
		var token = crypto.createHmac('md5','aff6576e3045279d783a30718eb94e487a8aecc52fa9cd0ccf35d64f0265').update(data).digest('hex');
		return token;

		console.log(token);
};