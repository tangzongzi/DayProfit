const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const formidable = require('formidable');

// 安装Python依赖
function installDependencies() {
  try {
    console.log('Installing Python dependencies...');
    execSync('pip install -r requirements.txt --target ./python_modules');
    console.log('Dependencies installed successfully');
  } catch (error) {
    console.error('Error installing dependencies:', error);
    throw error;
  }
}

exports.handler = async function(event, context) {
  // 仅处理POST请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: '方法不允许' })
    };
  }

  try {
    // 确保Python依赖已安装
    if (!fs.existsSync('./python_modules')) {
      installDependencies();
    }

    // 处理文件上传
    if (event.headers['content-type'] && event.headers['content-type'].includes('multipart/form-data')) {
      // 创建临时目录用于存储上传的文件
      const tmpDir = path.join(os.tmpdir(), 'uploads');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // 解析表单数据
      const form = new formidable.IncomingForm({
        uploadDir: tmpDir,
        keepExtensions: true,
        multiples: false
      });

      const formData = await new Promise((resolve, reject) => {
        form.parse(event, (err, fields, files) => {
          if (err) reject(err);
          resolve({ fields, files });
        });
      });

      const uploadedFile = formData.files.file;
      if (!uploadedFile) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: '没有文件部分' })
        };
      }

      // 调用Python脚本处理文件
      const filePath = uploadedFile.filepath;
      const result = execSync(`python -c "
import sys
sys.path.append('./python_modules')
import pandas as pd
import re
import json

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
        val = re.sub(r'[^\\d\\.-]', '', val)
        try:
            return float(val) if val else 0.0
        except ValueError:
            return 0.0
    
    return 0.0

try:
    # 读取文件
    if '${filePath}'.endswith('.csv'):
        df = pd.read_csv('${filePath}')
    else:
        # 以字符串形式读取Excel文件中的所有数据
        df = pd.read_excel('${filePath}', dtype=str)
    
    # 检查必要的列是否存在
    required_columns = ['创建时间', '小计金额', '店铺商品小计', '采购单状态']
    missing_columns = [col for col in required_columns if not any(c for c in df.columns if c.strip() == col.strip())]
    if missing_columns:
        print(json.dumps({'error': f'表格缺少必要的列: {\", \".join(missing_columns)}'}))
        sys.exit(1)
    
    # 标准化列名，去除可能的空格
    column_mapping = {}
    for col in df.columns:
        for req_col in required_columns:
            if col.strip() == req_col.strip():
                column_mapping[col] = req_col
    
    df = df.rename(columns=column_mapping)
    
    # 只保留交易成功的记录，不区分大小写
    df = df[df['采购单状态'].str.contains('交易成功', case=False, na=False)]
    if len(df) == 0:
        print(json.dumps({'error': '没有找到交易成功的记录'}))
        sys.exit(1)
    
    # 确保创建时间列为日期类型
    df['创建时间'] = pd.to_datetime(df['创建时间'], errors='coerce')
    
    # 使用自定义函数处理数值列，确保正确转换
    df['小计金额'] = df['小计金额'].apply(clean_numeric)
    df['店铺商品小计'] = df['店铺商品小计'].apply(clean_numeric)
    
    # 计算利润（店铺商品小计 - 小计金额）
    df['利润'] = df['店铺商品小计'] - df['小计金额']
    
    # 按日期分组计算每日利润
    df['日期'] = df['创建时间'].dt.date
    
    # 排除日期为NaT的行
    df = df.dropna(subset=['日期'])
    
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
    
    print(json.dumps({'success': True, 'data': result}))
except Exception as e:
    import traceback
    error_msg = f'处理文件出错: {str(e)}\\n{traceback.format_exc()}'
    print(json.dumps({'error': error_msg}))
    sys.exit(1)
"`, { encoding: 'utf-8' });

      // 清理临时文件
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to delete temp file:', err);
      }

      // 解析并返回结果
      const parsedResult = JSON.parse(result.trim());
      return {
        statusCode: parsedResult.success ? 200 : 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(parsedResult)
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: '无效的请求' })
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '服务器错误: ' + error.message })
    };
  }
}; 