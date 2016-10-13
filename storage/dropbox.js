var http = require('https');



function DropboxStorage(options) {

    var self = this;


    var accessToken = options.auth.token;
   
   

    var uploading = false;

    var onChangeEventListener;

    var rev;
    var fileCount = 0;

    var latestCursor;

    function getHeaders(params, additionalHeaders) {
        var headers = {
            'Authorization': 'Bearer ' + accessToken,
        };
        if (params) {
            headers['Dropbox-API-Arg'] = JSON.stringify(params);
        }
        if (additionalHeaders) {
            var keys = Object.keys(additionalHeaders);
            for (var i = 0; i < keys.length; i++) {
                headers[keys[i]] = additionalHeaders[keys[i]]
            }
        }
        return headers;
    }

    function processResponse(res, callback) {
        var resBody = '';
        res.on('error', function(err) {
            callback(err, null);
        });
        res.on('data', function(d) {
            resBody = resBody + d;
        });
        res.on('end', function() {
            callback(null, resBody);
        });
    }


    function listFolder(path, callback) {

        var params = {
            path: path,
            include_media_info: false,
            include_deleted: false,
            "recursive": false,
            "include_has_explicit_shared_members": false
        };

        var req = http.request({
            method: 'POST',
            headers: getHeaders(null, {
                "Content-Type": "application/json"
            }),
            host: 'api.dropboxapi.com',
            path: '/2/files/list_folder'
        }, function(res) {

            processResponse(res, function(err, resBody) {
                if (err) {
                    return callback(err);
                }
                if (res.statusCode === 200) {
                    var resObj = JSON.parse(resBody);
                    return callback(null, resObj);
                } else {
                    return callback({
                        error: true,
                        res: res,
                        resBody: resBody
                    });
                }
            });
        });
        req.write(JSON.stringify(params));
        req.end();
    }

    function lisfFolderContinue(cursor, callback) {

        var params = {
            cursor: cursor
        };

        var req = http.request({
            method: 'POST',
            headers: getHeaders(null, {
                "Content-Type": "application/json"
            }),
            host: 'api.dropboxapi.com',
            path: '/2/files/list_folder/continue'
        }, function(res) {

            processResponse(res, function(err, resBody) {
                if (err) {
                    return callback(err);
                }
                if (res.statusCode === 200) {
                    var resObj = JSON.parse(resBody);
                    return callback(null, resObj);
                } else {
                    return callback({
                        error: true,
                        res: res,
                        resBody: resBody
                    });
                }
            });
        });
        req.write(JSON.stringify(params));
        req.end();

    }





    this.setOnChangeEventListener = function setOnChangeEventListener(func) {
        onChangeEventListener = func;
    };


    this.exists = function(path, callback) {

        var params = {
            path: path,
            include_media_info: false,
            include_deleted: false
        };
        var req = http.request({
            method: 'POST',
            headers: getHeaders(null, {
                "Content-Type": "application/json"
            }),
            host: 'api.dropboxapi.com',
            path: '/2/files/get_metadata',
        }, function(res) {
            processResponse(res, function(err, resBody) {
                if (err) {
                    return callback(err);
                }

                switch (res.statusCode) {
                    case 200:
                        return callback(null, true);
                    case 409:
                        var resObj = JSON.parse(resBody);
                        if (resObj.error["path"][".tag"] == 'not_found') {
                            return callback(null, false);
                        } else {
                            return callback({
                                error: true,
                                res: res,
                                resBody: resBody
                            });
                        }
                    default:
                        return callback({
                            error: true,
                            res: res,
                            resBody: resBody
                        });
                }
            });

        });
        req.write(JSON.stringify(params));
        req.end();
    };

    this.createDir = function createDir(path, callback) {

        var params = {
            path: path,
        };

        var req = http.request({
            method: 'POST',
            headers: getHeaders(null, {
                "Content-Type": "application/json"
            }),
            host: 'api.dropboxapi.com',
            path: '/2/files/create_folder'
        }, function(res) {

            processResponse(res, function(err, resBody) {
                if (err) {
                    return callback(err);
                }
                if (res.statusCode === 200) {
                    var resObj = JSON.parse(resBody);
                    return callback(null, resObj);
                } else {
                    return callback({
                        error: true,
                        res: res,
                        resBody: resBody
                    });
                }
            });
        });
        req.write(JSON.stringify(params));
        req.end();
    };


    this.getFileList = function getFileList(path, callback) {
        var fileList = [];

        function listFolderCallback(err, data) {
            if (err) {
                return callback(err);
            }
            for (var i = 0; i < data.entries.length; i++) {
                fileList.push(data.entries[i].name);
            }
            latestCursor = data.cursor;
            if (data.has_more) {
                lisfFolderContinue(data.cursor, listFolderCallback);
            } else {
                return callback(null, fileList);
            }

        }
        listFolder(path, listFolderCallback);
    };

    this.getLatestFileName = function getLatestFileName(path, callback) {
        function listFolderCallback(err, data) {
            if (err) {
                return callback(err);
            }
            latestCursor = data.cursor;
            if (data.has_more) {
                lisfFolderContinue(data.cursor, listFolderCallback);
            } else {

                if (data.entries && data.entries.length) {
                    return callback(null, data.entries[data.entries.length - 1].name);
                } else {
                    return callback(null, null);
                }
            }
        }
        if (latestCursor) {
            lisfFolderContinue(latestCursor, listFolderCallback);
        } else {
            listFolder(path, listFolderCallback);
        }

    };

    this.getFile = function getFile(filePath, callback) {
        var params = {
            path: filePath
        };
        var req = http.request({
            method: 'POST',
            headers: getHeaders(params),
            host: 'content.dropboxapi.com',
            path: '/2/files/download',

        }, function(res) {
            processResponse(res, function(err, resBody) {
                if (err) {
                    return callback(err);
                }
                var headers = res.headers;
                if (headers['dropbox-api-result']) {
                    var apiResultObj = JSON.parse(headers['dropbox-api-result']);
                    rev = apiResultObj.rev;
                    return callback(null, resBody);
                } else {
                    callback({
                        error: true,
                        res: res,
                        resBody: resBody
                    });
                }
            });
        });
        req.end();
    };

    this.saveFile = function saveFile(filePath, data, callback) {
        uploading = true;
        var params = {
            path: filePath,
            "autorename": false,
            "mute": true,
            "mode": "add"
        };

        var req = http.request({
            method: 'POST',
            headers: getHeaders(params, {
                "Content-Type": "application/octet-stream"
            }),
            host: 'content.dropboxapi.com',
            path: '/2/files/upload',
        }, function(res) {

            processResponse(res, function(err, resBody) {
                if (err) {
                    uploading = false;
                    return callback(err);
                }
                if (res.statusCode == 200) {
                    var resObj = JSON.parse(resBody);
                    rev = resObj.rev;
                    uploading = false;
                    callback(null);
                } else {
                    var resObj;
                    if (resBody) {
                        resObj = JSON.parse(resBody);
                    }
                    if (resObj && res.statusCode == 409 && resObj.error["reason"][".tag"] == 'conflict') { // conflict
                        // conflict occured !!!
                        return callback({
                            error: true,
                            conflict: true
                        });
                    } else {
                        uploading = false;
                        callback({
                            error: true,
                            res: res,
                            resBody: resBody
                        });
                    }

                }
            });

        });
        if (typeof data !== 'string') {
            data = JSON.stringify(data);
        }
        req.write(data);
        req.end();
    };


    function checkForDeleteOps(asynId, callback) {

        setTimeout(function() {
            var reqParams = {
                "async_job_id": asynId,
            };

            var req = http.request({
                method: 'POST',
                headers: getHeaders(null, {
                    "Content-Type": "application/json"
                }),
                host: 'api.dropboxapi.com',
                path: '/2/files/delete_batch/check'
            }, function(res) {

                processResponse(res, function(err, resBody) {
                    if (err) {
                        return callback(err);
                    }
                    if (res.statusCode === 200) {
                        var resObj = JSON.parse(resBody);
                        if (resObj['.tag'] === 'complete') {
                            return callback(null);
                        } else if (resObj['.tag'] === 'in_progress') {
                            return checkForDeleteOps(asynId, callback);
                        } else {
                            return callback({
                                error: true,
                                res: res,
                                resBody: resBody
                            });
                        }
                    } else {
                        return callback({
                            error: true,
                            res: res,
                            resBody: resBody
                        });
                    }
                });
            });
            req.write(JSON.stringify(reqParams));
            req.end();
        }, 2000);

    }

    this.deleteFiles = function deleteFiles(fileList, callback) {

        var reqParams = {
            "entries": []
        };


        if (fileList && fileList.length) {
            for (var i = 0; i < fileList.length; i++) {
                reqParams.entries.push({
                    path: fileList[i]
                });
            }
        } else {
            return callback(null);
        }

       

        var req = http.request({
            method: 'POST',
            headers: getHeaders(null, {
                "Content-Type": "application/json"
            }),
            host: 'api.dropboxapi.com',
            path: '/2/files/delete_batch'
        }, function(res) {

            processResponse(res, function(err, resBody) {
                if (err) {
                    return callback(err);
                }
                if (res.statusCode === 200) {
                    var resObj = JSON.parse(resBody);
                    if (resObj['.tag'] === 'complete') {
                        return callback(null);
                    } else if (resObj['.tag'] === 'async_job_id') {
                        return checkForDeleteOps(resObj['async_job_id'], callback);
                    } else {
                        return callback({
                            error: true,
                            res: res,
                            resBody: resBody
                        });
                    }

                } else {
                    return callback({
                        error: true,
                        res: res,
                        resBody: resBody
                    });
                }
            });
        });
        req.write(JSON.stringify(reqParams));
        req.end();

    };

}

module.exports = DropboxStorage;