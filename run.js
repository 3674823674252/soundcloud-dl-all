var cp = require('child_process');	

var lib = require('./lib');

var argv = process.argv.slice(2);

function usage() {
	console.log('node index.js user=blablabla dl_root=blabla tag=blabla fold=blabla');
}

if (argv.length < 1) {
	usage();
	process.exit(1);
}

var user;
var dl_root;
var tagging = false;
var fold = false;

argv.forEach((arg) => {
	var split = arg.split('=');
	if (split[0] === 'user') {
		user = split[1];
	} else if (split[0] === 'dl_root') {
		dl_root = split[1];
	} else if (split[0] === 'tag') {
		if (!cp.execSync('which ffmpeg')) {
			console.log('couldnt find ffmpeg, tagging is disabled');
		} else {
			console.log('tagging is enabled');
			tagging = true;
		}
	} else if (split[0] === 'fold') {
		fold = true;
	} else {
		usage();
		process.exit(1);
	}
});

lib.dl(user, dl_root, tagging, fold, function () {
	console.log('all tracks downloaded');
});