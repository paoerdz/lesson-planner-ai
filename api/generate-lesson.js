import Bytez from "bytez.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { grade, subject, objective } = req.body;

    const sdk = new Bytez(process.env.BYTEZ_API_KEY);
    const model = sdk.model("Qwen/Qwen3-0.6B");

    const { output, error } = await model.run([
      {
        role: "user",
        content: `Create a lesson plan for Grade ${grade}, Subject: ${subject}, Objective: ${objective}`
      }
    ]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ lesson: output[0].content });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
