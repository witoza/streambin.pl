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
    .factory('MyRest', function ($http) {

        const extract_data = function (data) {
            console.log("data from backend", data.data);
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
    })
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

    .run(function ($rootScope, $location, $timeout) {

        console.log("Welcome to The Machine");

        const host = location.origin + location.pathname;
        $rootScope.host = host;
        console.log("host", host);

        $rootScope.drag_and_drop = ('draggable' in document.createElement('span'));
        $rootScope.chrome = window.chrome;
    });