/**
 * Gemini Service - Handles interaction with Google's Gemini API for multimodal tasks.
 * Includes exponential backoff for reliable API calls.
 */
// FIX: Changed static require to dynamic import for node-fetch ESM compatibility
// We will store the imported fetch function in a variable outside of the functions
let fetch;
import("node-fetch")
  .then((mod) => {
    fetch = mod.default;
  })
  .catch((err) => {
    console.error(
      "Failed to load node-fetch. The Gemini service will not work.",
      err
    );
  });

require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
const MAX_RETRIES = 5;

// Define a JSON schema for structured output (number plate)
const responseSchema = {
  type: "OBJECT",
  properties: {
    licensePlate: {
      type: "STRING",
      description:
        "The most prominent license plate number detected in the image, strictly alphanumeric and capitalized.",
    },
  },
  required: ["licensePlate"],
};

/**
 * Executes a POST request to the Gemini API with exponential backoff.
 * @param {string} userPrompt - Text prompt for the model.
 * @param {string} base64Image - Base64 encoded image data.
 * @returns {Promise<Object>} The parsed JSON response from the model.
 */
async function callGeminiApiWithBackoff(userPrompt, base64Image) {
  if (!fetch) {
    throw new Error(
      "node-fetch dependency not loaded. Cannot connect to Gemini API."
    );
  }
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Gemini API Key is not configured in environment variables."
    );
  }

  const payload = {
    // Contents array remains the same
    contents: [
      {
        role: "user",
        parts: [
          { text: userPrompt },
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG for common camera output
              data: base64Image,
            },
          },
        ],
      },
    ],
    // FIX: The generationConfig must be a top-level property, NOT inside contents.
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  };

  let lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // If the error is not a rate limit (429), throw immediately
        if (response.status !== 429) {
          const errorBody = await response.text();
          throw new Error(
            `API returned status ${response.status}: ${errorBody}`
          );
        }
        lastError = `Rate limit error on attempt ${attempt + 1}`;
      } else {
        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) {
          throw new Error("Gemini response was empty or malformed.");
        }
        return JSON.parse(jsonText);
      }
    } catch (error) {
      lastError = error.message;
      console.warn(
        `Gemini API Call Attempt ${attempt + 1} failed. Retrying in ${
          Math.pow(2, attempt) * 1000
        }ms. Error: ${error.message}`
      );
    }

    // Exponential backoff
    if (attempt < MAX_RETRIES - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  throw new Error(
    `Failed to call Gemini API after ${MAX_RETRIES} attempts. Last error: ${lastError}`
  );
}

/**
 * Public function to extract the license plate from an image.
 * @param {string} base64Image - Base64 encoded image data.
 * @returns {Promise<string>} Extracted license plate number.
 */
async function extractLicensePlate(base64Image) {
  // UPDATED PROMPT: Giving explicit format examples to guide the model.
  const prompt =
    "Identify the license plate number visible in this image. This is an Indian auto rickshaw plate from Maharashtra, starting with MH. The plate format is MH-XX-YY-ZZZZ. Output the plate string without any spaces or dashes (e.g., MH02DK6801). Strictly output the result as a JSON object matching the provided schema, containing only the capitalized alphanumeric license plate text. Do not include any other text or explanation in the response.";

  const jsonResponse = await callGeminiApiWithBackoff(prompt, base64Image);

  // Ensure the output is clean and capitalized
  if (jsonResponse && jsonResponse.licensePlate) {
    // The cleanup regex here handles removal of spaces/dashes if the model includes them
    return String(jsonResponse.licensePlate)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  throw new Error("Could not extract a valid license plate from the image.");
}

module.exports = {
  extractLicensePlate,
};
