//Permission to web scrap has been granted by Eric Gurt.
//I have asked him in discord.
//Web scraping also keeps the links working. :)
//https://cdn.discordapp.com/attachments/717280355283107881/813747451608563722/Capture.JPG

const request = require('request')
const fs = require('fs')
const api2 = require('./filePath');

const isMac = process.platform === "darwin"
const appDataFolder = `/Users/${require("os").userInfo().username}/AppData/Local/PB2ZenLauncher`

let dataFolder = ``

//https://javascript.info/regexp-introduction
regexNewsExp = /<strong class="news_date">(.+?(?=<\/strong>))<\/strong>(.+?(?=\s*<div class="news_div"><\/div>|\s*<div align="center">))/gs
regexNewsCountExp = /<a href="https:\/\/www\.plazmaburst2\.com\/launcher\/index\.php\?a=&s=&pg=(\d+)">/gs

function getNewsAtPg(counter){
    return new Promise((resolve, reject) => {
        let url = "https://www.plazmaburst2.com/launcher/index.php?a=&s=&pg="
        url += counter

        request(url, (err, res, body) => {
            if(err){
                console.log("Cannot make HTTP request.")
                reject()
                return
            }
            if(res.statusCode != 200){
                console.log("Server returned a status code other than 200")
                reject()
                return
            }
        
            results = Array.from(body.matchAll(regexNewsExp))
            newsCount = Array.from(body.matchAll(regexNewsCountExp)).length

            obj = {}
            let i = 0
            for(let result of results)
            {
                obj[i] = new Array(2);
                obj[i][0] = result[1]
                obj[i][1] = result[2]
                i++
            }

            resolve([obj, newsCount])
        });
    })
}

function writeNewsCache(obj, callback){
    if(!process.defaultApp){
        if(process.platform === "win32"){
            dataFolder = `${appDataFolder}/data`
        }
    }

    let today = new Date().toLocaleString('default', { day: 'numeric', month: 'long', year: 'numeric' });

    //writing news json
    fs.writeFile(`${dataFolder}/news.json`, JSON.stringify(obj), (err) => {
        if(err){
            console.log("Error writing file!")
            callback(3)
            return
        }
        
        //writing date update
        fs.writeFile(`${dataFolder}/news.date`, today, (err) => {
            if(err){
                console.log("Error writing file!")
                callback(3)
                return
            }

            console.log("File successfully written.")

            const newsFile = isMac ? `${api2.exeFilePath()}/Resources/app/data/news.json` : `${dataFolder}/news.json`
            const newsDate = isMac ? `${api2.exeFilePath()}/Resources/app/data/news.date` : `${dataFolder}/news.date`

            fs.chmodSync(newsFile, 0777)
            fs.chmodSync(newsDate, 0777)
            callback(0)
        })
    })
}

module.exports = {
    queryNews : function(progressCallback, callback){
        let finalObj = {}
    
        getNewsAtPg(0).then(async (obj) => {
            finalObj[0] = obj[0]
            let newsCount = obj[1]
    
            let failure = false
    
            for(let counter = 1; counter < newsCount; counter++){
                if(failure){
                    callback(2)
                    break
                }
                
                progressCallback(Math.round((counter)/newsCount*100))

                //start getting news
                getNewsAtPg(counter).then((obj) => {
                    finalObj[counter] = obj[0]
                    
                    //last news
                    if(counter == newsCount - 1){
                        writeNewsCache(finalObj, callback)
                    }
                }).catch(() => {
                    console.log("Couldn't connect to server.")
                    failure = true
                })
                //delay to prevent rate limited
                await new Promise(r => setTimeout(r, 400));
            }
    
        }).catch(() => {
            //Failed to connect to server. Passed back to caller.
            callback(2)
        })
    }
}


