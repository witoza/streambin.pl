angular
.module('sbApp', [
	'angularFileUpload', 
	'ja.qr', 
	'ngStorage',
	'ngRoute',
	'sb.main',
	'sb.dir'])
.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
		when('/', {
			templateUrl: 'src/app/main/main.html',
			controller: 'mainCtrl'
		}).
		when('/dir/:directoryId', {
			templateUrl: 'src/app/dir/dir.html',
			controller: 'dirCtrl'
		}).
		otherwise({
			redirectTo: '/'
		});
  }]);