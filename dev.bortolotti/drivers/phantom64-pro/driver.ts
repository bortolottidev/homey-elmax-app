import Homey from "homey";
import { PairSession } from "homey/lib/Driver";

export type StoredData = {
  address: `${number}.${number}.${number}.${number}`;
};

module.exports = class Phantom64ProDriver extends Homey.Driver {
  async onInit() {
    this.log("Driver Phantom64ProDriver has been initialized");
  }

  async onPair(session: PairSession) {
    session.setHandler("list_devices", this.onPairListDevices.bind(this));

    // session.setHandler("pincode", async (pincode: string[]) => {
    //   // { singular: true } allow to just get the first one
    //   this.log(this.getDevice({ id: "123" }));
    //   const [device] = this.getDevices();
    //   this.log(device);
    //   const { address } = device.getStore() as StoredData;
    //
    //   const token = await askToken(address, pincode.join("")).catch(this.error);
    //   const isTokenOk = !!token;
    //
    //   if (isTokenOk) {
    //     await device.setSettings({ device_pin: pincode.join("") });
    //   }
    //
    //   return isTokenOk;
    // });
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    const straregyDiscovery = this.homey.discovery.getStrategy(
      "lookup-elmax-videobox",
    );
    const discoveryResults = straregyDiscovery.getDiscoveryResults();
    const videoboxesFound = [];
    for (const [id, data] of Object.entries(discoveryResults)) {
      // check mdnssd strategy
      if ("name" in data) {
        videoboxesFound.push({
          name: "Phantom64 Pro",
          data: {
            id: `VideoBox-${id}`,
            discoveryName: data.name,
          },
          settings: {
            device_pin: null,
          },
          store: {
            address: data.address,
          } as StoredData,
        });
      }
    }
    return videoboxesFound;
  }
};
