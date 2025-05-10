// Khi trang load xong
document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    let customerEmail = '';

    // ===== YÊU CẦU NHẬP EMAIL =====
    function askForEmail() {
        customerEmail = prompt("Vui lòng nhập email của bạn để bắt đầu chat:");
        if (!customerEmail) {
            alert("Bạn cần nhập email để sử dụng chatbot!");
            askForEmail();
        } else {
            verifyEmail(customerEmail);
        }
    }

    // ===== Gửi email tới API /verify-email =====
    function verifyEmail(email) {
        fetch('/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                addMessage(`👋 Xin chào ${data.customer.FirstName}! Tôi là trợ lý tư vấn điện thoại. Bạn cần hỗ trợ gì?`);
            } else {
                alert("Email không tồn tại. Vui lòng nhập lại!");
                askForEmail();
            }
        })
        .catch(err => {
            console.error('Lỗi khi xác thực email:', err);
            alert("Có lỗi xảy ra, vui lòng thử lại!");
            askForEmail();
        });
    }

    // ===== Thêm tin nhắn vào khung chat =====
    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);

        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 10);

        return messageDiv;
    }

    // ===== Gửi câu hỏi tới API /chat =====
    function handleSend() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessage(message, true);
        userInput.value = '';

        fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            const botResponseDiv = addMessage(data.bot_response);
            displaySuggestions(data.recommendations, botResponseDiv);
        })
        .catch(err => {
            console.error('Lỗi khi gửi câu hỏi:', err);
            addMessage("Xin lỗi, hiện tại hệ thống đang gặp sự cố. Vui lòng thử lại sau!");
        });
    }

    // ===== Hiển thị sản phẩm gợi ý =====
    function displaySuggestions(products, parentElement) {
        if (products.length === 0) {
            const noResults = document.createElement('p');
            noResults.textContent = "Tôi không tìm thấy sản phẩm phù hợp, bạn có thể mô tả chi tiết hơn không?";
            parentElement.appendChild(noResults);
            return;
        }

        products.forEach(product => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.classList.add('product-suggestion');

            suggestionDiv.innerHTML = `
                <div class="product-details">
                    <div class="product-name">📱 ${product["Model Name"]}</div>
                    <div class="product-description">${product.Description}</div>
                    <div class="product-price">Giá: ${product["Launched Price (India)"]}</div>

                </div>
            `;

            parentElement.appendChild(suggestionDiv);
        });

        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 10);
    }

    // ===== Event listeners =====
    sendButton.addEventListener('click', handleSend);

    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSend();
        }
    });

    // Bắt đầu yêu cầu nhập email khi load trang
    askForEmail();
});
