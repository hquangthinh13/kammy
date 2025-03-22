document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    
    // Sample product database
    const products = [
        {
            name: "UltraBook Pro X13",
            description: "13\" display, 16GB RAM, 512GB SSD, 14-hour battery life, only 2.8 lbs",
            price: "$899.99",
            tags: ["laptop", "lightweight", "college", "battery", "ultrabook"]
        },
        {
            name: "LiteBook Air",
            description: "14\" display, 8GB RAM, 256GB SSD, 12-hour battery life, 2.2 lbs",
            price: "$749.99",
            tags: ["laptop", "lightweight", "college", "budget", "battery"]
        },
        {
            name: "PowerBook Studio",
            description: "15.6\" display, 32GB RAM, 1TB SSD, dedicated GPU, 8-hour battery life",
            price: "$1,299.99",
            tags: ["laptop", "powerful", "graphics", "programming", "design"]
        },
        {
            name: "NoiseCancel Pro Headphones",
            description: "Active noise cancellation, 30-hour battery, premium sound quality",
            price: "$249.99",
            tags: ["headphones", "noise-cancellation", "audio", "wireless"]
        },
        {
            name: "FitTrack Smart Watch",
            description: "Health monitoring, 7-day battery life, waterproof, sleep tracking",
            price: "$179.99",
            tags: ["watch", "fitness", "tracking", "health", "waterproof"]
        }
    ];
    
    // Function to add a message to the chat
    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        
        // Scroll to the bottom to show the latest message
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 10);
        
        return messageDiv;
    }
    
    // Function to find product suggestions based on user input
    function findProductSuggestions(input) {
        const keywords = input.toLowerCase().split(/\s+/);
        
        // Score products based on how many keywords match
        const matchedProducts = products.map(product => {
            const allText = product.name.toLowerCase() + ' ' + 
                          product.description.toLowerCase() + ' ' + 
                          product.tags.join(' ').toLowerCase();
            
            let score = 0;
            keywords.forEach(keyword => {
                if (allText.includes(keyword)) score++;
            });
            
            return { product, score };
        }).filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 2); // Get top 2 matches
        
        return matchedProducts.map(item => item.product);
    }
    
    // Function to display product suggestions
    function displaySuggestions(products, parentElement) {
        if (products.length === 0) {
            const noResults = document.createElement('p');
            noResults.textContent = "I couldn't find any products matching your description. Could you provide more details?";
            parentElement.appendChild(noResults);
            return;
        }
        
        products.forEach(product => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.classList.add('product-suggestion');
            
            suggestionDiv.innerHTML = `
                <img src="/api/placeholder/80/80" alt="${product.name}" class="product-image">
                <div class="product-details">
                    <div class="product-name">${product.name}</div>
                    <div class="product-description">${product.description}</div>
                    <div class="product-price">${product.price}</div>
                </div>
            `;
            
            parentElement.appendChild(suggestionDiv);
        });
        
        // Scroll to the bottom after adding products
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 10);
    }
    
    // Handle send button click
    function handleSend() {
        const message = userInput.value.trim();
        if (message === '') return;
        
        // Add user message
        addMessage(message, true);
        
        // Clear input
        userInput.value = '';
        
        // Simulate AI response after a short delay
        setTimeout(() => {
            const botResponseDiv = addMessage("Based on your description, here are some products that might interest you:");
            
            // Find and display product suggestions
            const suggestions = findProductSuggestions(message);
            displaySuggestions(suggestions, botResponseDiv);
        }, 1000);
    }
    
    // Event listeners
    sendButton.addEventListener('click', handleSend);
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSend();
        }
    });
    
    // Initial scroll to bottom to show the most recent messages
    chatMessages.scrollTop = chatMessages.scrollHeight;
});