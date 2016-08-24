var __myid = 0;

function get_genid($scope, $http, callback) {
    setTimeout(function () {
        $scope.$apply(function () {
            __myid += 1;
            callback("my_uniq_id_" + __myid);
        });
    }, 100);
}

function get_genuuid($scope, $http, callback) {
    setTimeout(function () {
        $scope.$apply(function () {
            __myid += 1;
            callback("f81d4fae-7dec-11d0-a765-00a0c91e6bf" + __myid);
        });
    }, 100);
}

function get_streams($scope, $http, dirId, callback) {
    setTimeout(function () {
        $scope.$apply(function () {
            var json = '[{"is_public":true,"publish_time":1442946045069,"file_meta":{"name":"Iceman-SAS.jpg","size":325335,"file_uuid":"my_uniq_id"},"num_of_download_ok":0,"num_of_download_fail":0,"author":"john maverik","desc":"very interesting file"}, {"is_public":true,"publish_time":1442946045069,"file_meta":{"name":"Iceman-SAS.jpg","size":325335,"file_uuid":"my_uniq_id"},"num_of_download_ok":10,"num_of_download_fail":3,"author":"john maverik","desc":""}]';
            callback(JSON.parse(json));
        });
    }, 100);
}