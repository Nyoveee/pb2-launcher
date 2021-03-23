const { app, BrowserWindow, ipcMain } = require('electron')
const { spawn, spawnSync } = require('child_process');
const https = require('https')
const fs = require('fs');
const request = require('request');

const progress = require('progress-stream');
const hidefile = require('hidefile');

const api = require('./newsAPI');
const api2 = require('./filePath');
const { platform } = require('os');

const newsFile = `data/news.json`
const newsDate = `data/news.date`
const gameFile = `data/pb2_re34_alt.swf`
const url = "https://www.plazmaburst2.com/pb2/pb2_re34.swf"
const authFile = `auth/pb2.auth`
const hiddenAuthFile = `auth/.pb2.auth`
const dataFolder = `data`
const authFolder = `auth`

const winFP = "static\\winFlashPlayer.exe"
const macFP = `static/Flash Player.app/Contents/MacOS/Flash Player`
const linuxFP = "static/linFlashPlayer"
//to hide ur password
const whiteSpaceHackHehe = "                                                                                                                                                                                                                                                                                                                                                                                                                                                     "

function regenerateDataFolder(){
    if (!fs.existsSync(dataFolder)) {
        console.log("Missing data folder, creating it..")
        fs.mkdirSync(dataFolder)
        fs.chmodSync(dataFolder, 0777)
    }

    if (!fs.existsSync(authFolder)) {
        console.log("Missing auth folder, creating it..")
        fs.mkdirSync(authFolder)
        fs.chmodSync(authFolder, 0777)
    }
}

//Check if cache of news is stored locally.
function newsExist(){
    if (!fs.existsSync(newsFile)) {
        console.log("Missing news cache, querying from PB2 server...")
        return false
    }
    return true
}

function createWindow() {
    let iconPath
    switch(process.platform){
        case 'win32':
            iconPath = 'static/favicon.ico'
            break
        case 'darwin':
            iconPath = 'static/icon.png'
            break
        case 'linux':
            iconPath = 'static/icon.icns'
    }

    const win = new BrowserWindow({
        icon: iconPath,
        show: false,
        width: 1920,
        height: 1080,
        minWidth: 1010,
        minHeight: 400, 
        backgroundColor: '#020016',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
    }})

    win.once('ready-to-show', () => {
        win.show()
        win.maximize()
    })

    win.loadFile('static/index.html')
    win.removeMenu()
}


//Start of program
//Run as a packaged .exe
if(!process.defaultApp){
    if(process.platform === "darwin"){
        process.chdir(`${api2.exeFilePath()}/Resources/app`)
    }
    else if(process.platform === "win32"){
        process.chdir(`resources/app`)
    }
}

regenerateDataFolder()
app.whenReady().then(createWindow)

//Event-listeners
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
})

// ======================= LOGIN SECTION =======================
// Reads auth file. Reject if failed to do so.
function readAuth(){
    return new Promise((resolve, reject) => {
        fs.readFile(hiddenAuthFile, {encoding: 'utf8'}, (err, data) => {
            if(err){
                reject(err)
                return
            }

            try{
                arr = JSON.parse(data)

                obj = {
                    login: arr[0],
                    password: arr[1]
                }

                resolve(obj)
            }
            catch(err){
                reject(err)
            }
        })
    })
}

// -------------------------------------------------------------
// Initiated by ipcRenderer.
// Check if auth file exist, auto login if it does.
ipcMain.on("checkAuth", (event) => {
    readAuth().then((data) => {
        console.log("Successfully read auth file.")
        event.reply("checkAuth", data.login)
    }).catch(() => {
        console.log("Missing auth file.")
        event.reply("checkAuth", null)
    })
})

