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
    var request = require('request');
    var speakurl = "http://crowdbotblock.herokuapp.com/speak";
    request.post({url: speakurl, body: { message: (info+"") }}, function(e, r, body){ });
  }
};\n'''

# while loops < 125: # 125 loops x 1 minute > 2 hours running time
while loops < 125:
	program = json.loads(urllib.urlopen(appinstance + '/latest?lastid=' + lastid).read())
	
	if(program["_id"] != lastid):
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
		# just to be safe, don't run programs with square brackets yet
		if((program["js"].find('[') > -1) or (program["js"].find(']') > -1)):
			continue

		# create a folder to store the program
		myfilename = 'submitted-crowdbotblock.js'

		saveprogram = open(myfilename,'w')
		saveprogram.write(introcode)
		saveprogram.write(program["js"])
		saveprogram.close()

		response = os.system('node submitted-crowdbotblock.js')
		# response could feasibly be checked for compilation / upload errors
		print response

		# let program run for two minutes
		time.sleep(120)
	else:
		# wait 60 seconds and look for a new pending program
		print "no new program"
		time.sleep(60)
	loops = loops + 1
