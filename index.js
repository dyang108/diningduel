var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var async = require('async');
var cookieParser = require('cookie-parser');
var shortid = require('shortid');
var app = express();

var mongoUri = process.env.MONGODB_URI || process.env.MONGOLAB_URI || 'mongodb://localhost:27017/dining';
var MongoClient = require('mongodb').MongoClient;
var db = MongoClient.connect(mongoUri, function (error, databaseConnection) {
    if (error) {
        console.log('Database not initialized');
    }
    db = databaseConnection;
    app.set('port', (process.env.PORT || 5000));
    app.listen(app.get('port'), function () {
        console.log('Node app is running on port', app.get('port'));
    });
});

var weights = {
    'CARVED MEATS & POULTRY': 30,
    'Hearty Soups': 25,
    'VEGETARIAN': 20,
    'VEGETABLES': 20,
    'BREADS & ROLLS': 10,
    'DINNER ENTREES': 50,
    'PASTA & SAUCES': 30,
    'SAUCES, GRAVIES & TOPPINGS': 20,
    'SAUCES,GRAVIES & TOPPINGS': 20,
    'PIZZA': 30,
    'GRILL SELECTIONS': 30,
    'POTATO & RICE ACCOMPANIMENTS': 35,
    'BAKED FRESH DESSERTS': 15,
    'CREATE YOUR OWN STIRFRY': 5,
    'CHEESE & BREAD BAR': 10,
    'VEGETARIAN OPTIONS': 20,
    'FRUIT & YOGURT': 15,
    'LUNCH ENTREE': 40,
    'MEXICAN BAR': 20,
    'AFTERNOON WOK': 25,
    'DELI & PANINI': 10,
    'MORNING BELGIUM WAFFLE BAR': 1,
    'BELGIAN WAFFLES': 1,
    'HOT BREAKFAST CEREAL': 5,
    'BRK BREADS,PASTRY & TOPPINGS': 15,
    'BREAKFAST MEAT': 25,
    'BREAKFAST MEATS': 25,
    'BREAKFAST ENTREES': 30,
    'BREAKFAST ENTREE': 30,
    'NOODLERY & STIR FRY': 25,
    'HALAL ENTREES': 40,
    'CHAR-GRILL STATIONS': 30,
    'HOT BREAKFAST CEREAL BAR': 5,
    'FRESH BAKED DESSERTS': 15,
    'BREAKFAST POTATO': 30,
    'LATE NIGHT': 0,
    'SUNDAE BAR': 15,
    'APPETIZER': 30,
    'BRUNCH CHAR-GRILL SELECTIONS': 20,
    'BRUNCH GRILL SELECTIONS': 20,
    'ASSORTED FRESH FRUIT': 15,
    'SPECIALITY SALADS': 25,
    'SPECIALTY SALADS': 25,
    'CREATE-YOUR-OWN': 18,
    'PARFAIT BAR': 5,
    'BREAKFAST FRUIT & YOGURT': 10,
    'CREATE YOUR OWN MEDITERRANEAN': 20,
    'BRK BREADS,PASTRIES & TOPPINGS': 15
};

