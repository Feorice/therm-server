// let GPIO = require("onoff").Gpio;
// var DHT22 = require("node-dht-sensor");

// let LED = new GPIO(4, "out");
// let FAN = new GPIO(23, "high");
// let COOL = new GPIO(24, "high");
// let HEAT = new GPIO(25, "high");
import { config } from "dotenv";
import DHT from "node-dht-sensor";
import { Direction, Edge, Gpio, Options } from "onoff";

config();

class MockGpio {
  constructor(
    gpio: number,
    direction: Direction,
    edge?: Edge,
    options?: Options
  ) {}
}

class MockDHT {
  constructor() {}

  static read = (
    type: DHT.SensorType,
    pin: number,
    callback: (
      err: NodeJS.ErrnoException,
      temperature: number,
      humidity: number
    ) => void
  ) => {
    const minTemp = Math.ceil(23);
    const maxTemp = Math.floor(25);
    const temp = Math.floor(Math.random() * (maxTemp - minTemp) + minTemp);
    callback(null, temp, 35);
  };
}

export class Device {
  static DHT = process.env.DEVENV === "PC" ? MockDHT : DHT;
  static GPIO =
    process.env.DEVENV === "PC"
      ? (gpio: number, direction: Direction, edge?: Edge, options?: Options) =>
          new MockGpio(gpio, direction, edge, options)
      : (gpio: number, direction: Direction, edge?: Edge, options?: Options) =>
          new Gpio(gpio, direction, edge, options);

  constructor() {}
}
