import { expect, vi } from "vitest";
import { stringify, xrandkeys } from "./jest-tuwien/pretty";
import WS from 'vitest-websocket-mock';

import { ARTMART_BASE_WS_URL } from "@/services/ArtmartService";

export function wsInterceptHostEndpoint(steps) {
  const hostEndpoint = ARTMART_BASE_WS_URL + '/framing/shared/create';
  steps.push(
    'start intercepting Artmart WebSocket connections for host endpoint',
    `All WebSocket connections to <code>${hostEndpoint}</code> will be intercepted.`
  )        
  return new WS(hostEndpoint, { jsonProtocol: true });
}

export function wsInterceptRandomGuestEndpoint(steps, chance) {
  const sessionId = chance.configureTogetherSessionId();
  const basePath = ARTMART_BASE_WS_URL + '/framing/shared/join/'
  const guestEndpoint = basePath + sessionId;
  steps.push(
    'start intercepting Artmart WebSocket connections for guest endpoint',
    `All WebSocket connections to <code>${basePath}<x-rand>${sessionId}</x-rand></code> will be intercepted.`
  )
  const guestWS = new WS(guestEndpoint, { jsonProtocol: true });
  return { guestWS, sessionId }
}

export async function wsExpectConnection(ws) {
  try {
    await vi.waitUntil(() => ws.connected, { timeout: 1000 });
  } catch (e) {
    throw Error(
      `Expected opening of a WebSocket connection to ${ws.server.url}\n`
    )
  }
}

export async function wsExpectClosed(ws) {
  try {
    await vi.waitUntil(() => ws.closed, { timeout: 1000 });
  } catch (e) {
    throw Error(
      `Expected closing of a WebSocket connection to ${ws.server.url}\n`
    )
  }
}

export async function wsExpectMessage(steps, ws, expectedMsg) {
  steps.push(`expect <code>${expectedMsg.op}</code> message with correct payload to be sent to server via WebSocket`);
  let actualMsg;
  try {
    await vi.waitFor(async () => {
      actualMsg = await ws.nextMessage
      expect(actualMsg).toEqual(expectedMsg)
    }, { timeout: 1000 })
  } catch (e) {
    throw Error(
      `Expected message:\n${stringify(expectedMsg)}\n\n` +
      'Actual message received by server:\n' +
      (actualMsg == undefined ? '(the server did not receive any message)' : stringify(actualMsg))
    )
  }  
}

export function wsSendMessage(steps, ws, msg) {
  steps.push(
    `send <code>${msg.op}</code> message to client via WebSocket`,
    `<pre>${stringify(msg, { mark: xrandkeys(['op'], false) })}</pre>`
  )
  ws.send(msg);
}