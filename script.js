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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    adjustTextareaHeight();
    loadChatHistory();
    hideWelcomeMessage();
});

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
    const aiMessage = data.choices?.[0]?.message?.content || 
                      data.content || 
                      "I'm sorry, I couldn't generate a response. Please try again.";
    
    // Add AI message to chat history
    chatHistory.push({
        role: "assistant",
        content: aiMessage
    });
    
    return aiMessage;
}

// Add message to UI
function addMessage(text, sender, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
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
}

// Format message text
function formatMessage(text) {
    // Convert line breaks to <br>
    let formatted = text.replace(/\n/g, '<br>');
    
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">$1</a>');
    
    // Convert code blocks (basic support)
    formatted = formatted.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');
    
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

