from flask import Flask, request, jsonify, render_template, send_from_directory
import pandas as pd
import os
import re
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

# 用于清理和转换数值的函数
def clean_numeric(val):
    if pd.isna(val):
        return 0.0
    
    # 如果已经是数字类型，直接返回
    if isinstance(val, (int, float)):
        return float(val)
    
    # 处理字符串类型
    if isinstance(val, str):
        # 移除可能的货币符号、空格和其他非数字字符
        val = re.sub(r'[^\d\.-]', '', val)
        try:
            return float(val) if val else 0.0
        except ValueError:
            return 0.0
    
    return 0.0

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
                df = pd.read_excel(filepath, dtype=str)  # 先以字符串形式读取所有数据
            
            # 打印初始列名和数据类型，以便调试
            print("列名:", df.columns.tolist())
            print("数据类型:", df.dtypes)
            print("数据前5行:", df.head())
            
            # 检查必要的列是否存在
            required_columns = ['创建时间', '小计金额', '店铺商品小计', '采购单状态']
            missing_columns = [col for col in required_columns if not any(c for c in df.columns if c.strip() == col.strip())]
            if missing_columns:
                return jsonify({'error': f'表格缺少必要的列: {", ".join(missing_columns)}'}), 400
            
            # 标准化列名，去除可能的空格
            column_mapping = {}
            for col in df.columns:
                for req_col in required_columns:
                    if col.strip() == req_col.strip():
                        column_mapping[col] = req_col
            
            df = df.rename(columns=column_mapping)
            
            # 打印采购单状态的唯一值，以便了解有哪些状态
            print("采购单状态的唯一值:", df['采购单状态'].unique())
            
            # 只保留交易成功的记录，不区分大小写
            df = df[df['采购单状态'].str.contains('交易成功', case=False, na=False)]
            if len(df) == 0:
                return jsonify({'error': '没有找到交易成功的记录'}), 400
            
            # 确保创建时间列为日期类型
            df['创建时间'] = pd.to_datetime(df['创建时间'], errors='coerce')
            
            # 使用自定义函数处理数值列，确保正确转换
            df['小计金额'] = df['小计金额'].apply(clean_numeric)
            df['店铺商品小计'] = df['店铺商品小计'].apply(clean_numeric)
            
            # 打印转换后的数据，检查是否正确
            print("转换后小计金额的数据类型:", df['小计金额'].dtype)
            print("转换后店铺商品小计的数据类型:", df['店铺商品小计'].dtype)
            print("示例数据:", df[['创建时间', '小计金额', '店铺商品小计']].head())
            
            # 计算利润（店铺商品小计 - 小计金额）
            df['利润'] = df['店铺商品小计'] - df['小计金额']
            
            # 按日期分组计算每日利润
            df['日期'] = df['创建时间'].dt.date
            
            # 找出包含NaT的行
            nat_rows = df[df['日期'].isna()]
            if not nat_rows.empty:
                print("警告: 有日期为NaT的行:", nat_rows)
            
            # 排除日期为NaT的行
            df = df.dropna(subset=['日期'])
            
            daily_profits = df.groupby('日期').agg({
                '店铺商品小计': 'sum',
                '小计金额': 'sum',
                '利润': 'sum'
            }).reset_index()
            
            # 打印计算结果，查看是否正确
            print("每日利润计算结果:", daily_profits.head())
            
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
            import traceback
            print("处理文件时出错:", str(e))
            print(traceback.format_exc())
            return jsonify({'error': f'处理文件出错: {str(e)}'}), 500
    
    return jsonify({'error': '不允许的文件类型'}), 400

if __name__ == '__main__':
    app.run(debug=True) 