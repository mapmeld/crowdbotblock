/*jshint laxcomma:true */

/**
 * Module dependencies.
 */
var auth = require('./auth')
    , express = require('express')
    , mongoose = require('mongoose')
    , mongoose_auth = require('mongoose-auth')
    , mongoStore = require('connect-mongo')(express)
    , routes = require('./routes')
    , middleware = require('./middleware')
    , blockcode = require('./blockcode')
    ;

var HOUR_IN_MILLISECONDS = 3600000;
var session_store;

var init = exports.init = function (config) {
  
  var db_uri = process.env.MONGOLAB_URI || process.env.MONGODB_URI || config.default_db_uri;

  mongoose.connect(db_uri);
  session_store = new mongoStore({url: db_uri});

  var app = express.createServer();

  var io = require('socket.io').listen(app);
  //app.listen(80);

  app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', { pretty: true });

    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(express.session({secret: 'top secret', store: session_store,
      cookie: {maxAge: HOUR_IN_MILLISECONDS}}));
    app.use(mongoose_auth.middleware());
    app.use(express.static(__dirname + '/public'));
    //app.use(express.static(__dirname + '/public/blockly'));
    //app.use(express.static(__dirname + '/public/blockly/demos'));
    app.use(app.router);

  });

  app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  });

  app.configure('production', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: false}));
  });

  io.configure(function(){
    io.set("transports", ["xhr-polling"]); 
    io.set("polling duration", 10); 
  });
  
  // Routes
  app.get('/', function(req, res){
    res.render('homepage');
  });
  app.get('/livestream', function(req, res){
    blockcode.blockcode.findOne({ status: 'downloaded' }).sort('-updated').exec(function(err, doc){
      res.render('livestream', { program: { id: doc._id, name: doc.name, js: replaceAll(replaceAll(doc.js, "<", "&lt;"), ">", "&gt;") } });
    });
  });
  /*io.sockets.on('connection', function(socket){
    socket.emit('code', { hello: 'world' });
    socket.on('special', function(data){
      console.log(data);
    });
  });*/

  app.get('/code', function(req, res){
    if(req.query['id']){
      blockcode.blockcode.findById(req.query['id'], function(err, block){
        res.setHeader('Content-Type', 'application/json');
        res.send({ xml: block.xml, name: block.name });
      });
    }
  });
  app.post('/code', function(req, res){
    var code = req.body.js;
    var blocks = req.body.xml;
    var codename = replaceAll(replaceAll(req.body.name, "<", "&lt;"), ">", "&gt;");
    var myblock = new blockcode.blockcode({
      js: code,
      xml: blocks,
      status: 'cue',
      name: codename,
      updated: new Date()
    });
    myblock.save(function(err){
      res.setHeader('Content-Type', 'application/json');
      res.send({ id: (myblock._id || "") });
    });
  });

  app.post('/speak', function(req, res){
    var message = req.body.info;
    if(io && io.sockets){
      io.sockets.emit('newdata', { info: replaceAll(replaceAll(message, "<", "&lt;"), ">", "&gt;") });
    }
    res.send({});
  });
  
  var replaceAll = function(src, oldr, newr){
    while(src.indexOf(oldr) > -1){
      src = src.replace(oldr, newr);
    }
    return src;
  };
  
  /* /latest has been set to show the running program */
  app.get('/latest', function(req, res){
    blockcode.blockcode.findOne({ status: 'downloaded' }).sort('-updated').exec(function(err, doc){
      var Blockly = require("./blocklyserver/blockly_full.js");
      var xml = Blockly.Blockly.Xml.textToDom(doc.xml);
      Blockly.Blockly.mainWorkspace = new Blockly.Blockly.Workspace(true);
      Blockly.Blockly.Xml.domToWorkspace(Blockly.Blockly.mainWorkspace, xml);
      var code = Blockly.Blockly.Generator.workspaceToCode('JavaScript');
      res.send({ _id: doc._id, js: code, name: doc.name });
    });
  });

  /* /cue has been set to show the next program in the cue and make it active */
  app.get('/cue', function(req, res){
    blockcode.blockcode.findOne({ status: 'cue' }).sort('updated').exec(function(err, doc){
      // if code is unchanged, send only the lastid
      if(!doc.xml){
        res.send({ _id: "none" });
        return;
      }

      // generate code from XML
      var Blockly = require("./blocklyserver/blockly_full.js");
      var xml = Blockly.Blockly.Xml.textToDom(doc.xml);
      Blockly.Blockly.mainWorkspace = new Blockly.Blockly.Workspace(true);
      Blockly.Blockly.Xml.domToWorkspace(Blockly.Blockly.mainWorkspace, xml);
      var code = Blockly.Blockly.Generator.workspaceToCode('JavaScript');

      // send new code to streamers
      if(io && io.sockets){
        io.sockets.emit('newprogram', { js: replaceAll(replaceAll(doc.js, "<", "&lt;"), ">", "&gt;"), name: doc.name, id: doc._id });
      }

      // update doc status
      doc.status = 'downloaded';
      doc.updated = new Date();
      doc.save(function(err){ });

      // return code to host
      res.send({ _id: doc._id, js: code });
    });
  });

  app.get('/auth', middleware.require_auth_browser, routes.index);
  app.post('/auth/add_comment',middleware.require_auth_browser, routes.add_comment);
  
  // redirect all non-existent URLs to doesnotexist
  app.get('*', function onNonexistentURL(req,res) {
    res.render('doesnotexist',404);
  });

  mongoose_auth.helpExpress(app);

  return app;
};

// Don't run if require()'d
if (!module.parent) {
  var config = require('./config');
  var app = init(config);
  app.listen(process.env.PORT || 3000);
  console.info("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}