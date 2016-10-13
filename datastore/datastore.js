var Table = require('./table');

var initFileData = {
    deltas: []
};

function updateStructuedData(structuredData, delta) {
    var tableNames = Object.keys(delta);
    for (var count = 0; count < tableNames.length; count++) {

        if (!structuredData[tableNames[count]]) {
            structuredData[tableNames[count]] = {};
        }

        if (delta[tableNames[count]].s) { // for snapshot
            structuredData[tableNames[count]] = JSON.parse(JSON.stringify(delta[tableNames[count]].s));
        }


        if (delta[tableNames[count]].i) { // for insert
            var ids = Object.keys(delta[tableNames[count]].i);
            for (var j = 0; j < ids.length; j++) {
                structuredData[tableNames[count]][ids[j]] = {};
                Object.assign(structuredData[tableNames[count]][ids[j]], delta[tableNames[count]].i[ids[j]]);
            }
        }

        if (delta[tableNames[count]].u) { // for update
            var ids = Object.keys(delta[tableNames[count]].u);
            for (var j = 0; j < ids.length; j++) {
                var record = structuredData[tableNames[count]][ids[j]];
                if (record) {
                    Object.assign(record, delta[tableNames[count]].u[ids[j]]);
                }
            }
        }

        if (delta[tableNames[count]].d) { // for deletion
            for (var j = 0; j < delta[tableNames[count]].d.length; j++) {
                delete structuredData[tableNames[count]][delta[tableNames[count]].d[j]];
            }
        }
    }

}

// precdence
// insert > delete > snapshot > update

function resolveConflict(remoteDeltas, currentDelta) { // remote always wins

    var newDelta = JSON.parse(JSON.stringify(currentDelta)); // cloning


    /*
     * Inserts will always go
     */
    /*var tableNames = Object.keys(currentDelta);
    for (var count = 0; count < tableNames.length; count++) {
        if (currentDelta[tableNames[count]].i) {
            newDelta[tableNames[count]] = {};
            newDelta[tableNames[count]].i = currentDelta[tableNames[count]].i
        }
    }*/


    // for deletion and update

    for (var i = 0; i < remoteDeltas.length; i++) {
        var delta = remoteDeltas[i];
        var tableNames = Object.keys(delta);

        for (var j = 0; j < tableNames.length; j++) {

            /**
             * Delete always wins
             */
            if (delta[tableNames[j]].d) {
                if (newDelta[tableNames[j]]) {
                    if (!newDelta[tableNames[j]].d) {
                        newDelta[tableNames[j]].d = [];
                    }
                    for (var k = 0; k < delta[tableNames[j]].d.length; k++) {
                        if (newDelta[tableNames[j]].u) {
                            delete newDelta[tableNames[j]].u[delta[tableNames[j]].d[k]];
                        }
                        // removing already deleted entry from newDelta
                        var index = newDelta[tableNames[j]].d.indexOf(delta[tableNames[j]].d[k]);
                        if (index != -1) {
                            newDelta[tableNames[j]].d.splice(index, 1);
                        }
                    }
                }
            }
            // checking if delete operation is empty
            if (newDelta[tableNames[j]] && newDelta[tableNames[j]].d && newDelta[tableNames[j]].d.length === 0) {
                delete newDelta[tableNames[j]].d
            }

            /*
             * For snapshot (snapshot has higher precedence than update)
             */
            if (delta[tableNames[j]].s && newDelta[tableNames[j]]) {
                delete newDelta[tableNames[j]].u;
            }


            /*
             * For Update (remote always wins)
             */
            if (newDelta[tableNames[j]] && newDelta[tableNames[j]].u && delta[tableNames[j]].u) {
                var ids = Object.keys(newDelta[tableNames[j]].u);
                for (var k = 0; k < ids.length; k++) {
                    if (delta[tableNames[j]].u[ids[k]]) {
                        Object.assign(newDelta[tableNames[j]].u[ids[k]], delta[tableNames[j]].u[ids[k]]);
                    }
                }
            }
        }

    }

    return newDelta;

}


function QueueHandler() {
    var queue = [];
    var running = false;

    function next() {
        queue.splice(0, 1);
        run();
    }

    function run() {
        if (queue.length) {
            running = true;
            queue[0](next);
        } else {
            running = false;
        }
    }

    this.add = function add(func) {
        queue.push(func);
    };

    this.start = function start() {
        if (!running) {
            run();
        }

    };

}

function increaseMinorVersion(ver, clip) {
    var clipStr = clip + '';
    var newVer = (ver + Math.pow(10, clipStr.length * -1)).toFixed(clipStr.length);
    return parseFloat(newVer);
}

