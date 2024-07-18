/**
 * This module contains the routes under /cart
 */

'use strict';

const express = require('express');
const routes = express.Router();

const Session = require('../utils/session');
const Cart = require('../utils/cart');
const { calculatePrice } = require('../utils/price.js');

const sessionCookieName = 'sessionId';

/**
 * Load the cart for a given SID
 * @param sid The session id
 * @return {Cart|null} The cart, or null if the session does not exist
 */
function loadCart(sid) {
  const session = Session.load(sid);
  if (!session) {
    return null;
  }

  if (!session.cart) {
    // Session exists, but no cart set: Create one
    session.cart = new Cart();
  }
  return session.cart;
}

/**
 * Get the items for the cart associated with the user's session
 */
routes.get('/', (req, res) => {
  // Reuse the session if cookie is present, create a new one otherwise
  const sid = req.cookies[sessionCookieName] || Session.create();

  // Try to load the cart for the session id
  const cart = loadCart(sid);
  if (!cart) {
    res.sendStatus(403);
    return;
  }

  // Set the session id as a cookie
  res.cookie(sessionCookieName, sid);
  res.send(cart.getItems());
});

routes.get('/:id', (req, res) => {
  // Reuse the session if cookie is present, create a new one otherwise
  const sid = req.cookies[sessionCookieName];
  if (!sid) {
    res.sendStatus(403);
    return;
  }

  // Try to load the cart for the session id
  const cart = loadCart(sid);
  if (!cart) {
    res.sendStatus(403);
    return;
  }

  let item = cart.getItem(parseInt(req.params.id));
  if (item) {
    res.send(item);
  } else {
    res.sendStatus(404);
  }
});

routes.post('/', (req, res) => {
  const sid = req.cookies[sessionCookieName];
  if (!sid) {
    res.sendStatus(403);
    return;
  }

  const cart = loadCart(sid);
  if (!cart) {
    res.sendStatus(403);
    return;
  }

  const errors = cart.addItem(req.body);
  if (errors === null) {
    res.sendStatus(201);
  } else {
    res.status(400).json({ message: "Validation failed" , errors : errors }); // validation error
  }
});

routes.delete('/', (req, res) => {
  const sid = req.cookies[sessionCookieName]

  if (!sid) {
    res.sendStatus(403);
    return;
  }

  const cart = loadCart(sid);
  if (!cart) {
    res.sendStatus(403);
    return;
  }

  cart.clearCart()
  res.sendStatus(204)
});

routes.delete('/:id', (req, res) => {
  const sid = req.cookies[sessionCookieName]

  if (!sid) {
    res.sendStatus(403);
    return;
  }

  const cart = loadCart(sid);
  if (!cart) {
    res.sendStatus(403);
    return;
  }

  if (cart.deleteItem(parseInt(req.params.id))) {
    res.sendStatus(204)
  } else {
    res.sendStatus(404);
  }
});

routes.post('/checkout', async (req, res) => {
  const sid = req.cookies[sessionCookieName]

  if (!sid) {
    res.sendStatus(403);
    return;
  }

  const cart = loadCart(sid);
  if (!cart) {
    res.sendStatus(403);
    return;
  }

  if (cart.getItems().length === 0) {
    res.sendStatus(400);
    return;
  }

  // validate customer info
  if (!req.body.email) {   // email
    res.sendStatus(400);
    return;
  }

  const shippingAddress = req.body.shipping_address;
  if (!shippingAddress) {   // shipping address
    res.sendStatus(400);
  } else {
    if (!shippingAddress.name || !shippingAddress.address || !shippingAddress.city || !shippingAddress.country || !shippingAddress.postal_code || !shippingAddress.phone) {
      res.sendStatus(400);
    }
  }
});

module.exports = routes;
