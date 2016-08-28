angular
    .module('sb.main', [
        'angularFileUpload',
        'ja.qr',
        'ngStorage',
        'ngRoute'])
    .controller('mainCtrl',

        ["$window", "$scope", "$localStorage", "$http", "anchorSmoothScroll", "FileUploader", function ($window, $scope, $localStorage, $http, anchorSmoothScroll, FileUploader) {

            function isEmpty(str) {
                return str == null || str.trim().length == 0;
            }

            $(".dir_input").on('change', function (e) {
                void 0;
                var fileList = e.currentTarget.files;
                if (Object.keys(fileList).length > 500) {
                    void 0;
                    return;
                }
                for (var k in Object.keys(fileList)) {
                    uploader.addToQueue(fileList[k]);
                }
            });

            $scope.close_page = function () {
                void 0;
                $window.location = 'about:blank';
            };

            $scope.the_files = {};

            if ($localStorage.you_streams == null) {
                $localStorage.you_streams = ['public'];
            }

            $scope.you_streams = $localStorage.you_streams;
            $scope.curr_streams_data = [];
            $scope.curr_stream = "";

            $scope.dir_to_add = "";
            $scope.add_dir = function () {
                var d = $scope.dir_to_add;
                void 0;
                if (d === "") {
                    return;
                }
                if ($scope.you_streams.includes(d)) {
                    void 0;
                    return;
                }
                $scope.you_streams.push(d);
                $scope.dir_to_add = "";
            };

            $scope.get_stream_data = function (sname) {

                void 0;
                $scope.curr_stream = sname;
                get_streams($http, sname, function (data) {
                    $scope.curr_streams_data = data;
                });
            };

            $scope.refreshStreamDir = function () {

                void 0;
                $scope.get_stream_data($scope.curr_stream);
            };

            $scope.removeStreamDir = function () {
                var d = $scope.curr_stream;
                void 0;
                var i = $scope.you_streams.indexOf(d);
                if (i > -1) {
                    $scope.you_streams.splice(i, 1);
                }
                $scope.curr_stream = "";
            };
            $scope.showExplore = function () {

                void 0;
                $scope.state = 2;

                $scope.curr_streams_data = [];
                $scope.curr_stream = "";
            };
            $scope.showMe = function () {

                void 0;
                $scope.state = 3;

                $scope.bind_dir_uuid = $localStorage.dir_uuid;
            };
            $scope.showStats = function () {

                void 0;
                $scope.state = 'stats';

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
                void 0;
                $localStorage.dir_uuid = $scope.bind_dir_uuid;

                $scope.dir_to_add = $localStorage.dir_uuid;
                $scope.add_dir();
            };

            $scope.state = 1;

            const binaryJsClient_ulr = $scope.host.replace(/^http/, 'ws') + 'binary-uploader-stream';

            const uploader = $scope.uploader = new FileUploader({
                binaryJsClient_ulr: binaryJsClient_ulr
            });

            $scope.total_files = 0;
            $scope.total_size = 0;
            $scope.dir_uuid = $localStorage.dir_uuid;
            $scope.original_dir_uuid = $scope.dir_uuid;
            if (isEmpty($scope.dir_uuid)) {
                get_genuuid($http, function (data) {
                    $scope.dir_uuid = data;
                    $scope.original_dir_uuid = $scope.dir_uuid;
                });
            }

            uploader.onWhenAddingFileFailed = function (item /*{File|FileLikeObject}*/, filter, options) {
                void 0;
            };
            uploader.onAfterAddingFile = function (fileItem) {
                void 0;

                if (isEmpty($scope.dir_uuid)) {
                    throw new Error("dir can't be empty");
                }

                get_genid($http, function (data) {

                    fileItem.metadata = {
                        file_uuid: data,
                        dir_uuid: $scope.dir_uuid,
                        relativePath: fileItem._file.webkitRelativePath,
                        name: fileItem._file.name,
                        size: fileItem._file.size
                    };
                    fileItem.options = $scope.options;
                    fileItem.download_url = $scope.host + "d/" + fileItem.metadata.file_uuid;
                    fileItem.isStreaming = false;
                    fileItem.instances = [];
                    fileItem.original_dir_uuid = $scope.dir_uuid;

                    fileItem.upload();

                    var k = "Files/";
                    if (!isEmpty(fileItem.metadata.relativePath)) {
                        var rp = fileItem.metadata.relativePath;
                        fileItem.metadata.top_dir = rp.substring(0, rp.indexOf("/") + 1);

                        rp = rp.substring(rp.indexOf("/") + 1);
                        fileItem.metadata.rest_dir = rp.substring(0, rp.lastIndexOf("/") + 1);

                        k = fileItem.metadata.top_dir;
                    }
                    if (!$scope.the_files[k]) {
                        $scope.the_files[k] = [];
                    }
                    $scope.the_files[k].push(fileItem);
                    $scope.the_files_len = Object.keys($scope.the_files).length;
                    $scope.total_files++;
                    $scope.total_size += fileItem.metadata.size;

                    setTimeout(function () {
                        var tid = "#m_" + fileItem.metadata.file_uuid;
                        $(tid).addClass('flash');
                        setTimeout(function () {
                            $(tid).removeClass('flash');
                        }, 1000);
                    }, 100);
                    $scope.scrollto(fileItem);

                });

            };

            $scope.apply_dir = function (dir_uuid) {
                $scope.dir_uuid = dir_uuid;
                for (let d in $scope.the_files) {
                    $scope.the_files[d].forEach(function (item) {
                        item.chnage_dir_uuid(dir_uuid);
                    })
                }
            };

            var scrollto_last = null;

            $scope.scrollto = function (fileItem) {
                scrollto_last = fileItem;

                setTimeout(function () {
                    if (scrollto_last == null || $scope.total_files > 1) {
                        return
                    }
                    $scope.do_scrollto(scrollto_last);
                    scrollto_last = null;
                }, 50);
            };

            $scope.do_scrollto = function (fileItem) {
                anchorSmoothScroll.scrollTo("panel_" + fileItem.metadata.file_uuid);
            };

            uploader.onAfterAddingAll = function (addedFileItems) {
                void 0;
            };
            uploader.onBeforeUploadItem = function (item) {
                void 0;
            };
            uploader.onProgressItem = function (fileItem, progress) {
                void 0;
            };
            uploader.onProgressAll = function (progress) {
                void 0;
            };
            uploader.onSuccessItem = function (fileItem, response, status, headers) {
                void 0;
            };
            uploader.onErrorItem = function (fileItem, response, status, headers) {
                void 0;
            };
            uploader.onCancelItem = function (fileItem, response, status, headers) {
                void 0;
            };
            uploader.onCompleteItem = function (fileItem, response, status, headers) {
                void 0;
            };
            uploader.onCompleteAll = function () {
                void 0;
            };

            void 0;

        }]
    );