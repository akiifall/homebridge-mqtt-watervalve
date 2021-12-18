import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  Characteristic,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";

let hap: HAP;

import mqtt, { MqttClient, IClientOptions } from "mqtt";
import { config } from "process";

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("WaterValue", WaterValue);
};

class WaterValue implements AccessoryPlugin {
  private readonly log: Logging;
  private mqttOptions: IClientOptions;
  private mqttClient: MqttClient;
  private api: API;

  private deviceService: Service;
  private informationService: Service;

  private deviceName: string;
  private mqttUrl: string;
  private mqttUser: string;
  private mqttPass: string;
  private manufacturer: string;
  private model: string;
  private serialNumber: string;
  private deviceType: string;
  private topicStatus: string;
  private topicCommand: string;
  private onCommand: string;
  private offCommand: string;
  private statusCommand: string;
  private onValue: string;
  private offValue: string;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.api = api;

    this.deviceName = config.name;
    this.manufacturer = config.manufacturer;
    this.model = config.model;
    this.serialNumber = config.serialNumber;
    this.deviceType = config.deviceType;
    this.mqttUrl = config.mqttUrl;
    this.mqttUser = config.mqttUser;
    this.mqttPass = config.mqttPass;
    this.topicStatus = config.topicStatus;
    this.topicCommand = config.topicCommand;
    this.onCommand = config.onCommand;
    this.offCommand = config.offCommand;
    this.statusCommand = config.statusCommand;
    this.onValue = config.onValue;
    this.offValue = config.offValue;
    
    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(hap.Characteristic.Model, this.model)
      .setCharacteristic(hap.Characteristic.SerialNumber, this.serialNumber);

      // Service Type
    this.deviceService = new hap.Service.Valve(this.deviceName);

    this.deviceService.getCharacteristic(this.api.hap.Characteristic.Active)
      .on(CharacteristicEventTypes.GET, this.getActiveHandler.bind(this))
      .on(CharacteristicEventTypes.SET, this.setActiveHandler.bind(this));

    this.deviceService.getCharacteristic(this.api.hap.Characteristic.InUse)
      .on(CharacteristicEventTypes.GET, this.getInUseHandler.bind(this));

    this.deviceService.setCharacteristic(this.api.hap.Characteristic.ValveType, this.deviceType);
  
    this.mqttOptions = {
      keepalive: 10,
      clientId: this.deviceName + "_" + (Math.random() * 10000).toFixed(0),
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      will: {
      topic: 'home/will',
        payload: this.deviceName,
        qos: 0,
        retain: false
      },
      username: this.mqttUser,
      password: this.mqttPass,
      rejectUnauthorized: false
    };

    // connect to MQTT broker
    this.mqttClient = mqtt.connect(this.mqttUrl, this.mqttOptions);

    this.setMqttEvent();

    log.info(this.deviceName + " plugin loaded.");
  }


	getActiveHandler (callback: any) {
    callback(null, this.deviceService.getCharacteristic(this.api.hap.Characteristic.Active).value);  
	}

	setActiveHandler (value: CharacteristicValue, callback: any) {
    let jsonCommand: string
    
    if (value == 1) {
      jsonCommand = this.onCommand;
    }
    else {
      jsonCommand = this.offCommand;
    }

    this.mqttClient.publish(this.topicCommand,jsonCommand);
    callback(null);  
	}

  getInUseHandler (callback: any) {
    callback(null, this.deviceService.getCharacteristic(this.api.hap.Characteristic.InUse).value);  
  }

  setMqttEvent() {
    this.mqttClient.on("message", (topic: string, message: Buffer) => {
      if (topic === this.topicStatus) {
        let jsonData = JSON.parse(message.toString());
        let deviceStatus = jsonData.DeviceStatus;


        if (deviceStatus == this.onValue) {
          this.deviceService.updateCharacteristic(this.api.hap.Characteristic.Active, 1);
          this.deviceService.updateCharacteristic(this.api.hap.Characteristic.InUse, 1);
        }
        else if (deviceStatus == this.offValue) {
          this.deviceService.updateCharacteristic(this.api.hap.Characteristic.Active, 0);
          this.deviceService.updateCharacteristic(this.api.hap.Characteristic.InUse, 0);
        }
      }
    });

    this.mqttClient.on("connect", () => {
      this.mqttClient.subscribe(this.topicStatus, (error) => {
        if (error) {
          this.log.info("Failed to subscribe : " + this.topicStatus);
        }
      });
    });

    this.mqttClient.on("close", () => {
      this.log.info("MQTT connection closed.");
    });
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.deviceService
    ];
  }
}
