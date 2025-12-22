export const generateImage = async (prompt, styleId) => {
  try {
    const response = await fetch('/api/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        style_id: styleId,
        model_config: {
          model: 'gpt-image-1.5',
          quality: 'high',
          size: '1024x1024'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Generation request failed:', error);
    throw error;
  }
};
