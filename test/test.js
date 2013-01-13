
var ELEM_SELECTOR = '#stopwatch';


module("Create & Destroy", {
    setup: function(){
        $elem = $(ELEM_SELECTOR);
    },
    teardown: function(){
        $elem.removeData();
    }
});

test("Basic initialise", function() {
    var elem = $elem.stopwatch('init');
    ok(elem instanceof Object);
    same(elem, $elem.stopwatch('init')); //init call on existing stopwatch
});

test("Default data", function() {
    var data = $elem.stopwatch('init').data('stopwatch');
    equals(data.updateInterval, 1000,
        'Default update interval should be 1000, not ' + data.updateInterval);
    equals(data.startTime, 0,
        'Default start time offset should be 0, not ' + data.startTime);
    equals(data.active, false);
});

test("User provided data", function() {
    var user_data = {startTime: 1000, updateInterval: 2000};
    var data = $elem.stopwatch('init', user_data).data('stopwatch');
    equals(data.startTime, user_data.startTime,
        'Start time offset should equal ' + user_data.startTime + ' not ' + data.startTime);
    equals(data.updateInterval, user_data.updateInterval,
        'Update interval should equal ' + user_data.updateInterval + ' not ' + data.updateInterval);
});

test("Destroy", function() {
    $elem.stopwatch('init').stopwatch('destroy');
    ok( !$elem.data('stopwatch') );
});



module("Start & Stop", {
    setup: function(){
        $elem = $(ELEM_SELECTOR);
        $elem.stopwatch('init');
    },
    teardown: function(){
        $elem.stopwatch('destroy');
    }
});

test("Start", function(){
    $elem.stopwatch('start');
    equals($elem.data('stopwatch').active, true);
});

test("Stop", function(){
    $elem.stopwatch('stop');
    equals($elem.data('stopwatch').active, false);
});

test("Stop and then Start", function(){
    var interval = $elem.data('stopwatch').updateInterval;
    // Start the stopwatch for one tick, stop it for more than two ticks, then
    // restart it for one more tick.  The elapsed time should be two ticks, even
    // though three and a half ticks worth of actual wall clock time went by.
    var firstTick = true;
    var restart = function() {
        // in-between waiting time is over; restart the stopwatch
        $elem.stopwatch('start');
    }
    $elem.stopwatch().bind('tick.stopwatch', function(e, elapsed) {
        if (firstTick) {
            // First tick: stop and wait 2.5 ticks
            equals($elem.stopwatch('getTime'), interval);
            $elem.stopwatch('stop');
            setTimeout(restart, Math.floor(interval*2.5));
        } else {
            // Second tick: stop the stopwatch, elapsed should be 2 ticks
            equals($elem.stopwatch('getTime'), interval * 2);
            $elem.stopwatch('stop');
            start();
        }
        firstTick = false;
    });
    stop();
    $elem.stopwatch('start');
});

test("Toggle", function(){
    $elem.stopwatch('stop');
    $elem.stopwatch('toggle');
    equals($elem.data('stopwatch').active, true);
    $elem.stopwatch('toggle');
    equals($elem.data('stopwatch').active, false);
});



module("Standard Operation", {
    setup: function(){
        $elem = $(ELEM_SELECTOR);
        $elem.stopwatch('init');
    },
    teardown: function(){
        $elem.stopwatch('destroy');
    }
});

test("Render", function(){
    $elem.stopwatch('render');
    equals($elem.text(), '00:00:00');
});

test("Elapsed time", function(){
    var data = $elem.data('stopwatch');
    equals(data.elapsed, 0);
    $elem.stopwatch('start');
    stop();
    setTimeout(function(){
        equals(data.elapsed, 2000);
        start();
    }, 2500);
});

test("Get time", function(){
    var data = $elem.data('stopwatch');
    equals($elem.stopwatch('getTime'), 0);
    equals(data.elapsed, $elem.stopwatch('getTime'));
    $elem.stopwatch('start');
    stop();
    setTimeout(function(){
        equals($elem.stopwatch('getTime'), 2000);
        start();
    }, 2500);
});



module("Jintervals Formatting", {
    setup: function(){
        $elem = $(ELEM_SELECTOR);
    },
    teardown: function(){
        $elem.stopwatch('destroy');
    }
});

test("jsinterval formatting", function() {
    var user_data = {startTime: 1000, format: '{MM}:{SS}'};
    var data = $elem.stopwatch('init', user_data).data('stopwatch');
    equals(data.formatter(data.elapsed, data), '00:01',
        'Formatted output should be 00:01');
});



module("Reset", {
    setup: function(){
        $elem = $(ELEM_SELECTOR);
        $elem.stopwatch('init');
    },
    teardown: function(){
        $elem.removeData();
    }
});

test("from inactive", function(){
    $elem.stopwatch('start');
    stop();
    setTimeout(function(){
        $elem.stopwatch('stop'); //stop first, then reset
        $elem.stopwatch('reset');
        equals($elem.data('stopwatch').elapsed, $elem.data('stopwatch').startTime);
        start();
    }, 2000);
});

test("from active", function(){
    $elem.stopwatch('start');
    stop();
    setTimeout(function(){
        $elem.stopwatch('reset'); //reset whilst active, then stop
        $elem.stopwatch('stop');
        equals($elem.data('stopwatch').elapsed, $elem.data('stopwatch').startTime);
        start();
    }, 2000);
});



module("Non-Standard Operation", {
    setup: function(){
        $elem = $(ELEM_SELECTOR);
    },
    teardown: function(){
        $elem.stopwatch('destroy');
    }
});

test("Custom update interval", function(){
    // wait 2 secs, with update interval of 100 millis, elapsed should be 1900
    $elem.stopwatch('init', {updateInterval: 100});
    var data = $elem.data('stopwatch');
    equals(data.updateInterval, 100);
    $elem.stopwatch('start');
    stop();
    setTimeout(function(){
        equals(data.elapsed, 1900);
        start();
    }, 2000);
});

test("Slow callback should not affect accuracy", function(){
    $elem.stopwatch('init', {updateInterval: 100});
    // We're going to sleep for 50 millisecs, with the stopwatch running
    // on a 10-milisecond interval.  The result should be two ticks:
    // the first after 10 milliseconds, and the next after 60.  The second
    // one should nevertheless report a 60 millisec elapsed time.
    var ticksEncountered = 0;
    var data = $elem.data('stopwatch');
    var tickFunction;
    tickFunction = function(e, elapsed) {
        if (ticksEncountered >= 1) {
            equals(ticksEncountered, 1);
            equals(data.elapsed, 600);
            $elem.stopwatch().unbind('tick.stopwatch', tickFunction);
            start();
        } else {
            // Yes, this is a ridiculous busy-wait.  But the point is to test
            // for callbacks that inherently take longer than our interval to
            // complete.
            var startDt = new Date();
            var currDt = null;
            do { currDt = new Date(); } while (currDt - startDt < 500);
        }
        ++ticksEncountered;
    };
    $elem.stopwatch().bind('tick.stopwatch', tickFunction);
    stop();
    $elem.stopwatch('start');
});
