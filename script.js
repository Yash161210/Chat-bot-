// API Configuration
const API_CONFIG = {
    url: "https://api.euron.one/api/v1/euri/chat/completions",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer euri-bdd0572d818314c74e9c5b82cc38d1192e10ebbc9df49b3631408e4626ee1f08"
    },
    model: "gpt-4.1-nano",
    max_tokens: 1000,
    temperature: 0.7
};

// DOM Elements
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const attachBtn = document.getElementById('attachBtn');
const emojiBtn = document.getElementById('emojiBtn');
const menuBtn = document.getElementById('menuBtn');

// Chat History
let chatHistory = [];
let isWaitingForResponse = false;
let mathJaxReady = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    adjustTextareaHeight();
    loadChatHistory();
    hideWelcomeMessage();
    waitForMathJax();
});

// Wait for MathJax to load
function waitForMathJax() {
    if (window.MathJax && window.MathJax.startup && window.MathJax.startup.ready) {
        window.MathJax.startup.promise.then(() => {
            mathJaxReady = true;
            console.log('MathJax is ready');
        });
    } else {
        // Check periodically if MathJax loads later
        setTimeout(waitForMathJax, 100);
    }
}

// Event Listeners
function initializeEventListeners() {
    // Send button
    sendBtn.addEventListener('click', handleSendMessage);
    
    // Enter key to send (Shift+Enter for new line)
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Auto-resize textarea
    messageInput.addEventListener('input', adjustTextareaHeight);
    
    // Suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.textContent.trim();
            messageInput.value = text;
            adjustTextareaHeight();
            handleSendMessage();
        });
    });
    
    // Menu button (placeholder for future features)
    menuBtn.addEventListener('click', () => {
        // Could add menu functionality here
        console.log('Menu clicked');
    });
    
    // Attach button (placeholder)
    attachBtn.addEventListener('click', () => {
        // Could add file attachment functionality here
        console.log('Attach clicked');
    });
    
    // Emoji button (placeholder)
    emojiBtn.addEventListener('click', () => {
        // Could add emoji picker functionality here
        console.log('Emoji clicked');
    });
}

// Adjust textarea height dynamically
function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
}

// Hide welcome message when first message is sent
function hideWelcomeMessage() {
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage && chatHistory.length > 0) {
        welcomeMessage.style.display = 'none';
    }
}

// Handle send message
async function handleSendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || isWaitingForResponse) {
        return;
    }
    
    // Add user message to UI
    addMessage(message, 'user');
    
    // Clear input
    messageInput.value = '';
    adjustTextareaHeight();
    
    // Hide welcome message
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
    }
    
    // Disable input while waiting for response
    setInputEnabled(false);
    isWaitingForResponse = true;
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Get AI response
        const response = await getAIResponse(message);
        
        // Hide typing indicator
        hideTypingIndicator();
        
        // Add AI response to UI
        addMessage(response, 'assistant');
        
        // Save to history
        saveChatHistory();
        
    } catch (error) {
        console.error('Error:', error);
        hideTypingIndicator();
        addMessage('Sorry, I encountered an error. Please try again.', 'assistant', true);
    } finally {
        setInputEnabled(true);
        isWaitingForResponse = false;
    }
}

