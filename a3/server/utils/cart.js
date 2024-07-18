const {sendStatus} = require("express/lib/response");
import Price from './price'
const validMatColors = require('../resources/mat-colors.json');
const validFrames = require('../resources/frames.json');

/**
 * This class represents the cart for one session
 */
class Cart {
  items = new Map();

  /**
   * Get all items in the cart
   * @return {any[]} The items as an array
   */
  getItems() {
    return [...this.items.values()];
  }

  /** TODO: Add other methods to operate on Cart */
  getItem(itemId) {
    return this.items.get(itemId);
  }

  addItem(item) {
    const errors = this.validateForCreate(item);
    if (Object.values(errors).length > 0) {
      return errors;
    }

    const cartItem = {
      cartItemId: item.artworkId,
      price: Price.calculatePrice(item.printSize, item.frameStyle, item.frameWidth, item.matWidth),
      artworkId: item.artworkId,
      printSize: item.printSize,
      frameStyle: item.frameStyle,
      frameWidth: item.frameWidth,
      matWidth: item.matWidth,
      matColor: item.matColor,
    };
    this.items.set(item.artworkId, cartItem);
    return null;
  }

  validateForCreate(item) {
    let errors = {};

    // frame style
    if (!item.frameStyle) {
      errors.frameStyle = "missing";
    } else {
      if (!(validFrames.map(frame => frame.id)).includes(item.frameStyle)) {
        errors.frameStyle = "invalid";
      }
    }

    // frame width
    if (!item.frameWidth) {
      errors.frameWidth = "missing";
    } else {
      if (item.frameWidth < 20 || item.frameWidth > 50) errors.frameWidth = "invalid";
    }

    // mat width
    if (item.matWidth === null || item.matWidth === undefined) {
      errors.matWidth = "missing";
    } else {
      if (item.matWidth < 0 || item.matWidth > 100) errors.matWidth = "invalid";
    }

    // print size
    if (!item.printSize) {
      errors.printSize = "missing";
    } else {
      if (!['S', 'M', 'L'].includes(item.printSize)) {
        errors.printSize = "invalid"
      }
    }

    // mat color (not necessary)
    if (item.matColor) {
      if (!(validMatColors.map(color => color.id)).includes(item.matColor)) {
        errors.matColor = "invalid";
      }
    }

    return errors;
  }
  deleteItem(i) {
    return this.items.delete(i);
  }

  clearCart() {
    this.items = new Map();
  }
}

module.exports = Cart;
