// external packages
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

// Start the webapp
const webApp = express();

// Webapp settings
webApp.use(bodyParser.urlencoded({
    extended: true
}));
webApp.use(bodyParser.json());

// Server Port
const PORT = process.env.PORT;

// Home route
webApp.get('/', (req, res) => {
    res.send(`Hello World.!`);
});

const AT = require('../helper-functions/airtable-database');

const TIMEZONE = 'Asia/Kolkata';
const TIMEOFFSET = '+05:30';

// User provides email
const userProvidesEmail = async (req) => {

    let responseText = {};
    let outString = '';
    let outputContexts = [];

    let session = req.body.session;

    let email = req.body.queryResult.parameters.email;

    let organization = await AT.getOrganizationByEmail(email);

    if (organization.status == 2 || organization == undefined) {
        outString += 'Something is wrong with the ALI. Try again after sometime.';
    } else if (organization.status == 0) {
        // No organization with that email address
        outString += 'Please give me the name of the organization or hospital you are calling from.';
        let awaitOrganizationName = `${session}/contexts/await-org-name`;
        let sessionVars = `${session}/contexts/session-vars`;
        outputContexts = [{
            name: awaitOrganizationName,
            lifespanCount: 1,
        },
        {
            name: sessionVars,
            lifespanCount: 20,
            parameters: {
                email: email
            }
        }];
    } else {
        // Organization found in airtable with the email
        outString += `Thank you ${organization.fields.firstName}, To get us started, We are going to work together to document a few pieces of information. Let me start with your full name.`;
        let awaitFullname = `${session}/contexts/await-full-name`;
        let sessionVars = `${session}/contexts/session-vars`;
        outputContexts = [{
            name: awaitFullname,
            lifespanCount: 2,
        },
        {
            name: sessionVars,
            lifespanCount: 20,
            parameters: {
                email: email,
                organization: organization
            }
        }];
    }

    responseText['fulfillmentText'] = outString;
    responseText['outputContexts'] = outputContexts;
    return responseText;
};

// User provides organization name
const userProvidesOrganizationName = async (req) => {

    let organizationName = req.body.queryResult.parameters.organizationName;
    let responseText = {};
    let outString = '';
    let session = req.body.session;
    let outputContexts = req.body.queryResult.outputContexts;

    let email;

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session-vars')) {
            email = outputContext.parameters.email;
        }
    });

    let date = new Date();
    let createdAt = date.toLocaleString('en-US', { timeZone: TIMEZONE });

    let fields = {
        email: email,
        organization: organizationName,
        createdAt: createdAt
    };

    let organization = await AT.createNewOrganization(fields);

    outString += `Thank you ${organization.fields.firstName}, To get us started, We are going to work together to document a few pieces of information. Let me start with your full name.`;
    let sessionVars = `${session}/contexts/session-vars`;
    outputContexts = [{
        name: sessionVars,
        lifespanCount: 20,
        parameters: {
            organizationName: organizationName,
            organization: organization
        }
    }];

    responseText['fulfillmentText'] = outString;
    responseText['outputContexts'] = outputContexts;
    return responseText;
};

