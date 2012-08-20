# CrowdBotHost.py
# This program runs on the computer which is connected to the Arduino
# It checks for pending sketches on the CrowdBotBlock server, checks them for dangerous code, and then tells node to run them

# basic functionality libraries
import time, urllib, os, json

# configure app instance for your installation
appinstance = "http://crowdbotblock.herokuapp.com"

loops = 0
lastid = ""

# overwrite console.log to send messages / data to livestream
introcode = '''var console = {
  log: function(info){
    var querystring = require("querystring");
    var post_data = querystring.stringify({
      info: info
    });
    var options = {
      host: "crowdbotblock.herokuapp.com",
      port: 80,
      path: '/speak',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
      }
    };
    var http = require("http");
    var req = http.request(options, null);
    req.write(post_data);
    req.end();
  }
};
setTimeout(function(){
  process.exit(code=0);
}, 60000);
'''

# while loops < 175: # 175 loops x 45 seconds > 2 hours running time
while loops < 175:
    program = ""
    if(lastid == ""):
        # first time through, rerun last program (allows restarts)
        program = json.loads(urllib.urlopen(appinstance + '/latest').read())        
    else:
        # after the first time, pick a program from the cue
        program = json.loads(urllib.urlopen(appinstance + '/cue?lastid=' + lastid).read())
    
    if(program["_id"] != "none"):
        print program["js"]
        lastid = program["_id"]

        programid = program["_id"]

        # do not run programs which write to EEPROM - these can overwrite or even break the Arduino's memory
        if(program["js"].find('EEPROM') > -1):
            continue

        # do not run programs which require libraries other than johnny-five
        if(program["js"].replace("require('johnny-five')","").find("require") > -1):
            continue
        # do not run programs which use request
        if(program["js"].find("request") > -1):
            continue
        # do not run programs which use eval
        if(program["js"].find("eval") > -1):
            continue

        # just to be safe, don't run programs with square brackets yet
        if((program["js"].find('[') > -1) or (program["js"].find(']') > -1)):
            continue

        # create a folder to store the program
        myfilename = 'submitted-crowdbotblock.js'

        saveprogram = open(myfilename,'w')
        saveprogram.write(introcode + "\n" + program["js"])
        saveprogram.close()

		# program stops running after a minute/
        response = os.system('node submitted-crowdbotblock.js')
        # response could feasibly be checked for compilation / upload errors
        print response
        time.sleep(5)
    else:
        # wait 45 seconds and look for a new pending program
        print "no new program"
        time.sleep(45)
    loops = loops + 1
