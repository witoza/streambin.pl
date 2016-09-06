if (!Array.prototype.find) {
    Array.prototype.find = function(predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    };
}

if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
        'use strict';
        var O = Object(this);
        var len = parseInt(O.length) || 0;
        if (len === 0) {
            return false;
        }
        var n = parseInt(arguments[1]) || 0;
        var k;
        if (n >= 0) {
            k = n;
        } else {
            k = len + n;
            if (k < 0) {k = 0;}
        }
        var currentElement;
        while (k < len) {
            currentElement = O[k];
            if (searchElement === currentElement ||
                (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
                return true;
            }
            k++;
        }
        return false;
    };
}

function gen_uuid() {
    return chance.string({
        length: 8,
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
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
    .factory('MyRest', ["$http", function ($http) {

        const extract_data = function (data) {
            void 0;
            return data.data
        };

        return {
            get_stats: function () {
                return $http.get('stats').then(extract_data);
            },
            get_config: function () {
                return $http.get('config').then(extract_data);
            },
            get_streams: function (dirId) {
                return $http.get('status', {
                    params: {
                        dir_uuid: dirId
                    }
                }).then(extract_data);
            }
        }
    }])
    .filter('bytes', function () {
        return function (bytes, precision) {
            if (bytes === 0) {
                return '0 b'
            }
            if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
            if (typeof precision === 'undefined') precision = 1;

            var units = ['b', 'kB', 'MB', 'GB', 'TB', 'PB'],
                number = Math.floor(Math.log(bytes) / Math.log(1024)),
                val = (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision);

            return (val.match(/\.0*$/) ? val.substr(0, val.indexOf('.')) : val) + ' ' + units[number];
        }
    })
    .directive('toggle', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                if (attrs.toggle == "tooltip") {
                    $(element).tooltip({
                        delay: {"show": 750, "hide": 10},
                        placement: 'bottom',
                        trigger: 'hover'
                    });
                }
                if (attrs.toggle == "popover") {
                    $(element).popover();
                }
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
        }])

    .run(["$rootScope", "$location", "$timeout", function ($rootScope, $location, $timeout) {

        void 0;

        const host = location.origin + location.pathname;
        $rootScope.host = host;
        void 0;

        $rootScope.drag_and_drop = ('draggable' in document.createElement('span'));
        $rootScope.chrome = window.chrome;
    }]);