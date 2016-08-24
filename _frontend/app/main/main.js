angular
    .module('sb.main', [
        'angularFileUpload',
        'ja.qr',
        'ngStorage',
        'ngRoute'])
    .controller('mainCtrl', ['$window', '$scope', '$localStorage', '$http', 'anchorSmoothScroll', '$location', 'FileUploader',

        function ($window, $scope, $localStorage, $http, anchorSmoothScroll, $location, FileUploader) {

            $scope.$storage = $localStorage;

            const host = location.origin;

            $scope.theFiles = [];
            $scope.options = {
                should_apply: false,
                op1: false,
                op2: false,
                op3: false,
                op4: false,
                op5: false,

                close_page: function () {
                    console.log("closing the page");
                    $window.location = 'about:blank';
                }

            };
            $scope.applyOptions = function () {
                console.log("apply options");
                $scope.options.should_apply = true;
            };

            if ($localStorage.you_streams == null) {
                $localStorage.you_streams = ['public'];
            }

            if ($localStorage.you_channels == null) {
                $localStorage.you_channels = [
                    'public',
                    '/dev/null',
                ];
            }

            $scope.you_channels = $localStorage.you_channels;
            $scope.curr_channel_data = null;
            $scope.curr_channel = "";

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
                if ($scope.you_streams.indexOf(d) > -1) {
                    console.log("already exists");
                    return;
                }
                $scope.you_streams.push(d);
                $scope.dir_to_add = "";
            };
            $scope.get_channel_data = function (sname) {

                console.log("get_channel_data", sname);
                $scope.curr_channel = sname;

                $scope.curr_channel_data = {
                    name: sname,
                    users: ['jola_' + sname, 'ola_' + sname, 'pytong_' + sname],
                    text: ['jola: abrakadabra']
                };

            };

            $scope.get_stream_data = function (sname) {

                console.log("get_stream_data", sname);
                $scope.curr_stream = sname;
                get_streams($scope, $http, sname, function (data) {
                    $scope.curr_streams_data = data;
                });
            };
            $scope.refreshStreamDir = function () {

                console.log("refreshStreamDir")
                $scope.get_stream_data($scope.curr_stream);
            };
            $scope.removeStreamDir = function () {
                var d = $scope.curr_stream;
                console.log("removeStreamDir", d)
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

                get_stats($scope, $http, function (data) {
                    $scope.stats = data;
                });
            };

            $scope.showChat = function () {

                console.log("tab change");
                $scope.state = 6;
            };

            $scope.generate_radom_dir_uuid = function () {
                get_genuuid($scope, $http, function (data) {
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

            var binaryJsClient_ulr = host.replace(/^http/, 'ws') + '/binary-uploader-stream';

            var uploader = $scope.uploader = new FileUploader({
                binaryJsClient_ulr: binaryJsClient_ulr,
                socket: null,
            });

            uploader.filters.push({
                name: 'customFilter',
                fn: function (item /*{File|FileLikeObject}*/, options) {
                    return this.queue.length < 4;
                }
            });

            uploader.onWhenAddingFileFailed = function (item /*{File|FileLikeObject}*/, filter, options) {
                console.info('onWhenAddingFileFailed', item, filter, options);
            };
            uploader.onAfterAddingFile = function (fileItem) {
                console.info('onAfterAddingFile', fileItem);

                get_genid($scope, $http, function f(data) {

                    fileItem.metadata = {
                        file_uuid: data,
                        dir_uuid: $scope.$storage.dir_uuid,
                        author: $scope.$storage.author,
                        name: fileItem._file.name,
                        size: fileItem._file.size
                    }
                    fileItem.options = $scope.options;
                    fileItem.download_url = host + "/d/" + fileItem.metadata.file_uuid;
                    fileItem.isStreaming = false;
                    fileItem.instances = [];
                    fileItem.original_dir_uuid = $scope.$storage.dir_uuid;

                    fileItem.upload();

                    $scope.theFiles.push(fileItem);
                    setTimeout(function () {
                        angular.element(document.querySelector('#the_url')).focus();
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

        }]
    );