var tddAPI = 'https://tuftsdiningdata.herokuapp.com/menus/';

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/getmealdata', function (req, res) {
    var day = req.query.day.replace(/[<>]/g, '');
    var month = req.query.month.replace(/[<>]/g, '');
    var year = req.query.year.replace(/[<>]/g, '');
    var meal = req.query.meal.replace(/[<>]/g, '');
    if (!day || !month || !year || !meal) {
        res.sendStatus(404);
        return;
    }
    var compKey = meal + '-' + day + '-' + month + '-' + year;
    var query = {};
    query.compID = compKey;
    db.collection('comparisons').findOne(query, function (err, result) {
        if (err) {
            res.sendStatus(500);
            return;
        }
        if (!result) {
            var carmMenu, dewMenu;
            var apiarg = '/' + day + '/' + month + '/' + year;
            // keep track of whether or not the comparison
            // object actually has any data
            var valid = false;

            request(tddAPI + 'carm' + apiarg, function (error, response, body) {
                if (error) {
                    res.sendStatus(500);
                    return;
                }

                carmMenu = JSON.parse(body);
                // check if data has populated
                if (Object.keys(carmMenu.data.Dinner).length !== 0 || Object.keys(carmMenu.data.Lunch).length !== 0 || Object.keys(carmMenu.data.Breakfast).length !== 0) {
                    valid = true;
                }

                request(tddAPI + 'dewick' + apiarg, function (error, response, body) {
                    if (error) {
                        res.sendStatus(500);
                        return;
                    }

                    dewMenu = JSON.parse(body);
                    if (!valid && (Object.keys(carmMenu.data.Dinner).length !== 0 || Object.keys(carmMenu.data.Lunch).length !== 0 || Object.keys(carmMenu.data.Breakfast).length !== 0)) {
                        valid = true;
                    }

                    // check if it is a bad query
                    if (valid) {
                        initComp(carmMenu.data[meal], dewMenu.data[meal], function (comparison) {
                            var toAdd = {};
                            toAdd.compID = compKey;
                            toAdd.compdata = comparison;
                            // the most important line in this entire file
                            res.json(toAdd);
                            res.end();
                            db.collection('comparisons').insert(toAdd, function () {});
                        });
                    } else {
                        res.sendStatus(400);
                    }

                    // since we already retrieved the menu data, we add the other meals too
                    if (valid) {
                        for (var othermeal in carmMenu.data) {
                            if (othermeal !== meal) {
                                initComp(carmMenu.data[othermeal], dewMenu.data[othermeal], addComp(othermeal, req.query));
                            }
                        }
                    }
                });
            });
        } else {
            // update the scores in both comp objects
            updateDewScore(compKey);
            updateCarmScore(compKey);
            res.json(result);
            res.end();
        }
    });
});

// get the user's vote history based on the cookie
app.get('/userdata', function (req, res) {
    var cookie = req.cookies;
    if (!('userID' in cookie)) {
        res.send({});
        return;
    }
    var userID = cookie.userID;
    db.collection('users').findOne({ '_id': userID }, function (err, result) {
        if (err) {
            res.sendStatus(500);
            return;
        }

        if (result === null) {
            res.sendStatus(400);
            return;
        }

        res.send(result.food);
    });
});

app.post('/vote', function (req, res) {
    var voteType = req.body.type;
    var otherVote;
    if (voteType === 'u') {
        otherVote = 'd';
    } else if (voteType === 'd') { // invalid vote voteType
        otherVote = 'u';
    } else {
        res.sendStatus(400);
        return;
    }
    var foodName = req.body.food.replace(/[<>]/g, '');
    var compID = req.body.compID.replace(/[<>]/g, '');
    var cookie = req.cookies;
    var new_user = false;
    var userID, query;

    // check the request for the userID cookie
    if (!('userID' in cookie)) {
        userID = shortid.generate();
        res.cookie('userID', userID);
        query = {};
        query[foodName] = voteType;
        db.collection('users').insert({
            '_id': userID,
            'food': query
        });
        new_user = true;
    } else {
        userID = cookie.userID;
    }

    db.collection('users').findOne({ '_id': userID }, function (err, result) {
        var upNum = 1;
        if (err) {
            res.sendStatus(500);
            return;
        }

        if (result === null) {
            res.sendStatus(400);
            return;
        } else {
            // check if user has already upvoted
            if (result.food[foodName] === voteType && new_user === false) {
                upNum = 0;
                res.send({});
                return;
            }

            // check if user has already downvoted
            if (result.food[foodName] === otherVote) {
                upNum = 2;
            }

            // negate upNum if it was a downvote
            if (voteType === 'd') {
                upNum = -upNum;
            }
            // update the comparisons database
            db.collection('comparisons').update({
                'compdata.carm.food_arr': {
                    $elemMatch: {
                        name: foodName
                    }
                }
            }, {
                $inc: {
                    'compdata.carm.food_arr.$.up': upNum
                }
            }, {
                multi: true
            }, function (err1, count1, result1) {
                if (err1) {
                    res.sendStatus(500);
                    return;
                }

                if (count1 !== 0) {
                    updateCarmScore(compID);
                }

                db.collection('comparisons').update({
                    'compdata.dewick.food_arr': {
                        $elemMatch: {
                            name: foodName
                        }
                    }
                }, {
                    $inc: {
                        'compdata.dewick.food_arr.$.up': upNum
                    }
                }, {
                    multi: true
                }, function (err2, count2, result2) {
                    if (err2) {
                        res.sendStatus(500);
                        return;
                    }

                    if (count2 !== 0) {
                        updateDewScore(compID);
                    }

                    db.collection('comparisons').findOne({ compID: compID }, function (err, result) {
                        if (err) {
                            res.sendStatus(500);
                            return;
                        }

                        if (!result) {
                            res.sendStatus(500);
                        } else {
                            res.send(result);
                        }
                    });
                });
            });

            // update the users collection
            query = {};
            query['food.' + foodName] = voteType;
            db.collection('users').update({ '_id': userID }, {
                $set: query
            });

            // update foods collection
            db.collection('foods').update({
                name: foodName
            }, {
                $inc: {
                    up: upNum
                }
            });
        }
    });
});