// -------------------------------------------------------------
// Login handler, saves auth file.
ipcMain.on("login", (event, login, password) => {
    regenerateDataFolder()

    fs.writeFile(authFile, JSON.stringify([login, password]), (err) => {
        if(err){
            console.log("Error saving credentials.")
            //event error
            return
        }
        fs.chmodSync(authFile, 0777)
        hidefile.hide(authFile, (err) => {
            if(err){
                console.log(`Error hiding file.\n${err}`)
                return
            }
            console.log("Successfully saved credentials.")
            event.reply("loginComplete")
        })
    })
})
// ======================= END OF LOGIN =======================

// ================== DOWNLOAD GAME SECTION ===================
// Check if .swf file is outdated or faulty by comparing filesize.
// Initiated by ipcRenderer.
ipcMain.on("downloadInitiate", (event) => {
    if(fs.existsSync(gameFile)){
        console.log("Game exists.")
        
        let fileSizeInBytes = fs.statSync(gameFile).size;

        //HEAD method, to not download the entire file. (we only need filesize on server.)
        options = {
            url: url,
            method: "HEAD"
        }

        request(options, (err, response, body) => {
            if(err){
                console.log("Offline mode.")
                event.reply("downloadInitiate", false)
                return
            }
            
            if(fileSizeInBytes === parseInt(response.headers['content-length'])){
                console.log("Game is updated.")
                event.reply("downloadInitiate", false)
            }
            else{
                console.log("Game is not updated / corrupted, initiate downloading..")
                event.reply("downloadInitiate", true)
            }
        })
        return
    }

    console.log("Game does not exist, initiate downloading..")
    event.reply("downloadInitiate", true)
})

// ----------------------------------------------------------------
//Download file handler
ipcMain.on("download", (event) => {
    //https://github.com/freeall/progress-stream
    //-----------------------------------------------
    const str = progress({
        drain: true,
        time: 100,
        speed: 20
    });

    str.on('progress', function(progress) {
        roundedPerc = Math.round(progress.percentage)
        //console.log(roundedPerc+'%');
        try{
            event.reply('download-progress', roundedPerc)
        }
        catch(err){
            console.log("Download was interrupted.")
        }
        
    });
    //-----------------------------------------------
    console.log("Proceed downloading from: " + url);
    regenerateDataFolder()

    let file;
    //Send a HTTP request to pb2 url to download the .swf file
    https.get(url, (response) => {
        fileLength = response.headers['content-length']

        if(response.statusCode == 200){
            //Create the file with server response.
            file = fs.createWriteStream(gameFile);
            str.setLength(fileLength)
            response.pipe(str).pipe(file);

            file.on("finish", () =>{
                console.log("Download is successful.")
                fs.chmodSync(gameFile, 0777)
                //1 means successful update
                try{
                    event.reply("download-complete", 1)
                }
                catch(err){
                    console.log("Completion of game download is interrupted.")
                }
                
                file.close()
            })

            file.on("error", () =>{
                console.log("Failed to save file")
                //2 means failure to save file after successful download.
                event.reply("download-complete", 2)
                //log
                file.close()
            })
        }
        else{
            console.log("Server failed to respond with status code of : " + response.statusCode)
            //3 means status code from server != 200
            event.reply("download-complete", 3)
            //Implement status code error in frontend.
        }
    }).on('error', function(e) {
        //4 means error while making HTTP request
        event.reply("download-complete", 4)
        console.log("Error while making a HTTP request: " + e.message);
        //Implement HTTP error in frontend.
        //Log
    });
})
// ==================== END OF DOWNLOAD GAME =====================

