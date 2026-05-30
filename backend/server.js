const express = require("express");
const cors = require("cors");
const si = require("systeminformation");
const Docker = require("dockerode");
const client = require("prom-client");
const axios = require("axios");
const os = require("os");
const { exec } = require("child_process");

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
| System Uptime & Docker Overview
|--------------------------------------------------------------------------
*/
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (d > 0) {
    return `${d}d ${h}h`;
  } else if (h > 0) {
    return `${h}h ${m}m`;
  } else {
    return `${m}m`;
  }
}

app.get("/api/system-overview", (req, res) => {
  try {
    const uptimeSeconds = os.uptime();
    const uptime = formatUptime(uptimeSeconds);

    exec("docker ps -q | wc -l", (error, stdout, stderr) => {
      let containers = 0;
      if (!error && stdout) {
        const parsed = parseInt(stdout.trim(), 10);
        if (!isNaN(parsed)) {
          containers = parsed;
        }
      } else if (error) {
        console.error("Error executing docker ps:", error);
      }
      res.json({
        uptime,
        containers
      });
    });
  } catch (error) {
    console.error("Error in /api/system-overview:", error);
    res.status(500).json({
      error: "Failed to fetch system overview",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Prometheus Alerts API
|--------------------------------------------------------------------------
*/
app.get("/api/alerts", async (req, res) => {
  try {
    const response = await axios.get("http://cloudvitals-prometheus:9090/api/v1/alerts");
    const alertsData = response.data?.data?.alerts || [];

    let activeAlerts = 0;
    let pendingAlerts = 0;
    let highestSeverity = "healthy";
    const alertDetails = [];

    for (const alert of alertsData) {
      const name = alert.labels?.alertname || "UnknownAlert";
      const severity = (alert.labels?.severity || "info").toLowerCase();
      const summary = alert.annotations?.summary || alert.annotations?.description || "No summary provided";
      const state = alert.state; // "firing" or "pending"
      const activeAt = alert.activeAt || new Date().toISOString();

      alertDetails.push({
        name,
        severity,
        summary,
        state,
        activeAt
      });

      if (state === "firing") {
        activeAlerts++;
        if (severity === "critical") {
          highestSeverity = "critical";
        } else if (severity === "warning" && highestSeverity !== "critical") {
          highestSeverity = "warning";
        } else if (severity === "info" && highestSeverity !== "critical" && highestSeverity !== "warning") {
          highestSeverity = "info";
        }
      } else if (state === "pending") {
        pendingAlerts++;
      }
    }

    if (activeAlerts === 0) {
      highestSeverity = "healthy";
    }

    res.json({
      activeAlerts,
      pendingAlerts,
      severity: highestSeverity,
      alerts: alertDetails
    });
  } catch (error) {
    console.error("Prometheus is unavailable or failed:", error.message);
    res.json({
      activeAlerts: 0,
      pendingAlerts: 0,
      severity: "unknown",
      alerts: []
    });
  }
});

/*
|--------------------------------------------------------------------------
| Prometheus Service Health Scrape Status (up metric)
|--------------------------------------------------------------------------
*/
app.get("/api/service-health", async (req, res) => {
  try {
    const health = {
      backend: "Offline",
      frontend: "Offline",
      prometheus: "Offline",
      grafana: "Offline",
    };

    // 1. Get frontend state from Docker
    try {
      const containers = await docker.listContainers();
      const frontendContainer = containers.find(container => 
        container.Names.some(name => name.includes("frontend"))
      );
      if (frontendContainer && frontendContainer.State === "running") {
        health.frontend = "Online";
      }
    } catch (dockerErr) {
      console.error("Failed to fetch frontend health from Docker:", dockerErr.message);
    }

    // 2. Get backend, prometheus, grafana states from Prometheus
    try {
      const response = await axios.get("http://cloudvitals-prometheus:9090/api/v1/query", {
        params: {
          query: "up",
        },
      });

      const results = response.data?.data?.result || [];
      for (const item of results) {
        const job = item.metric.job;
        const status = item.value[1] === "1" ? "Online" : "Offline";
        if (job === "backend") health.backend = status;
        else if (job === "prometheus") health.prometheus = status;
        else if (job === "grafana") health.grafana = status;
      }
    } catch (promErr) {
      console.error("Failed to fetch service health from Prometheus:", promErr.message);
      // Fallback for backend/prometheus/grafana from Docker when Prometheus is down
      try {
        const containers = await docker.listContainers();
        const backendContainer = containers.find(container => 
          container.Names.some(name => name.includes("backend"))
        );
        if (backendContainer && backendContainer.State === "running") {
          health.backend = "Online";
        }
        const promContainer = containers.find(container => 
          container.Names.some(name => name.includes("prometheus"))
        );
        if (promContainer && promContainer.State === "running") {
          health.prometheus = "Online";
        }
        const grafanaContainer = containers.find(container => 
          container.Names.some(name => name.includes("grafana"))
        );
        if (grafanaContainer && grafanaContainer.State === "running") {
          health.grafana = "Online";
        }
      } catch (dockerErr) {
        console.error("Fallback Docker check failed:", dockerErr.message);
      }
    }

    res.json(health);
  } catch (error) {
    console.error("Failed to fetch service health:", error.message);
    res.json({
      backend: "Offline",
      frontend: "Offline",
      prometheus: "Offline",
      grafana: "Offline",
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