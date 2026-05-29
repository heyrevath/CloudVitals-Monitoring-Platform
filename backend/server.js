const express = require("express");
const cors = require("cors");
const si = require("systeminformation");
const Docker = require("dockerode");
const client = require("prom-client");
const axios = require("axios");


const docker = new Docker({
  socketPath: "/var/run/docker.sock",
});
const app = express();

client.collectDefaultMetrics();

app.use(cors());

app.get("/api/system", async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const memory = await si.mem();
    const disk = await si.fsSize();
    const network = await si.networkStats();

    res.json({
      cpu: cpu.currentLoad.toFixed(2),
      totalMemory: (memory.total / 1024 / 1024 / 1024).toFixed(2),
      usedMemory: (memory.used / 1024 / 1024 / 1024).toFixed(2),
      diskUsed: disk[0].use.toFixed(2),
      network: network[0].rx_sec || 0,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch system data",
    });
  }
});
app.get("/api/containers", async (req, res) => {
  try {
    const containers = await docker.listContainers();

    const result = containers.map((container) => ({
      id: container.Id.substring(0, 12),
      name: container.Names[0].replace("/", ""),
      image: container.Image,
      state: container.State,
      status: container.Status,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch container data",
    });
  }
});
app.get("/api/prometheus/cpu", async (req, res) => {
  try {
    const response = await axios.get(
      "http://cloudvitals-prometheus:9090/api/v1/query",
      {
        params: {
          query: "process_cpu_seconds_total",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: "Failed to query Prometheus",
    });
  }
});

const PORT = 3001;

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
