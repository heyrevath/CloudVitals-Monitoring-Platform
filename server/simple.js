import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello");
});

app.listen(5001, () => {
  console.log("Listening on 5001");
});

setInterval(() => {
  console.log("still running");
}, 5000);
