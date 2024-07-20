# 🎙️ Claude AI Speech-to-Text Chrome Extension 🤖

![Demo](https://raw.githubusercontent.com/unclecode/claudet/main/howto.gif)

## Why This Extension? 🤔
Hey there!

I don't know if you've felt this way, but I love using AI assistants like Claude. Recently, I found myself wishing I could talk to Claude instead of typing all the time. I enjoyed the speech-to-text feature when communicating with ChatGPT, and I wanted the same experience with Claude.

That's when I had an idea: why not create a Chrome extension to bring this functionality to Claude? I like Groq's super-fast Whisper model, and I also appreciate the power of local processing using WebGPU. So, I decided to create an extension that offers both options.

This Chrome extension has been a game-changer for me personally, making my interactions with Claude more natural and efficient. I hope it can do the same for you!

## Features 🚀

- 🎤 Adds a microphone button to Claude AI's text input area
- 🔄 Two speech-to-text conversion methods:
  1. Groq API (using Whisper model)
  2. Transformer.js (local processing with WebGPU)
- 🔀 Switch between conversion methods easily
- 🔒 Privacy-focused design

## Two Powerful Approaches 💪

### 1. Groq API - Speed and Accuracy ⚡

If you're looking for lightning-fast transcription, the Groq API is the way to go. It uses the Whisper model, which is known for its speed and accuracy. This option is perfect when you need quick, reliable transcriptions and don't mind using an external API.

### 2. Transformer.js - Local Processing 💻

For those who prefer to keep everything on their local machine, we've integrated Transformer.js. This approach leverages your computer's Web GPU capabilities to process speech-to-text locally. While it might not be as fast as Groq, it offers the benefit of complete privacy and works offline.

You can easily switch between these two methods depending on your needs - whether you prioritize speed or local processing.

## Installation 📥

### From Chrome Web Store (Coming Soon! 🔜)

Great news! The extension will be available on the Chrome Web Store in the next few days. This will make installation quick and easy. Stay tuned for the link!

### From GitHub (Available Now! 🎉)

1. Clone this repository or download it as a ZIP file
2. Unzip the file (if downloaded as ZIP)
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right corner
5. Click "Load unpacked" and select the extension directory

## Usage 🔧

1. After installation, head over to the Claude AI interface
2. Look for the new microphone button next to the text input area
3. Click it and start talking - it's that simple!
4. Watch as your words appear in the input box

### Switching Conversion Methods 🔄

- Check out the extension settings to choose between Groq API and Transformer.js
- To use Groq API, you'll need to provide your API token in the settings

## Privacy and Security 🛡️

- Your Groq API token is stored safely in your browser's local storage
- All speech-to-text conversion happens on your device when using Transformer.js

## Contributing 🤝

Got ideas to make this even better? Feel free to submit a Pull Request!

## License 📄

MIT License

## Disclaimer ⚠️

This is an unofficial extension and is not affiliated with Anthropic (creators of Claude AI) or Groq.

## Let's Make AI Conversations More Natural! 💬

I hope this extension enhances your Claude AI experience as much as it has mine. Whether you prefer the speed of Groq or the privacy of local processing, this tool aims to make your interactions with Claude more natural and efficient. Enjoy!