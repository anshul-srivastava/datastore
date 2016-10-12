var DropboxStorage = require('./dropbox.js');

var storages = {
    'dropbox': DropboxStorage
};

module.exports.getStorage = function(type) {
    var storage = storages[type];
    if (!storage) {
        throw new Error("storage of type " + type + " is not supported");
        return;
    }
    return storage;
};

module.exports.setStorage = function(type, StorageConstructor) {
    storages[type] = StorageConstructor;
};