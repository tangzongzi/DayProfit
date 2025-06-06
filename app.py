from flask import Flask, request, jsonify, render_template, send_from_directory
import pandas as pd
import os
from werkzeug.utils import secure_filename
from flask_cors import CORS
import datetime

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': '没有文件部分'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # 根据文件类型读取数据
            if filepath.endswith('.csv'):
                df = pd.read_csv(filepath)
            else:  # Excel文件
                df = pd.read_excel(filepath)
            
            # 检查必要的列是否存在
            required_columns = ['创建时间', '小计金额', '店铺商品小计', '采购单状态']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return jsonify({'error': f'表格缺少必要的列: {", ".join(missing_columns)}'}), 400
                
            # 只保留交易成功的记录
            df = df[df['采购单状态'] == '交易成功']
            if len(df) == 0:
                return jsonify({'error': '没有找到交易成功的记录'}), 400
            
            # 确保创建时间列为日期类型
            df['创建时间'] = pd.to_datetime(df['创建时间'])
            
            # 计算利润（店铺商品小计 - 小计金额）
            df['利润'] = df['店铺商品小计'] - df['小计金额']
            
            # 按日期分组计算每日利润
            df['日期'] = df['创建时间'].dt.date
            daily_profits = df.groupby('日期').agg({
                '店铺商品小计': 'sum',
                '小计金额': 'sum',
                '利润': 'sum'
            }).reset_index()
            
            # 转换为字典列表
            result = []
            for _, row in daily_profits.iterrows():
                result.append({
                    '日期': row['日期'].strftime('%Y-%m-%d'),
                    '收入': float(row['店铺商品小计']),
                    '支出': float(row['小计金额']),
                    '利润': float(row['利润'])
                })
            
            return jsonify({
                'success': True,
                'data': result
            })
        except Exception as e:
            return jsonify({'error': f'处理文件出错: {str(e)}'}), 500
    
    return jsonify({'error': '不允许的文件类型'}), 400

if __name__ == '__main__':
    app.run(debug=True) 