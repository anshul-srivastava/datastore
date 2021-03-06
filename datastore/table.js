//var Record = require('./record.js');
var shortid = require('shortid');

function Table(tableName, structuredData) {

    var currentDelta = {};



    var self = this;

    this.getAllRecords = function() {
        var tableData = structuredData[tableName];
        var records = [];
        if (!tableData) {
            return records;
        }
        var keys = Object.keys(tableData);
        for (var i = 0; i < keys.length; i++) {
            var record = new Record(keys[i], tableData[keys[i]]);
            records.push(record);
        }
        return records;
    };

    this.getRecord = function getRecord(recordId) {
        var tableData = structuredData[tableName];
        if (tableData) {
            var recordData = tableData[recordId];
            if (recordData) {
                var record = new Record(recordId, recordData);
                return record;
            } else {
                return null;
            }
        } else {
            return null;
        }
    };

    this.insert = function insert(recordData) {
        var id = shortid.generate();

        if (!currentDelta.i) {
            currentDelta.i = {};
        }
        var i = currentDelta.i;
        i[id] = recordData;
        return new Record(id, recordData);
    };

    this.removeRecord = function removeRecord(recordId) {
        if (!currentDelta.d) {
            currentDelta.d = [];
        }
        currentDelta.d.push(recordId);
        // checking if record is present in update delta
        if (currentDelta.u && currentDelta.u[recordId]) {
            delete currentDelta.u[recordId];
        }
    };

    this.query = function query(queryObj) {
        var tableData = structuredData[tableName];
        var records = [];
        if (tableData) {
            var searchKeys = Object.keys(queryObj);
            if (searchKeys.length) {
                var ids = Object.keys(tableData);
                for (var i = 0; i < ids.length; i++) {
                    var found = true;
                    var item = tableData[ids[i]];
                    for (var j = 0; j < searchKeys.length; j++) {
                        if (item[searchKeys[j]] !== queryObj[searchKeys[j]]) {
                            found = false;
                        }
                    }
                    if (found) {
                        var record = new Record(ids[i], item);
                        records.push(record);
                    }

                }
            } else {
                return this.getAllRecords();
            }
        }

        return records;
    };

    this.reset = function reset() {
        currentDelta = {};
    };

    this.getDelta = function getDelta() {
        var obj = {};
        Object.assign(obj, currentDelta);
        return obj;
    };

    this.setDelta = function setDelta(delta) {
        if (delta) {
            currentDelta = delta;
        }
    };

    function Record(id, recordData) {

        var updateData = {};

        this.getId = function getId() {
            return id;
        };

        this.get = function get(key) {
            var tableData = structuredData[tableName];
            if (tableData) {
                var recordData = tableData[id];
                if (recordData) {
                    return recordData[key];
                } else {
                    return null;
                }
            } else {
                return null;
            }
        };

        this.set = function set(key, value) {
            if (!currentDelta.u) {
                currentDelta.u = {};
            }
            var u = currentDelta.u;
            if (!u[id]) {
                updateData = {};
            }
            u[id] = updateData
            updateData[key] = value;
        };
        this.deleteRecord = function deleteRecord() {
            self.removeRecord(id);
        };
    }

}
module.exports = Table;