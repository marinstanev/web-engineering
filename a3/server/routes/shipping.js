/**
 * This module contains the routes under /shipping
 */

'use strict';

const express = require('express');
const routes = express.Router();
const path = require('path');

routes.get('/', (req, res) => {
    const shipping = require(path.join(__dirname, '../resources/shipping.json'));
    return res.send(shipping);
});

module.exports = routes;