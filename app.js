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
    blockcode.blockcode.findOne().sort('updated', -1).exec(function(err, doc){
      res.render('livestream', { js: replaceAll(replaceAll(doc.js, "<", "&lt;"), ">", "&gt;") });
    });
  });
  /*io.sockets.on('connection', function(socket){
    socket.emit('code', { hello: 'world' });
    socket.on('special', function(data){
      console.log(data);
    });
  });*/

  app.post('/code', function(req, res){
    var code = req.body.js;
    var myblock = new blockcode.blockcode({
      js: code,
      updated: new Date()
    });
    myblock.save(function(err){
      res.send("console.log('all good');");
    });
  });
  app.post('/speak', function(req, res){
    var message = req.body.message;
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
  
  app.get('/latest', function(req, res){
    blockcode.blockcode.findOne().sort('updated', -1).exec(function(err, doc){
      if(io && io.sockets && req.query['lastid'] != doc._id){
        io.sockets.emit('newprogram', { js: replaceAll(replaceAll(doc.js, "<", "&lt;"), ">", "&gt;") });
      }
      res.send(doc);
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