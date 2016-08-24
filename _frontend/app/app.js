function get_genid($scope, $http, callback) {
    $http.get($scope.host + '/genid').then(function (data) {
        console.log("generated uuid", data.data);
        callback(data.data);
    });
}

function get_genuuid($scope, $http, callback) {
    $http.get($scope.host + '/genuuid').then(function (data) {
        console.log("generated uuid", data.data);
        callback(data.data);
    });
}

function get_streams($scope, $http, dirId, callback) {
    $http.get($scope.host + '/status', {
        params: {
            dir_uuid: dirId
        }
    }).then(function (data) {
        console.log("get_streams", dirId, '=', data.data);
        callback(data.data);
    });
}

function get_stats($scope, $http, callback) {
    $http.get($scope.host + '/stats').then(function (data) {
        console.log("get_stats", data.data);
        callback(data.data);
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

    .service('anchorSmoothScroll', function(){

        this.scrollTo = function(eID) {

            // This scrolling function
            // is from http://www.itnewb.com/tutorial/Creating-the-Smooth-Scroll-Effect-with-JavaScript

            var startY = currentYPosition();
            var stopY = elmYPosition(eID);
            var distance = stopY > startY ? stopY - startY : startY - stopY;
            if (distance < 100) {
                scrollTo(0, stopY); return;
            }
            var speed = Math.round(distance / 20);
            if (speed >= 20) speed = 20;
            var step = Math.round(distance / 25);
            var leapY = stopY > startY ? startY + step : startY - step;
            var timer = 0;
            var i;
            if (stopY > startY) {
                for ( i=startY; i<stopY; i+=step ) {
                    setTimeout("window.scrollTo(0, "+leapY+")", timer * speed);
                    leapY += step; if (leapY > stopY) leapY = stopY; timer++;
                } return;
            }
            for ( i=startY; i>stopY; i-=step ) {
                setTimeout("window.scrollTo(0, "+leapY+")", timer * speed);
                leapY -= step; if (leapY < stopY) leapY = stopY; timer++;
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
                } return y;
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