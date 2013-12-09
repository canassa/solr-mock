var http = require('http');
var qs = require('querystring');
var url = require('url');
var parseString = require('xml2js').parseString;
var _ = require('lodash');
var fs = require('fs');
var peg = require('pegjs');

var parser = peg.buildParser(fs.readFileSync('lucene-query.grammar', {encoding: 'utf8'}));


var DB = {};
var SCORE = 0.48526156;


function findEntries(query) {
    var searchQuery = parser.parse(query).left,
        term, repositoryIndex, mimetype;

    if (searchQuery.field === '*' && searchQuery.term === '*') return _.toArray(DB);

    repositoryIndex = parseInt(searchQuery.left.term, 10);

    // TODO: This should be done with recursion
    if (searchQuery.right.term) {
        term = searchQuery.right.term;
    } else if (searchQuery.right.right.left.field === 'mimetype') {
        mimetype = searchQuery.right.right.left.term;
    }

    if (term) {
        if (term === "*") return _.toArray(DB);

        // Try to transform the Solr query into a Regex
        term = term.replace(/"/g, '');
        term = term.replace(/\?/g, '.');

        term = new RegExp(term, "i");
    }

    if (mimetype) {
        mimetype = mimetype.replace(/\*/g, '.*');

        mimetype = new RegExp(mimetype, "i");
    }

    return _.filter(DB, function (entry, id) {
        if (entry.repository !== repositoryIndex) {
            return false;
        }

        if (term) {
            return term.test(entry.text);
        }

        if (mimetype) {
            return mimetype.test(entry.mimetype);
        }
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

PORT = process.argv[2] || 1337;

http.createServer(function (req, res) {
    var queryData = url.parse(req.url, true).query,
        body = '';

    req.on('data', function (data) {
        body += data;
    });

    req.on('end', function () {
        route(req, res, body, queryData);
    });
}).listen(PORT, '0.0.0.0');
