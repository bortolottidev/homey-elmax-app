import Homey from "homey";
import { StoredData } from "./driver";

export const askToken = async (
  address: StoredData["address"],
  pin: string,
  i18nFn: (key: string) => string,
): Promise<string> => {
  const body = JSON.stringify({ pin });

  const res = await fetch(`http://${address}/api/v2/login`, {
    method: "POST",
    body,
    headers: {
      Host: "Homey",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok && res.status === 403) {
    const errorMsg = i18nFn("errors.not_authorized");
    throw new Error(errorMsg);
  } else if (!res.ok) {
    throw new Error(res.statusText);
  }

  return ((await res.json()) as { token: string }).token;
};

export const findAllAreas = async (
  address: StoredData["address"],
  authToken: string,
  i18nFn: (key: string) => string,
) => {
  const res = await fetch(`http://${address}/api/v2/discovery`, {
    method: "GET",
    headers: {
      Host: "Homey",
      "Content-Type": "application/json",
      Authorization: authToken,
    },
  });

  if (!res.ok && res.status === 403) {
    const errorMsg = i18nFn("errors.not_authorized");
    throw new Error(errorMsg);
  } else if (!res.ok) {
    throw new Error(res.statusText);
  }

  return (
    (await res.json()) as { aree: { nome: string; endpointId: string }[] }
  ).aree;
};

export const modifyArmStatus = async (
  address: StoredData["address"],
  pin: string,
  authToken: string,
  areaEndpointId: string,
  status: "armed" | "disarmed" | "partially_armed",
): Promise<void> => {
  const body = JSON.stringify(status === "disarmed" ? { code: pin } : {});
  let statusCode = "unknown";
  if (status === "armed") {
    statusCode = "4";
  }
  if (status === "partially_armed") {
    statusCode = "1";
  }
  if (status === "disarmed") {
    statusCode = "0";
  }

  const res = await fetch(
    `http://${address}/api/v2/cmd/${areaEndpointId}/${statusCode}`,
    {
      method: "POST",
      body,
      headers: {
        Host: "Homey",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body).toString(),
        Authorization: authToken,
      },
    },
  );

  if (!res.ok) {
    console.error(res);
    throw new Error(res.statusText);
  }

  const armResponse = (await res.json()) as { message: string };
  console.log("command response", armResponse);
  if (armResponse.message !== "Command Sent") {
    throw new Error("Unexpected confirm response");
  }
};

module.exports = class Phantom64ProDevice extends Homey.Device {
  public areaEndpointId: string | null = null;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.registerCapabilityListener("alarm_generic", (value: boolean) => {
      this.log({ armedAlarm: value });
    });

    this.registerCapabilityListener(
      "homealarm_state",
      async (value: "armed" | "disarmed" | "partially_armed") => {
        const devicePIN = this.getSetting("device_pin");
        if (!devicePIN) {
          const missingPinErrorMsg = this.homey.__("errors.missing_pin");
          throw new Error(missingPinErrorMsg);
        }

        const { address } = this.getStore() as StoredData;

        this.log("gettin token");
        const token = await askToken(address, devicePIN, this.homey.__);

        if (!this.areaEndpointId) {
          const areas = await findAllAreas(address, token, this.homey.__);
          if (!areas || areas.length !== 1) {
            throw new Error("Error while looking for area");
          }

          const { endpointId, nome } = areas[0];
          this.log("Found endpoint area: ", nome);
          this.areaEndpointId = endpointId;
        }

        this.log("modify status");
        await modifyArmStatus(
          address,
          devicePIN,
          token,
          this.areaEndpointId,
          value,
        );

        // update alarm status
        await this.setCapabilityValue(
          "alarm_generic",
          value === "armed" || value === "partially_armed",
        ).catch(this.error);
      },
    );
    this.log("Phantom64ProDevice has been initialized");
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log("Phantom64ProDevice has been added");
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: {
      [key: string]: boolean | string | number | undefined | null;
    };
    newSettings: {
      [key: string]: boolean | string | number | undefined | null;
    };
    changedKeys: string[];
  }): Promise<string | void> {
    this.log("Phantom64ProDevice settings where changed");
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name: string) {
    this.log("Phantom64ProDevice was renamed");
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log("Phantom64ProDevice has been deleted");
  }
};
