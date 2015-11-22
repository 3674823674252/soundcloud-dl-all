# soundcloud-dl-all
a small script to download all track previews from someone's soundcloud page.

use it like this:
 
 node run.js user=USERNAME dl_root=DLROOT fold=FOLD tag=TAG client=CLIENT_ID

client_id is mandatory!

user is mandatory

dl_root is set to . if not specified

fold is false by default. what fold does is it folds playlists to separate subdirectories

tag is false by default. use it if you wanna tracks be automatically tagged and enhanced with artworks. you should have ffmpeg on path if you wanna use it.

or you can run it programmatically like this:

 require('soundcloud-dl-all').dl(client, user, dl_root, tag, fold, cb)

(client and user params are strings, dl_root is also a string, tag is boolean, fold is boolean, cb is function)

always specify a callback when calling it like that, it will be invoked after all tracks are downloaded.

first argument to callback is an error, second argument is a path of a folder where all tracks were downloaded to.	

