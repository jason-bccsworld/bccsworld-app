import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env file
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  for (const line of envLines) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface ExtractedField {
  fieldName: string;
  extractedValue: string;
  confidenceScore: number;
}

export async function extractFieldsWithNLP(text: string): Promise<ExtractedField[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert in aviation training document analysis. Extract key information from training documents and return it in JSON format. 

Focus on these fields:
- studentName: Full name of the student/pilot
- licenseNumber: License or certificate number
- eventType: Type of training event (checkride, flight review, etc.)
- eventDate: Date of the training event
- instructorName: Name of the instructor
- status: Status of the training (completed, pending, etc.)

For each field, provide a confidence score between 0 and 100 based on how certain you are about the extraction.

Return JSON in this format:
{
  "fields": [
    {
      "fieldName": "studentName",
      "extractedValue": "John Doe",
      "confidenceScore": 95
    },
    {
      "fieldName": "licenseNumber", 
      "extractedValue": "PPL-2024-001",
      "confidenceScore": 87
    }
  ]
}

If you cannot find a field, omit it from the response.`,
        },
        {
          role: "user",
          content: `Extract aviation training information from this text:\n\n${text}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.fields || [];
  } catch (error) {
    console.error("NLP processing error:", error);
    throw new Error("Failed to extract fields with NLP");
  }
}
