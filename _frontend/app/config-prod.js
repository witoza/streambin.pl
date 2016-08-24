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