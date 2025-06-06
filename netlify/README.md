# Netlify 部署配置

本目录包含在Netlify上部署应用所需的配置和函数。

## 文件结构

- `/netlify/functions/process.js` - 处理表格上传和计算的Netlify函数
- `/netlify/functions/package.json` - Netlify函数依赖配置
- `/netlify.toml` - Netlify部署配置文件

## 部署步骤

1. 在Netlify账户中创建新站点
2. 连接到GitHub仓库 (https://github.com/tangzongzi/DayProfit)
3. 部署设置使用默认配置（Netlify会自动识别netlify.toml文件）
4. 点击部署 