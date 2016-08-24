angular
.module('sb.dir', [
	'ngStorage',
	'ngRoute'])
.controller('dirCtrl', ['$window', '$scope', '$localStorage', '$http', '$routeParams', '$location',  
	
	function($window, $scope, $localStorage, $http, $routeParams, $location, FileUploader) {
		
		$scope.$storage = $localStorage;
		
		if (typeof String.prototype.startsWith != 'function') {
			String.prototype.startsWith = function (str){
				return this.indexOf(str) === 0;
			};
		}

		$scope.curr_stream = $routeParams.directoryId;
		$scope.curr_streams_data = [];
		
		$scope.get_stream_data = function(sname) {
			console.log("get_stream_data", sname);
			$scope.curr_stream = sname;
			get_streams($scope, $http, sname, function (data) {	
				$scope.curr_streams_data = data;
			});
		};
		$scope.refreshStreamDir = function() {
			console.log("refreshStreamDir")
			$scope.get_stream_data($scope.curr_stream);
		};
		
		$scope.refreshStreamDir();
		
		
	}]
);