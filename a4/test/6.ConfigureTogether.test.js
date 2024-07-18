import { test_, expectText, getElement } from './jest-tuwien';
import { wsInterceptHostEndpoint, wsInterceptRandomGuestEndpoint, wsExpectConnection, wsExpectMessage, wsSendMessage } from './ws';
import { describe, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { stringify, xrand } from "./jest-tuwien/pretty";
import { mount, flushPromises, enableAutoUnmount, disableAutoUnmount } from '@vue/test-utils';
import WS from 'vitest-websocket-mock';

import ConfigureTogether from "../src/components/framing/ConfigureTogether.vue";

function prettyList(xs) { return xs.join(', ').replace(/,([^,]*)$/, ' and$1'); }

function randomFrameConfig(chance) {
  return {
    printSize: chance.printSize(),
    frameWidth: chance.frameWidth(),
    frameStyle: chance.word({ syllables: 2 }),
    matWidth: chance.matWidth(),
    matColor: chance.word()
  }
}

function mountConfigureTogether(steps, chance) {
  let props = {
    artworkId: chance.artworkId(),
    config: randomFrameConfig(chance)
  }
  const propsStr = stringify(props, { indent: 2, mark: xrand, inspect: true })
  steps.push(
    'mount the <code>ConfigureTogether</code> component',
    `The props are set to the following random values: <pre>${propsStr}</pre>`
  )
  const wrapper = mount(ConfigureTogether, { props: props });
  return { wrapper, props } ;
}

async function setupSessionAsHost(steps, chance) {
  const hostWS = wsInterceptHostEndpoint(steps);
  const { wrapper, props } = mountConfigureTogether(steps, chance)

  steps.push('click "Configure Together" button');
  const configureTogetherButton = getElement(wrapper, 'button.configure-together-btn');
  await configureTogetherButton.trigger('click');

  steps.push(`expect opening of WebSocket connection to host endpoint`);
  await wsExpectConnection(hostWS);

  const artworkId = props.artworkId;
  const config = props.config;
  await wsExpectMessage(steps, hostWS, {
    op: "init", 
    data: { 
      artworkId: artworkId, 
      state: config
    }
  });

  const sessionId = chance.configureTogetherSessionId();
  const hostUsername = chance.configureTogetherUsername();
  wsSendMessage(steps, hostWS, {
    op: "ready", 
    data: {
      artworkId: artworkId, 
      sessionId: sessionId,
      username: hostUsername
    }
  });
  await wrapper.vm.$nextTick();
  await flushPromises();

  expectEventEmitted(steps, wrapper, "update:sessionId", sessionId)

  return { hostWS, wrapper, artworkId, config, sessionId, hostUsername }
}

async function setupSessionAsGuest(steps, chance) {
  const { guestWS, sessionId } = wsInterceptRandomGuestEndpoint(steps, chance);
  const { wrapper, props } = mountConfigureTogether(steps, chance)
  await wrapper.setProps({sessionId: sessionId})

  await wrapper.vm.$nextTick();
  await flushPromises();

  steps.push(`expect opening of WebSocket connection to guest endpoint`);
  await wsExpectConnection(guestWS);

  const artworkId = props.artworkId  
  const guestUsername = chance.configureTogetherUsername();
  wsSendMessage(steps, guestWS, {
    op: "ready",
    data: {
      artworkId: artworkId, 
      sessionId: sessionId,
      username: guestUsername
    }
  });
  await wrapper.vm.$nextTick();
  await flushPromises();

  const config = randomFrameConfig(chance);
  wsSendMessage(steps, guestWS, {
    op: "update_state",
    data: config
  });

  const hostUsername = chance.configureTogetherUsername();
  let allUsernames = [hostUsername, guestUsername]
  wsSendMessage(steps, guestWS, {
    op: "update_users",
    data: {
      usernames: allUsernames
    }
  })

  await wrapper.vm.$nextTick();
  await flushPromises();

  return { guestWS, wrapper, artworkId, config, sessionId, guestUsername, hostUsername }
}

function expectEventEmitted(steps, wrapper, event, value, i = 0) {
  steps.push(`expect <code>${event}</code> event from <code>ConfigureTogether</code> component`);
  try {
    expect(wrapper.emitted()).toHaveProperty(event);
    expect(wrapper.emitted()[event]).toHaveLength(i+1);
    expect(wrapper.emitted()[event][i]).toEqual([value])  
  } catch (e) {
    let err = `Expected one ${event} event with value:\n${stringify(value, {margin: 2})}\n\n`;
    if (event in wrapper.emitted()) {
      const n = wrapper.emitted()[event].length;
      if (n < i+1) {
        err += `No ${event} event was emitted.`
      } else if (n > i+1) {
        let eventValues = wrapper.emitted()[event].slice(i).map((x) => x[0]);
        err += `Too many ${event} events were emitted (${n-i}); their values were:\n${stringify(eventValues, {margin:2})}`
      } else {
        let eventValue = wrapper.emitted()[event][i][0];
        err += `Actual value of emitted event:\n${stringify(eventValue, {margin: 2})}`
      }
    } else {
      err += `No ${event} event was emitted.`
    }
    throw Error(err)
  }
}

describe('ConfigureTogether', () => {

  beforeAll(() => {
    enableAutoUnmount(afterEach);
  })

  afterEach(() => {
    WS.clean();
  });

  afterAll(() => {
    disableAutoUnmount();
  });

  test_(601, 'Create session (host)', async (steps, chance) => {
    await setupSessionAsHost(steps, chance)    
  });

  test_(602, 'Join session (guest)', async (steps, chance) => {
    await setupSessionAsGuest(steps, chance)
  });

  test_(603, 'Active users (host)', async (steps, chance) => {
    const { hostWS, wrapper, hostUsername } = await setupSessionAsHost(steps, chance)
    for (let i = 0; i < 5; i++) {
      const guests = chance.nn(chance.configureTogetherUsername, 0, 4);
      const allUsernames = [hostUsername].concat(guests);
      wsSendMessage(steps, hostWS, {
        op: "update_users",
        data: {
          usernames: allUsernames
        }
      });
      await wrapper.vm.$nextTick();
      await flushPromises();
      
      steps.push('expect correct greeting to be shown on page')
      await vi.waitFor(() => {
        const others = guests.length > 0 ? `together with ${prettyList(guests)}` : 'alone';
        expectText(wrapper, `Hello ${hostUsername}. You are framing this artwork ${others}.`, false)
      });
    }    
  });

  test_(604, 'Active users (guest)', async (steps, chance) => {
    const { guestWS, wrapper, guestUsername, hostUsername } = await setupSessionAsGuest(steps, chance)
    for (let i = 0; i < 5; i++) {
      const otherGuests = chance.nn(chance.configureTogetherUsername, 0, 4);
      const allUsernames = [hostUsername].concat(otherGuests).concat([guestUsername]);
      wsSendMessage(steps, guestWS, {
        op: "update_users",
        data: {
          usernames: allUsernames
        }
      });
      await wrapper.vm.$nextTick();
      await flushPromises();
      
      steps.push('expect correct greeting to be shown on page')
      await vi.waitFor(() => {
        const names = prettyList(['You'].concat(otherGuests));
        expectText(wrapper, `Hello ${guestUsername}. ${names} are helping ${hostUsername} frame this artwork.`, false)
      });
    }
  });

  test_(605, 'Frame parameters (host)', async (steps, chance) => {
    const { hostWS, wrapper } = await setupSessionAsHost(steps, chance)
    for (let i = 0; i < 5; i++) {
      const newConfig = randomFrameConfig(chance);
      steps.push(
        'set <code>config</code> prop of <code>ConfigureTogether</code> component to <x-rand>random</x-rand> value',
        `<pre>${stringify(newConfig, { mark: xrand })}</pre>`
      )
      await wrapper.setProps({ config: newConfig})
      await wrapper.vm.$nextTick();
      await flushPromises();

      await wsExpectMessage(steps, hostWS, {
        op: "update_state",
        data: newConfig
      })
    }
    for (let i = 0; i < 5; i++) {
      const newConfig = randomFrameConfig(chance);
      wsSendMessage(steps, hostWS, {
        op: "update_state",
        data: newConfig
      })
      await wrapper.vm.$nextTick();
      await flushPromises();
      expectEventEmitted(steps, wrapper, "update:config", newConfig, i);
    }
  });

  test_(606, 'Frame parameters (guest)', async (steps, chance) => {
    const { guestWS, wrapper, config } = await setupSessionAsGuest(steps, chance)
    expectEventEmitted(steps, wrapper, "update:config", config, 0);
    for (let i = 0; i < 5; i++) {
      const newConfig = randomFrameConfig(chance);
      steps.push(
        'set <code>config</code> prop of <code>ConfigureTogether</code> component to <x-rand>random</x-rand> value',
        `<pre>${stringify(newConfig, { mark: xrand })}</pre>`
      )
      await wrapper.setProps({ config: newConfig})
      await wrapper.vm.$nextTick();
      await flushPromises();

      await wsExpectMessage(steps, guestWS, {
        op: "update_state",
        data: newConfig
      })
    }
    for (let i = 1; i < 6; i++) {
      const newConfig = randomFrameConfig(chance);
      wsSendMessage(steps, guestWS, {
        op: "update_state",
        data: newConfig
      })
      await wrapper.vm.$nextTick();
      await flushPromises();
      expectEventEmitted(steps, wrapper, "update:config", newConfig, i);
    }
  });

  test_(607, 'Stop sharing (host)', async (steps, chance) => {
    const { hostWS, wrapper } = await setupSessionAsHost(steps, chance)
    steps.push('click "Stop Sharing" button');
    const stopSharingButton = getElement(wrapper, '#stopConfigureTogether');
    await stopSharingButton.trigger('click');
    await wsExpectMessage(steps, hostWS, {
      op: "done", 
      data: { 
        success: false
      }
    });
  });

  test_(608, 'End of session (guest)', async (steps, chance) => {
    const { guestWS, wrapper, hostUsername } = await setupSessionAsGuest(steps, chance)
    const success = chance.bool();
    wsSendMessage(steps, guestWS, {
      op: "done",
      data: {
        success: success
      }
    })
    guestWS.close()
    await wrapper.vm.$nextTick();
    await flushPromises();

    steps.push('expect correct message to be shown on page')
    await vi.waitFor(() => {
      if (success) {
        expectText(wrapper, `${hostUsername} has added the framed artwork to their shopping cart.`, false);
      } else {
        expectText(wrapper, `${hostUsername} has decided not to buy this artwork.`, false);
      }
    });

    expectEventEmitted(steps, wrapper, "update:sessionId", null, 1)
  });

});
