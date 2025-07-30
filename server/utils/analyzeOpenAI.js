import { OpenAI } from 'openai';

let openai = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export async function analyzeImageWithOpenAI(imageBuffer, mimeType) {
  console.log('🤖 Using OpenAI GPT-4o for image analysis...');
  
  const client = getOpenAIClient();

  // Convert image to base64
  const base64Image = imageBuffer.toString('base64');

  // Create the prompt for calorie estimation
  const prompt = `You are a helpful assistant that identifies food and estimates nutritional information from a photo.

Please analyze this image and return:
1. A list of identifiable food items
2. An estimated total calorie count
3. A nutrition facts breakdown, including:
   - Protein (g)
   - Fat (g)
   - Carbohydrates (g)
   - (Include other nutrients if clearly identifiable, like fiber or sugar)
4. Serving size (e.g., 1 plate, 1 bowl, 100g), if possible
5. A confidence score (0–1) representing how certain you are about the identification and estimation
6. A brief explanation of how you arrived at these estimates

If the food is unclear, say so and provide general estimates based on visual clues.

Format your response as a JSON object like this:
{
  "foodItems": ["item1", "item2", ...],
  "totalCalories": number,
  "nutritionFacts": {
    "protein_g": number,
    "fat_g": number,
    "carbohydrates_g": number,
    "fiber_g": number,
    "sugar_g": number
  },
  "servingSize": "string",
  "confidenceScore": number,
  "explanation": "your explanation here"
}`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    const content = response.choices[0].message.content;
    console.log('📝 OpenAI Response:', content);

    // Parse the JSON response
    let parsedResult;
    try {
      // Try to extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response as JSON:', parseError);
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate the response structure
    if (!parsedResult.foodItems || !Array.isArray(parsedResult.foodItems)) {
      throw new Error('Invalid response: missing or invalid foodItems array');
    }

    if (typeof parsedResult.totalCalories !== 'number') {
      throw new Error('Invalid response: missing or invalid totalCalories');
    }

    if (!parsedResult.explanation || typeof parsedResult.explanation !== 'string') {
      throw new Error('Invalid response: missing or invalid explanation');
    }

    console.log('✅ OpenAI analysis completed successfully');
    return {
      success: true,
      result: parsedResult,
      usage: response.usage
    };

  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    
    if (error.code === 'quota_exceeded') {
      throw new Error('OpenAI API quota exceeded. Please check your billing settings.');
    }
    
    if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    }

    throw new Error(`OpenAI API error: ${error.message}`);
  }
} 