// Converts the date and time from Dialogflow
const dateTimeToString = (date) => {

    let year = date.split('T')[0].split('-')[0];
    let month = date.split('T')[0].split('-')[1];
    let day = date.split('T')[0].split('-')[2];

    let hour = date.split('T')[1].split(':')[0];
    let minute = date.split('T')[1].split(':')[1];

    let newDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000${TIMEOFFSET}`;

    let event = new Date(Date.parse(newDateTime));

    return event.toLocaleString('en-US', { timeZone: TIMEZONE });
};

// User provides ventilator details
const userProvidesVentilatorDetails = async (req) => {

    let outputContexts = req.body.queryResult.outputContexts;
    let email, organizationName, ventilatorDetail, fullName, dateTime, phoneNumber;

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session-vars')) {
            if (outputContext.parameters.hasOwnProperty('organization')) {
                let organization = outputContext.parameters.organization;
                email = organization.fields.email;
                organizationName = organization.fields.organization;
            } else {
                email = outputContext.parameters.email;
                organizationName = outputContext.parameters.organizationName
            }
            ventilatorDetail = outputContext.parameters.ventilatorDetail;
            fullName = outputContext.parameters.fullName.name;
            dateTime = outputContext.parameters['date-time'][0]['date_time'];
            phoneNumber = outputContext.parameters.phoneNumber;
        }
    });

    let date = new Date();
    let createdAt = date.toLocaleString('en-US', { timeZone: TIMEZONE });
    let cardiacDateTime = dateTimeToString(dateTime);

    let fields = {
        email: email,
        organization: organizationName,
        name: fullName,
        phoneNumber: `${phoneNumber}`,
        cardiacDate: cardiacDateTime,
        deathTime: cardiacDateTime,
        ventilatorDetail: ventilatorDetail,
        createdAt: createdAt
    };

    await AT.createNewDonor(fields);

    return {
        fulfillmentText: `Thank you ${fullName}, a coordinator will be reaching out to you ${phoneNumber} in the next 1 hour with additional information.`
    }
};

// Handle user provides name
const userProvidesName = async (req) => {

    let fullName = req.body.queryResult.parameters.fullName.name;
    let values = fullName.split(' ');
    let firstName, lastName;

    if (values.length == 1) {
        firstName = values[0];
        lastName = 'No last name';
    } else if (values.length == 2) {
        firstName = values[0];
        lastName = values[1];
    } else {
        firstName = values[0];
        lastName = 'No last name';
    }

    let outputContexts = req.body.queryResult.outputContexts;
    let organization = {};

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session-vars')) {
            organization = outputContext.parameters.organization;
        }
    });

    let fields = {
        firstName: firstName,
        lastName: lastName
    };

    await AT.updateOrganizationById(organization.id, fields);

    return {
        fulfillmentText: 'Please let me know a callback number where we can contact you.'
    }
};

// Handle userProvidesPhoneNumber
const userProvidesPhoneNumber = async (req) => {

    let phoneNumber = req.body.queryResult.parameters.phoneNumber;
    let outputContexts = req.body.queryResult.outputContexts;
    let organization = {};

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session-vars')) {
            organization = outputContext.parameters.organization;
        }
    });

    let fields = {
        phoneNumber: `${phoneNumber}`
    };

    await AT.updateOrganizationById(organization.id, fields);

    return {
        fulfillmentText: 'Please let me know patients cardiac date and time of death.'
    }
};

// Google Dialogflow Webhook
webApp.post('/webhook', async (req, res) => {

    let action = req.body.queryResult.action;

    let responseText = {};

    if (action === 'userProvidesEmail') {
        responseText = await userProvidesEmail(req);
    } if (action === 'userProvidesOrganizationName') {
        responseText = await userProvidesOrganizationName(req);
    } if (action === 'userProvidesVentilatorDetails') {
        responseText = await userProvidesVentilatorDetails(req);
    } if (action === 'userProvidesName') {
        responseText = await userProvidesName(req);
    } if (action === 'userProvidesPhoneNumber') {
        responseText = await userProvidesPhoneNumber(req);
    } else {
        responseText['fulfullmentText'] = 'Something went wrong, try after sometime.';
    }

    res.send(responseText);
});

const GD = require('../helper-functions/google-dialogflow');

// Website widget route
webApp.get('/website', async (req, res) => {

    let text = req.query.text;
    let sessionId = req.query.mysession;

    let intentData = await GD.detectIntent(text, sessionId);

    res.setHeader('Access-Control-Allow-Origin', '*');
    if (intentData.status == 200) {
        res.send(intentData.message);
    } else {
        res.send('Chatbot is having problem. Try again after sometime.');
    }
});

// Start the server
webApp.listen(PORT, () => {
    console.log(`Server is up and running at ${PORT}`);
});