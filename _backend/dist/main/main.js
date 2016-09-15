angular
    .module('sb.main', [
        'angularFileUpload',
        'ja.qr',
        'ngStorage',
        'ngRoute'])
    .controller('mainCtrl',

        ["$window", "$scope", "$rootScope", "$localStorage", "FileUploader", "MyRest", "$mdDialog", function ($window, $scope, $rootScope, $localStorage, FileUploader, MyRest, $mdDialog) {

            function isEmpty(str) {
                return str == null || str.trim().length == 0;
            }

            $scope.showPrompt = function (ev) {
                var confirm = $mdDialog.prompt()
                    .title('Attach Directory')
                    .textContent('Enter name of Directory to attach.')
                    .placeholder('Directory name')
                    .ariaLabel('Directory name')
                    .initialValue('')
                    .targetEvent(ev)
                    .ok('Attach')
                    .cancel('Cancel');

                $mdDialog.show(confirm).then(function (result) {
                    $scope.add_dir(result);
                }, function () {
                    void 0
                });
            };

            $scope.copy_to_clipboard = function ($event) {
                let that = $event.target;
                $(that).select();
                var v = $(that).val();
                void 0;
                document.execCommand('copy');
                var cp = $('<p>Copied to clipboard!</p>');
                cp.fadeOut(2000);
                $(that).parent().append(cp);
            };

            function get_top_folder(fileList) {
                for (var k in Object.keys(fileList)) {
                    var rp = fileList[k].webkitRelativePath;
                    return rp.substring(0, rp.indexOf("/") + 1);
                }
            }

            MyRest.get_config().then(function (data) {
                if (!isEmpty(data.hostname)) {
                    $rootScope.host = data.hostname;
                }
            });

            MyRest.get_stats().then(function (stats) {
                $rootScope.stats = stats;
            });

            $("input[directory]").on('change', function (e) {
                void 0;
                const fileList = e.currentTarget.files;
                const num_of_files = Object.keys(fileList).length;
                if (num_of_files === 0) {
                    return;
                }
                if (num_of_files > 800) {
                    void 0;
                    return;
                }

                const top_dir = get_top_folder(fileList);
                if (!$scope.props[top_dir]) {
                    $scope.props[top_dir] = {
                        expanded: num_of_files < 20,
                        size: 0
                    }
                }

                add_msg(num_of_files + ' files from directory <b>' + top_dir + '</b> have been added');
            });

            $scope.open_current_dir = function () {
                void 0;
                $scope.showExplore();

                $scope.curr_stream = $scope.dir_uuid;
                $scope.refreshStreamDir();
            };

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

            $scope.add_dir = function (d) {
                void 0;
                if (isEmpty(d)) {
                    return;
                }
                if ($scope.you_streams.includes(d)) {
                    void 0;
                    return;
                }
                $scope.you_streams.push(d);
            };

            $scope.get_stream_data = function (sname) {

                void 0;
                $scope.curr_stream = sname;

                MyRest.get_streams(sname).then(function (data) {
                    $scope.curr_streams_data = data;
                });
            };

            $scope.refreshStreamDir = function () {

                void 0;
                $scope.get_stream_data($scope.curr_stream);
            };

            var originatorEv;

            $scope.openMenu = function ($mdOpenMenu, ev) {
                originatorEv = ev;
                $mdOpenMenu(ev);
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
                $scope.current_page = 'p_dirs';

                $scope.curr_streams_data = [];
                $scope.curr_stream = "";

                $scope.bind_dir_uuid = $localStorage.dir_uuid;
            };
            $scope.showStats = function () {

                void 0;
                $scope.current_page = 'p_stats';

                MyRest.get_stats().then(function (stats) {
                    $rootScope.stats = stats;
                });
            };

            $scope.generate_random_dir_uuid = function () {
                $scope.bind_dir_uuid = gen_uuid();
            };

            $scope.saveMySettings = function () {
                void 0;
                $localStorage.dir_uuid = $scope.bind_dir_uuid;
                $scope.add_dir($localStorage.dir_uuid);
            };

            $scope.current_page = 'p_transfer';

            const binaryJsClient_ulr = $scope.host.replace(/^http/, 'ws') + 'binary-uploader-stream';

            const uploader = $scope.uploader = new FileUploader({
                binaryJsClient_ulr: binaryJsClient_ulr
            });

            $scope.props = {
                "/": {
                    expanded: true,
                    size: 0
                }
            };
            $scope.total_files = 0;
            $scope.total_size = 0;

            $scope.dir_uuid = $localStorage.dir_uuid;
            if (isEmpty($scope.dir_uuid)) {
                $scope.dir_uuid = gen_uuid();
            }
            $scope.original_dir_uuid = $scope.dir_uuid;
            $scope.download_dir_uuid = $scope.host + "d/" + $scope.dir_uuid;

            var add_msg = function (msg) {
                var A = $('<p style="margin:0"><code>' + msg + '</code></p>');
                A._cls = function () {
                    A.fadeTo(500, 0.4).slideUp(2000, function () {
                        A.remove();
                    });
                };
                $("#msgs_here").append(A);
                setTimeout(A._cls, 1000);
            };

            uploader.onWhenAddingFileFailed = function (item /*{File|FileLikeObject}*/, filter, options) {
                void 0;
            };
            uploader.onAfterAddingFile = function (fileItem) {
                void 0;

                if (isEmpty($scope.dir_uuid)) {
                    throw new Error("dir can't be empty");
                }

                for (let dir_name in $scope.the_files) {
                    const already_there = $scope.the_files[dir_name].some(function (fi) {
                        return fi._file.name === fileItem._file.name && fi._file.webkitRelativePath === fileItem._file.webkitRelativePath;
                    });
                    if (already_there) {
                        add_msg('File <b>' + fileItem._file.name + '</b> has already been added');
                        void 0;
                        uploader.removeFromQueue(fileItem);
                        return;
                    }
                }


                fileItem.metadata = {
                    file_uuid: gen_uuid(),
                    dir_uuid: $scope.dir_uuid,
                    relativePath: fileItem._file.webkitRelativePath,
                    name: fileItem._file.name,
                    size: fileItem._file.size
                };
                fileItem.download_url = $scope.host + "d/" + fileItem.metadata.file_uuid;
                fileItem.isStreaming = false;
                fileItem.instances = [];

                var dir = "/";
                if (!isEmpty(fileItem.metadata.relativePath)) {
                    var rp = fileItem.metadata.relativePath;
                    fileItem.metadata.top_dir = rp.substring(0, rp.indexOf("/") + 1);

                    rp = rp.substring(rp.indexOf("/") + 1);
                    fileItem.metadata.rest_dir = rp.substring(0, rp.lastIndexOf("/") + 1);

                    dir = fileItem.metadata.top_dir;
                }
                if (!$scope.the_files[dir]) {
                    $scope.the_files[dir] = [];
                }
                $scope.the_files[dir].push(fileItem);
                $scope.total_files++;
                $scope.total_size += fileItem.metadata.size;

                if (dir === "/") {
                    add_msg('File <b>' + fileItem.metadata.name + '</b> has been added');

                    $scope.the_files[dir].sort(function (a, b) {
                        return a.metadata.name > b.metadata.name;
                    });

                }

                $scope.props[dir].size += fileItem.metadata.size;

                fileItem.upload();

            };

            $scope.apply_dir = function (dir_uuid) {
                $scope.dir_uuid = dir_uuid;
                $scope.download_dir_uuid = $scope.host + "d/" + $scope.dir_uuid;
                for (let d in $scope.the_files) {
                    $scope.the_files[d].forEach(function (item) {
                        item.chnage_dir_uuid(dir_uuid);
                    })
                }
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