var client_id = 'client_id=986b39d4513a5b501d57d973318715f0'; // thanks Mr Someone for sharing your client id!
var api_endpoint = 'http://api.soundcloud.com';
var track_endpoint = `${api_endpoint}/tracks/${track}?{client_id}`;

var http = require('http');
var https = require('https');
var fs = require('fs');
var cp = require('child_process');

var ffmd = require('ffmetadata');
var tmp = require('tmp');
var ohash = require('object-hash');

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

dl_root = dl_root || '.';

if (!fs.existsSync(dl_root)) {
	console.log(`dl_root ${dl_root} doesnt exist. please create it`);
	process.exit(1);
}

var tracks_endpoint = `${api_endpoint}/users/${user}/tracks?${client_id}`;
var user_endpoint = `${api_endpoint}/users/${user}?${client_id}`;
var playlists_endpoint = `${api_endpoint}/users/${user}/playlists?${client_id}`;

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
			download_tracks(true, fold, `${dl_root}/${user}`, JSON.parse(body));
		} catch (e) {
			console.log(`Response error ${e}. Say that to the dev!`);
			process.exit(1);
		}
	});
});

function maybefold(is_top, cb) {
	if (!is_top) {
		return cb(false);
	}

	http.get(playlists_endpoint, (res) => {
		var body = '';

		res.on('data', function (b) {
			body += b;
		});

		res.on('end', function (b) {
			if (b) {
				body += b;
			}

			var playlists = JSON.parse(body);

			if (!playlists.length) {
				playlists = false;
			}

			cb(playlists);
		});
	});
}

function download_tracks(is_top_level, fold, root_folder, tracks) {
	if (!tracks.length) {
		return;
	}

	if (is_top_level) {
		console.log(`${user} has ${tracks.length} tracks`);
	}

	maybefold(is_top_level, (playlists) => {
		if (!playlists) {
			fold = false;
		}

		var hash_object = {
			tracks: tracks
		};

		if (fold) {
			hash_object.playlists = playlists;
		}

		var hash = ohash.sha1(hash_object);

		if (fold) {
			root_folder += '_with_playlists';
		}

		if (!fs.existsSync(`${root_folder}`)) {
			console.log(`creating a directory for ${user} called ${root_folder}..`);
			fs.mkdirSync(`${root_folder}`);
		} else if (!fs.existsSync(`${root_folder}/.hash`)) {
			console.log(`older folder for ${user} called ${root_folder} detected (no hash), overwriting..`);
			cp.execSync(`rm -rf ${root_folder}`);
			fs.mkdirSync(`${root_folder}`);
		} else if (fs.readFileSync(`${root_folder}/.hash`).toString() !== hash) {
			console.log(`older folder for ${user} called ${root_folder} detected (hashes didnt conincide), overwriting..`);
			cp.execSync(`rm -rf ${root_folder}`);
			fs.mkdirSync(`${root_folder}`);
		} else {
			console.log('nothing has changed since you last downloaded it..');
			process.exit(1);
		}

		fs.writeFileSync(`${root_folder}/.hash`, hash);

		var avatar = tracks[0].user.avatar_url;

		if (avatar.indexOf('default') === -1 && is_top_level) {
			http.get(user_endpoint, (res) => {
				var body = '';
				res.on('data', (d) => {
					body += d;
				});

				res.on('end', (d) => {
					if (d) {
						body += d;
					}

					avatar = JSON.parse(body).avatar_url;
					avatar = avatar.replace('-large.jpg', '-t500x500.jpg');

					https.get(avatar, (res) => {
						console.log(`getting an avatar image of ${user} from ${avatar}...`);
						var avatarFile = `${root_folder}/${user}_avatar.jpg`;
						var stream = fs.createWriteStream(avatarFile);
						res.pipe(stream);
					});
				})
			});
		}

		if (fold) {
			[].forEach.call(playlists, function (playlist) {
				var name = playlist.permalink;
				var root = `${root_folder}/${name}`;

				tracks = [].filter.call(tracks, (track) => {
					var notfound = true;
					[].forEach.call(playlist.tracks, (ptrack) => {
						if (ptrack.id === track.id) {
							notfound = false;
						}
					});

					return notfound;
				});

				download_tracks(false, false, root, playlist.tracks);
			});
		}

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

					function artwork_cb(cb) {
						if (track.artwork_url) {
							https.get(track.artwork_url, function (res) {
								var img = [];
								res.on('data', function (b) {
									img.push(b);
								});
								res.on('end', function (b) {
									if (b) {
										img.push(b);
									}

									cb(Buffer.concat(img));
								});
							});
						} else {
							cb([]);
						}
					}

					download_track(JSON.parse(body).location, root_folder, {
						name: track.permalink,
						title: track.title,
						date: track.created_at,
						artist: track.user.username,
						artwork: artwork_cb
					});
				})
			})
		});
	});
}

function download_track(url, root, info) {
	var name = info.name;
	var date = info.date;
	var artist = info.artist;
	var title = info.title;
	var artwork = info.artwork;

	https.get(url, (res) => {
		var size = res.headers['content-length'];
		var total = 0;

		var file = fs.createWriteStream(`${root}/${name}.mp3`);
		res.pipe(file);
		res.on('data', (d) => {
			total += d.length;
			//console.log(`:::${Math.round(100 * (total / size))}% of ${name} is downloaded`);
		});
		res.on('end', () => {
			console.log(`${name} downloaded`);

			if (tagging) {
				console.log(`tagging ${name}...`);

				var tag = {};
				
				tag.artist = artist.toLowerCase();
				tag.title = title.toLowerCase();
				tag.date = new Date(date).getUTCFullYear() + '';
				tag.album = 'from soundcloud';
				
				console.log(`downloading artwork for ${name}..`);

				artwork(function (img) {
					if (!img.length) {
						ffmd.write(`${root}/${name}.mp3`, tag, () => {
							console.log(`tagged ${name}..`);
						})
					} else {
						tmp.file((_, path, _1, cb) => {
							var str = fs.createWriteStream(path);
							str.write(img);
							str.end();
							var options = { attachments: [path] };

							ffmd.write(`${root}/${name}.mp3`, tag, options, () => {
								console.log(`tagged ${name}..`);
								cb();
							})
						});
					}
				});
				
			}
		});

	})
}