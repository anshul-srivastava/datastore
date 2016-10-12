#**Datastore**
----------------------------------------------------------------

This is an alternative for Dropbox datastore, which has been deprecated from  April 29th, 2016. 

With Datastore; structured data (e.g. contacts, to-do items, etc.) can be stored and synced effortlessly across multiple devices. 

Files are used as database to store data.

Browserify Compatible.

NOTE: 
Current implementation supports Dropbox, this can be extendable for other storage providers (e.g. Box, Google Drive etc.) as well.

Example:

    var fileDatastore = require('file-datastore');
    fileDatastore.openDatastore('<datastore_name>', {
	    storageType: "dropbox",
	    storageOptions: {
	        auth: {
	            token: "<authToken>"
	        }
	    }
	}, function(err, ds) {
		 if (err) {
	        console.error(err, "unable to open datastore");
	        return;
		 }
		 var tableTodo = ds.getTable('contact');
		 tableTodo.insert({
	          	"name":"John Smith",
	          	"city":"New York",
	          	"country":"US"
         });
         ds.commit(); // commits the changes to file
	});


   

**API Description :**
(coming soon..)
