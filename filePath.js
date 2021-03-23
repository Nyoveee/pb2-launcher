module.exports = {
    exeFilePath : function(){
        let regexString = /(.+)\/.+/
        return process.argv[0].match(regexString)[1].match(regexString)[1]
    }
}
