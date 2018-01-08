// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
//===========================self defined API===================================
var localModule = (function(){
    return {
        pad: function(num){
          num = num.toString();
          while(num.length < 4){
            num = "0".concat(num);
          }
          console.log(num);
          return num;
        }
    }
})();

var dbRelatedFunc = (function(){
    return {
        set: function(oriUrl, key){
          var dbEntry = {};
          
          dbEntry["original_url"] = oriUrl;
          dbEntry["short_url"] = 'https://url-sorten.glitch.me/'+key;
          dbEntry["url_key"] = key;

          return dbEntry;
          
        },
        get: function(dbEty){
          var dbEntry = {};
          dbEntry["original_url"] = dbEty["original_url"];
          dbEntry["short_url"] = dbEty["short_url"];
          
          return dbEntry;
        }
    }
})();
//=============================MongoDB initialization===========================/
//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Connection URL. This is where your mongodb server is running.

//(Focus on This Variable)
var url = 'mongodb://'+process.env.DB_USER_NAME+':'+process.env.DB_USER_PASSWORD+'@'+process.env.HOST+':'+process.env.DB_PORT+'/'+process.env.DB;      
//(Focus on This Variable)


function dbConnect(url){
    return new Promise(function(resolve, reject){
        MongoClient.connect(url, function(err, db){
            if(!err){
                console.log('Connection established to', url);
                resolve(db);
            }else{
                reject(err);
            }
        });
    });
}


function dbFindOne(db, collectName, queryData){
    return new Promise(function(resolve, reject){
        var regExp = /^https?:\/{2}/;
        if(regExp.test(queryData)){
            console.log("valid url format");
            db.collection(collectName).findOne({"original_url":queryData}, function(err, result){
                if(err) {
                    console.log("find operation err");
                    reject(err);
                }
                else{
                    resolve({dbSearchResult: result, dbName: db, collection: collectName, query: queryData});
                }
            });
        }else{
            console.log('invalid url');
            reject(new Error('invalid url format'));
        }

    });
}
function dbResultService(inputResult){
    return new Promise(function(resolve, reject){
        if(!inputResult['dbSearchResult']){
            inputResult['dbName'].collection(inputResult['collection']).find({}).toArray(function(err, result) {
                var curItemKey;
                var data;
                if (err){
                    reject(err);
                }

                curItemKey = result.sort(function(a, b){
                    return +b['url_key'] - (+a['url_key']);
                })[0];

                if(!curItemKey){
                    curItemKey = 1;
                }else{
                    curItemKey= +curItemKey["url_key"] +1;
                }

                data = dbRelatedFunc.set(inputResult['query'], localModule.pad(curItemKey));

                resolve({insertData: data, dbName: inputResult['dbName'], collection: inputResult['collection']});
            });
        }else{
            reject(new Error(JSON.stringify(dbRelatedFunc.get(inputResult['dbSearchResult']))));
        }

    });
}

function dbInsertData(inputResult){
    return new Promise(function(resolve, reject){
        inputResult['dbName'].collection(inputResult['collection']).insertOne( inputResult['insertData'], function(err, res) {
            if(err) {
                console.log("err2");
                reject(err);
            }else{
                var retRes = JSON.stringify(dbRelatedFunc.get(res.ops[0]));

                resolve(retRes);

            }
        });
    });

}

dbConnect(url).then(function(db){
    db.createCollection("urlBase", function(err, res){
        if(err){
            throw err;
        }
        console.log("create collect");

        //db.close();
    });
});

//=================================================================================

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.route("/:shortUrl").get(function (request, response) {
  //response.send("https://"+request.headers['x-forwarded-host']+'/'+request.params.shortUrl);
  MongoClient.connect(url, function (err, db) {
    db.collection('urlBase').findOne({"url_key":request.params.shortUrl}, function(err, result){
      if(result){
        response.redirect(result['original_url']);
      }else{
        response.send("It's not a valid URL.");
      }
    });
  });
  
});


app.route("/new/*").get(function (request, response) {
    dbConnect(url).then(function(db){
        return dbFindOne(db, 'urlBase', request.params[0]);
    }).then(function(result){
        return dbResultService(result);
    }).then(function(data){
        return dbInsertData(data);
    }).then(function(res){
        response.send(res);
    }).catch(function(err){
        console.log(err);
        response.send(err.message);
    });
    
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
