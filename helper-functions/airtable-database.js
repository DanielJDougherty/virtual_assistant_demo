const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_KEY;
const APP_ID = process.env.APP_ID;

// Get organization by email id
const getOrganizationByEmail = async (email) => {

    url = `https://api.airtable.com/v0/${APP_ID}/OrganizationInformation?view=Grid%20view&filterByFormula=(AND({email}="${email}"))&maxRecords=1`;
    headers = {
        Authorization: 'Bearer ' + API_KEY
    }

    try {

        let response = await axios.get(url, { headers });
        let records = response.data.records;
        if (records.length == 0) {
            return {
                status: 0
            }
        } else {
            let fields = records[0].fields;
            return {
                status: 1,
                fields: fields,
                id: records[0].id
            }
        }

    } catch (error) {
        console.log(`Error at  getOrganizationByEmail --> ${error}`);
        return {
            status: 2
        }
    }
};

// Create new organization
const createNewOrganization = async (fields) => {

    url = `https://api.airtable.com/v0/${APP_ID}/OrganizationInformation`;
    headers = {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
    }

    try {

        let response = await axios.post(url, { fields }, { headers });
        if (response.status == 200) {
            return 1;
        } else {
            return 0;
        }
    } catch (error) {
        console.log(`Error at createNewOrganization --> ${error}`);
        return 2;
    }
};

// let date = new Date();
// let createdAt = date.toLocaleString('en-US', {timeZone: TIMEZONE});

// let fields = {
//     email: 'jhon@gmail.com',
//     organization: 'Hitech Hospital',
//     createdAt: createdAt
// };

// Create new donor info
const createNewDonor = async (fields) => {

    url = `https://api.airtable.com/v0/${APP_ID}/DonationInformation`;
    headers = {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
    }

    try {

        let response = await axios.post(url, { fields }, { headers });
        if (response.status == 200) {
            return 1;
        } else {
            return 0;
        }
    } catch (error) {
        console.log(`Error at createNewOrganization --> ${error}`);
        return 2;
    }
};

module.exports = {
    getOrganizationByEmail,
    createNewDonor,
    createNewOrganization
};