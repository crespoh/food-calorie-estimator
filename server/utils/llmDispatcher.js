import { analyzeImageWithOpenAI } from './analyzeOpenAI.js';
import { analyzeImageWithQwen } from './analyzeQwen.js';

export async function analyzeImage(req, imageBuffer) {
  const llmProvider = process.env.LLM_PROVIDER?.toLowerCase() || 'openai';
  
  console.log(`🚀 LLM Provider: ${llmProvider.toUpperCase()}`);
  
  try {
    let result;
    
    switch (llmProvider) {
      case 'openai':
        result = await analyzeImageWithOpenAI(imageBuffer, req.file.mimetype);
        break;
        
      case 'qwen':
        result = await analyzeImageWithQwen(imageBuffer, req.file.mimetype);
        break;
        
      default:
        console.warn(`⚠️ Unknown LLM provider: ${llmProvider}, falling back to OpenAI`);
        result = await analyzeImageWithOpenAI(imageBuffer, req.file.mimetype);
        break;
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error with ${llmProvider.toUpperCase()} provider:`, error.message);
    
    // If the primary provider fails, try the fallback provider
    if (llmProvider === 'qwen') {
      console.log('🔄 Falling back to OpenAI...');
      try {
        return await analyzeImageWithOpenAI(imageBuffer, req.file.mimetype);
      } catch (fallbackError) {
        console.error('❌ Fallback to OpenAI also failed:', fallbackError.message);
        throw error; // Throw the original error
      }
    } else if (llmProvider === 'openai') {
      console.log('🔄 Falling back to Qwen2.5-VL...');
      try {
        return await analyzeImageWithQwen(imageBuffer, req.file.mimetype);
      } catch (fallbackError) {
        console.error('❌ Fallback to Qwen2.5-VL also failed:', fallbackError.message);
        throw error; // Throw the original error
      }
    }
    
    throw error;
  }
} 