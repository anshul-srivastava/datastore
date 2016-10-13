var storageService = require('./storage/storage.js');
var Datastore = require('./datastore/datastore.js');

module.exports.openDatastore = function openDatastore(datastoreName, options, callback) {

    var Storage = storageService.getStorage(options.storageType);
    var storageOptions = options.storageOptions;
    var store = new Storage(storageOptions);
    Datastore.init({
        datastoreName: datastoreName,
        store: store,
        path: options.path
    }, function(err, datastore) {
        callback(err, datastore);
    });

};

module.exports.addNewStorageProvider = function(type, Contructor) {
    storageService.setStorage(type, Contructor);
};