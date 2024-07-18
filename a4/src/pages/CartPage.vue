<template>
  <main>
    <section class="cart">
      <cart-item
          v-for="item in this.cart"
          :cart-item="item">
      </cart-item>
      <div class="cart-total">
        <div class="price">{{ this.totalPrice }}</div>
        <router-link to="/checkout">
          <button v-if="!artmartStore.cartIsEmpty" class="cart-checkout">Checkout</button>
        </router-link>
      </div>
    </section>
  </main>
</template>

<script>
import CartItem from "@/components/CartItem.vue";
import {mapStores} from "pinia";
import {useArtmartStore} from "@/store.js";

export default {
  name: "CartPage",
  components: {
    CartItem
  },
  computed: {
    artmartStore: mapStores(useArtmartStore).artmartStore,
    cart() {
      return this.artmartStore.cart;
    },
    totalPrice() {
      if (this.artmartStore.cartIsEmpty) {
        return "There are no items in your shopping cart.";
      } else {
        return "Total: € " + (this.artmartStore.cartTotal / 100).toFixed(2);
      }
    },
  },
};
</script>

<style scoped>
.cart {
  display: flex;
  flex-direction: column;
}

.cart-total {
  align-self: flex-end;
  font-size: 1.5rem;
  font-weight: bold;
  margin: 1rem;
  text-align: right;
}

.cart-checkout {
  align-self: flex-end;
  margin-top: 1em;
  font-size: 1rem;
}

@media (max-width: 600px) {
  .cart-total {
    align-self: stretch;
    text-align: center;
  }

  .cart-checkout {
    align-self: stretch;
    width: 100%;
  }
}
</style>
