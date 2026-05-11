const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

app.get("/", (req, res) => {
  res.json({
    message: "CloudVitals API Running"
  });
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
