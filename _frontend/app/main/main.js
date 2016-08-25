angular
    .module('sb.main', [
        'angularFileUpload',
        'ja.qr',
        'ngStorage',
        'ngRoute'])
    .controller('mainCtrl',

        function ($window, $scope, $localStorage, $http, anchorSmoothScroll, FileUploader) {

            $scope.close_page = function () {
                console.log("close_page");
                $window.location = 'about:blank';
            };

            $scope.theFiles = [];

            if ($localStorage.you_streams == null) {
                $localStorage.you_streams = ['public'];
            }

            $scope.you_streams = $localStorage.you_streams;
            $scope.curr_streams_data = [];
            $scope.curr_stream = "";

            $scope.dir_to_add = "";
            $scope.add_dir = function () {
                var d = $scope.dir_to_add;
                console.log("add_dir", d);
                if (d === "") {
                    return;
                }
                if ($scope.you_streams.includes(d)) {
                    console.log("already exists");
                    return;
                }
                $scope.you_streams.push(d);
                $scope.dir_to_add = "";
            };

            $scope.get_stream_data = function (sname) {

                console.log("get_stream_data", sname);
                $scope.curr_stream = sname;
                get_streams($http, sname, function (data) {
                    $scope.curr_streams_data = data;
                });
            };

            $scope.refreshStreamDir = function () {

                console.log("refreshStreamDir");
                $scope.get_stream_data($scope.curr_stream);
            };

            $scope.removeStreamDir = function () {
                var d = $scope.curr_stream;
                console.log("removeStreamDir", d);
                var i = $scope.you_streams.indexOf(d);
                if (i > -1) {
                    $scope.you_streams.splice(i, 1);
                }
                $scope.curr_stream = "";
            };
            $scope.showExplore = function () {

                console.log("tab change");
                $scope.state = 2;

                $scope.curr_streams_data = [];
                $scope.curr_stream = "";
            };
            $scope.showMe = function () {

                console.log("tab change");
                $scope.state = 3;

                $scope.bind_dir_uuid = $localStorage.dir_uuid;
                $scope.bind_author = $localStorage.author;
            };
            $scope.showStats = function () {

                console.log("tab change");
                $scope.state = 5;

                get_stats($http, function (data) {
                    $scope.stats = data;
                });
            };

            $scope.generate_random_dir_uuid = function () {
                get_genuuid($http, function (data) {
                    $scope.bind_dir_uuid = data;
                });
            };

            $scope.saveMySettings = function () {
                console.log("saveMySettings");
                $localStorage.dir_uuid = $scope.bind_dir_uuid;
                $localStorage.author = $scope.bind_author;

                $scope.dir_to_add = $localStorage.dir_uuid;
                $scope.add_dir();
            };

            $scope.state = 1;

            const binaryJsClient_ulr = $scope.host.replace(/^http/, 'ws') + 'binary-uploader-stream';

            const uploader = $scope.uploader = new FileUploader({
                binaryJsClient_ulr: binaryJsClient_ulr
            });

            uploader.onWhenAddingFileFailed = function (item /*{File|FileLikeObject}*/, filter, options) {
                console.info('onWhenAddingFileFailed', item, filter, options);
            };
            uploader.onAfterAddingFile = function (fileItem) {
                console.info('onAfterAddingFile', fileItem);

                get_genid($http, function f(data) {

                    fileItem.metadata = {
                        file_uuid: data,
                        dir_uuid: $localStorage.dir_uuid,
                        author: $localStorage.author,
                        name: fileItem._file.name,
                        size: fileItem._file.size
                    };
                    fileItem.options = $scope.options;
                    fileItem.download_url = $scope.host + "d/" + fileItem.metadata.file_uuid;
                    fileItem.isStreaming = false;
                    fileItem.instances = [];
                    fileItem.original_dir_uuid = $localStorage.dir_uuid;

                    fileItem.upload();

                    $scope.theFiles.push(fileItem);

                    setTimeout(function () {
                        anchorSmoothScroll.scrollTo("step2");
                    }, 50);

                });

            };
            uploader.onAfterAddingAll = function (addedFileItems) {
                console.info('onAfterAddingAll', addedFileItems);
            };
            uploader.onBeforeUploadItem = function (item) {
                console.info('onBeforeUploadItem', item);
            };
            uploader.onProgressItem = function (fileItem, progress) {
                console.info('onProgressItem', fileItem, progress);
            };
            uploader.onProgressAll = function (progress) {
                console.info('onProgressAll', progress);
            };
            uploader.onSuccessItem = function (fileItem, response, status, headers) {
                console.info('onSuccessItem', fileItem, response, status, headers);
            };
            uploader.onErrorItem = function (fileItem, response, status, headers) {
                console.info('onErrorItem', fileItem, response, status, headers);
            };
            uploader.onCancelItem = function (fileItem, response, status, headers) {
                console.info('onCancelItem', fileItem, response, status, headers);
            };
            uploader.onCompleteItem = function (fileItem, response, status, headers) {
                console.info('onCompleteItem', fileItem, response, status, headers);
            };
            uploader.onCompleteAll = function () {
                console.info('onCompleteAll');
            };

            console.info('uploader', uploader);

        }
    );