// Get AI response from API
async function getAIResponse(userMessage) {
    // Add user message to chat history
    chatHistory.push({
        role: "user",
        content: userMessage
    });
    
    // Prepare payload
    const payload = {
        messages: chatHistory,
        model: API_CONFIG.model,
        max_tokens: API_CONFIG.max_tokens,
        temperature: API_CONFIG.temperature
    };
    
    // Make API request
    const response = await fetch(API_CONFIG.url, {
        method: 'POST',
        headers: API_CONFIG.headers,
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract AI response
    let aiMessage = data.choices?.[0]?.message?.content || 
                    data.content || 
                    "I'm sorry, I couldn't generate a response. Please try again.";
    
    // Format the response for square root answers
    aiMessage = formatSquareRootAnswer(aiMessage);
    
    // Add AI message to chat history
    chatHistory.push({
        role: "assistant",
        content: aiMessage
    });
    
    return aiMessage;
}

// Format square root answers to "Square root of X = Y" format
function formatSquareRootAnswer(text) {
    // Remove all LaTeX display blocks \[ ... \] completely
    let cleanedText = text.replace(/\\\[[\s\S]*?\\\]/g, '');
    
    // Remove all LaTeX inline math \( ... \)
    cleanedText = cleanedText.replace(/\\\([\s\S]*?\\\)/g, '');
    
    // Normalize text by removing extra whitespace
    const normalizedText = cleanedText.replace(/\s+/g, ' ').trim();
    
    // Extract number from various patterns
    let number = null;
    let result = null;
    
    // Pattern 1: LaTeX with result: \sqrt{144} = 12 (even after cleaning)
    const latexWithResult = /\\sqrt\{(\d+)\}\s*=\s*(\d+)/;
    const latexResultMatch = text.match(latexWithResult);
    
    if (latexResultMatch) {
        number = parseInt(latexResultMatch[1]);
        result = parseInt(latexResultMatch[2]);
        // Verify it's correct
        if (result * result === number) {
            return `Square root of ${number} = ${result}`;
        }
    }
    
    // Pattern 2: "square root of 144" or "√144" in text
    const sqrtTextRegex = /(?:square\s+root\s+of|sqrt|√)\s*(\d+)/i;
    const textMatch = normalizedText.match(sqrtTextRegex);
    
    // Pattern 3: LaTeX \sqrt{144} (without result, need to calculate)
    const latexRegex = /\\sqrt\{(\d+)\}/;
    const latexMatch = text.match(latexRegex);
    
    // Pattern 4: Extract from "sqrt(144)" or similar
    const sqrtFuncRegex = /sqrt\((\d+)\)/i;
    const funcMatch = normalizedText.match(sqrtFuncRegex);
    
    // Determine which number to use
    if (textMatch) {
        number = parseInt(textMatch[1]);
    } else if (latexMatch) {
        number = parseInt(latexMatch[1]);
    } else if (funcMatch) {
        number = parseInt(funcMatch[1]);
    }
    
    // If we found a number, calculate or use the result
    if (number) {
        if (result === null) {
            result = Math.sqrt(number);
            // Only format if it's a whole number
            if (result !== Math.floor(result)) {
                return cleanedText; // Return cleaned text if not a perfect square
            }
        }
        
        // Return ONLY the answer in the exact format requested
        return `Square root of ${number} = ${result}`;
    }
    
    // Handle patterns like "144 = 12" where 12*12 = 144
    const squarePattern = /(\d+)\s*=\s*(\d+)/;
    const squareMatch = normalizedText.match(squarePattern);
    if (squareMatch) {
        const num = parseInt(squareMatch[1]);
        const res = parseInt(squareMatch[2]);
        if (num > 0 && res > 0 && res * res === num) {
            return `Square root of ${num} = ${res}`;
        }
    }
    
    // If no pattern matched, return cleaned text (without LaTeX blocks)
    return cleanedText;
}

// Add message to UI
function addMessage(text, sender, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const bubbleDiv = document.createElement('div');
    
    // Check if this is a square root answer (simple format, no LaTeX)
    const isSquareRootAnswer = /^Square root of \d+ = \d+$/.test(text);
    
    if (isSquareRootAnswer) {
        // Don't add MathJax class for simple square root answers
        bubbleDiv.className = 'message-bubble';
    } else {
        bubbleDiv.className = 'message-bubble tex2jax_process';
    }
    
    // Format message text (preserve line breaks)
    const formattedText = formatMessage(text);
    bubbleDiv.innerHTML = formattedText;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = getCurrentTime();
    
    messageDiv.appendChild(bubbleDiv);
    messageDiv.appendChild(timeDiv);
    
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    scrollToBottom();
    
    // Add animation
    messageDiv.style.animation = 'messageSlide 0.3s ease-out';
    
    // Only render MathJax if it's not a simple square root answer
    if (!isSquareRootAnswer) {
        setTimeout(() => {
            renderMathJax(bubbleDiv);
        }, 50);
    }
}

// Render MathJax equations in an element
function renderMathJax(element) {
    // Wait for MathJax to be ready
    const tryRender = () => {
        if (window.MathJax && window.MathJax.typesetPromise) {
            // MathJax is ready, render the element
            window.MathJax.typesetPromise([element]).then(() => {
                scrollToBottom(); // Scroll again after math is rendered
            }).catch((err) => {
                console.warn('MathJax rendering error:', err);
            });
        } else if (window.MathJax && window.MathJax.startup) {
            // Wait for startup promise
            if (window.MathJax.startup.promise) {
                window.MathJax.startup.promise.then(() => {
                    if (window.MathJax && window.MathJax.typesetPromise) {
                        window.MathJax.typesetPromise([element]).then(() => {
                            scrollToBottom();
                        }).catch((err) => {
                            console.warn('MathJax rendering error:', err);
                        });
                    }
                });
            } else {
                // MathJax is loading, wait and retry
                setTimeout(tryRender, 200);
            }
        } else if (window.MathJax) {
            // MathJax script is loaded but not initialized yet
            setTimeout(tryRender, 200);
        } else {
            // MathJax not loaded at all, try again
            setTimeout(tryRender, 500);
        }
    };
    
    // Start trying immediately
    tryRender();
}

// Format message text
function formatMessage(text) {
    // Protect LaTeX blocks by temporarily replacing them with placeholders
    const latexBlocks = [];
    let placeholderIndex = 0;
    
    // Store display math blocks \[ ... \] (multiline support)
    let formatted = text.replace(/\\\[[\s\S]*?\\\]/g, (match) => {
        const placeholder = `__LATEX_DISPLAY_${placeholderIndex}__`;
        latexBlocks.push({ placeholder, content: match });
        placeholderIndex++;
        return placeholder;
    });
    
    // Store inline math blocks \( ... \)
    formatted = formatted.replace(/\\\([\s\S]*?\\\)/g, (match) => {
        const placeholder = `__LATEX_INLINE_${placeholderIndex}__`;
        latexBlocks.push({ placeholder, content: match });
        placeholderIndex++;
        return placeholder;
    });
    
    // Now process regular text: convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s<>\[\]\(\)]+)/g;
    formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">$1</a>');
    
    // Convert code blocks (basic support)
    formatted = formatted.replace(/`([^`\n]+)`/g, '<code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');
    
    // Restore LaTeX blocks (keep original line breaks and formatting)
    latexBlocks.forEach(({ placeholder, content }) => {
        formatted = formatted.replace(placeholder, content);
    });
    
    return formatted;
}

// Get current time
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Show typing indicator
function showTypingIndicator() {
    typingIndicator.classList.add('active');
    scrollToBottom();
}

// Hide typing indicator
function hideTypingIndicator() {
    typingIndicator.classList.remove('active');
}

// Scroll to bottom
function scrollToBottom() {
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

// Enable/disable input
function setInputEnabled(enabled) {
    messageInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
    
    if (enabled) {
        messageInput.focus();
    }
}

// Save chat history to localStorage
function saveChatHistory() {
    try {
        localStorage.setItem('chatbot_history', JSON.stringify(chatHistory));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// Load chat history from localStorage
function loadChatHistory() {
    try {
        const saved = localStorage.getItem('chatbot_history');
        if (saved) {
            chatHistory = JSON.parse(saved);
            
            // Restore messages in UI
            if (chatHistory.length > 0) {
                const welcomeMessage = document.querySelector('.welcome-message');
                if (welcomeMessage) {
                    welcomeMessage.style.display = 'none';
                }
                
                chatHistory.forEach((msg, index) => {
                    // Only show user messages and assistant responses
                    if (msg.role === 'user' || msg.role === 'assistant') {
                        const sender = msg.role === 'user' ? 'user' : 'assistant';
                        const messageDiv = document.createElement('div');
                        messageDiv.className = `message ${sender}`;
                        
                        const bubbleDiv = document.createElement('div');
                        bubbleDiv.className = 'message-bubble';
                        bubbleDiv.innerHTML = formatMessage(msg.content);
                        
                        const timeDiv = document.createElement('div');
                        timeDiv.className = 'message-time';
                        // Use current time as fallback (could store timestamps)
                        timeDiv.textContent = getCurrentTime();
                        
                        messageDiv.appendChild(bubbleDiv);
                        messageDiv.appendChild(timeDiv);
                        
                        messagesContainer.appendChild(messageDiv);
                    }
                });
                
                scrollToBottom();
                
                // Render MathJax for loaded messages
                const messageBubbles = messagesContainer.querySelectorAll('.message-bubble');
                if (messageBubbles.length > 0) {
                    messageBubbles.forEach(bubble => {
                        renderMathJax(bubble);
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Clear chat history (for future use)
function clearChatHistory() {
    chatHistory = [];
    localStorage.removeItem('chatbot_history');
    messagesContainer.innerHTML = '';
    
    // Show welcome message again
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.display = 'block';
    }
}

// Handle errors gracefully
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (isWaitingForResponse) {
        hideTypingIndicator();
        addMessage('Sorry, I encountered an error. Please try again.', 'assistant', true);
        setInputEnabled(true);
        isWaitingForResponse = false;
    }
});

