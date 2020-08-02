'use strict';
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();


module.exports.list = (event, context, callback) => {
    var params = {
        TableName: process.env.PASS_TABLE,
        Limit: 100,
        ScanIndexForward: true,
        ProjectionExpression: "satellite,passDate,passTime,imageKey,images,chan_a,chan_b,direction,tle1,tle2,passDuration,frequency,elevation,gain"
    };

    console.log("Scanning passes table.");
    const onScan = (err, data) => {

        if (err) {
            console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
            callback(err);
        } else {
            console.log("Scan succeeded.");
            return callback(null, {
                statusCode: 200,
                headers: {
                  "Access-Control-Allow-Origin" : "*",
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    passes: data.Items
                })
            });
        }

    };

    dynamoDb.scan(params, onScan);

};
