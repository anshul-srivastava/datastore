var storageService = require('./storage/storage.js');
var Datastore = require('./datastore/datastore.js');

module.exports.openDatastore = function openDatastore(datastoreName, options, callback) {

    var Storage = storageService.getStorage(options.storageType);
    var storageOptions = options.storageOptions;
    var store = new Storage(datastoreName, storageOptions);
    Datastore.init({
        store: store
    }, function(err, datastore) {
        callback(err, datastore);
    });

};

module.exports.setStorage = function(type, Contructor) {
    storageService.setStorage(type, Contructor);
};