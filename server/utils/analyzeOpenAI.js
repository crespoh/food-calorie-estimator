import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeImageWithOpenAI(imageBuffer, mimeType) {
  console.log('🤖 Using OpenAI GPT-4o for image analysis...');
  
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

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
4. A brief explanation of your analysis

Return the response as a valid JSON object with this exact structure:
{
  "foodItems": ["item1", "item2", "item3"],
  "totalCalories": 650,
  "nutritionFacts": {
    "protein_g": 35,
    "fat_g": 28,
    "carbohydrates_g": 55
  },
  "explanation": "A meal of fried chicken with rice and broccoli typically contains around 650 calories..."
}

Be realistic with your estimates and only include food items you can clearly identify.`;

  try {
    const response = await openai.chat.completions.create({
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