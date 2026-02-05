/**
 * ElevenLabs Text-to-Speech Integration
 * 
 * Converts text to speech using the ElevenLabs API.
 */

const { getConfig } = require('../config.cjs');

// Default voice ID (George - a clear, warm voice)
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

/**
 * Check if ElevenLabs is configured
 */
function isConfigured() {
  const elevenlabsConfig = getConfig('elevenlabs');
  return !!(elevenlabsConfig?.apiKey);
}

/**
 * Get the configured voice ID or default
 */
function getVoiceId() {
  const elevenlabsConfig = getConfig('elevenlabs');
  return elevenlabsConfig?.voiceId || DEFAULT_VOICE_ID;
}

/**
 * Convert text to speech using ElevenLabs API
 * @param {string} text - The text to convert to speech
 * @param {Object} options - Optional settings
 * @param {string} options.voiceId - Override the default voice ID
 * @param {string} options.modelId - Override the default model ID
 * @returns {Promise<ArrayBuffer>} - The audio data as an ArrayBuffer
 */
async function textToSpeech(text, options = {}) {
  if (!isConfigured()) {
    throw new Error('ElevenLabs API key not configured. Please add your API key in settings.');
  }

  const elevenlabsConfig = getConfig('elevenlabs');
  const apiKey = elevenlabsConfig.apiKey;
  const voiceId = options.voiceId || getVoiceId();
  const modelId = options.modelId || DEFAULT_MODEL_ID;

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      // Try to parse the error for a better message
      let errorMessage = `ElevenLabs API error (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail) {
          // Handle validation errors like { detail: { status: "...", message: "..." } }
          if (typeof errorJson.detail === 'object' && errorJson.detail.message) {
            errorMessage = errorJson.detail.message;
          } else if (typeof errorJson.detail === 'string') {
            errorMessage = errorJson.detail;
          }
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // If not JSON, use the raw text if meaningful
        if (errorText && errorText.length < 200) {
          errorMessage = errorText;
        }
      }
      
      // Special handling for common errors
      if (response.status === 401) {
        errorMessage = 'Invalid ElevenLabs API key. Please check your API key in settings.';
      } else if (response.status === 422) {
        errorMessage = 'Invalid request to ElevenLabs API. The text might be too long or contain invalid characters.';
      }
      
      throw new Error(errorMessage);
    }

    // Return the audio data as an ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    return audioBuffer;
  } catch (error) {
    console.error('ElevenLabs text-to-speech error:', error);
    throw error;
  }
}

/**
 * Get list of available voices (for future settings UI)
 * @returns {Promise<Array>} - List of available voices
 */
async function getVoices() {
  if (!isConfigured()) {
    throw new Error('ElevenLabs API key not configured.');
  }

  const elevenlabsConfig = getConfig('elevenlabs');
  const apiKey = elevenlabsConfig.apiKey;

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    throw error;
  }
}

module.exports = {
  isConfigured,
  getVoiceId,
  textToSpeech,
  getVoices,
  DEFAULT_VOICE_ID,
  DEFAULT_MODEL_ID,
};
