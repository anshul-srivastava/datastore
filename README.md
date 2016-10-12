#**Datastore**
----------------------------------------------------------------

This is an alternative for Dropbox datastore, which has been deprecated from  April 29th, 2016. 

With Datastore; structured data (e.g. contacts, to-do items, etc.) can be stored and synced effortlessly across multiple devices. 

Files are used as database to store data. Data is stored as a series of deltas (changes) and the database is constructed by reading all the changes.

Browserify Compatible.

NOTE: 
Current implementation supports Dropbox, this can be extendable for other storage providers (e.g. Box, Google Drive etc.) as well.

Example:

    var fileDatastore = require('file-datastore');
    fileDatastore.openDatastore('address_book', {
	    storageType: "dropbox",
	    storageOptions: {
	        auth: {
	            token: "<authToken>"
	        }
	    }
	}, function(err, datastore) {
		 if (err) {
	        console.error(err, "unable to open datastore");
	        return;
		 }
		 var tableContact = datastore.getTable('contact');
		 
		 // inserting a new record
		 var record = tableContact.insert({
	          	"name":"John Smith",
	          	"city":"New York",
	          	"country":"US"
         });
         datastore.commit(); // commits the changes to file. changes won't get reflect until and unless a commit is called on datastore.
        
        // updating a record 
        record.set('city','Chicago');
        record.get('city'); // New York
        datastore.commit(); 
        record.get('city'); // Chicago
        
        // querying a record
        var matchedRecords = tableContact.query({
         "country":"US"
        });
        matchedRecords.length // 1

        
        
	});


   

**Usage :**
---------------------

**openDatastore**(< string >name, < object >options, < function > callback) - opens a datastore with the options provided. callback has 2 parameters: < Error >err, < Datastore >datastore. Valid options properties are:
   

 - storageType < string > : Type of storage. Currently supported value is 'dropbox'.
 - storageOptions < object > : Properties required for initializing storage. Since only dropbox is currenty supported followinf are the valid values.
        {
	        auth: {
	            token: "<token>",
            },
            path: ''< path where files will be stored (optional) >" 
      }

Datastore
---------

**Datastore.getTable**(< string >tableName) : Returns an instance of Table.

**Datastore.commit**(< function >callback(optional)) : save the changes into file.

**Datastore.addRemoteChangeEventListener**(< function >eventHandler) : add eventlisteners that get fired when there is a change in remote data.

Table
-----

**Table.getAllRecords**() : Returns all records.
 
 **Table.getRecord**(< string > Id) : Returns a record based on record id.
 
**Table.insert**(< object > recordData) : inserts a new record into the table and returns an instance of that record. Record Data must be a simple key value javascript object.

**Table.removeRecord**(< string > id) : Removes record based on record Id.

**Table.query**(< object > queryObject) : Returns list of records that matches the query object.

Record
------

**Record.getId**() : Returns the id of the record.

**Record.get**(< String > key) : Returns the value of the key specified.

**Record.set**(< String > key,< string/number >) : sets the value of the specified key.

**Record.deleteRecord**() : removed the record from the table.

 





