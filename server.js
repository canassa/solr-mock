var http = require('http');
var qs = require('querystring');
var url = require('url');
var parseString = require('xml2js').parseString;
var _ = require('lodash');


var DB = {};
var SCORE = 0.48526156;


function findEntries(query) {
    var parsed = /\(repository:(\d+) AND (.+)\)/.exec(query),
        repository = parseInt(parsed[1], 10),
        searchQuery = parsed[2];

    if (searchQuery === "*") return _.toArray(DB);

    // Try to transform the Solr query into a Regex
    searchQuery = searchQuery.replace(/"/g, '');
    searchQuery = searchQuery.replace(/\?/g, '.');

    searchQuery = new RegExp(searchQuery, "i");

    return _.filter(DB, function (entry, id) {
        return searchQuery.test(entry.text) &&
               entry.repository === repository;
    });
}


function addEntry(result) {
    var fields = result.add.doc[0].field;
    var entry = {};

    result.add.doc[0].field.forEach(function (field) {
        entry[field.$.name] = field._;
    });

    entry.score = SCORE;  // Fakes the score;
    entry.repository = parseInt(entry.repository, 10);

    DB[entry.id] = (entry);
}


function deleteDb(result) {
    DB = {};
}


function route(req, res, body, queryData) {

    if (req.url.indexOf('/solr/update/') === 0) {

        parseString(body, function (err, result) {
            if (result.add) addEntry(result);
            if (result.delete) deleteDb(result);
        });

        res.writeHead(200, {'Content-Type': 'application/xml'});

        res.write(
            '<?xml version="1.0" encoding="UTF-8"?>' +
            '<response>' +
                '<lst name="responseHeader"><int name="status">0</int><int name="QTime">15</int></lst>' +
            '</response>');
        res.end();
    }
    else if (req.url.indexOf('/solr/select/') === 0) {
        var found = findEntries(queryData.q);

        res.writeHead(200, {'Content-Type': 'application/json'});

        solrResponse = {
            "responseHeader": {
                "status": 0,
                "QTime": 0,
                "params": {
                    "fl": queryData.fl,
                    "start": queryData.start,
                    "q": queryData.q,
                    "wt": "json",
                    "fq": queryData.fq,
                    "rows": queryData.rows
                }
            },
            "response": {
                "numFound": found.length,
                "start": 0,
                "maxScore": SCORE,
                docs: found
            }
        };

        res.write(JSON.stringify(solrResponse));
        res.end();
    }
}


http.createServer(function (req, res) {
    var queryData = url.parse(req.url, true).query,
        body = '';

    req.on('data', function (data) {
        body += data;
    });

    req.on('end', function () {
        route(req, res, body, queryData);
    });
}).listen(1337, '0.0.0.0');