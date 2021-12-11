import { config } from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { Device } from "./devices";

config();

const PORT = process.env.PORT;

const LED = Device.GPIO(4, "out");
const FAN = Device.GPIO(23, "high");
const COOL = Device.GPIO(24, "high");
const HEAT = Device.GPIO(25, "high");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(process.env.DEVENV)
});

let state = {
  lightValue: 0,
  thermostatMetrics: {
    currentTemperature: 0,
    currentHumidity: 0,
  },
  thermostatControls: {
    adjustedTemperature: 10,
    temperatureUnit: "C",
    fanSetting: "auto",
    airSetting: "off",
  },
};

io.on("connection", (socket: Socket) => {
  const id = socket.id
  console.log(`User connected: ${id}`);

  setInterval(() => {
    Device.DHT.read(22, 13, function (err, temperature, humidity) {
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
        console.log(
          `temp: ${state.thermostatMetrics.currentTemperature
            .toFixed(2)
            .toString()}°C, humidity: ${state.thermostatMetrics.currentHumidity
            .toFixed(2)
            .toString()}% on socket ${id}`
        );
      }
    });
  }, 5000);

  socket.on("setAdjustedTemperature", (data) => {
    if (data?.change) {
      console.log("data", data);
      const prevAdjustedTemperature =
        state.thermostatControls.adjustedTemperature;
      const updatedAjustedTemperature =
        data.change === "increment"
          ? prevAdjustedTemperature + 1
          : data.change === "decrement"
          ? prevAdjustedTemperature - 1
          : prevAdjustedTemperature;

      const updatedControls = {
        ...state.thermostatControls,
        adjustedTemperature: updatedAjustedTemperature,
      };

      state = {
        ...state,
        thermostatControls: updatedControls,
      };

      console.log("updated controls", updatedControls);

      // When emitting back to client, use io.emit (not socket.emit)
      io.emit("updateThermostatControls", {
        ...updatedControls,
      });
    }
  });

  socket.on("setTemperatureUnit", (data) => {
    if (data?.unit) {
      const updatedControls = {
        ...state.thermostatControls,
        temperatureUnit: data.unit,
      };

      state = {
        ...state,
        thermostatControls: updatedControls,
      };

      io.emit("updateThermostatControls", {
        ...updatedControls,
      });
    }
  });

  socket.on("getInitialThermostatControls", () =>
    io.emit("respondInitialThermostatControls", { ...state.thermostatControls })
  );

  socket.on("setControls", (data) => {
    console.log(data);
  });
});

process.on("SIGINT", () => {
  console.log("Shutting down...");

  // LED.writeSync(0);
  // FAN.writeSync(0)
  // COOL.writeSync(0)
  // HEAT.writeSync(0)

  // LED.unexport();
  // FAN.unexport();
  // COOL.unexport();
  // HEAT.unexport();

  process.exit();
});
