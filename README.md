# PB2 Launcher
Developed via ElectronJs. A basic launcher that works on Windows 7 and above, MacOS as well as Linux (Ubunutu tested).

### Run
Make sure you have NodeJs installed.

On the root directory,
Type `npm i` to install all the dependencies.
Type `npm start` to run the application.

### Functionalities
- Caches news so user does not have query PB2 server for news everytime launcher is launched.
- Checks if game is updated / corrupted and redownloads from PB2 server if needed.
- Credentials is stored in a seperate folder (auth), and hidden.

### Possible future features
- Settings option (Light/dark theme toggle, fully customisable launcher's look, option to not close launcher when launching game)
- Centering the game (not possible with NodeJS, may have to extend application with other technologies)
- Discord rich prescence
- Ability to play PB FTTP at the last page