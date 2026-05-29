import express from "express";
import cors from "cors";
import metricsRoute from "./routes/metrics.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CloudVitals API Running");
});

app.use("/api/metrics", metricsRoute);

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
