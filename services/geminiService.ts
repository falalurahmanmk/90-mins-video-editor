import { GoogleGenAI, Type } from "@google/genai";
import type { Word } from '../types';

// Assume process.env.API_KEY is available
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    // In a real app, you'd handle this more gracefully.
    // For this environment, we assume it's set.
    console.warn("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateCaptions = async (audioBase64: string, audioMimeType: string): Promise<Word[]> => {
  // Using a more powerful model suitable for audio transcription
  const model = "gemini-2.5-pro"; 

  const prompt = `You are an expert audio transcription service.
  Transcribe the provided audio file with precise word-level timestamps.
  The output must be a valid JSON array of objects.
  Each object in the array must have three properties:
  1. "word": a string representing a single word.
  2. "start": a number representing the start time of the word in seconds (float).
  3. "end": a number representing the end time of the word in seconds (float).
  
  Do not include any text, explanation, or markdown formatting outside of the JSON array. The response should be only the JSON.`;

  try {
    const audioPart = {
      inlineData: {
        mimeType: audioMimeType,
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{text: prompt}, audioPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER },
            },
            required: ["word", "start", "end"],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    const captions = JSON.parse(jsonText) as Word[];
    
    if (!Array.isArray(captions)) {
        // If it's an empty array, it's valid (e.g. silent audio)
        // but if it's not an array at all, it's an error.
        throw new Error("Invalid caption format received from API: not an array");
    }

    if (captions.length > 0 && (captions[0].word === undefined || captions[0].start === undefined)) {
        throw new Error("Invalid caption format received from API: missing required fields");
    }


    return captions;
  } catch (error) {
    console.error("Error generating captions:", error);
    if (error instanceof Error && error.message.includes("JSON.parse")) {
        throw new Error("The AI model returned an invalid format. Please try a different audio file.");
    }
    throw new Error("Failed to communicate with the generative AI model.");
  }
};