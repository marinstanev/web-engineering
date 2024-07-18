import { test_, expectText, getElement, getComponent, getAllComponents, expectPropValue, emitEvent, expectLocalData, expectNoElement, expectRoute } from './jest-tuwien';
import { wsInterceptHostEndpoint, wsInterceptRandomGuestEndpoint, wsExpectConnection, wsExpectMessage, wsSendMessage } from './ws';
import { describe, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { stringify, xrand } from "./jest-tuwien/pretty";
import { mount, shallowMount, flushPromises, enableAutoUnmount, disableAutoUnmount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { useArtmartStore } from "../src/store";
import { fm, fetchMock } from './jest-tuwien/fetch';
import { calculatePrice } from './obf';
import WS from 'vitest-websocket-mock';

import router from '../src/router';
import Framing from '../src/pages/FramingPage.vue';
import WidthSlider from "../src/components/framing/WidthSlider.vue";
import FrameStylePicker from "../src/components/framing/FrameStylePicker.vue";
import MatColorPicker from "../src/components/framing/MatColorPicker.vue";

function prettyList(xs) { return xs.join(', ').replace(/,([^,]*)$/, ' and$1'); }

function mockArtmart(steps, chance) {
  const artwork = chance.artwork();
  const artworkStr = stringify(artwork, { mark: xrand });

  steps.push(
    'start intercepting requests to the Artmart API',
    `The first <code>GET</code> request to <code>/artworks/${xrand(artwork.artworkId)}</code> ` +
    `will return <code>200 OK</code> with the following JSON payload:\n<pre>${artworkStr}</pre>`
  )
  fetchMock.mockOnceIf(fm.and(fm.isHttpGet, fm.urlIncludes(`/artworks/${artwork.artworkId}`)), fm.respondJson(artwork));
  fetchMock.mockResponse(() => ({ status: 501 }));

  return artwork;
}

async function mountFramingPage(steps, chance, artwork, sessionId = null, deep = false) {
  const frames = new Map();
  for (const frame of chance.nn(chance.frame, 3, 5)) {
    frames.set(frame.style, frame);
  }
  const mats = new Map();
  for (const mat of chance.nn(chance.mat, 3, 5)) {
    mats.set(mat.color, mat);
  }
  const pinia = createTestingPinia({
    // Replace every action with a spy that always returns true
    createSpy: () => vi.fn(() => Promise.resolve(true))
  });
  const store = useArtmartStore();
  store.frames = frames;
  store.mats = mats;

  const stateStr = stringify(store.$state, { mark: xrand, inspect: true })
  let opts = {
    props: {
      artworkId: artwork.artworkId
    },
    global: {
      plugins: [
        pinia,
        router
      ]
    }
  };
  let path = `/framing/${artwork.artworkId}`
  let pathStr = `/framing/${xrand(artwork.artworkId)}`;
  if (sessionId) {
    path += `?together=${sessionId}`;
    pathStr += `?together=${xrand(sessionId)}`;
  }
  router.push(path)
  await router.isReady()
  steps.push(
    `mount the <code>Framing</code> page with ${deep ? 'full' : 'stubbed'} child components and a mock store`,
    `The page URL is <code>${pathStr}</code> and ` +
    `the <code>artworkId</code> prop is set to the value <code>${xrand(artwork.artworkId)}</code>.<br>` +
    `The mocked store contains the following initial state: <pre>${stateStr}</pre>`
  );
  const wrapper = deep ? mount(Framing, opts) : shallowMount(Framing, opts);  
  await flushPromises();
  return { wrapper, store };
}

function mkRandomFraming(chance, store) {
  const frameStyles = store.sortedFrames.map(x => x.style);
  const matColors = store.sortedMats.map(x => x.color);
  return {
    printSize: chance.printSize(),
    frameWidth: chance.frameWidth(),
    frameStyle: chance.pickone(frameStyles),
    matWidth: chance.matWidth(),
    matColor: chance.pickone(matColors)
  }
}

async function setRandomFraming(steps, chance, wrapper, store) {
  const config = mkRandomFraming(chance, store);

  steps.push(
    `set local data <code>config</code> of <code>Framing</code> to a random value`,
    `<pre>${stringify(config, { mark: xrand, inspect: true })}</pre>`
  )
  wrapper.vm.$data.config = config;
  await wrapper.vm.$nextTick();

  const frameCost = store.frames.get(config.frameStyle).cost;
  const price = calculatePrice(config.printSize, frameCost, config.frameWidth, config.matWidth);
  return { config, price }
}

describe('Framing', () => {

  beforeAll(() => {
    enableAutoUnmount(afterEach);
  })

  afterEach(() => {    
    fetchMock.mockReset();
    WS.clean();
  });

  afterAll(() => {
    disableAutoUnmount();
  });

  test_(201, 'Frame width slider', async (steps, chance) => {
    const artwork = mockArtmart(steps, chance);
    const { wrapper } = await mountFramingPage(steps, chance, artwork);

    steps.push('expect to find a <code>WidthSlider</code> component for the frame width')
    const widthSliders = getAllComponents(wrapper, WidthSlider, 2);
    const frameWidthSlider = widthSliders.at(0);

    steps.push('expect <code>WidthSlider</coder> props to be bound correctly')
    expectPropValue(frameWidthSlider, 'min', 20);
    expectPropValue(frameWidthSlider, 'max', 50);
    expectPropValue(frameWidthSlider, 'label', 'Frame');

    const xs = chance.unique(chance.integer, 5, { min: 20, max: 50 });
    for (const x of xs) {
      await emitEvent(steps, wrapper, frameWidthSlider, 'update:modelValue', x);
      expectLocalData(steps, wrapper, 'config.frameWidth', x);
    }
  });

  test_(202, 'Frame style picker', async (steps, chance) => {
    const artwork = mockArtmart(steps, chance);
    const { wrapper, store } = await mountFramingPage(steps, chance, artwork);
    steps.push('expect to find a <code>FrameStylePicker</code> component')
    const frameStylePicker = getComponent(wrapper, FrameStylePicker);

    const frameStyles = chance.shuffle(store.sortedFrames.map(x => x.style))
    for (const frameStyle of frameStyles) {
      await emitEvent(steps, wrapper, frameStylePicker, 'update:modelValue', frameStyle);
      expectLocalData(steps, wrapper, 'config.frameStyle', frameStyle);
    }
  });

  test_(203, 'Mat width slider', async (steps, chance) => {
    const artwork = mockArtmart(steps, chance);
    const { wrapper } = await mountFramingPage(steps, chance, artwork);

    steps.push('expect to find a <code>WidthSlider</code> component for the mat width')
    const widthSliders = getAllComponents(wrapper, WidthSlider, 2);
    const matWidthSlider = widthSliders.at(1);

    steps.push('expect <code>WidthSlider</coder> props to be bound correctly')
    expectPropValue(matWidthSlider, 'min', 0);
    expectPropValue(matWidthSlider, 'max', 100);
    expectPropValue(matWidthSlider, 'label', 'Mat');

    const xs = chance.unique(chance.integer, 5, { min: 20, max: 50 });
    for (const x of xs) {
      await emitEvent(steps, wrapper, matWidthSlider, 'update:modelValue', x);
      expectLocalData(steps, wrapper, 'config.matWidth', x);
    }
  });

  test_(204, 'Mat color picker', async (steps, chance) => {
    const artwork = mockArtmart(steps, chance);
    const { wrapper, store } = await mountFramingPage(steps, chance, artwork);
    steps.push('expect to find a <code>MatColorPicker</code> component')
    const matColorPicker = getComponent(wrapper, MatColorPicker);

    const matColors = chance.shuffle(store.sortedMats.map(x => x.color))
    for (const matColor of matColors) {
      await emitEvent(steps, wrapper, matColorPicker, 'update:modelValue', matColor);
      expectLocalData(steps, wrapper, 'config.matColor', matColor);
    }
  });

  test_(205, 'Price', async (steps, chance) => {
    const artwork = mockArtmart(steps, chance);
    const { wrapper, store } = await mountFramingPage(steps, chance, artwork);

    for (let i = 0; i < chance.integer({ min: 3, max: 5 }); i++) {
      const { price } = await setRandomFraming(steps, chance, wrapper, store);
      steps.push('expect price on page to match framing');
      const priceSpan = getElement(wrapper, '#price');
      expectText(priceSpan, '€ ' + (price / 100).toFixed(2));
    }
  });

  test_(206, 'Add to Cart', async (steps, chance) => {
    const artwork = mockArtmart(steps, chance);
    const { wrapper, store } = await mountFramingPage(steps, chance, artwork);
    const { config } = await setRandomFraming(steps, chance, wrapper, store);

    steps.push('click "Add to Cart" button');
    const addToCartButton = getElement(wrapper, 'button.buy');
    await addToCartButton.trigger('click');

    steps.push('expect the appropiate store action to be dispatched');
    const product = { artworkId: artwork.artworkId, ...config };
    try {
      expect(store.addToCart).toHaveBeenCalledWith(product);
    } catch (e) {      
      const lastCall = store.addToCart.mock.lastCall;
      throw Error(
        `Expected call to addToCart function of Pinia store with the following argument:\n${stringify(product)}\n\n` +
        (lastCall ? `Actual arguments of call:\n${stringify(lastCall)}` : "No calls detected.")
      )
    }

    steps.push('wait for redirect to <code>/cart</code>');
    await flushPromises();
    expectRoute(wrapper, '/cart');
  });

  test_(207, 'Configure Together integration (host)', async (steps, chance) => {
    const artwork = mockArtmart(steps, chance);
    const hostWS = wsInterceptHostEndpoint(steps);
    const { wrapper, store } = await mountFramingPage(steps, chance, artwork, null, true);
    const { config } = await setRandomFraming(steps, chance, wrapper, store);    

    steps.push('click "Configure Together" button');
    const configureTogetherButton = getElement(wrapper, 'button.configure-together-btn');
    await configureTogetherButton.trigger('click');

    steps.push(`expect opening of WebSocket connection to host endpoint`);
    await wsExpectConnection(hostWS);

    await wsExpectMessage(steps, hostWS, {
      op: "init", 
      data: { 
        artworkId: artwork.artworkId, 
        state: config
      }
    });
    
    const sessionId = chance.configureTogetherSessionId();
    const hostUsername = chance.configureTogetherUsername();
    wsSendMessage(steps, hostWS, {
      op: "ready", 
      data: {
        artworkId: artwork.artworkId, 
        sessionId: sessionId,
        username: hostUsername
      }
    });
    await wrapper.vm.$nextTick();
    await flushPromises();

    steps.push('expect page URL to be updated')
    expectRoute(wrapper, wrapper.vm.$route.path, { together: sessionId })

    steps.push('expect correct greeting to be shown on page')
    await vi.waitFor(() => {
      expectText(wrapper, `Hello ${hostUsername}. You are framing this artwork alone.`, false)
    });

    const config2 = mkRandomFraming(chance, store);
    wsSendMessage(steps, hostWS, {
      op: "update_state",
      data: config2
    });
    await wrapper.vm.$nextTick();
    await flushPromises();

    expectLocalData(steps, wrapper, 'config.printSize', config2.printSize)
    expectLocalData(steps, wrapper, 'config.frameWidth', config2.frameWidth)
    expectLocalData(steps, wrapper, 'config.frameStyle', config2.frameStyle)
    expectLocalData(steps, wrapper, 'config.matWidth', config2.matWidth)
    expectLocalData(steps, wrapper, 'config.matColor', config2.matColor)

    const usernames = chance.nn(chance.configureTogetherUsername, 1, 4);
    usernames.unshift(hostUsername);
    wsSendMessage(steps, hostWS, {
      op: "update_users",
      data: { usernames: usernames }
    });
    await wrapper.vm.$nextTick();
    await flushPromises();

    steps.push('expect correct greeting to be shown on page')
    await vi.waitFor(() => {      
      const others = prettyList(usernames.slice(1));
      expectText(wrapper, `Hello ${hostUsername}. You are framing this artwork together with ${others}.`, false)
    });

    const widthSliders = getAllComponents(wrapper, WidthSlider, 2);
    const matWidthSlider = widthSliders.at(1);
    const xs = chance.unique(chance.integer, 5, { min: 20, max: 50 });
    let config3 = config2;
    for (const x of xs) {
      config3.matWidth = x;
      await emitEvent(steps, wrapper, matWidthSlider, 'update:modelValue', config3.matWidth);
      const stateMsg = {op: "update_state", data: config3}
      await wsExpectMessage(steps, hostWS, stateMsg);
    }

    steps.push('click "Add to Cart" button');
    const addToCartButton = getElement(wrapper, 'button.buy');
    await addToCartButton.trigger('click');

    steps.push('wait for redirect to <code>/cart</code>');
    await flushPromises();
    expectRoute(wrapper, '/cart')
    
    steps.push('unmount <code>Framing</code> page')    
    await wrapper.unmount();

    await wsExpectMessage(steps, hostWS, {
      op: "done", 
      data: { 
        success: true 
      }
    });
  });

  test_(208, 'Configure Together integration (guest)', async (steps, chance) => {
    const artwork = mockArtmart(steps, chance);
    const { guestWS, sessionId } = wsInterceptRandomGuestEndpoint(steps, chance);
    const { wrapper, store } = await mountFramingPage(steps, chance, artwork, sessionId, true);

    steps.push(`expect opening of WebSocket connection to guest endpoint`);
    await wsExpectConnection(guestWS);

    const guestUsername = chance.configureTogetherUsername();
    wsSendMessage(steps, guestWS, {
      op: "ready", 
      data: {
        artworkId: artwork.artworkId, 
        sessionId: sessionId,
        username: guestUsername
      }
    });

    const config = mkRandomFraming(chance, store);
    wsSendMessage(steps, guestWS, {
      op: "update_state",
      data: config
    });

    const hostUsername = chance.configureTogetherUsername();
    const otherGuestUsernames = chance.nn(chance.configureTogetherUsername, 1, 2);
    const usernames = [hostUsername].concat(otherGuestUsernames).concat([guestUsername])
    wsSendMessage(steps, guestWS, {
      op: "update_users",
      data: {
        usernames: usernames
      }
    });
    
    await wrapper.vm.$nextTick();    
    await flushPromises();

    steps.push('expect correct greeting to be shown on page')
    await vi.waitFor(() => {      
      let names = prettyList(['You'].concat(otherGuestUsernames));
      expectText(wrapper, `Hello ${guestUsername}. ${names} are helping ${hostUsername} frame this artwork.`, false)      
    });
    
    expectLocalData(steps, wrapper, 'config.printSize', config.printSize)
    expectLocalData(steps, wrapper, 'config.frameWidth', config.frameWidth)
    expectLocalData(steps, wrapper, 'config.frameStyle', config.frameStyle)
    expectLocalData(steps, wrapper, 'config.matWidth', config.matWidth)
    expectLocalData(steps, wrapper, 'config.matColor', config.matColor)

    steps.push('expect "Add to Cart" button to not be shown')
    expectNoElement(wrapper, 'button.buy')

    steps.push('expect price to not be shown')
    expectNoElement(wrapper, '#price')

    const widthSliders = getAllComponents(wrapper, WidthSlider, 2);
    const matWidthSlider = widthSliders.at(1);
    const xs = chance.unique(chance.integer, 5, { min: 20, max: 50 });
    let config2 = config;
    for (const x of xs) {
      config2.matWidth = x;
      await emitEvent(steps, wrapper, matWidthSlider, 'update:modelValue', config2.matWidth);
      const stateMsg = {op: "update_state", data: config2}
      await wsExpectMessage(steps, guestWS, stateMsg);
    }

    const success = chance.bool();
    wsSendMessage(steps, guestWS, {
      op: "done",
      data: {
        success: success 
      }
    });
    guestWS.close()

    await wrapper.vm.$nextTick();
    await flushPromises();

    steps.push('expect page URL to be updated')
    expectRoute(wrapper, wrapper.vm.$route.path, config2)    
  });

});