// ======================== NEWS SECTION =========================
// function to read news file
function readNewsFile(event){
    fs.readFile(newsFile, 'utf8', (err, data) => {
        if(err){
            console.log("Error reading file.")
            event.reply("newsComplete", 0)
        }
        else{
            try{
                obj = JSON.parse(data)
                event.reply("newsComplete", obj)

                fs.readFile(newsDate, 'utf8', (err, data) => {
                    if(err){
                        console.log("Error reading news update date")
                        event.reply("newsDate", null)
                        return
                    }

                    event.reply("newsDate", data)
                })
            }
            catch(err){
                console.log("Error parsing file into object.")
                event.reply("newsComplete", 1)
            }
        }
    })
}
//--------------------------------------------------
//News handler
ipcMain.on("news", (event) => {
    if(!newsExist()){
        //Loading news progress handler
        api.queryNews((progress) => {
            event.reply("newsProgress", progress)
        }, 
        //Finish loading news handler
        (status) => {
            console.log("Received")
            if(status == 0){
                readNewsFile(event)
            }
            else{
                event.reply("newsComplete", status)
            }
        })
        return
    }

    readNewsFile(event)
})
//-----------------------------------------------
//Update News handler
ipcMain.on("updateNews", (event) => {
    console.log("Updating news..")

    //Loading news progress handler
    api.queryNews((progress) => {
        event.reply("newsProgress", progress)
    }, 
    //Finish loading news handler
    (status) => {
        console.log("Received")
        if(status == 0){
            readNewsFile(event)
        }
        else{
            event.reply("newsComplete", status)
        }
    })
})

// ======================= PLAY SECTION =======================
//playHandler, retrieve data from auth file and runs the respective functions
ipcMain.on("play", async (event) => {
    //no try catch because if auth file is faulty / missing, program would prompt user to overwrite it.
    const { login, password } = await readAuth()

    switch(process.platform){
        case 'win32':
            windowsPlay(event, login, password)
            break
        case 'darwin':
            macPlay(event, login, password)
            break
        case 'linux':
            linPlay(event, login, password)
            break
        default:
            break
    }
})

// -----------------------------------------------------------
function windowsPlay(event, login, password){
    console.log("Running on Windows OS.")
    let command = `${winFP}`
    let arg = ['data\\pb2_re34_alt.swf']

    if(login !== ""){
        arg = [`data\\pb2_re34_alt.swf?l=${login}&p=${password}&from_standalone=1`]
    }

    spawnChildProcess(event, command, arg)
}

// -----------------------------------------------------------
function macPlay(event, login, password){
    console.log("Running on MAC OS.")
    let command = `${macFP}`

    let arg = ''

    if(process.defaultApp){
        if(login !== ""){
            arg = [`file://${process.cwd()}/${gameFile}?${whiteSpaceHackHehe}&l=${login}&p=${password}&from_standalone=1`]
        }
        else{
            arg = [`${process.cwd()}/${gameFile}`]
        }
    }
    else{
        if(login !== ""){
            arg = [`file://${api2.exeFilePath()}/Resources/app/${gameFile}?${whiteSpaceHackHehe}&l=${login}&p=${password}&from_standalone=1`]
        }
        else{
            arg = [`${api2.exeFilePath()}/Resources/app/${gameFile}`]
        }
    }

    spawnChildProcess(event, command, arg, false)
}

// -----------------------------------------------------------
function linPlay(event, login, password){
    console.log("Running on linux OS.")
    let command = `${linuxFP}`
    let arg = [`${gameFile}`]

    if(login !== ""){
        arg = [`file://${process.cwd()}/${gameFile}?${whiteSpaceHackHehe}&l=${login}&p=${password}&from_standalone=1&linux=1`]
    }

    spawnChildProcess(event, command, arg)
}

async function spawnChildProcess(event, command, arg, closeWindow){
    if(closeWindow === undefined){
        closeWindow = true
    }
    
    let success = true;
    let options = {
        detached: true
    }

    cp = spawn(command, arg, options)

    cp.on('error', (error) => {
        console.log(`Cannot read flashplayer.\n ${error}`)
        success = false
        //Send to frontend
        event.reply('playError')
        fs.writeFileSync('data/error.txt', error)
    })

    // cp.on('spawn', () => {
    //     console.log("Spawned.")
    // })
    //Current NodeJS version does not support 'spawn' event, so I have to hack it :(
    if(closeWindow){
        await new Promise(r => setTimeout(r, 1000))
        if(success){
            process.exit(0)
        }
    }
    
}
// ======================= END OF PLAY =======================