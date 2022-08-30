let express = require("express");
let http = require("http");
let GPIO = require("onoff").Gpio;
var DHT22 = require("node-dht-sensor");

let app = express();
let server = http.createServer(app);
let LED = new GPIO(4, "out");
let FAN = new GPIO(23, "high");
let COOL = new GPIO(24, "high");
let HEAT = new GPIO(25, "high");

let io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

server.listen(8080, () => {
  console.log("Server running...");
});

let state = {
  lightValue: 0,
  thermostatMetrics: {
    currentTemperature: 0,
    currentHumidity: 0,
  },
  thermostatSettings: {
    adjustedTemperature: 50,
    temperatureUnit: "C",
    fanSetting: "auto",
    airSetting: "off",
  },
};

io.on("connection", (socket) => {
  const { id } = socket.client;
  console.log(`User connected: ${id}`);

  setInterval(() => {
    DHT22.read(22, 13, function (err, temperature, humidity) {
      if (!err) {
        state = {
          ...state,
          thermostatMetrics: {
            currentTemperature: temperature,
            currentHumidity: humidity,
          },
        };

        socket.emit("updateThermostatMetrics", {
          currentTemperature: state.thermostatMetrics.currentTemperature.toFixed(
            0
          ),
          currentHumidity: state.thermostatMetrics.currentHumidity.toFixed(0),
        });
        // state = {...state, temperature, humidity }
        // console.log(
        //   `temp: ${state.thermostatMetrics.currentTemperature
        //     .toFixed(2)
        //     .toString()}°C, humidity: ${state.thermostatMetrics.currentHumidity
        //     .toFixed(2)
        //     .toString()}%`
        // );
      }
    });
  }, 5000);

  socket.on("setAdjustedTemperature", (data) => {
    if (data?.change) {
      console.log("data", data);
      const prevAdjustedTemperature =
        state.thermostatSettings.adjustedTemperature;
        
      const updatedAjustedTemperature =
        data.change === "increment"
          ? prevAdjustedTemperature + 1
          : data.change === "decrement"
          ? prevAdjustedTemperature - 1
          : prevAdjustedTemperature;

      const updatedSettings = {
        ...state.thermostatSettings,
        adjustedTemperature: updatedAjustedTemperature,
      };

      state = {
        ...state,
        thermostatSettings: updatedSettings,
      };

      console.log("updated controls", updatedSettings);

      // When emitting back to client, use io.emit (not socket.emit)
      io.emit("updateThermostatSettings", {
        ...updatedSettings,
      });
    }
  });

  socket.on("setTemperatureUnit", (data) => {
    if (data?.unit) {
      const updatedSettings = {
        ...state.thermostatSettings,
        temperatureUnit: data.unit,
      };

      state = {
        ...state,
        thermostatSettings: updatedSettings,
      };

      io.emit("updateThermostatSettings", {
        ...updatedSettings,
      });
    }
  });

  socket.on("getInitialThermostatSettings", () =>
    io.emit("respondInitialThermostatSettings", { ...state.thermostatSettings })
  );

  socket.on('setSettings', (data) => {
    const updatedSettings = {
      ...state.thermostatSettings,
      ...data
    }
    state = {
      ...state,
      thermostatSettings: updatedSettings
    }
    io.emit("updateThermostatSettings", {
      ...updatedSettings,
    });
    console.log("updated controls", updatedSettings);
  });
});

process.on("SIGINT", () => {
  console.log("Shutting down...");

  LED.writeSync(0);
  // FAN.writeSync(0)
  // COOL.writeSync(0)
  // HEAT.writeSync(0)

  LED.unexport();
  FAN.unexport();
  COOL.unexport();
  HEAT.unexport();

  process.exit();
});