app.post('/addfoodimgurl', function (req, res) {
    var url = req.body.url;
    var foodName = req.body.food.replace(/[<>]/g, '');

    // go to comparisons, update image
    db.collection('comparisons').update({
        'compdata.carm.food_arr': {
            $elemMatch: {
                name: foodName
            }
        }
    }, {
        $set: {
            'compdata.carm.food_arr.$.imgurl': url
        }
    }, {
        multi: true
    }, function (err1, count1, result1) {
        if (err1) {
            res.sendStatus(500);
            return;
        }

        db.collection('comparisons').update({
            'compdata.dewick.food_arr': {
                $elemMatch: {
                    name: foodName
                }
            }
        }, {
            $set: {
                'compdata.dewick.food_arr.$.imgurl': url
            }
        }, {
            multi: true
        }, function (err2, count2, result2) {
            if (err2) {
                res.sendStatus(500);
            } else {
                res.sendStatus(200);
            }
        });
    });

    // go to foods collection, and update that.
    db.collection('foods').update({
        name: foodName
    }, {
        $set: {
            imgurl: url
        }
    });
});

function updateDewScore(compID) {
    var score = 0;
    var denom = 0;
    db.collection('comparisons').find({ compID: compID }).forEach(function (data) {
        async.each(data.compdata.dewick.food_arr, function (food, callback2) {
            score += food.up;
            denom += food.weight;
            callback2();
        }, function (err) {
            if (err) {
                return;
            }
            db.collection('comparisons').update({
                compID: compID
            }, {
                $set: {
                    'compdata.dewick.score': score / denom
                }
            });
        });
    });
}

function updateCarmScore(compID) {
    var score = 0;
    var denom = 0;
    db.collection('comparisons').find({ compID: compID }).forEach(function (data) {
        async.each(data.compdata.carm.food_arr, function (food, callback2) {
            score += food.up;
            denom += food.weight;
            callback2();
        }, function (err) {
            if (err) {
                return;
            }
            db.collection('comparisons').update({
                compID: compID
            }, {
                $set: {
                    'compdata.carm.score': score / denom
                }
            });
        });
    });
}

function addComp(othermeal, query) {
    return function (comparison) {
        var toAdd = {};
        toAdd.compID = othermeal + '-' + query.day + '-' + query.month + '-' + query.year;
        toAdd.compdata = comparison;
        db.collection('comparisons').insert(toAdd, function () {});
    };
}

function initComp(carmMenu, dewMenu, callback) {
    var comp = {};
    getFoodsAndScore(carmMenu, function (foodArr, score) {
        comp.carm = { 'food_arr': foodArr, 'score': score };
        getFoodsAndScore(dewMenu, function (foodArr, score) {
            comp.dewick = { 'food_arr': foodArr, 'score': score };
            callback(comp);
        });
    });
}

function getFoodsAndScore(menu, callback) {
    var foodArr = [];
    var score = 0;
    var denom = 0;
    async.forEachOf(menu, function (typearr, type, callback1) {
        type = type.trim();
        async.each(typearr, function (foodname, callback2) {
            checkForFood(type, foodname, function (food) {
                score += food.up;
                denom += food.weight;
                foodArr.push(food);
                callback2();
            });
        }, function (err) {
            if (err) {
                return;
            }

            callback1();
        });
    }, function (err) {
        if (err) {
            return;
        }
        callback(foodArr, score / denom);
    });
}

function checkForFood(foodType, foodname, callback) {
    var query = {};
    foodname = foodname.replace(/[\.'$]/g, '');
    query.name = foodname;
    db.collection('foods').findOne(query, function (err, result) {
        if (err) {
            return;
        }

        if (!result) {
            var wt = weights[foodType];
            if (wt == null) {
                wt = 'ADD WEIGHT';
            }
            var toAdd = {
                name: foodname,
                imgurl: 'https://placehold.it/400/eeba93?text=No+Image+Found',
                type: foodType,
                weight: wt,
                up: 0
            };
            callback(toAdd);
            db.collection('foods').insert(toAdd, function () {});
        } else {
            callback(result);
        }
    });
}
