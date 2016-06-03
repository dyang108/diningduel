carmResults = 0;
dewickResults = 0;
voteInProgress = false;
var mq = window.matchMedia('(max-width: 520px)');

window.addEventListener('load', function() {
    // var time = new Date(Date.now());
    // var hour = time.getHours();
    // var curr_meal = 'Breakfast';
    // if (hour > 10) {
    //     if (hour < 16) {
    //         curr_meal = 'Lunch';
    //     } else if (hour < 21) {
    //         curr_meal = 'Dinner';
    //     }
    // }

    $.ajax({
        url: '/getmealdata',
        dataType: 'json',
        data: {
            meal: 'Dinner',
            day: 4,
            month: 5,
            year: 2016
        },
        success: function(result) {
            carmResults = result.compdata.carm.score;
            dewickResults = result.compdata.dewick.score;
            loadBar();
            // sort in order of most significant
            result.compdata.carm.food_arr.sort(sortFoods);
            result.compdata.dewick.food_arr.sort(sortFoods);

            result.compdata.carm.food_arr.forEach(function(item, index) {
                $('#leftfoods').append(function() {
                    return createItem(item, 'left', result.compID);
                });
            });
            // sort in order of most significant
            result.compdata.dewick.food_arr.forEach(function(item, index) {
                $('#rightfoods').append(function() {
                    return createItem(item, 'right', result.compID);
                });
            });
        }
    }).done(function() {
        $.ajax({
            url: '/userdata',
            dataType: 'json',
            success: function(result) {
                $.each(result, function(key, value) {
                    var selector = '[name="' + key + '"]';
                    $(selector).each(function() {
                        if (value === 'u') {
                            $(this).find('.downvote').attr('class', 'btn btn-danger downvote');
                            $(this).find('.upvote').attr('class', 'btn btn-secondary upvote');
                        } else if (value === 'd') {
                            $(this).find('.downvote').attr('class', 'btn btn-secondary downvote');
                            $(this).find('.upvote').attr('class', 'btn btn-success upvote');
                        }
                    });
                });
            }
        });
    });


    if (mq.matches) {
        $('.left').attr({
            class: 'mobile-show left',
            style: ''
        });
        $('.right').attr('style', 'display: none;');
        $('<div>').attr('class', 'carm-highlight hall-highlight').appendTo('.progress');

        $('#carm').click(function() {
            $('.left').attr({
                class: 'mobile-show left',
                style: ''
            });
            $('.right').attr('style', 'display: none;');
            $('.hall-highlight').attr('class', 'carm-highlight hall-highlight');
            $('#carm').popover('show');
            $('#dewick').popover('hide');
        });

        $('#dewick').click(function() {
            $('.left').attr('style', 'display: none;');
            $('.right').attr({
                class: 'mobile-show right',
                style: ''
            });
            $('.hall-highlight').attr('class', 'dewick-highlight hall-highlight');
            $('#carm').popover('hide');
            $('#dewick').popover('show');
        });

        $('#dewick').insertAfter('#carm');
    }
});

function sortFoods(a, b) {
    return (b.up * b.weight) - (a.up * a.weight);
}

function createItem(item, position, compID) {
    var opp = 'right';
    if (position === 'right') {
        opp = 'left';
    }
    return $('<div>').append(function() {
        return $('<div>').attr({
            class: 'desc'
        }).append(function() {
            return $('<span>').html(item.name).attr({
                class: 'food-title ' + position + '-align ' + position + '-block',
            });
        }).append(function() {
            return $('<div>').append(function() {
                return $('<div>').html(item.up).attr({
                    class: 'food-score',
                });
            }).append(function() {
                return $('<button>').attr({
                    class: 'btn btn-success upvote'
                }).click(function() {
                    sendVote('u', item, compID);
                }).append(function() {
                    return $('<span>').attr({
                        class: 'glyphicon glyphicon-menu-up'
                    });
                });
            }).append(function() {
                return $('<button>').attr({
                    class: 'btn btn-danger downvote'
                }).click(function() {
                    sendVote('d', item, compID);
                }).append(function() {
                    return $('<span>').attr({
                        class: 'glyphicon glyphicon-menu-down'
                    });
                });
            }).attr({
                class: 'voting-' + position + ' pull-' + opp,
                name: item.name
            });
        });
    }).attr({
        class: 'food-block',
        style: 'background-image: url(' + item.imgurl + ');'
    });
}

function sendVote(vote, item, compID) {
    if (!voteInProgress) {
        voteInProgress = true;
        var curr_btn = this;
        var displayScore = $(this).parent().find('.food-score');
        $.ajax({
            method: 'POST',
            url: '/vote',
            data: {
                food: item.name,
                compID: compID,
                type: vote
            },
            success: function(result) {
                if ($.isEmptyObject(result)) {
                    return;
                }
                carmResults = result.compdata.carm.score;
                dewickResults = result.compdata.dewick.score;
                loadBar();
                setScore(item.name, result.compdata);
            }
        }).done(function() {
            voteInProgress = false;
        });
    }
}

// changes the displayed score of an item on the page
function setScore(foodname, compdata) {
    var selector = '[name="' + foodname + '"]';
    var item = $.grep(compdata.carm.food_arr, function(e) {
        return e.name == foodname;
    });
    if (item.length === 0) {
        item = $.grep(compdata.dewick.food_arr, function(e) {
            return e.name == foodname;
        });
    }
    item = item[0];
    $(selector).each(function() {
        var oldScore = $(this).find('.food-score').html();
        var newScore = item.up;
        if (newScore > oldScore) {
            $(this).find('.downvote').attr('class', 'btn btn-danger downvote');
            $(this).find('.upvote').attr('class', 'btn btn-secondary upvote');
        } else if (newScore < oldScore) {
            $(this).find('.downvote').attr('class', 'btn btn-secondary downvote');
            $(this).find('.upvote').attr('class', 'btn btn-success upvote');
        }
        $(this).find('.food-score').html(newScore);
    });
}