function increaseMajorVersion(ver) {
    return parseInt(ver) + 1;
}

function increaseVersion(ver, clip) {
    var clipStr = clip + '';
    var minVer = increaseMinorVersion(ver, clip);
    if (minVer > parseInt(ver) + ((Math.pow(10, clipStr.length * -1)) * clip)) {
        return increaseMajorVersion(ver);
    } else {
        return minVer;
    }
}

function Datastore(datastorePath, options) {

    
    var store = options.store;

    var structuredData = options.data; // stores structured data

    var latestRevision = options.revision;

    var tables = {}; // store list of tables


    var eventListeners = [];

    var clip = options.clip || 10;

    var queue = new QueueHandler();




    function getAndResolveConflictDelta(currentDelta, callback) {
        store.getFileList(datastorePath, function(err, fileList) {
            if (err) {
                return callback(err);
            }
            if (fileList.length) {
                var uploadRevision = increaseVersion(latestRevision, clip);
                var serverRevision = parseFloat(fileList[fileList.length - 1]);
                if (uploadRevision > serverRevision) {
                    return callback(null, currentDelta, null);
                } else { //fetching deltas


                    var count;
                    var deltas = [];

                    var index = fileList.indexOf(uploadRevision + '');
                    if (index !== -1) {
                        count = index;
                    }

                    function getFile(fileName) {

                        store.getFile(datastorePath + '/' + fileName, function(err, data) {
                            count++;
                            if (err) { // is deleted error ?? need to check in 
                                //return callback(err);
                                return;
                            }

                            var delta = JSON.parse(data);
                            updateStructuedData(structuredData, delta);
                            deltas.push(delta);
                            if (count < fileList.length) {
                                getFile(fileList[count]);
                            } else {

                                latestRevision = serverRevision;
                                currentDelta = resolveConflict(deltas, currentDelta);
                                return callback(null, currentDelta, deltas);
                            }

                        });
                    }
                    getFile(fileList[count]);

                }
            } else {
                return callback(null, currentDelta, null);
            }
        });
    }

    // onchange event 
    function poll() {

        setTimeout(function() {
            store.getLatestFileName(datastorePath, function(err, fileName) {
                if (err) {
                    return poll();
                }
                latestServerRevision = parseFloat(fileName);
                if (latestServerRevision && latestRevision < latestServerRevision) {

                    // fetching current delta
                    var currentDelta = {};
                    var tableNames = Object.keys(tables);

                    for (var i = 0; i < tableNames.length; i++) {
                        var table = tables[tableNames[i]];
                        var delta = table.getDelta();
                        if (Object.keys(delta).length) {
                            currentDelta[tableNames[i]] = delta;
                        }
                    }

                    getAndResolveConflictDelta(currentDelta, function(err, currentDelta, remoteDeltas) {
                        if (err) {
                            if (typeof cb == 'function') {
                                cb(err);
                            }
                            return poll();
                        }

                        if (remoteDeltas && remoteDeltas.length && eventListeners.length) {

                            for (var j = 0; j < eventListeners.length; j++) {
                                eventListeners[j](remoteDeltas);
                            }

                        }

                        // setting modified delta 
                        for (var i = 0; i < tableNames.length; i++) { // resetting table deltas
                            tables[tableNames[i]].setDelta(currentDelta[tableNames[i]]);
                        }

                        return poll();
                    });

                } else {
                    return poll();
                }
            });

        }, 10000);
    }

    poll();

    this.getTable = function getTable(tableName) {
        var table = tables[tableName];
        if (!table) {
            table = new Table(tableName, structuredData);
            tables[tableName] = table;
        }
        return table;
    };



    function saveData(currentDelta, cb) {

        /* getAndResolveConflictDelta(currentDelta, function(err, currentDelta) {
            if (err) {
                if (typeof cb == 'function') {
                    cb(err);
                }
                return;
            }*/
        var rev = increaseVersion(latestRevision, clip);
        var snapshotDelta = null;
        var newStructuredData = null;
        if (rev % 1 === 0) { //clip size reached

            snapshotDelta = {};
            var newStructuredData = JSON.parse(JSON.stringify(structuredData));
            //updateStructuedData(newStructuredData, currentDelta); // updating new data with current delta

            // creating snapshot delta
            var tableNames = Object.keys(newStructuredData);
            for (var i = 0; i < tableNames.length; i++) {
                snapshotDelta[tableNames[i]] = {};
                snapshotDelta[tableNames[i]].s = newStructuredData[tableNames[i]];
            }
        }

        var dataToSave = currentDelta;
        if (snapshotDelta) {
            dataToSave = snapshotDelta;
        }


        store.saveFile(datastorePath + '/' + rev, dataToSave, function(err) {
            if (err) {
                if (err.conflict) {

                    getAndResolveConflictDelta(currentDelta, function(err, currentDelta) {
                        if (err) {
                            if (typeof cb == 'function') {
                                cb(err);
                            }
                            return;
                        }
                        saveData(currentDelta, cb);
                    });

                    return;
                } else {
                    if (typeof cb == 'function') {
                        cb(err);
                    }
                    return;
                }
            }



            latestRevision = rev;

            if (snapshotDelta) {
                structuredData = newStructuredData;
                // deleting files
                // creating file list

                var deleteList = [];
                var deleteRevision = parseInt(latestRevision);
                deleteRevision = deleteRevision - 3;
                var v = deleteRevision;
                if (deleteRevision >= 0) {
                    deleteList.push(v);
                    while (true) {
                        v = increaseVersion(v, clip);
                        if (parseInt(v) === deleteRevision) {
                            deleteList.push(datastorePath + '/' + v);
                        } else {
                            break;
                        }
                    }
                }

                store.deleteFiles(deleteList, function(err) {

                });

                saveData(currentDelta, cb); // now saving currentDelta
            } else {
                updateStructuedData(structuredData, currentDelta);
            }
            if (typeof cb == 'function') {
                cb(null);
            }
            return;
        });



        // });


    }

    function commitData(cb) {

        var currentDelta = {};
        var tableNames = Object.keys(tables);

        for (var i = 0; i < tableNames.length; i++) {
            var table = tables[tableNames[i]];
            var delta = table.getDelta();
            if (Object.keys(delta).length) {
                currentDelta[tableNames[i]] = delta;
            }
        }

        if (Object.keys(currentDelta).length === 0) {
            console.log("nothing to commit");
            if (typeof cb == 'function') {
                cb(null);
            }
            return;
        }

        for (var i = 0; i < tableNames.length; i++) { // resetting table deltas
            tables[tableNames[i]].reset();
        }

        saveData(currentDelta, cb);

    }

    this.commit = function commit(cb) {
        queue.add(function(next) {
            commitData(function(err) {
                if (typeof cb == 'function') {
                    cb(err);
                }
                next();
            });
        });
        queue.start();
    };

    this.addRemoteChangeEventListener = function(func) {
        if (typeof func === 'function') {
            eventListeners.push(func);
        }
    }

}


