import si from "systeminformation";

export const getMetrics = async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const memory = await si.mem();
    const disk = await si.fsSize();

    res.json({
      cpu: cpu.currentLoad.toFixed(2),
      memoryUsed: (
        (memory.used / memory.total) * 100
      ).toFixed(2),
      diskUsed: disk[0].use.toFixed(2),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch metrics",
    });
  }
};
