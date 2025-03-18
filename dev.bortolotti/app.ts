"use strict";

import Homey from "homey";

module.exports = class ElmaxIntegration extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log("ElmaxIntegration has been initialized");
  }
};
