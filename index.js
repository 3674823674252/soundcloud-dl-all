var client_id = 'client_id=986b39d4513a5b501d57d973318715f0'; // thanks Mr Someone for sharing your client id!
var api_endpoint = 'http://api.soundcloud.com';
var track_endpoint = `${api_endpoint}/tracks/${track}?{client_id}`;

var http = require('http');
var https = require('https');
var fs = require('fs');
var argv = process.argv.slice(2);

function usage() {
	console.log('node index.js user=blablabla dl_root=blabla');
}

if (argv.length < 1) {
	usage();
	process.exit(1);
}

var user;
var dl_root;
argv.forEach((arg) => {
	var split = arg.split('=');
	if (split[0] === 'user') {
		user = split[1];
	} else if (split[0] === 'dl_root') {
		dl_root = split[1];
	} else {
		usage();
		process.exit(1);
	}
});

dl_root = dl_root || '.';

if (!fs.existsSync(dl_root)) {
	console.log(`dl_root ${dl_root} doesnt exist. please create it`);
	process.exit(1);
}

var tracks_endpoint = `${api_endpoint}/users/${user}/tracks?${client_id}`;

var track;	

if (!user) {
	usage();
	process.exit(1);
}

console.log(`getting all tracks by ${user}`);

http.get(tracks_endpoint, function (res) {
	var body = '';

	res.on('data', function (d) {
		body += d;
	});

	res.on('end', function (d) {
		if (d) {
			body += d;
		}

		try {
			download_tracks(JSON.parse(body));
		} catch (e) {
			console.log(`Response error ${e}. Say that to the dev!`);
			process.exit(1);
		}
	});
});

function download_tracks(tracks) {
	tracks = tracks.length? tracks : [];
	console.log(tracks.length);

	[].forEach.call(tracks, function(track) {
		var stream = track.stream_url;
		stream = `${stream}?${client_id}`;
		https.get(stream, function (res) {
			var body = '';

			res.on('data', function (d) {
				body += d;
			});

			res.on('end', function (d) {
				if (d) {
					body += d;
				}

				download_track(JSON.parse(body).location, track.permalink);
			})
		})
	});
}

function download_track(url, name) {
	https.get(url, (res) => {
		var size = res.headers['content-length'];
		var total = 0;

		if (!fs.existsSync(`${dl_root}/${user}`)) {
			fs.mkdirSync(`${dl_root}/${user}`);
		}

		if (fs.existsSync(`${dl_root}/${user}/${name}.mp3`)) {
			console.log(`${name} already exists in place, skippin..`);
			return;
		}
		var file = fs.createWriteStream(`${dl_root}/${user}/${name}.mp3`);
		res.pipe(file);
		res.on('data', (d) => {
			total += d.length;
			console.log(`-${Math.round(100 * (total / size))}% of ${name} is downloaded`);
		});
		res.on('end', () => {
			console.log(`${name} downloaded`);
		});

	})
}