# About CrowdBotBlock

## First, write your code:

Suppose you put some blocks together like this:

<img src="http://i.imgur.com/wDxAi.png"/>

The blocks are then available in Wiring (the standard language for Arduino, based on C) and in JavaScript (which runs on a node.js server with the johnny-five module).

There is also an option to write Wiring programs in text:

<img src="http://i.imgur.com/CXLu5.png"/>

## Click 'Send' and Watch Live

In development: a mobile <strong>CrowdBot</strong> which you can watch and reprogram over the web. Socket.io makes it possible to see the code and data stream in real time.

<img src="http://i.imgur.com/AvnDI.jpg"/>

<img src="http://i.imgur.com/5rUXc.jpg"/>

## Roadmap
CrowdBotBlock is based on [CrowdBot](https://github.com/mapmeld/CrowdBot), which let you program an Arduino in C. The roadmap to making similar and then brand new features:

Future plans:
<ul>
<li>Share a livestream link which adds your program to the cure</li>
<li>Tweet or e-mail users when their code runs</li>
<li>Archive each user's code and results</li>
</ul>

# About Blockly

Blockly is an open-source, drag-and-drop programming environment from Google. It was chosen for this project because it runs in the web browser and compiles to JavaScript.

In addition to the changes made for CrowdBotBlock, you can [write your own blocks for Blockly](http://code.google.com/p/blockly/wiki/DefiningBlocks).

See more on the Google Code page for [Blockly](http://code.google.com/p/blockly/).

Blockly is also running server-side to convert users' block XML to JavaScript. This ensures that every line of code run on the host computer comes from a block. We're still in alpha mode though, so, no security guarantees!

# About Johnny-Five

Programs written in CrowdBotBlock are run using the Johnny-Five node module, written by Rick Waldron.

See more on the GitHub repo for [johnny-five](https://github.com/rwldrn/johnny-five).

# About Poang

Poang ([github](https://github.com/BeyondFog/Poang)) is a Node.js/MongoDB app built using the [Express](http://expressjs.com/) framework. Poang uses [Everyauth](http://everyauth.com/) for local authentication, [Mongoose-Auth](https://github.com/bnoguchi/mongoose-auth) to connect Everyauth to MongoDB (and [Mongoose](http://mongoosejs.com/) as the ODM) for account persistence, and [Connect-Mongo](https://github.com/kcbanner/connect-mongo) as a session store. Most of the code in app.js was generated by Express and all of the code in auth.js after the Comment schema is straight from the Mongoose-Auth docs.

For testing, Poang uses the [Mocha](http://visionmedia.github.com/mocha/) test framework, [should](https://github.com/visionmedia/should.js) for assertions, [Sinon.JS](http://sinonjs.org/) for mocks & stubs, and [Zombie.js](http://zombie.labnotes.org/) for lightweight integration testing.

For more details, please see this [blog post](http://blog.beyondfog.com/?p=222) that walks through the various tests in Poang.

## Local Installation
 
1) Do a git clone:

    git clone git://github.com/mapmeld/crowdbotblock.git
    
2) cd into the project directory and then install the necessary node modules:

    npm install -d

3) start up MongoDB if it's not already running:
  
    mongod --noprealloc --nojournal
    
4) start the node process:

    node app.js

## Deploy to Heroku

    heroku create APP_NAME -s cedar
    git push heroku master

After you have created a new app on Heroku and pushed the code via git, you will need to use the Heroku Toolbelt from your command line to add the free MongoLab starter addon:

    heroku addons:add mongolab:starter
    
## Running CrowdBotHost.py

    npm install johnny-five
    npm install request
    python CrowdBotHost.py