#**File Datastore**
----------------------------------------------------------------

This is an alternative for Dropbox datastore, which has been deprecated from  April 29th, 2016. 

With Datastore; structured data (e.g. contacts, to-do items, etc.) can be stored and synced effortlessly across multiple devices. 

Files are used as database to store data. Data is stored as a series of deltas, where each delta is a list of changes. The datastore stores the full list of changes in files, and the state (a.k.a. snapshot) of a datastore can be obtained by executing the entire list of changes, in sequence, starting with an empty datastore. These deltas can be synced between multiple devices.

**Delta (Change):**
---------------------
A delta has following structure :-

```json
{
   "< table-name >" : {
        "i" :  {
          "< record-id >" : < object (Record Data) >
         },
         "d" : [ "< record-id >"],
         "s" :   < object (table-snapshot) >,
         "u": {
          "< record-id >" : < object (Update Data) >
         },
      }
 }
```
where in above i,d,s,u stands for insert, delete, snapshot and update respectively. 

**Conflict Resolution :**
---------------------
In case of conflict between deltas of different devices, Following precedence is considered :- 

 - **insert** :- Insert will always win. In case where there is an insert in remote and local, both the insert will go into database.
 - **delete** :- Delete will always win. In case  there is a delete irrespective of, remote and local, delete will always reflect in database. 
 -  **snapshot** :- From time to time a snapshot of the database is taken and stored as delta to reduce file size. A snapshot has lower precedence than insert and delete but higher than update.
 - **update** :- In case there is an update to the same record data, remote will always win. Update operation has the lowest precedence.


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
         // commit the changes to file. 
         // changes won't get reflect until and unless a 
         // commit is called on datastore.
         datastore.commit(); 
        
         // updating a record 
         record.set('city','Chicago');
         record.get('city'); // New York .. since commit is not called
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
 - storageOptions < object > : Properties required for initializing storage provider. Since only dropbox is currenty supported following are the valid values. 

 {
            auth: {
                token: "< token >",
            },
            path: ''< path where files will be stored (optional) >" 
        }
        

  
   



Datastore
---------

**Datastore.getTable**(< string >tableName) : Returns an instance of Table.

**Datastore.commit**(< function >callback(optional)) : save the changes into file.

**Datastore.addRemoteChangeEventListener**(< function >eventHandler) : add eventlisteners that get fired when there is a change in remote data. eventHandler has 1 parameter :- array of deltas.

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

 





