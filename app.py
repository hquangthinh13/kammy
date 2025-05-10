from flask import Flask, request, jsonify, render_template
import pandas as pd
import openai
import numpy as np
import os

app = Flask(__name__)

# Cấu hình API Key
openai.api_key = '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'

customers_df = pd.read_csv('./data/Customers_Lookup_Processed.csv')
products_df = pd.read_csv('./data/Mobiles_Dataset_Processed.csv')




if 'Description' not in products_df.columns:
    def generate_description(row):
        return (f"{row['Model Name']} với {row['RAM']} RAM, camera trước {row['Front Camera']}, "
                f"camera sau {row['Back Camera']}, chip {row['Processor']}, pin {row['Battery Capacity']}, "
                f"màn hình {row['Screen Size']}")
    
    products_df['Description'] = products_df.apply(generate_description, axis=1)


# ====== Kiểm tra & Tạo Embedding nếu chưa có ======
if 'embedding' not in products_df.columns:
    def create_embedding(text):
        response = openai.Embedding.create(
            input=text,
            model='text-embedding-3-small'
        )
        return response['data'][0]['embedding']

    print("🔹 Đang tạo embedding cho sản phẩm...")
    products_df['embedding'] = products_df['Description'].apply(create_embedding)
    products_df.to_csv('./data/Mobiles_Dataset_Processed.csv', index=False)
    print("✅ Đã tạo xong embedding và lưu lại file CSV.")

# Convert embedding từ string về numpy array để tính toán
if isinstance(products_df['embedding'].iloc[0], str):
    products_df['embedding'] = products_df['embedding'].apply(eval).apply(np.array)
else:
    products_df['embedding'] = products_df['embedding'].apply(np.array)

# ====== ROUTES ======

@app.route('/')
def home():
    return render_template('kammy_chatbox.html')

@app.route('/verify-email', methods=['POST'])
def verify_email():
    data = request.json
    email = data.get('email', '').strip().lower()

    customer = customers_df[customers_df['EmailAddress'].str.lower() == email]
    if not customer.empty:
        return jsonify({"status": "success", "customer": customer.iloc[0].to_dict()})
    else:
        return jsonify({"status": "error", "message": "Email không tồn tại trong hệ thống."}), 404

@app.route('/chat', methods=['POST'])
def chat():
    import json
    import re

    data = request.json
    user_message = data.get('message', '')

    # 1️⃣ Detect Intent
    prompt = f"""
Bạn là hệ thống phân tích nhu cầu khách hàng mua điện thoại.
Hãy đọc câu sau và trích xuất nhu cầu dưới dạng JSON với các trường:

- "brand": Thương hiệu hoặc null.
- "price_level": "rẻ", "tầm trung", "cao cấp" hoặc null.
- "battery": true/false.
- "camera": true/false.
- "performance": true/false.

Chỉ trả về JSON.

Câu: "{user_message}"
"""

    try:
        response = openai.ChatCompletion.create(
            model='gpt-4o-mini-2024-07-18',
            messages=[{"role": "user", "content": prompt}]
        )
        intent_json = response.choices[0].message.content
        intent = json.loads(intent_json)
    except Exception as e:
        print(f"Lỗi detect intent: {e}")
        intent = {
            "brand": None,
            "price_level": None,
            "battery": False,
            "camera": False,
            "performance": False
        }

    # 2️⃣ Semantic Search (toàn bộ products trước)
    query_embedding = openai.Embedding.create(
        input=user_message,
        model='text-embedding-3-small'
    )['data'][0]['embedding']
    query_embedding = np.array(query_embedding)

    def cosine_similarity(a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    products_df['similarity'] = products_df['embedding'].apply(lambda x: cosine_similarity(x, query_embedding))
    semantic_top = products_df.sort_values('similarity', ascending=False).head(30)

    # 3️⃣ Lọc theo Intent (sau Semantic)
    if intent.get('brand'):
        semantic_top = semantic_top[semantic_top['Model Name'].str.contains(intent['brand'], case=False)]

    if 'Launched Price (India)' in semantic_top.columns:
        semantic_top['Launched Price (India)'] = (
            semantic_top['Launched Price (India)']
            .replace('[^\\d]', '', regex=True)
            .astype(int)
        )

        if intent.get('price_level') == 'rẻ':
            semantic_top = semantic_top.sort_values('Launched Price (India)').head(10)
        elif intent.get('price_level') == 'cao cấp':
            semantic_top = semantic_top.sort_values('Launched Price (India)', ascending=False).head(10)

    # 🎯 Lọc thêm theo battery, camera, performance
    def extract_battery(text):
        match = re.search(r'(\d+)', str(text))
        return int(match.group(1)) if match else 0

    def extract_back_camera(text):
        numbers = [int(s) for s in str(text).split() if s.isdigit()]
        return max(numbers) if numbers else 0

    def extract_ram(text):
        match = re.search(r'(\d+)', str(text))
        return int(match.group(1)) if match else 0

    if intent.get('battery'):
        semantic_top['Battery (mAh)'] = semantic_top['Battery Capacity'].apply(extract_battery)
        semantic_top = semantic_top.sort_values('Battery (mAh)', ascending=False)

    if intent.get('camera'):
        semantic_top['Back Camera Max'] = semantic_top['Back Camera'].apply(extract_back_camera)
        semantic_top = semantic_top.sort_values('Back Camera Max', ascending=False)

    if intent.get('performance'):
        semantic_top['RAM (GB)'] = semantic_top['RAM'].apply(extract_ram)
        semantic_top = semantic_top.sort_values('RAM (GB)', ascending=False)

    # 4️⃣ Lấy 3 sản phẩm phù hợp nhất
    recommended = semantic_top.head(3)

    # 5️⃣ Chuyển giá INR ➔ VND chuẩn phong cách bạn
    recommended['Launched Price (India)'] = recommended['Launched Price (India)'].apply(
        lambda x: f"{int(str(x).replace(',', '').replace('₹', '').strip()) * 300:,} VND" if pd.notna(x) else "Không rõ"
    )

    # 6️⃣ Chuẩn hóa dữ liệu gợi ý
    products_list = recommended[['Model Name', 'Launched Price (India)', 'Description']].to_dict(orient='records')

    # 7️⃣ Trả response
    bot_response = f"Tôi đã tìm được những sản phẩm phù hợp với nhu cầu của bạn: \"{user_message}\". Dưới đây là gợi ý của tôi:"

    return jsonify({
        "bot_response": bot_response,
        "recommendations": products_list
    })


if __name__ == '__main__':
    app.run(debug=True)
