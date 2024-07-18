/**
 * This module contains the routes under /artworks
 */

'use strict';

const express = require('express');
const routes = express.Router();
const fetch = require('node-fetch');
const path = require('path');

const MET_BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';

let cache = new Map();

async function getArtwork(id) {
  /** Cache results and transform return object to match the endpoint description */
  const cached = cache.get(id);
  if (cached) {
    return JSON.parse(cached);
  }

  const res = await fetch(MET_BASE_URL + '/objects/' + id);
  if (!res.ok) {
    return null;
  }
  const obj = await res.json();
  if (!obj || !obj.objectID) {
    return null;
  }

  const ret = {
    "artworkId": id,
    "title": obj.title,
    "artist": obj.artistDisplayName,
    "date": obj.objectDate,
    "image": obj.primaryImageSmall
  };

  // cache necessary info
  cache.set(id, JSON.stringify(ret));

  return ret;
}

routes.get('/', async (req, res) => {
  let requestBody = [];
  if (req.query.q == null) {
    // return highlights
    const { highlights } = require(path.join(__dirname, '../resources/highlights.json'));
    for (let id of highlights) {
      requestBody.push(await getArtwork(id));
    }
  } else {
    // search for artworks
    const cached = cache.get(req.query.q);
    if (cached) {
      // in cache
      requestBody = cached;
    } else {
      // not in cache
      const ret = await fetch(MET_BASE_URL + '/search?hasImages=true&q=' + req.query.q);
      if (!ret.ok) {
        return null;
      }
      const objects = await ret.json();
      if (!objects || !objects.objectIDs) {
        res.send([]);
        return null;
      }

      for (let id of objects.objectIDs) {
        requestBody.push(await getArtwork(id));
      }

      // cache necessary info
      cache.set(req.query.q, requestBody);
    }
  }
  res.send(requestBody);
});

routes.get('/:id', async (req, res) => {
  const artwork = await getArtwork(parseInt(req.params.id));

  if (artwork === null) {
    res.sendStatus(404);
    return;
  }
  res.send(artwork);
});

module.exports = routes;
