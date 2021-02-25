window.$ = window.jQuery = require('jquery');
//document.ready
$(function() {
    const { shell, ipcRenderer } = require('electron');
    const loginInput = $("#loginInput");
    const passInput = $("#passInput");

    //Initiate loading of news, check if game file exist, and auto-login.
    ipcRenderer.send("news");
    ipcRenderer.send("downloadInitiate")
    ipcRenderer.send("checkAuth")

    //make <a> links work outside electron window.
    $(document).on('click', 'a[href^="http"]', function(event) {
        event.preventDefault();
        shell.openExternal(this.href);
    });

    function updateFile(){
        ipcRenderer.send("download");
    }

    //idk why i didnt standardise declaration of function
    const makeNewsNavFunctional = (btnCount) => {
        for(let x = 0; x < btnCount; x++){
            $(`#navPg${x}`).on("click", () => {
                for(let y = 0; y < btnCount; y++){
                    if(y === x){
                        $(`#newsPg${y}`).removeClass('hidden')
                        $(`#navPg${y}`).addClass('pgNoSelected')
                    }
                    else{
                        $(`#newsPg${y}`).addClass('hidden')
                        $(`#navPg${y}`).removeClass('pgNoSelected')
                    }
                }
            })
        }
    }

    function enableButtons(){
        //Enable relogin button.
        $("#relogin").removeClass("blockedBtn");
        $("#relogin").on("click", relogin);

        //Enable play button.
        $("#play").removeClass("blockedBtn2");
        $("#play").on("click", play);

        setTimeout(() => {
            $("#updateGameBtn").removeClass("blockedBtn");
            $("#updateGameBtn").on("click", updateGame);
            $("#updateGameBtn").html("Update Game");
        }, 2000)
    }

    ipcRenderer.on("playError", () => {
        $("#updateGame").html("Error starting game. Please reinstall.")
        $("#updateGame").show()
    })

    //Receives whether to autologin
    ipcRenderer.on("checkAuth", (event, login) => {
        $("#preLoad").hide()
        if(login === null){
            console.log("Error reading auth file.")
            $("#preLogin").show()
            $("#login").on("click", logIn);
            return
        }
        console.log(`Successfully read auth file. Login: ${login}`)
        loginInput.val(login)
        showLoggedIn()
    })

    //Receives date when news got updated
    ipcRenderer.on("newsDate", (event, date) => {
        if(date === null){
            $("#lastUpdateDate").html("Error.")
            return
        }

        $("#lastUpdateDate").html(date)
    })

    //Receives progress on loading news
    ipcRenderer.on("newsProgress", (event, progress) => {
        $("#newsProgress").html(progress)
    })

    //Receives loaded news.
    ipcRenderer.on("newsComplete", (event, obj) => {
        let finalHtml=""
        let finalNavHtml = ""

        //DONT MIND ME NOT USING SWITCH STATEMENT :pensive:
        if(obj === 0){
            console.log("Main process failed to read file.")
            finalHtml = '<span style="color: #FF4444">Failed to read news cache. Please restart the application. If problem persist, please notify the developer about the issue.</span>'
        }
        else if(obj === 1){
            console.log("Main process failed to parse file.")
            finalHtml = '<span style="color: #FF4444">Failed to parse news cache. Please restart the application. If problem persist, please notify the developer about the issue.</span>'
        }
        //from queryNews
        else if(obj === 2){
            console.log("Cannot make HTTP request.")
            finalHtml = '<span style="color: #FF4444">Cannot connect to server. Ensure make sure you have internet connection. Please restart the application.</span>'
        }
        //from queryNews
        else if(obj === 3){
            console.log("Error writing news json into data folder.")
            finalHtml = '<span style="color: #FF4444">Error saving news cache. Please restart the application. If problem persist, please notify the developer about the issue.</span>'
        }
        //Succeed
        else{
            arrayObj = Object.values(obj)
            newsCount = arrayObj.length

            for(let x = 0; x < newsCount; x++){
                if( x == 0 )
                {
                    finalNavHtml += '<div id="navPg0" class="pgNo pgNoSelected">1</div>'
                }
                else{
                    finalNavHtml += `<div id="navPg${x}" class="pgNo">${x+1}</div>`
                }
            }

            $("#newsPageNav").html(finalNavHtml)

            let x = 0

            for(let newsPage of arrayObj)
            {
                if(x == 0){
                    finalHtml += `<div id="newsPg${x}">`
                }
                else{
                    finalHtml += `<div id="newsPg${x}" class="hidden">`
                }

                let arr = Object.values(newsPage)
                for(let newsSection of arr){
                    finalHtml += '<div class="newsSection"><div class="newsDate">'
                    finalHtml += newsSection[0]
                    finalHtml += '</div><div class="newsContent">'
                    finalHtml += newsSection[1]
                    finalHtml += '</div></div>'
                }
                
                finalHtml += '</div>'
                x++
            }
        }
        $("#newsContainer").html(finalHtml)
        makeNewsNavFunctional(newsCount)
        $("#updateButton").on("click", updateNews);
        $("#updateButton").html("Update");
        $("#updateButton").addClass("readyUpdate");
        $("#updateButton").removeClass("notReady");
    })

    ipcRenderer.on("download-complete", (event, message) => {
        /*
        Case 1: Successful
        Case 2: Failure to save file after successful download. [Logged]
        Case 3: Receives a status code of != 200
        Case 4: Error while making HTTP request [Logged]
        */
        switch(message){
            case 1:
                $("#updateGame").html("Updated successfully.");
                $("#updateGameBtn").html("Updated."); 

                enableButtons();
                break;
            case 2:
                $("#updateGame").html("Failed to save file. Please contact developer if issue persist.");
                $("#updateGameBtn").html("Failure.");
                
                enableButtons();
                break;
            case 3:
                $("#updateGame").html("Server failed to respond. Please try again.");
                $("#updateGameBtn").html("Failure.");

                enableButtons();
                break;
            case 4:
                $("#updateGame").html("Ensure you have internet connection.");
                $("#updateGameBtn").html("Failure.");

                enableButtons();
                break;
            default:
                throw new Error("Unknown download completion status");
        }
    });

    ipcRenderer.on("download-progress", (event, progress) => {
        $("#updateGamePerc").html(progress);
    });

    ipcRenderer.on("loginComplete", showLoggedIn)

    ipcRenderer.on("downloadInitiate", (event, initiate) => {
        if(initiate){
            disableUpdateBtn()
            ipcRenderer.send("download")
            return
        }

        //Everything okay.
        $("#updateGameBtn").on("click", updateGame);
        $("#updateGameBtn").html("Update Game");
        $("#updateGameBtn").removeClass("blockedBtn")
        $("#play").removeClass("blockedBtn2")
        $("#play").on("click", play);
    })
    
    $("#relogin").on("click", relogin);

    $("#passInfo").on("click", openPB2EditProfile);

    $("#passInfo").on("mouseover", function(){
        $("#passwordInfo").show();
        console.log("test");
    });

    $("#loginName").on("click", openPB2EditProfile);

    function openPB2EditProfile(){
        shell.openExternal('https://www.plazmaburst2.com/?a=&s=8');
        //window.open('https://www.plazmaburst2.com/?a=&s=8', '_blank');
    }

    $("#passInfo").on("mouseleave", function(){
        $("#passwordInfo").hide();
    });

    function updateNews(){
        $("#updateButton").removeClass("readyUpdate");
        $("#updateButton").addClass("notReady");

        $("#updateButton").off("click", updateNews);
        $("#updateButton").html("Updating..");

        $("#newsContainer").html('<span style="color: #9b9b9b">Loading... Progress: <span id="newsProgress">0</span>%</span>');
        $("#updateButton").html("Updating..");
        $("#lastUpdateDate").html("Updating..")
        $("#newsPageNav").html("")

        ipcRenderer.send("updateNews")
    }

    function showLoggedIn(){
        loginHtml = loginInput.val()

        if(loginHtml == "")
        {
            loginHtml = "Guest";
        }

        $("#preLogin").css("display","none");
        $("#posLogin").css("display","block");

        $("#loginName").html(loginHtml);
    }

    function logIn(){
        console.log("asd")
        loginName = loginInput.val();
        password = passInput.val();

        $("#login").off("click", logIn);
        $("#login").addClass("blockedBtn");
        $("#login").html("...");

        loginInput.prop( "disabled", true );
        passInput.prop( "disabled", true );
        ipcRenderer.send("login", loginName, password)
    }

    function relogin(){
        $("#login").removeClass("blockedBtn");
        $("#login").on("click", logIn);
        loginInput.prop( "disabled", false );
        passInput.prop( "disabled", false );
        $("#login").html("Login");
        $("#preLogin").css("display","block");
        $("#posLogin").css("display","none");
    }

    function disableUpdateBtn(){
        //Disable update game button, and update text
        $("#updateGameBtn").off("click", updateGame);
        $("#updateGameBtn").addClass("blockedBtn");
        $("#updateGameBtn").html("Updating..");

        //Show update progress text
        $("#updateGame").html("Updating game, Progress: <span id='updateGamePerc'>0</span>%");
        $("#updateGame").show();

        //Disable play button.
        $("#play").addClass("blockedBtn2")
        $("#play").off("click", play);

        //Disable relogin button.
        $("#relogin").addClass("blockedBtn")
        $("#relogin").off("click", relogin);
    }

    function updateGame(){
        disableUpdateBtn()

        //download and update the PB2 .swf file.
        updateFile();
    }

    function play(){
        ipcRenderer.send("play")
    }
});
