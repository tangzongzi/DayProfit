document.addEventListener('DOMContentLoaded', function() {
    // 关键DOM元素
    const fileUpload = document.getElementById('fileUpload');
    const fileName = document.getElementById('file-name');
    const resultSection = document.getElementById('result-section');
    const resultBody = document.getElementById('result-body');
    const statusFilter = document.getElementById('statusFilter');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const calculateBtn = document.getElementById('calculateBtn');
    const totalDays = document.getElementById('totalDays');
    const totalOrders = document.getElementById('totalOrders');
    const totalProfit = document.getElementById('totalProfit');
    const copyAllProfitsBtn = document.getElementById('copyAllProfitsBtn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const calculationMode = document.getElementById('calculationMode');
    const diagnosticBtn = document.getElementById('show-diagnostic-btn');
    const modal = document.getElementById('diagnostic-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    
    // 初始化弹窗关闭功能
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            modal.classList.remove('show');
        });
    }
    
    // 点击弹窗外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
    
    // 添加诊断按钮点击事件
    if (diagnosticBtn) {
        diagnosticBtn.addEventListener('click', runDiagnostics);
    }

    // 存储当前显示的利润数据，用于批量复制
    let currentProfitData = [];
    
    // 原始上传数据缓存
    let uploadedData = null;
    
    // 添加计算模式改变事件
    calculationMode.addEventListener('change', function() {
        if (uploadedData && uploadedData.length > 0) {
            processData();
        }
    });
    
    // 添加复制所有利润数据的事件处理
    copyAllProfitsBtn.addEventListener('click', function() {
        copyAllProfits();
    });
    
    // 文件上传处理
    fileUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // 添加按钮文本节点引用
        const btnText = document.querySelector('.btn-text');
        const originalBtnText = btnText.textContent;
        
        fileName.textContent = '';
        fileName.classList.add('loading');
        fileName.textContent = '正在读取...';
        btnText.textContent = '已选择';
        
        // 确保XLSX库已加载
        ensureXLSXLoaded().then(() => {
            showLoading();
            
            // 使用setTimeout给浏览器时间更新UI
            setTimeout(() => {
        const reader = new FileReader();
                
        reader.onload = function(e) {
                    try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            uploadedData = XLSX.utils.sheet_to_json(firstSheet);
                        
                        fileName.classList.remove('loading');
                        fileName.textContent = file.name;
            
            // 自动设置日期范围
            setDateRangeFromData(uploadedData);
                        
                        hideLoading();
                    } catch (error) {
                        console.error('文件解析错误:', error);
                        fileName.classList.remove('loading');
                        fileName.textContent = '解析失败';
                        setTimeout(() => {
                            fileName.textContent = '';
                            btnText.textContent = originalBtnText;
                        }, 2000);
                        hideLoading();
                    }
                };
                
                reader.onprogress = function(event) {
                    if (event.lengthComputable) {
                        const percentLoaded = Math.round((event.loaded / event.total) * 100);
                        fileName.textContent = `${percentLoaded}%`;
                    }
                };
                
                reader.onerror = function() {
                    fileName.classList.remove('loading');
                    fileName.textContent = '读取失败';
                    setTimeout(() => {
                        fileName.textContent = '';
                        btnText.textContent = originalBtnText;
                    }, 2000);
                    hideLoading();
                };
                
        reader.readAsArrayBuffer(file);
            }, 10);
        }).catch(error => {
            console.error('加载XLSX库失败:', error);
            fileName.classList.remove('loading');
            fileName.textContent = '加载失败';
            setTimeout(() => {
                fileName.textContent = '';
                btnText.textContent = originalBtnText;
            }, 2000);
            hideLoading();
        });
    });
    
    // 确保XLSX库已加载的函数
    function ensureXLSXLoaded() {
        return new Promise((resolve, reject) => {
            if (window.XLSX) {
                resolve();
                return;
            }
            
            // 如果库未加载，等待加载完成
            const checkInterval = setInterval(() => {
                if (window.XLSX) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // 超时处理
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!window.XLSX) {
                    reject(new Error('加载XLSX库超时'));
                }
            }, 30000); // 30秒超时
        });
    }
    
    // 显示加载中指示器
    function showLoading() {
        loadingIndicator.style.display = 'flex';
        calculateBtn.disabled = true;
        calculateBtn.textContent = '处理中...';
    }
    
    // 隐藏加载中指示器
    function hideLoading() {
        loadingIndicator.style.display = 'none';
        calculateBtn.disabled = false;
        calculateBtn.textContent = '计算利润';
    }
    
    // 复制所有利润数据
    function copyAllProfits() {
        if (currentProfitData.length === 0) {
            alert('没有可复制的数据！');
            return;
        }
        
        // 格式化数据为可复制的文本，只包含利润值，每行一个
        let copyText = '';
        currentProfitData.forEach(item => {
            copyText += `${item.profit}\n`;
        });
        
        // 复制到剪贴板
        navigator.clipboard.writeText(copyText)
            .then(() => {
                // 显示复制成功的反馈
                const originalText = copyAllProfitsBtn.textContent;
                copyAllProfitsBtn.textContent = '复制成功!';
                copyAllProfitsBtn.style.backgroundColor = '#4CAF50';
                
                setTimeout(() => {
                    copyAllProfitsBtn.textContent = originalText;
                    copyAllProfitsBtn.style.backgroundColor = '';
                }, 1500);
            })
            .catch(err => {
                console.error('复制失败: ', err);
                alert('复制失败，请重试！');
            });
    }
    
    // 计算按钮点击事件
    calculateBtn.addEventListener('click', function() {
        if (!uploadedData || uploadedData.length === 0) {
            alert('请先上传数据表格！');
            return;
        }
        
        showLoading();
        
        // 延迟处理以允许UI更新
        setTimeout(() => {
        processData();
            hideLoading();
        }, 10);
    });
    
    // 从数据设置日期范围
    function setDateRangeFromData(data) {
        if (!data || data.length === 0) return;
        
        let minDate = null;
        let maxDate = null;
        
        // 使用 for 循环替代 forEach 以提高性能
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const dateStr = normalizeDate(item['创建时间']);
            if (!dateStr) continue;
            
            const date = new Date(dateStr);
            if (isNaN(date)) continue;
            
            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;
        }
        
        if (minDate) {
            startDate.value = minDate.toISOString().split('T')[0];
        }
        
        if (maxDate) {
            endDate.value = maxDate.toISOString().split('T')[0];
        }
    }
    
    // 处理数据
    function processData() {
        if (!uploadedData) return;
        
        // 应用筛选条件
        const filteredData = filterData(uploadedData);
        
        // 按日期分组并计算利润
        const dailyProfits = calculateDailyProfits(filteredData);
        
        // 显示结果
        displayResults(dailyProfits);
    }
    
    // 过滤数据
    function filterData(data) {
        const startValue = startDate.value ? new Date(startDate.value) : null;
        const endValue = endDate.value ? new Date(endDate.value) : null;
        const statusValue = statusFilter.value;
        
        return data.filter(order => {
            // 筛选状态
            if (statusValue !== 'all') {
                // 同时筛选多种状态
                if (statusValue === '交易成功和待客户确认和待发货') {
                    if (order['采购单状态'] !== '交易成功' && 
                        order['采购单状态'] !== '待客户确认' && 
                        order['采购单状态'] !== '待发货') {
                        return false;
                    }
                } else if (order['采购单状态'] !== statusValue) {
                return false;
                }
            }
            
            // 筛选日期范围
            const orderDate = normalizeDate(order['创建时间']);
            if (!orderDate) return false;
            
            const date = new Date(orderDate);
            if (isNaN(date)) return false;
            
            if (startValue && startValue > date) {
                return false;
            }
            
            if (endValue && endValue < date) {
                return false;
            }
            
            return true;
        });
    }
    
    // 标准化日期格式
    function normalizeDate(dateStr) {
        // 处理多种可能的日期格式
        if (!dateStr) return '';
        
        // 如果包含空格，可能是"YYYY-MM-DD HH:MM:SS"格式，取前面的日期部分
        if (dateStr.includes(' ')) {
            dateStr = dateStr.split(' ')[0];
        }
        
        // 处理"YYYY/MM/DD"格式
        if (dateStr.includes('/')) {
            dateStr = dateStr.replace(/\//g, '-');
        }
        
        // 处理可能的其他格式
        const parts = dateStr.split(/[-\/\.]/);
        if (parts.length === 3) {
            // 确保年份是4位数
            if (parts[0].length === 2) {
                parts[0] = '20' + parts[0]; // 假设是21世纪
            }
            
            // 确保月和日是两位数
            if (parts[1].length === 1) parts[1] = '0' + parts[1];
            if (parts[2].length === 1) parts[2] = '0' + parts[2];
            
            return parts.join('-');
        }
        
        return dateStr;
    }
    
    // 解析数字
    function parseNumber(value) {
        if (value === undefined || value === null || value === '') return 0;
        
        // 如果是字符串，去除可能的非数字字符（如货币符号、逗号等）
        if (typeof value === 'string') {
            value = value.replace(/[^\d.-]/g, '');
        }
        
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }
    
    // 计算每日利润
    function calculateDailyProfits(orders) {
        // 创建一个Map来存储每天的数据
        const dailyData = new Map();
        // 获取当前选择的计算模式
        const mode = document.getElementById('calculationMode').value;
        
        // 使用批处理方式优化性能，每批次处理1000条记录
        const batchSize = 1000;
        let processedCount = 0;
        
        function processBatch() {
            const endIndex = Math.min(processedCount + batchSize, orders.length);
            
            for (let i = processedCount; i < endIndex; i++) {
                const order = orders[i];
                
            // 标准化日期格式
            const creationDate = normalizeDate(order['创建时间']);
                if (!creationDate) continue; // 跳过没有有效日期的订单
            
            // 计算这笔订单的利润：店铺商品小计 - 小计金额
            let income, expense, profit;
            
            // 根据不同计算模式处理
            switch (mode) {
                case 'truncateEach':
                    // 每项金额先截断再计算
                    income = parseFloat(truncateTo2Decimals(parseNumber(order['店铺商品小计'])));
                    expense = parseFloat(truncateTo2Decimals(parseNumber(order['小计金额'])));
                    profit = income - expense;
                    break;
                case 'truncateProfit':
                    // 每笔利润计算后立即截断
                    income = parseNumber(order['店铺商品小计']);
                    expense = parseNumber(order['小计金额']);
                    profit = parseFloat(truncateTo2Decimals(income - expense));
                    break;
                default:
                    // 原始数据计算（默认）
                    income = parseNumber(order['店铺商品小计']);
                    expense = parseNumber(order['小计金额']);
                    profit = income - expense;
                    break;
            }
            
            // 如果这个日期已经在Map中，更新数据；否则，添加新的日期
            if (dailyData.has(creationDate)) {
                const data = dailyData.get(creationDate);
                data.orderCount += 1;
                data.totalIncome += income;
                data.totalExpense += expense;
                data.totalProfit += profit;
            } else {
                dailyData.set(creationDate, {
                    date: creationDate,
                    orderCount: 1,
                    totalIncome: income,
                    totalExpense: expense,
                    totalProfit: profit
                });
            }
            }
            
            processedCount = endIndex;
        
            // 如果还有未处理的记录，继续处理
            if (processedCount < orders.length) {
                setTimeout(processBatch, 0);
            } else {
                // 处理完成，将Map转换为数组并排序
                const results = Array.from(dailyData.values()).sort((a, b) => {
                // 确保日期格式正确再比较
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                
                // 如果日期无效，使用字符串比较
                if (isNaN(dateA) || isNaN(dateB)) {
                    return a.date > b.date ? -1 : 1;
                }
                
                return dateB - dateA;
            });
                
                displayResults(results);
                hideLoading();
            }
        }
        
        // 开始批处理
        showLoading();
        setTimeout(processBatch, 0);
        
        // 返回空数组，真正的结果会在批处理完成后显示
        return [];
    }
    
    // 显示结果
    function displayResults(dailyProfits) {
        // 清空之前的结果
        resultBody.innerHTML = '';
        
        // 更新汇总信息
        totalDays.textContent = dailyProfits.length;
        
        let orderCount = 0;
        let profitSum = 0;
        
        // 清空并重新填充当前利润数据数组
        currentProfitData = [];
        
        // 使用文档片段减少DOM操作
        const fragment = document.createDocumentFragment();
        
        // 添加每天的利润数据
        dailyProfits.forEach(day => {
            const row = document.createElement('tr');
            
            // 创建并添加单元格
            const dateCell = document.createElement('td');
            dateCell.textContent = day.date;
            row.appendChild(dateCell);
            
            // 利润单元格移到日期单元格后面 - 简化创建方式，不添加特殊类名和样式
            const profitCell = document.createElement('td');
            profitCell.textContent = truncateTo2Decimals(day.totalProfit) + ' 元';
            profitCell.setAttribute('data-value', truncateTo2Decimals(day.totalProfit));
            row.appendChild(profitCell);
            
            const countCell = document.createElement('td');
            countCell.textContent = day.orderCount;
            row.appendChild(countCell);
            
            const incomeCell = document.createElement('td');
            incomeCell.textContent = truncateTo2Decimals(day.totalIncome) + ' 元';
            row.appendChild(incomeCell);
            
            const expenseCell = document.createElement('td');
            expenseCell.textContent = truncateTo2Decimals(day.totalExpense) + ' 元';
            row.appendChild(expenseCell);
            
            // 将行添加到文档片段
            fragment.appendChild(row);
            
            // 更新汇总数据
            orderCount += day.orderCount;
            profitSum += day.totalProfit;
            
            // 将日期和利润添加到当前数据数组
            currentProfitData.push({
                date: day.date,
                profit: truncateTo2Decimals(day.totalProfit)
            });
        });
        
        // 一次性将所有行添加到表格
        resultBody.appendChild(fragment);
        
        // 更新汇总显示
        totalOrders.textContent = orderCount;
        totalProfit.textContent = truncateTo2Decimals(profitSum) + ' 元';
        
        // 显示结果区域
        resultSection.classList.remove('hidden');
        
        // 如果没有数据，显示提示
        if (dailyProfits.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 5;
            emptyCell.textContent = '没有找到符合条件的数据。请检查上传的表格或筛选条件。';
            emptyCell.style.textAlign = 'center';
            emptyCell.style.padding = '20px';
            emptyRow.appendChild(emptyCell);
            resultBody.appendChild(emptyRow);
            
            // 重置汇总信息
            totalDays.textContent = '0';
            totalOrders.textContent = '0';
            totalProfit.textContent = '0 元';
            
            // 清空当前数据数组
            currentProfitData = [];
        }
        
        // 修改添加利润列复制功能，移除会引起动画的部分
        addProfitCopyFeature();
    }
    
    // 修改添加利润列复制功能，移除会引起动画的部分
    function addProfitCopyFeature() {
        const profitCells = document.querySelectorAll('td:nth-child(2)');
        profitCells.forEach(cell => {
            cell.style.cursor = 'pointer';
            cell.title = '点击复制数值';
            
            cell.addEventListener('click', function() {
                const value = this.getAttribute('data-value');
                if (value) {
                    navigator.clipboard.writeText(value)
                        .catch(err => {
                            console.error('无法复制: ', err);
                        });
                }
            });
        });
    }
    
    // 保留两位小数但不四舍五入
    function truncateTo2Decimals(num) {
        if (typeof num !== 'number') num = parseFloat(num);
        if (isNaN(num)) return '0.00';
        const sign = num < 0 ? -1 : 1;
        num = Math.abs(num);
        return (sign * Math.floor(num * 100) / 100).toFixed(2);
    }
    
    // 调试功能，测试利润计算模式
    function runDiagnostics() {
        if (!uploadedData || uploadedData.length === 0) {
            alert('请先上传数据表格并执行计算！');
            return;
        }
        
        showLoading();
        
        setTimeout(() => {
            // 创建诊断内容
            const diagnosticContent = document.getElementById('diagnostic-content');
            diagnosticContent.innerHTML = ''; // 清空内容
        
        const diagnosticTitle = document.createElement('h3');
            diagnosticTitle.textContent = '不同计算模式下的结果比较';
            diagnosticContent.appendChild(diagnosticTitle);
        
        // 创建一个表格
        const table = document.createElement('table');
        table.style.width = '100%';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>日期</th>
                <th>原始数据计算</th>
                <th>每项金额先截断</th>
                <th>每笔利润先截断</th>
                    <th>订单数</th>
            </tr>
        `;
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        
        // 应用筛选条件
        const filteredData = filterData(uploadedData);
        
        // 计算三种模式下的每日利润
        const rawResults = calculateDailyProfitsByMode(filteredData, 'raw');
        const truncateEachResults = calculateDailyProfitsByMode(filteredData, 'truncateEach');
        const truncateProfitResults = calculateDailyProfitsByMode(filteredData, 'truncateProfit');
        
        // 合并所有日期
        const allDates = new Set([
            ...rawResults.map(d => d.date),
            ...truncateEachResults.map(d => d.date),
            ...truncateProfitResults.map(d => d.date)
        ]);
        
        // 排序日期
        const sortedDates = Array.from(allDates).sort((a, b) => new Date(b) - new Date(a));
        
        // 创建诊断表格行
        sortedDates.forEach(date => {
            const rawData = rawResults.find(d => d.date === date) || { totalProfit: 0, orderCount: 0 };
            const truncateEachData = truncateEachResults.find(d => d.date === date) || { totalProfit: 0, orderCount: 0 };
            const truncateProfitData = truncateProfitResults.find(d => d.date === date) || { totalProfit: 0, orderCount: 0 };
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${date}</td>
                <td>${truncateTo2Decimals(rawData.totalProfit)} 元</td>
                <td>${truncateTo2Decimals(truncateEachData.totalProfit)} 元</td>
                <td>${truncateTo2Decimals(truncateProfitData.totalProfit)} 元</td>
                    <td>${rawData.orderCount}</td>
            `;
            
            // 高亮显示如果有差异
            const rawProfit = parseFloat(truncateTo2Decimals(rawData.totalProfit));
            const eachProfit = parseFloat(truncateTo2Decimals(truncateEachData.totalProfit));
            const profitProfit = parseFloat(truncateTo2Decimals(truncateProfitData.totalProfit));
            
            if (rawProfit !== eachProfit || rawProfit !== profitProfit) {
                row.style.backgroundColor = '#fff8e1';
            }
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
            diagnosticContent.appendChild(table);
        
        // 添加帮助说明
        const helpText = document.createElement('div');
        helpText.style.cssText = 'margin-top: 15px; font-size: 14px; color: #555;';
        helpText.innerHTML = `
            <p>如果你的人工计算结果和上面某种模式匹配，请选择该计算模式。</p>
            <p>如需更多帮助，请手动计算几笔订单并详细记录金额，以便比对。</p>
        `;
            diagnosticContent.appendChild(helpText);
        
            // 显示弹窗
            modal.classList.add('show');
            
            hideLoading();
        }, 10);
    }
    
    // 根据不同模式计算每日利润
    function calculateDailyProfitsByMode(orders, mode) {
        const dailyData = new Map();
        
        orders.forEach(order => {
            const creationDate = normalizeDate(order['创建时间']);
            if (!creationDate) return;
            
            let income, expense, profit;
            
            switch (mode) {
                case 'truncateEach':
                    income = parseFloat(truncateTo2Decimals(parseNumber(order['店铺商品小计'])));
                    expense = parseFloat(truncateTo2Decimals(parseNumber(order['小计金额'])));
                    profit = income - expense;
                    break;
                case 'truncateProfit':
                    income = parseNumber(order['店铺商品小计']);
                    expense = parseNumber(order['小计金额']);
                    profit = parseFloat(truncateTo2Decimals(income - expense));
                    break;
                default:
                    income = parseNumber(order['店铺商品小计']);
                    expense = parseNumber(order['小计金额']);
                    profit = income - expense;
            }
            
            if (dailyData.has(creationDate)) {
                const data = dailyData.get(creationDate);
                data.orderCount += 1;
                data.totalIncome += income;
                data.totalExpense += expense;
                data.totalProfit += profit;
            } else {
                dailyData.set(creationDate, {
                    date: creationDate,
                    orderCount: 1,
                    totalIncome: income,
                    totalExpense: expense,
                    totalProfit: profit
                });
            }
        });
        
        return Array.from(dailyData.values())
            .sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                
                if (isNaN(dateA) || isNaN(dateB)) {
                    return a.date > b.date ? -1 : 1;
                }
                
                return dateB - dateA;
            });
    }
}); 