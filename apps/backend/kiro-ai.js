// Kiro AI integration - calls EC2 Kiro API server
const EC2_KIRO_API = process.env.EC2_KIRO_API || 'http://44.220.45.57:8080';
const KIRO_TIMEOUT = 120000; // 2 minutes

async function callKiroAPI(endpoint, payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), KIRO_TIMEOUT);
  
  try {
    const response = await fetch(`${EC2_KIRO_API}/kiro/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Kiro API returned ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Kiro API timeout');
    }
    throw error;
  }
}

export async function analyzeInvestWithKiro(story) {
  try {
    console.log('📊 Calling Kiro API for INVEST analysis');
    return await callKiroAPI('analyze-invest', { story });
  } catch (error) {
    console.error('❌ Kiro INVEST analysis failed:', error.message);
    throw error;
  }
}

export async function generateStoryDraftWithKiro(idea, parentStory) {
  try {
    console.log('📝 Calling Kiro API for story generation');
    return await callKiroAPI('generate-story', { idea, parentStory });
  } catch (error) {
    console.error('❌ Kiro story generation failed:', error.message);
    throw error;
  }
}

export async function generateAcceptanceTestWithKiro(story, idea) {
  try {
    console.log('✅ Calling Kiro API for test generation');
    return await callKiroAPI('generate-test', { story, idea });
  } catch (error) {
    console.error('❌ Kiro test generation failed:', error.message);
    throw error;
  }
}
