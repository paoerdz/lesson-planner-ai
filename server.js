import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Bytez from "bytez.js";

dotenv.config();

const app = express();
app.use(cors()); // allow all origins
app.use(express.json());

const sdk = new Bytez(process.env.BYTEZ_API_KEY);
const model = sdk.model("Qwen/Qwen3-0.6B");

app.post("/api/generate-lesson", async (req, res) => {
  const { grade, subject, objective } = req.body;

  try {
    const { output, error } = await model.run([
      { role: "user", content: `Create a lesson plan for ${subject} grade ${grade}, objective: ${objective}` }
    ]);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ lesson: output[0].content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
