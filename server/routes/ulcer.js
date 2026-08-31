import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import PatientRecord from "../models/PatientRecord.js";
import verifyToken from "../middleware/authMiddleware.js";
import { generateReport } from "../templates/report_templates.js";
import nodemailer from "nodemailer";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PREDICT_SCRIPT = path.resolve(__dirname, "../../model/predict.py");

// Gemini is kept ONLY for follow-up chat, not primary diagnosis
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const uploadToCloudinary = async (base64Image) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_UPLOAD_PRESET) {
    return base64Image;
  }
  try {
    const formData = new URLSearchParams();
    formData.append("file", base64Image);
    formData.append("upload_preset", process.env.CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.secure_url || base64Image;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return base64Image;
  }
};

// ─── Local Model Prediction ─────────────────────────────────────────────────

const predictWithLocalModel = (patientData) => {
  return new Promise((resolve, reject) => {
    const inputJson = JSON.stringify(patientData);

    const child = execFile("py", ["-3.11", PREDICT_SCRIPT], {
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) {
        console.error("Model prediction error:", error.message);
        if (stdout) console.error("Python STDOUT:", stdout.toString());
        if (stderr) console.error("Python STDERR:", stderr.toString());
        return reject(new Error("Local model prediction failed: " + error.message));
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (!result.success) {
          return reject(new Error(result.error || "Prediction returned failure"));
        }
        resolve(result);
      } catch (parseErr) {
        console.error("Failed to parse model output:", stdout);
        reject(new Error("Failed to parse model output"));
      }
    });

    // Send patient data via stdin
    child.stdin.write(inputJson);
    child.stdin.end();
  });
};

// ─── Gemini for follow-up chat only ─────────────────────────────────────────

