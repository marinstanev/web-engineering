/**
 * This module contains the routes under /frames
 */

'use strict';

const express = require('express');
const routes = express.Router();

const path = require("path");
const frames = require(path.join(__dirname, '../resources/frames.json'));
const fs = require("fs");

routes.get('/', (req, res) => {
    const transformedFrames = frames.map(frame => ({
        style: frame.id,
        label: frame.label,
        slice: frame.border.slice,
        cost: frame.cost
    }));
    return res.send(transformedFrames);
});

routes.get('/:id/:img', (req, res) => {
    const frame = frames.find(frame => frame.id === req.params.id);
    if (!frame) {
        return res.send(404);
    }

    let imageType;
    if (req.params.img === "borderImage") {
        imageType = frame.border.image;
    } else if (req.params.img === "thumbImage") {
        imageType = frame.image;
    } else {
        return res.sendStatus(404);
    }

    const image = fs.readFileSync(path.join(__dirname, '../resources/', imageType));
    return res.contentType('image/png').send(image);
});

module.exports = routes;