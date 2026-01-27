/**
 * Command publishing and broadcast
 */

import { newId, nowIsoMs } from "../utils/helpers.js";
import { ensureDevice } from "./device-registry.js";

/**
 * Publish a command to a device
 * @param {object} options
 * @param {object} options.controller - MQTT controller
 * @param {Map} options.devicesMap - Device registry
 * @param {string} options.deviceId - Target device
 * @param {string} options.action - Command action
 * @param {object} options.args - Command arguments
 * @param {number} options.commandTimeoutMs - Timeout for ACK
 * @param {function} options.onCommandSent - Sent callback
 * @param {function} options.onCommandTimeout - Timeout callback
 * @param {object} options.extra - Extra fields for payload
 * @returns {{ ok: boolean, err?: string, id?: string }}
 */
export function publishCommand(options) {
  const {
    controller,
    devicesMap,
    deviceId,
    action,
    args,
    commandTimeoutMs,
    onCommandSent,
    onCommandTimeout,
    extra = {}
  } = options;

  if (!controller) return { ok: false, err: "not_connected" };
  if (!deviceId) return { ok: false, err: "no_device" };
  if (!action) return { ok: false, err: "no_action" };

  const id = newId();
  const topic = `pulsar/${deviceId}/cmd/${action}`;

  const payload = {
    v: 1,
    id,
    t_ms: Date.now(),
    args: args ?? {},
    ttl_ms: commandTimeoutMs,
    ...extra
  };

  const dev = ensureDevice(devicesMap, deviceId);
  if (dev) {
    const timeoutId = setTimeout(() => {
      const pending = dev.pendingCommands.get(id);
      if (pending) {
        dev.pendingCommands.delete(id);
        onCommandTimeout({
          id,
          deviceId,
          action,
          timeoutMs: commandTimeoutMs
        });
      }
    }, commandTimeoutMs);

    dev.pendingCommands.set(id, {
      id,
      action,
      tStart: Date.now(),
      status: "pending",
      error: null,
      timeoutId
    });
  }

  controller.publish(topic, payload);

  onCommandSent({
    id,
    deviceId,
    action,
    t: nowIsoMs(),
    payload
  });

  return { ok: true, id };
}

/**
 * Broadcast a command to all online devices
 * @param {object} options
 * @param {object[]} options.deviceList - List of devices (with online status)
 * @param {object} options.controller - MQTT controller
 * @param {Map} options.devicesMap - Device registry
 * @param {string} options.action - Command action
 * @param {object} options.args - Command arguments
 * @param {number} options.commandTimeoutMs - Timeout for ACK
 * @param {function} options.onCommandSent - Sent callback
 * @param {function} options.onCommandTimeout - Timeout callback
 * @param {function} options.onNotif - Notification callback
 * @returns {string[]} IDs of sent commands
 */
export function broadcastCommand(options) {
  const {
    deviceList,
    controller,
    devicesMap,
    action,
    args,
    commandTimeoutMs,
    onCommandSent,
    onCommandTimeout,
    onNotif
  } = options;

  const targets = deviceList.filter((d) => d.online).map((d) => d.id);
  if (!targets.length) {
    onNotif({
      level: "warn",
      title: "Broadcast",
      detail: "No online devices to send to"
    });
    return [];
  }

  onNotif({
    level: "info",
    title: "Broadcast",
    detail: `Sending ${action} to ${targets.length} device(s)`
  });

  const ids = [];
  for (const devId of targets) {
    const result = publishCommand({
      controller,
      devicesMap,
      deviceId: devId,
      action,
      args,
      commandTimeoutMs,
      onCommandSent,
      onCommandTimeout
    });
    if (result.ok) ids.push(result.id);
  }

  return ids;
}