module.exports.init = function(options, callback) {
    console.log('init');


    var relativePath = options.path || '/';
    var datastoreName = options.datastoreName;
    var datastorePath = relativePath + datastoreName;


    var store = options.store;
    store.exists(datastorePath, function(err, exists) {

        if (err) {
            return callback(err);
        }

        if (exists) { // exist
            store.getFileList(datastorePath, function(err, fileList) {
                if (err) {
                    return callback(err);
                }
                var structuredData = {};
                if (fileList.length) {
                    var count = 0;
                    var latestRevision = parseInt(fileList[fileList.length - 1]);
                    if (latestRevision !== 0) {
                        var index = fileList.indexOf(latestRevision + '');
                        if (index !== -1) {
                            count = index;
                        }

                    }


                    function getFile(fileName) {
                        store.getFile(datastorePath + '/' + fileName, function(err, data) {
                            if (err) {
                                return callback(err);
                            }

                            data = JSON.parse(data)
                            updateStructuedData(structuredData, data);
                            count++;
                            if (count < fileList.length) {
                                getFile(fileList[count]);
                            } else {
                                var datastore = new Datastore(datastorePath, {
                                    data: structuredData,
                                    store: store,
                                    revision: parseFloat(fileList[fileList.length - 1])
                                });
                                return callback(null, datastore);
                            }
                        });
                    }
                    getFile(fileList[count]);
                } else {
                    var datastore = new Datastore(datastorePath, {
                        data: structuredData,
                        store: store,
                        revision: 0
                    });
                    return callback(null, datastore);
                }

            });
        } else { // does not exist ... creating dir
            store.createDir(datastorePath, function(err, data) {
                if (err) {
                    return callback(err);
                }
                // initializing data store
                var structuredData = {};
                var datastore = new Datastore(datastorePath, {
                    data: structuredData,
                    store: store,
                    revision: 0
                });
                return callback(null, datastore);
            });
        }
    });
};