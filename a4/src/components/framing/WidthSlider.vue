<template>
  <fieldset>
    <legend>{{ legend }}</legend>
    <div class="framing-form-row">
      <label>{{ label }}</label>
      <div>
        <input
          type="number"
          step="0.1"
          :aria-label="legend"
          v-on:change="getInput"
          :value="modelValue / 10"
        />
        cm
      </div>
    </div>
    <input
      type="range"
      step="0.1"
      aria-hidden="true"
      v-on:input="getInput"
      :value="this.modelValue / 10"
      :min="this.min / 10"
      :max="this.max / 10"
    />
  </fieldset>
</template>

<script>
export default {
  name: "WidthSlider",
  props: {
    label: String,
    min: Number, // in mm
    max: Number, // in mm
    modelValue: Number // in mm
  },
  computed: {
    legend() {
      return this.label + " Width";
    },
  },
  methods: {
    getInput: function(event) {
      let value = event.target.value * 10; // from cm to mm
      if (value < this.min) {
        value = this.min;
      } else if (value > this.max) {
        value = this.max;
      }
      this.$emit("update:modelValue", Math.trunc(value));
    }
  }
};
</script>

<style>

input[type="number"] {
  -moz-appearance: textfield;
  width: 2.5em;
  height: 1em;
  font-family: inherit;
  font-size: inherit;
  text-align: right;
  background-color: var(--bg-color);
  border: none;
  padding: 3px;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  appearance: none;
  margin: 0;
}

/*
Styling the range input element is very tricky.
If you want to know more, see
https://css-tricks.com/sliding-nightmare-understanding-range-input
*/
input[type="range"] {
  appearance: none;
  width: 100%;
  height: 0.5rem;
  background: transparent;
  background-color: var(--bg-color);
  border-radius: 0.5rem;
  margin: 1rem 0;
}

::-webkit-slider-thumb {
  appearance: none;
  width: 24px;
  height: 24px;
  border-style: none;
  border-radius: 50%;
  background-color: white;
  box-shadow: 1px 1px 3px;
  margin-top: -2px;
  color: rgb(144, 144, 144);
}

::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-style: none;
  border-radius: 50%;
  background-color: white;
  box-shadow: 1px 1px 3px;
  color: rgb(144, 144, 144);
}

input[type="range"]:focus {
  outline: none;
}
</style>

<style scoped>
fieldset {
  border: none;
  min-width: auto;
  border-bottom: 1px solid var(--bg-color);
  padding: 15px 20px 15px 20px;
  margin: 0;
}

/* legend is necessary for accessibility, but we don't want to show it */
fieldset legend {
  position: absolute;
  clip: rect(0 0 0 0);
}

.framing-form-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  line-height: 1.5em;
}
</style>
