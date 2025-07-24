export async function analyzeImageWithQwen(imageBuffer, mimeType) {
  console.log('🤖 Using Qwen2.5-VL for image analysis...');
  
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
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
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://food-calorie-estimator.vercel.app',
        'X-Title': 'Food Calorie Estimator'
      },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-72b-instruct:free',
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
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter API error response:', errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log('📝 Qwen2.5-VL Response:', content);

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
      console.error('❌ Failed to parse Qwen2.5-VL response as JSON:', parseError);
      throw new Error('Invalid response format from Qwen2.5-VL');
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

    console.log('✅ Qwen2.5-VL analysis completed successfully');
    return {
      success: true,
      result: parsedResult,
      usage: data.usage
    };

  } catch (error) {
    console.error('❌ Qwen2.5-VL API error:', error);
    
    if (error.message.includes('quota') || error.message.includes('billing')) {
      throw new Error('OpenRouter API quota exceeded. Please check your billing settings.');
    }
    
    if (error.message.includes('invalid') || error.message.includes('key')) {
      throw new Error('Invalid OpenRouter API key. Please check your configuration.');
    }

    throw new Error(`Qwen2.5-VL API error: ${error.message}`);
  }
} 