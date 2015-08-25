"use strict";

let express = require('express'),
    express_session = require('express-session'),
    path = require('path'),
    logger = require('morgan'),
    request = require('request'),
    mongoose = require('mongoose'),
    _ = require('lodash'),
    async = require('async'),
    config = require('./config'),
    Q = require('q'),
    Qx = require('qx'),
    AwesomeSlack = require('awesome_slack'),
    redis = require('redis');;

var serverPath = function(route){
  return path.join(__dirname, 'server', route);
}

var app = express();

app.serverPath = serverPath;

app.config = config();

app.modules = {};
mongoose.set('debug', false);
app.modules.mongoose = mongoose;
app.modules._ = _;
app.modules.async = async;
app.modules.Q = Q;
app.modules.Qx = Qx;
app.modules.request = request;
app.modules.AwesomeSlack = AwesomeSlack;
app.modules.BaseParser = require(serverPath('baseParser'))(app);

app.use(express_session({ secret: app.config.secret, resave: true, saveUninitialized: true }));

app.models = require( serverPath( path.join('models', 'index') ) )(app);

app.redisClient = require( serverPath( 'redisClient' ))(app);
app.AwesomeSlack = AwesomeSlack;
// app.slackStreamer = require(serverPath('slackStreamer'))(app);
app.slackUsers = require(serverPath('slackUsers'))(app);

app.bots = _.map(app.config.bots, function(botName){return require( serverPath(`bots/${botName}`) )(app)})


let streamToBots = function(messageInfo){
  console.log('streamToBots');
  Qx.map(app.bots, function(bot){bot.tick(messageInfo)});
}

app.slackClient = new app.AwesomeSlack(app.config.slack_api.token);

app.slackClient.on('connectionOpen', function(){
  app.slackUsers.saveUsers();
});
app.slackClient.on('messageReceived', streamToBots);

app.redisClient.exists("tryRedis", redis.print);

app.slackClient.startSocketConnection();
module.exports = app;
