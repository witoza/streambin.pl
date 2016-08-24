angular
    .module('sbApp', [
        'angularFileUpload',
        'ja.qr',
        'ngStorage',
        'ngRoute',
        'sb.main',
        'sb.dir'])
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