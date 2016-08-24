function get_genid($http, cb) {
    $http.get('/streambin/genid').then(function (data) {
        console.log("generated uuid", data.data);
        cb(data.data);
    });
}

function get_genuuid($http, cb) {
    $http.get('/streambin/genuuid').then(function (data) {
        console.log("generated uuid", data.data);
        cb(data.data);
    });
}

function get_streams($http, dirId, cb) {
    $http.get('/streambin/status', {
        params: {
            dir_uuid: dirId
        }
    }).then(function (data) {
        console.log("get_streams", dirId, '=', data.data);
        cb(data.data);
    });
}

function get_stats($http, cb) {
    $http.get('/streambin/stats').then(function (data) {
        console.log("get_stats", data.data);
        cb(data.data);
    });
}

angular
    .module('sbApp', [
        'angularFileUpload',
        'ja.qr',
        'ngStorage',
        'ngRoute',
        'sb.main',
        'sb.dir'])

    .filter('bytes', function () {
        return function (bytes, precision) {
            if (bytes === 0) {
                return '0 bytes'
            }
            if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
            if (typeof precision === 'undefined') precision = 1;

            var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
                number = Math.floor(Math.log(bytes) / Math.log(1024)),
                val = (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision);

            return (val.match(/\.0*$/) ? val.substr(0, val.indexOf('.')) : val) + ' ' + units[number];
        }
    })

    .service('anchorSmoothScroll', function () {

        this.scrollTo = function (eID) {

            // This scrolling function
            // is from http://www.itnewb.com/tutorial/Creating-the-Smooth-Scroll-Effect-with-JavaScript

            var startY = currentYPosition();
            var stopY = elmYPosition(eID);
            var distance = stopY > startY ? stopY - startY : startY - stopY;
            if (distance < 100) {
                scrollTo(0, stopY);
                return;
            }
            var speed = Math.round(distance / 20);
            if (speed >= 20) speed = 20;
            var step = Math.round(distance / 25);
            var leapY = stopY > startY ? startY + step : startY - step;
            var timer = 0;
            var i;
            if (stopY > startY) {
                for (i = startY; i < stopY; i += step) {
                    setTimeout("window.scrollTo(0, " + leapY + ")", timer * speed);
                    leapY += step;
                    if (leapY > stopY) leapY = stopY;
                    timer++;
                }
                return;
            }
            for (i = startY; i > stopY; i -= step) {
                setTimeout("window.scrollTo(0, " + leapY + ")", timer * speed);
                leapY -= step;
                if (leapY < stopY) leapY = stopY;
                timer++;
            }

            function currentYPosition() {
                // Firefox, Chrome, Opera, Safari
                if (self.pageYOffset) return self.pageYOffset;
                // Internet Explorer 6 - standards mode
                if (document.documentElement && document.documentElement.scrollTop)
                    return document.documentElement.scrollTop;
                // Internet Explorer 6, 7 and 8
                if (document.body.scrollTop) return document.body.scrollTop;
                return 0;
            }

            function elmYPosition(eID) {
                var elm = document.getElementById(eID);
                var y = elm.offsetTop;
                var node = elm;
                while (node.offsetParent && node.offsetParent != document.body) {
                    node = node.offsetParent;
                    y += node.offsetTop;
                }
                return y;
            }

        };

    })

    .config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider.when('/', {
                templateUrl: 'main/main.html',
                controller: 'mainCtrl'
            }).when('/dir/:directoryId', {
                templateUrl: 'dir/dir.html',
                controller: 'dirCtrl'
            }).otherwise({
                redirectTo: '/'
            });
        }]);