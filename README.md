# soundcloud-dl-all
a small script to download all track previews from someone's soundcloud page.

use it like this:
 
 node index.js user=USERNAME dl_root=DLROOT fold=FOLD tag=TAG

user is mandatory

dl_root is set to . if not specified

fold is false by default. what fold does is it folds playlists to separate subdirectories

tag is false by default. use it if you wanna tracks be automatically tagged and enhanced with artworks. you should have ffmpeg on path if you wanna use it.