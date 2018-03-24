// server.js
// where your node app starts

// init project
var express = require('express');
var shortid = require('shortid');
var app = express();



// Connection URL. This is where your mongodb server is running.
var redisClient = require("redis").createClient('13321', 'redis-13321.c1.us-west-2-2.ec2.cloud.redislabs.com');
redisClient.auth('lwin1POoSHWv4vfp5QyPnaSw4nYObI9e');



app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.route("/:shortUrl").get(function (request, response) {
  redisClient.get( request.params.shortUrl, function( err, reply ){
    if(err){
      console.log('invalid url');
      return response.send('err');
    }
    response.redirect(reply);
    //console.log( reply.toString() ); // 新增會回傳 value
  });
  
});


app.route("/new/*").get(function (request, response) {
    
    var regExp = /^https?:\/{2}/;
        if(regExp.test(request.params[0])){
            console.log("valid url format");
            var newShortUrl = shortid.generate();
          
            redisClient.set( newShortUrl, request.params[0], function( err, reply ){
              var ret = { "original_url": request.params[0], "short_url":"https://url-shorten-service.glitch.me/"+ newShortUrl}
              response.send( JSON.stringify(ret) ); // 新增成功會回傳 ok
            });
            
        }else{
            response.send('invalid url');
            
        }
    
    
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
