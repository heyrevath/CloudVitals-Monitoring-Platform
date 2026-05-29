const express = require("express");
const cors = require("cors");
const si = require("systeminformation");
const Docker = require("dockerode");
const client = require("prom-client");
const axios = require("axios");

const app = express();

const docker = new Docker({
  socketPath: "/var/run/docker.sock",
});

client.collectDefaultMetrics();

app.use(cors());

/*
|--------------------------------------------------------------------------
| System Metrics
|--------------------------------------------------------------------------
*/
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
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch system data",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Docker Container Metrics
|--------------------------------------------------------------------------
*/
app.get("/api/containers", async (req, res) => {
  try {
    const containers = await docker.listContainers();

    const result = await Promise.all(
      containers.map(async (container) => {
        const containerObj = docker.getContainer(container.Id);

        const stats = await containerObj.stats({
          stream: false,
        });

        const cpuDelta =
          stats.cpu_stats.cpu_usage.total_usage -
          stats.precpu_stats.cpu_usage.total_usage;

        const systemDelta =
          stats.cpu_stats.system_cpu_usage -
          stats.precpu_stats.system_cpu_usage;

        const cpuPercent =
          systemDelta > 0
            ? (
              (cpuDelta / systemDelta) *
              stats.cpu_stats.online_cpus *
              100
            ).toFixed(2)
            : "0.00";

        const memoryUsage = (
          stats.memory_stats.usage /
          1024 /
          1024
        ).toFixed(2);

        const memoryLimit = (
          stats.memory_stats.limit /
          1024 /
          1024
        ).toFixed(2);

        return {
          id: container.Id.substring(0, 12),
          name: container.Names[0].replace("/", ""),
          image: container.Image,
          state: container.State,
          status: container.Status,

          cpu: cpuPercent,
          memoryUsage,
          memoryLimit,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch container data",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Prometheus Query API
|--------------------------------------------------------------------------
*/
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
    console.error(error);

    res.status(500).json({
      error: "Failed to query Prometheus",
    });
  }
});

app.get("/api/logs", async (req, res) => {
  try {
    const response = await axios.get(
      "http://cloudvitals-loki:3100/loki/api/v1/query_range",
      {
        params: {
          query: '{job="docker"}',
          limit: 50,
          direction: "backward",
        },
      }
    );

    const logs =
      response.data.data.result.flatMap((stream) =>
        stream.values.map((entry) => ({
          timestamp: entry[0],
          log: entry[1],
        }))
      ) || [];

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch logs",
    });
  }
});


/*
|--------------------------------------------------------------------------
| Prometheus Metrics Endpoint
|--------------------------------------------------------------------------
*/
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

/*
|--------------------------------------------------------------------------
| Server
|--------------------------------------------------------------------------
*/
const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});