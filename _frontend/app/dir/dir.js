angular
    .module('sb.dir', [
        'ngStorage',
        'ngRoute'])
    .controller('dirCtrl',

        function ($scope, $routeParams, MyRest) {

            $scope.curr_stream = $routeParams.directoryId;
            $scope.curr_streams_data = [];

            $scope.get_stream_data = function (sname) {
                console.log("get_stream_data", sname);
                $scope.curr_stream = sname;

                MyRest.get_streams(sname).then(function (data) {
                    $scope.curr_streams_data = data;
                });
            };
            $scope.refreshStreamDir = function () {
                console.log("refreshStreamDir")
                $scope.get_stream_data($scope.curr_stream);
            };

            $scope.refreshStreamDir();

        }
    );