const callGeminiChat = async (contents) => {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2048,
        },
      });
      const response = await model.generateContent(contents);
      const candidate = response.response.candidates?.[0];
      let text = response.response.text();

      const finishReason = candidate?.finishReason;
      if (finishReason === "MAX_TOKENS" || finishReason === "RECITATION") {
        console.warn("Chat response truncated. Requesting continuation...");
        try {
          const contPrompt = `The following response was cut off. Please complete it:\n\n${text}\n\nPlease continue from where it stopped:`;
          const contResponse = await model.generateContent(contPrompt);
          text = text + "\n" + contResponse.response.text();
        } catch (contErr) {
          console.warn("Chat continuation failed.", contErr.message);
        }
      }

      return text;
    } catch (err) {
      console.warn(`Gemini chat attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 1500 * attempt));
      }
    }
  }
  throw lastError || new Error("AI chat service unavailable. Please try again.");
};

// ─── Gemini Vision for Image Analysis ───────────────────────────────────────

const callGeminiVision = async (contents) => {
  const maxRetries = 5;
  let lastError = null;

  const getModel = () => genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4096,
    },
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = getModel();
      const response = await model.generateContent(contents);
      const candidate = response.response.candidates?.[0];
      let text = response.response.text();

      const finishReason = candidate?.finishReason;
      if (finishReason === "MAX_TOKENS" || finishReason === "RECITATION") {
        console.warn("Response truncated (finishReason:", finishReason, "). Requesting continuation...");
        try {
          const contModel = getModel();
          const contPrompt = `The following is a partial medical diagnostic report that was cut off. Please complete the remaining sections based on the context:\n\n${text}\n\nPlease continue from where it stopped:`;
          const contResponse = await contModel.generateContent(contPrompt);
          text = text + "\n" + contResponse.response.text();
        } catch (contErr) {
          console.warn("Continuation failed, using partial response.", contErr.message);
        }
      }

      if (!text || text.trim().length < 100) {
        throw new Error("Response was too short or empty. Retrying...");
      }

      return text;
    } catch (err) {
      console.warn(`Gemini Vision attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.min(1500 * attempt, 8000);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw lastError || new Error("AI service is currently under high demand. Please wait a moment and try again.");
};

// ─── Analyze Endpoint ───────────────────────────────────────────────────────

router.post("/analyze", verifyToken, async (req, res) => {
  try {
    const {
      messages,
      systemPrompt,
      symptoms,
      patientName,
      image,
      saveRecord = true,
    } = req.body;

    // ─── Follow-up chat (saveRecord=false) → use Gemini ─────
    if (saveRecord === false) {
      const userPrompt = messages?.map((m) => m.content).join("\n\n") || "Follow-up question.";
      const finalPrompt = `${systemPrompt}\n\nPatient Information:\n${userPrompt}`;
      const chatResult = await callGeminiChat([finalPrompt]);
      return res.json({ success: true, result: chatResult });
    }

    // ─── Primary diagnosis (Hybrid Router) ──────────────────
    let result = { primary: "", image: null };
    let riskLevel = "UNKNOWN";
    let urgency = "ROUTINE";
    let modelInfo = null;

    console.log("[MODEL] Running Primary Analysis using Local XGBoost model for:", patientName);
    
    // Strip image data before passing to local model to prevent massive stdin buffers
    const cleanSymptoms = { ...(symptoms || {}) };
    delete cleanSymptoms.image;
    
    const primaryPrediction = await predictWithLocalModel(cleanSymptoms);
    result.primary = generateReport(
      primaryPrediction.primary_diagnosis,
      primaryPrediction.confidence,
      primaryPrediction.top_predictions,
      primaryPrediction.risk_level,
      primaryPrediction.urgency,
      cleanSymptoms
    );
    riskLevel = primaryPrediction.risk_level;
    urgency = primaryPrediction.urgency;
    modelInfo = {
      diagnosis: primaryPrediction.primary_diagnosis,
      confidence: primaryPrediction.confidence,
      topPredictions: primaryPrediction.top_predictions,
      modelVersion: primaryPrediction.model_version,
    };

    if (image && typeof image === "string" && image.startsWith("data:")) {
      console.log("[MODEL] Image detected. Extracting parameters with Gemini...");
      const jsonPrompt = `
You are an expert oral pathologist. Analyze the provided image of an oral ulcer and extract key visual clinical parameters as a JSON object.
ONLY output valid JSON. Do not include markdown formatting or extra text.

Extract as many of these fields as possible based solely on the image:
- size: "Pinpoint", "Small", "Medium", "Large", "Very large"
- shape: "Round", "Oval", "Irregular"
- color: "White/Grey", "Yellow", "Red", "Mixed", "Black/Dark"
- border: "Smooth", "Raised", "Irregular"
- bleedsEasily: true or false (if obvious bleeding is present)
- soreLocation: "Inner lip", "Inner cheek", "Tongue (top)", "Tongue (side/bottom)", "Gum", "Roof of mouth", "Floor of mouth"
- alongBiteLine: true or false
- hardRaisedEdges: true or false
- numberOfSores: "1", "2-3", "4-5", "> 5"

Example output:
{
  "size": "Medium",
  "shape": "Oval",
  "color": "White/Grey",
  "border": "Raised",
  "soreLocation": "Inner lip",
  "numberOfSores": "1"
}`;
      
      let promptContents = [jsonPrompt];
      const matches = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches) {
        promptContents.push({
          inlineData: { data: matches[2], mimeType: matches[1] },
        });
      }
      
      try {
        const geminiOutput = await callGeminiVision(promptContents);
        const cleanJsonString = geminiOutput.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const extractedParams = JSON.parse(cleanJsonString);
        console.log("[MODEL] Gemini extracted parameters:", extractedParams);
        
        // Run XGBoost again using only the image-extracted parameters
        // Run XGBoost again using only the image-extracted parameters
        const imagePrediction = await predictWithLocalModel(extractedParams);
        
        console.log("[MODEL] Generating custom Gemini report for image prediction...");
        const reportPrompt = `
You are an expert oral pathologist AI. 
The underlying analytical model has evaluated the visual features of the patient's ulcer and made the following definitive diagnosis:
- Diagnosis: ${imagePrediction.primary_diagnosis}
- Risk Level: ${imagePrediction.risk_level}
- Urgency: ${imagePrediction.urgency}

Visual features identified:
${JSON.stringify(extractedParams, null, 2)}

Write a structured 9-section clinical report validating this diagnosis. 
You MUST NOT contradict the provided diagnosis, risk level, or urgency. They are final.
Your report should focus on how the visual features align with the diagnosis.

FORMATTING RULES (CRITICAL):
1. ONLY the 9 section titles should be UPPERCASE.
2. The explanation text MUST be in regular sentence case (e.g., "This condition requires..."). DO NOT write explanations in all-caps.
3. ALWAYS put the explanation/details on a NEW LINE starting with a bullet point (-). Do NOT put explanations on the same line as the section title.

Example Format:
4. RISK LEVEL: MODERATE
- Requires prompt evaluation to identify the causative agent...
`;
        const generatedText = await callGeminiVision([systemPrompt, reportPrompt]);
        result.image = generatedText.trim();
      } catch (err) {
        console.error("[MODEL] Image parameter extraction or prediction failed:", err);
        result.image = "Image analysis failed to extract valid clinical parameters.";
      }
    }

    // Handle image upload
    let savedImageUrl = "";
    if (image && typeof image === "string" && image.startsWith("data:")) {
      savedImageUrl = await uploadToCloudinary(image);
    }

    // Save to database
    const validUserId = req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)
      ? req.user.id
      : null;

    const record = await PatientRecord.create({
      patientName: patientName || "Anonymous",
      symptoms: symptoms || {},
      diagnosis: result,
      aiResponse: result,
      riskLevel: riskLevel,
      urgency: urgency,
      user: validUserId,
      userEmail: req.user.email,
      imageUrl: savedImageUrl,
    });

    res.json({
      success: true,
      result,
      record,
      modelInfo: modelInfo,
    });

  } catch (error) {
    console.error("Analyze error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ─── Records ────────────────────────────────────────────────────────────────

router.get("/records", verifyToken, async (req, res) => {
  try {
    const filter = req.user.isAdmin ? {} : { user: req.user.id };
    const records = await PatientRecord.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    console.error("Records error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/records/:id", verifyToken, async (req, res) => {
  try {
    const filter = req.user.isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user.id };

    const deleted = await PatientRecord.findOneAndDelete(filter);

    if (!deleted) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }

    res.json({ success: true, msg: "Record deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/email-report", verifyToken, async (req, res) => {
  try {
    const { recordId, targetEmail } = req.body;
    if (!recordId || !targetEmail) return res.status(400).json({ success: false, error: "Missing required fields" });

    const filter = req.user.isAdmin ? { _id: recordId } : { _id: recordId, user: req.user.id };
    const record = await PatientRecord.findOne(filter);
    
    if (!record) return res.status(404).json({ success: false, error: "Record not found" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const htmlContent = `
      <h2>Oral Ulcer Diagnosis Report</h2>
      <p><strong>Patient Name:</strong> ${record.patientName}</p>
      <p><strong>Date:</strong> ${new Date(record.createdAt).toLocaleDateString()}</p>
      <p><strong>Diagnosis:</strong> ${record.diagnosis}</p>
      <p><strong>Risk Level:</strong> ${record.riskLevel}</p>
      <p><strong>Urgency:</strong> ${record.urgency}</p>
      <hr />
      <h3>Detailed AI Report</h3>
      <pre style="white-space: pre-wrap; font-family: sans-serif;">${record.aiResponse}</pre>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: targetEmail,
      subject: `OUDS Report for ${record.patientName}`,
      html: htmlContent,
    });

    res.json({ success: true, msg: "Report emailed successfully!" });
  } catch (error) {
    console.error("Email report error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;