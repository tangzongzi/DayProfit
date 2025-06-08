document.addEventListener('DOMContentLoaded', function() {
    // 关键DOM元素
    const fileUpload = document.getElementById('fileUpload');
    const fileName = document.getElementById('file-name');
    const resultSection = document.getElementById('result-section');
    const resultBody = document.getElementById('result-body');
    const dataSource = document.getElementById('dataSource');
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
    
    // 高级选项切换
    const advancedOptionsToggle = document.createElement('button');
    advancedOptionsToggle.textContent = '显示高级选项';
    advancedOptionsToggle.className = 'advanced-toggle';
    advancedOptionsToggle.style.cssText = 'margin-left: 10px; font-size: 12px; background: none; border: none; color: #0066cc; cursor: pointer;';
    document.querySelector('.filter-section').appendChild(advancedOptionsToggle);
    
    advancedOptionsToggle.addEventListener('click', function() {
        const advancedOptions = document.querySelector('.advanced-options');
        if (advancedOptions.style.display === 'none') {
            advancedOptions.style.display = 'block';
            this.textContent = '隐藏高级选项';
        } else {
            advancedOptions.style.display = 'none';
            this.textContent = '显示高级选项';
        }
    });
    
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
    
    // 添加数据源改变事件
    dataSource.addEventListener('change', function() {
        if (uploadedData && uploadedData.length > 0) {
            processData();
        }
        
        // 根据数据源更新计算按钮文本
        updateCalculateButtonText();
    });
    
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
        
        // 保存原始按钮文本
        const source = dataSource.value;
        calculateBtn.textContent = source === 'douyin' ? '处理中...' : '处理中...';
    }
    
    // 隐藏加载中指示器
    function hideLoading() {
        loadingIndicator.style.display = 'none';
        calculateBtn.disabled = false;
        
        // 恢复按钮文本
        updateCalculateButtonText();
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
            try {
        processData();
            hideLoading();
            } catch (error) {
                console.error('计算过程中发生错误:', error);
                alert('计算过程中发生错误，请检查数据格式是否正确！');
                hideLoading();
            }
        }, 10);
    });
    
    // 从数据设置日期范围
    function setDateRangeFromData(data) {
        if (!data || data.length === 0) return;
        
        let minDate = null;
        let maxDate = null;
        
        // 获取当前数据源
        const source = dataSource.value;
        
        // 使用 for 循环替代 forEach 以提高性能
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            
            // 根据数据源选择适当的日期字段
            let dateStr;
            if (source === 'douyin') {
                // 抖音订单优先使用结算时间
                dateStr = normalizeDate(item['结算时间'] || item['下单时间'] || item['创建时间']);
            } else {
                // 多赞订单使用创建时间
                dateStr = normalizeDate(item['创建时间']);
            }
            
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
        
        // 获取当前数据源
        const source = dataSource.value;
        
        console.log(`正在处理${source === 'douyin' ? '抖音手续费' : '多赞订单'}数据...`);
        
        // 根据数据源确定要使用的字段映射
        let fieldMapping = {};
        
        if (source === 'douyin') {
            // 抖音字段映射
            fieldMapping = {
                date: ['结算时间', '下单时间', '创建时间'],
                income: ['收入合计', '订单总价', '商品总价'],
                expense: ['支出合计', '平台服务费', '达人佣金'],
                settlement: ['结算金额'],
                feeExemption: ['免佣金额'],
                isExempted: ['是否免佣'],
                refund: ['有结算前退款', '结算前退款金额'],
                orderStatus: ['结算单类型', '订单类型']
            };
        } else {
            // 多赞字段映射
            fieldMapping = {
                date: ['创建时间'],
                income: ['店铺商品小计'],
                expense: ['小计金额'],
                orderStatus: ['采购单状态']
            };
        }
        
        // 检查上传数据中是否包含必要字段
        let hasRequiredFields = false;
        
        if (source === 'douyin') {
            // 抖音至少需要一个日期字段和收入/支出字段
            hasRequiredFields = 
                fieldMapping.date.some(field => Object.keys(uploadedData[0]).includes(field)) &&
                (fieldMapping.income.some(field => Object.keys(uploadedData[0]).includes(field)) ||
                 fieldMapping.settlement.some(field => Object.keys(uploadedData[0]).includes(field)));
        } else {
            // 多赞需要创建时间、店铺商品小计和小计金额
            hasRequiredFields = 
                Object.keys(uploadedData[0]).includes('创建时间') &&
                Object.keys(uploadedData[0]).includes('店铺商品小计') &&
                Object.keys(uploadedData[0]).includes('小计金额');
        }
        
        if (!hasRequiredFields) {
            alert(`上传的表格缺少必要字段，请确认您选择了正确的数据源（${source === 'douyin' ? '抖音' : '多赞'}）！`);
            return;
        }
        
        // 应用筛选条件
        const filteredData = filterData(uploadedData);
        
        console.log(`筛选后数据条数: ${filteredData.length}`);
        if (filteredData.length === 0) {
            console.warn('警告: 筛选后没有符合条件的数据！');
            if (source === 'douyin') {
                console.log('请检查抖音数据中是否包含结算时间/下单时间/创建时间等必要字段');
                
                // 输出上传数据的第一条记录的字段名，帮助调试
                if (uploadedData && uploadedData.length > 0) {
                    console.log('上传数据的字段列表:', Object.keys(uploadedData[0]));
                }
            }
        }
        
        // 根据数据源选择不同的计算方法
        if (source === 'douyin') {
            // 计算抖音手续费
            calculateDouyinFees(filteredData);
        } else {
            // 计算多赞订单利润
            calculateDuozhanProfits(filteredData);
        }
    }
    
    // 计算抖音手续费
    function calculateDouyinFees(orders) {
        // 创建一个Map来存储每天的数据
        const dailyData = new Map();
        
        // 使用批处理方式优化性能，每批次处理1000条记录
        const batchSize = 1000;
        let processedCount = 0;
        
        function processBatch() {
            const endIndex = Math.min(processedCount + batchSize, orders.length);
            
            for (let i = processedCount; i < endIndex; i++) {
                const order = orders[i];
                
                // 标准化日期格式，优先使用结算时间
                const creationDate = normalizeDate(
                    order['结算时间'] || order['下单时间'] || order['创建时间']
                );
                
                if (!creationDate) continue; // 跳过没有有效日期的订单
                
                // 提取关键字段
                const totalExpense = parseNumber(order['支出合计']);        // 支出合计(负值表示需支付)
                const feeExemption = parseNumber(order['免佣金额']);        // 免佣金额
                const isExempted = order['是否免佣'] === '是' || order['是否免佣'] === '是-商品卡免佣';
                const settlementAmount = parseNumber(order['结算金额']);    // 结算金额
                const incomeTotal = parseNumber(order['收入合计']);         // 收入合计
                const hasRefund = order['有结算前退款'] === '是';
                
                // 根据免佣逻辑计算实际手续费和净收益
                // 商品卡免佣是"预先减免不计入支出账单"的模式
                let actualFeeExpense; // 实际手续费支出（正值表示需支付，负值表示获得补贴）
                
                if (totalExpense < 0) {
                    // 支出为负，说明有佣金支出
                    const expenseAbs = Math.abs(totalExpense); // 理论需支付的佣金
                    actualFeeExpense = expenseAbs - feeExemption; // 实际需支付的手续费 = 理论佣金 - 免佣金额
                } else {
                    // 支出为零或正，直接使用免佣金额作为净收益
                    actualFeeExpense = -feeExemption; // 负值表示获得的补贴
                }
                
                // 计算利润 
                let profit;
                
                // 使用结算金额作为最终值(如果有效)
                if (settlementAmount !== 0) {
                    profit = settlementAmount;
                } else {
                    // 利润 = 收入合计 - 实际手续费支出
                    profit = incomeTotal - (actualFeeExpense > 0 ? actualFeeExpense : 0) + (actualFeeExpense < 0 ? Math.abs(actualFeeExpense) : 0);
                }
                
                // 汇总到对应日期
                if (dailyData.has(creationDate)) {
                    const data = dailyData.get(creationDate);
                    data.orderCount++;
                    data.totalExpenseRaw += totalExpense; // 原始支出合计（负值）
                    data.totalFeeExemption += feeExemption; // 免佣金额
                    data.actualFeeExpense += actualFeeExpense; // 实际手续费支出
                    data.totalIncome += incomeTotal;
                    data.totalProfit += profit;
                    data.refundCount += hasRefund ? 1 : 0;
                } else {
                    dailyData.set(creationDate, {
                        date: creationDate,
                        orderCount: 1,
                        totalExpenseRaw: totalExpense, // 原始支出合计（负值）
                        totalFeeExemption: feeExemption, // 免佣金额
                        actualFeeExpense: actualFeeExpense, // 实际手续费支出
                        totalIncome: incomeTotal,
                        totalProfit: profit,
                        refundCount: hasRefund ? 1 : 0
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
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    
                    if (isNaN(dateA) || isNaN(dateB)) {
                        return a.date > b.date ? -1 : 1;
                    }
                    
                    return dateB - dateA;
                });
                
                // 显示抖音手续费结果
                displayDouyinFeeResults(results);
                hideLoading();
            }
        }
        
        // 开始批处理
        showLoading();
        setTimeout(processBatch, 0);
        
        // 返回空数组，真正的结果会在批处理完成后显示
        return [];
    }
    
    // 显示抖音手续费结果
    function displayDouyinFeeResults(dailyData) {
        // 清空之前的结果
        resultBody.innerHTML = '';
        
        // 移除之前可能存在的结论区域
        const existingConclusion = document.querySelector('.fee-conclusion');
        if (existingConclusion) {
            existingConclusion.remove();
        }
        
        // 更新表头以反映抖音手续费数据
        updateTableHeader('抖音手续费');
        
        // 更新汇总信息
        totalDays.textContent = dailyData.length;
        
        let totalOrders = 0;
        let totalExpenseRaw = 0; // 原始支出合计总和（负值）
        let totalFeeExemption = 0; // 免佣金额总和
        let totalActualFeeExpense = 0; // 实际手续费支出总和
        
        // 清空并重新填充当前利润数据数组
        currentProfitData = [];
        
        // 使用文档片段减少DOM操作
        const fragment = document.createDocumentFragment();
        
        // 添加每天的手续费数据
        dailyData.forEach(day => {
            const row = document.createElement('tr');
            
            // 创建并添加日期单元格
            const dateCell = document.createElement('td');
            dateCell.textContent = day.date;
            row.appendChild(dateCell);
            
            // 添加手续费净额(利润 = 理论佣金 - 免佣金额 的相反数)
            // 当为负值时表示需要支付手续费，正值表示获得补贴
            const netFee = -day.actualFeeExpense; // 取相反数使正值表示净收益
            const netFeeCell = document.createElement('td');
            netFeeCell.textContent = truncateTo2Decimals(netFee) + ' 元';
            netFeeCell.style.color = netFee >= 0 ? '#10b981' : '#ef4444';
            netFeeCell.style.fontWeight = 'bold';
            netFeeCell.setAttribute('data-value', truncateTo2Decimals(netFee));
            row.appendChild(netFeeCell);
            
            // 添加订单数
            const countCell = document.createElement('td');
            countCell.textContent = day.orderCount;
            if (day.refundCount > 0) {
                countCell.textContent += ` (含${day.refundCount}笔退款)`;
                countCell.style.color = '#d97706';
            }
            row.appendChild(countCell);
            
            // 添加理论佣金（支出合计绝对值）
            const theoreticalFeeCell = document.createElement('td');
            const theoreticalFee = Math.abs(day.totalExpenseRaw);
            theoreticalFeeCell.textContent = truncateTo2Decimals(theoreticalFee) + ' 元';
            theoreticalFeeCell.style.color = theoreticalFee > 0 ? '#ef4444' : 'inherit';
            row.appendChild(theoreticalFeeCell);
            
            // 添加免佣金额
            const exemptionCell = document.createElement('td');
            exemptionCell.textContent = truncateTo2Decimals(day.totalFeeExemption) + ' 元';
            exemptionCell.style.color = '#10b981';
            row.appendChild(exemptionCell);
            
            // 设置行背景色
            if (netFee > 0) {
                // 净赚手续费，绿色背景
                row.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            } else if (netFee < 0) {
                // 需要支付手续费，浅红色背景
                row.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
            }
            
            // 将行添加到文档片段
            fragment.appendChild(row);
            
            // 更新汇总数据
            totalOrders += day.orderCount;
            totalExpenseRaw += day.totalExpenseRaw;
            totalFeeExemption += day.totalFeeExemption;
            totalActualFeeExpense += day.actualFeeExpense;
            
            // 将日期和利润添加到当前数据数组
            currentProfitData.push({
                date: day.date,
                profit: truncateTo2Decimals(netFee)
            });
        });
        
        // 添加汇总行
        const summaryRow = document.createElement('tr');
        summaryRow.style.fontWeight = 'bold';
        summaryRow.style.borderTop = '2px solid #e2e8f0';
        summaryRow.style.backgroundColor = '#f8fafc';
        
        // 日期列显示"总计"
        const summaryDateCell = document.createElement('td');
        summaryDateCell.textContent = '总计';
        summaryRow.appendChild(summaryDateCell);
        
        // 总净额
        const netFeeTotal = -totalActualFeeExpense; // 取相反数使正值表示净收益
        const summaryNetFeeCell = document.createElement('td');
        summaryNetFeeCell.textContent = truncateTo2Decimals(netFeeTotal) + ' 元';
        summaryNetFeeCell.style.color = netFeeTotal >= 0 ? '#10b981' : '#ef4444';
        summaryNetFeeCell.style.fontWeight = 'bold';
        summaryRow.appendChild(summaryNetFeeCell);
        
        // 总订单数
        const summaryCountCell = document.createElement('td');
        summaryCountCell.textContent = totalOrders;
        summaryRow.appendChild(summaryCountCell);
        
        // 理论佣金总额
        const summaryTheoreticalCell = document.createElement('td');
        const totalTheoreticalFee = Math.abs(totalExpenseRaw);
        summaryTheoreticalCell.textContent = truncateTo2Decimals(totalTheoreticalFee) + ' 元';
        summaryTheoreticalCell.style.color = '#ef4444';
        summaryRow.appendChild(summaryTheoreticalCell);
        
        // 总免佣金额
        const summaryExemptionCell = document.createElement('td');
        summaryExemptionCell.textContent = truncateTo2Decimals(totalFeeExemption) + ' 元';
        summaryExemptionCell.style.color = '#10b981';
        summaryRow.appendChild(summaryExemptionCell);
        
        // 添加汇总行
        fragment.appendChild(summaryRow);
        
        // 一次性将所有行添加到表格
        resultBody.appendChild(fragment);
        
        // 更新汇总显示
        totalOrders.textContent = totalOrders;
        totalProfit.textContent = truncateTo2Decimals(netFeeTotal) + ' 元';
        
        // 显示结果区域
        resultSection.classList.remove('hidden');
        
        // 如果没有数据，显示提示
        if (dailyData.length === 0) {
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
        
        // 添加手续费结论
        const conclusionDiv = document.createElement('div');
        conclusionDiv.className = 'fee-conclusion';
        conclusionDiv.style.cssText = 'margin: 20px 0; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;';
        
        // 计算实际需支付的手续费总额和获得的免佣补贴
        let actualFeePaid = 0;    // 实际需支付的金额
        let feeExemptionGain = 0; // 因免佣获得的补贴
        
        if (totalActualFeeExpense > 0) {
            // 仍需支付部分手续费
            actualFeePaid = totalActualFeeExpense;
        } else {
            // 获得补贴
            feeExemptionGain = Math.abs(totalActualFeeExpense);
        }
        
        const netResult = netFeeTotal >= 0 
            ? `<span style="color:#10b981">净收益 ${truncateTo2Decimals(netFeeTotal)} 元</span>` 
            : `<span style="color:#ef4444">净支出 ${truncateTo2Decimals(Math.abs(netFeeTotal))} 元</span>`;
        
        conclusionDiv.innerHTML = `
            <h4 style="margin-top: 0; font-size: 16px; color: #1e293b;">抖音手续费统计结果</h4>
            <p style="font-size: 15px; margin: 10px 0;">
                <b>理论需支付的佣金总额:</b> ${truncateTo2Decimals(totalTheoreticalFee)} 元
            </p>
            <p style="font-size: 15px; margin: 10px 0;">
                <b>平台减免的佣金总额:</b> ${truncateTo2Decimals(totalFeeExemption)} 元
            </p>
            ${actualFeePaid > 0 ? 
              `<p style="font-size: 15px; margin: 10px 0; color:#ef4444;">
                   <b>实际需支付的手续费:</b> ${truncateTo2Decimals(actualFeePaid)} 元
               </p>` : 
              `<p style="font-size: 15px; margin: 10px 0; color:#10b981;">
                   <b>获得的手续费补贴:</b> ${truncateTo2Decimals(feeExemptionGain)} 元
               </p>`
            }
            <p style="font-size: 16px; margin: 15px 0; font-weight: bold;">
                <b>手续费最终结果:</b> ${netResult}
            </p>
        `;
        
        // 添加到结果区域
        resultSection.appendChild(conclusionDiv);
        
        // 添加净额列复制功能
        addProfitCopyFeature();
    }
    
    // 计算多赞订单利润
    function calculateDuozhanProfits(orders) {
        // 创建一个Map来存储每天的数据
        const dailyData = new Map();
        // 获取当前计算模式
        const mode = calculationMode.value;
        
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
            
                // 计算这笔订单的利润
            let income, expense, profit;
            
                // 根据计算模式选择不同的计算逻辑
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
                
                // 显示多赞利润结果
                displayDuozhanProfitResults(results);
                hideLoading();
            }
        }
        
        // 开始批处理
        showLoading();
        setTimeout(processBatch, 0);
        
        // 返回空数组，真正的结果会在批处理完成后显示
        return [];
    }
    
    // 显示多赞利润结果
    function displayDuozhanProfitResults(dailyProfits) {
        // 清空之前的结果
        resultBody.innerHTML = '';
        
        // 移除之前可能存在的结论区域
        const existingConclusion = document.querySelector('.fee-conclusion');
        if (existingConclusion) {
            existingConclusion.remove();
        }
        
        // 更新表头以反映多赞订单数据
        updateTableHeader('多赞订单');
        
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
            
            // 利润单元格
            const profitCell = document.createElement('td');
            profitCell.textContent = truncateTo2Decimals(day.totalProfit) + ' 元';
            profitCell.setAttribute('data-value', truncateTo2Decimals(day.totalProfit));
            profitCell.style.color = day.totalProfit >= 0 ? '#10b981' : '#ef4444';
            profitCell.style.fontWeight = 'bold';
            row.appendChild(profitCell);
            
            const countCell = document.createElement('td');
            countCell.textContent = day.orderCount;
            row.appendChild(countCell);
            
            const incomeCell = document.createElement('td');
            incomeCell.textContent = truncateTo2Decimals(day.totalIncome) + ' 元';
            incomeCell.style.color = '#10b981';
            row.appendChild(incomeCell);
            
            const expenseCell = document.createElement('td');
            expenseCell.textContent = truncateTo2Decimals(day.totalExpense) + ' 元';
            expenseCell.style.color = '#ef4444';
            row.appendChild(expenseCell);
            
            // 设置行背景色
            if (day.totalProfit > 0) {
                // 盈利，绿色背景
                row.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            } else if (day.totalProfit < 0) {
                // 亏损，浅红色背景
                row.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
            }
            
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
        } else {
            // 添加多赞订单利润总结
            const conclusionDiv = document.createElement('div');
            conclusionDiv.className = 'fee-conclusion';
            conclusionDiv.style.cssText = 'margin: 20px 0; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;';
            
            const profitStyle = profitSum >= 0 ? 'color:#10b981' : 'color:#ef4444';
            
            conclusionDiv.innerHTML = `
                <h4 style="margin-top: 0; font-size: 16px; color: #1e293b;">多赞订单统计结果</h4>
                <p style="font-size: 15px; margin: 10px 0;">
                    <b>订单总数:</b> ${orderCount} 笔
                </p>
                <p style="font-size: 15px; margin: 10px 0;">
                    <b>统计天数:</b> ${dailyProfits.length} 天
                </p>
                <p style="font-size: 16px; margin: 15px 0; font-weight: bold;">
                    <b>总利润:</b> <span style="${profitStyle}">${truncateTo2Decimals(profitSum)} 元</span>
                </p>
            `;
            
            // 添加到结果区域
            resultSection.appendChild(conclusionDiv);
        }
        
        // 添加利润列复制功能
        addProfitCopyFeature();
    }
    
    // 添加利润列复制功能
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
    
    // 标准化日期格式
    function normalizeDate(dateStr) {
        // 处理多种可能的日期格式
        if (!dateStr) return '';
        
        // 对于抖音数据，可能有多种日期字段，如"结算时间"、"下单时间"、"创建时间"
        // 先检查是否包含完整的日期时间格式（例如：2023-04-15 14:30:25）
        if (dateStr.includes(' ')) {
            dateStr = dateStr.split(' ')[0]; // 取日期部分
        }
        
        // 处理"YYYY/MM/DD"格式
        if (dateStr.includes('/')) {
            dateStr = dateStr.replace(/\//g, '-');
        }
        
        // 处理"YYYY.MM.DD"格式
        if (dateStr.includes('.')) {
            dateStr = dateStr.replace(/\./g, '-');
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
    
    // 截断到小数点后两位
    function truncateTo2Decimals(num) {
        return (Math.floor(num * 100) / 100).toFixed(2);
    }
    
    // 过滤数据
    function filterData(data) {
        const startValue = startDate.value ? new Date(startDate.value) : null;
        const endValue = endDate.value ? new Date(endDate.value) : null;
        const source = dataSource.value;
        
        return data.filter(order => {
            // 根据数据源选择不同的筛选条件
            if (source === 'douyin') {
                // 抖音订单筛选逻辑
                // 这里可以添加针对抖音订单的特定筛选条件
                // 例如筛选结算单类型等，目前不做限制，保留所有抖音订单
            } else {
                // 多赞订单筛选逻辑
                if (order['采购单状态'] !== '交易成功' && 
                    order['采购单状态'] !== '待客户确认' && 
                    order['采购单状态'] !== '待发货') {
                    return false;
                }
            }
            
            // 筛选日期范围
            // 根据数据源选择适当的日期字段
            let orderDate;
            if (source === 'douyin') {
                // 抖音订单优先使用结算时间
                orderDate = normalizeDate(
                    order['结算时间'] || order['下单时间'] || order['创建时间']
                );
            } else {
                // 多赞订单使用创建时间
                orderDate = normalizeDate(order['创建时间']);
            }
            
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
        
            // 获取当前数据源
            const source = dataSource.value;
            const sourceType = source === 'douyin' ? '抖音订单' : '多赞订单';
        
        const diagnosticTitle = document.createElement('h3');
            diagnosticTitle.textContent = sourceType + '计算结果诊断';
            diagnosticContent.appendChild(diagnosticTitle);
        
        // 创建一个表格
        const table = document.createElement('table');
        table.style.width = '100%';
        
            // 应用筛选条件
            const filteredData = filterData(uploadedData);
            
            if (source === 'douyin') {
                // 抖音订单诊断
                runDouyinDiagnostics(table, filteredData, diagnosticContent);
            } else {
                // 多赞订单诊断
                runDuozhanDiagnostics(table, filteredData, diagnosticContent);
            }
            
            // 显示弹窗
            modal.classList.add('show');
            
            hideLoading();
        }, 10);
    }
    
    // 抖音订单诊断
    function runDouyinDiagnostics(table, filteredData, diagnosticContent) {
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>日期</th>
                <th>订单数</th>
                <th>支出合计</th>
                <th>免佣金额</th>
                <th>手续费净额</th>
            </tr>
        `;
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        
        // 计算抖音手续费
        let totalOrders = 0;
        let totalExpenseRaw = 0; // 原始支出合计总和（负值）
        let totalFeeExemption = 0; // 免佣金额总和
        let dailyResults = [];
        
        // 按日期分组
        const dailyData = new Map();
        
        // 处理每条订单数据
        filteredData.forEach(order => {
            // 标准化日期
            const orderDate = normalizeDate(
                order['结算时间'] || order['下单时间'] || order['创建时间']
            );
            if (!orderDate) return;
            
            // 提取关键字段
            const totalExpense = parseNumber(order['支出合计']); // 支出合计(负值)
            const feeExemption = parseNumber(order['免佣金额']); // 免佣金额
            const hasRefund = order['有结算前退款'] === '是';
            
            // 按日期分组
            if (dailyData.has(orderDate)) {
                const data = dailyData.get(orderDate);
                data.orderCount++;
                data.totalExpenseRaw += totalExpense; // 累加原始支出合计(负值)
                data.totalFeeExemption += feeExemption; // 累加免佣金额
                data.refundCount += hasRefund ? 1 : 0;
            } else {
                dailyData.set(orderDate, {
                    date: orderDate,
                    orderCount: 1,
                    totalExpenseRaw: totalExpense, // 原始支出合计(负值)
                    totalFeeExemption: feeExemption, // 免佣金额
                    refundCount: hasRefund ? 1 : 0
                });
            }
        });
        
        // 转换为数组并排序
        dailyResults = Array.from(dailyData.values()).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        });
        
        // 创建表格行
        dailyResults.forEach(day => {
            // 计算手续费净额 = 支出合计 + 免佣金额
            const netFee = day.totalExpenseRaw + day.totalFeeExemption; // 直接相加，支出合计为负值
            
            // 更新总计
            totalOrders += day.orderCount;
            totalExpenseRaw += day.totalExpenseRaw; // 累加原始支出合计(负值)
            totalFeeExemption += day.totalFeeExemption; // 累加免佣金额
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${day.date}</td>
                <td>${day.orderCount}${day.refundCount > 0 ? ` (含${day.refundCount}笔退款)` : ''}</td>
                <td>${truncateTo2Decimals(day.totalExpenseRaw)} 元</td>
                <td>${truncateTo2Decimals(day.totalFeeExemption)} 元</td>
                <td style="font-weight:bold;color:${netFee >= 0 ? '#10b981' : '#ef4444'}">
                    ${netFee >= 0 ? '+' : ''}${truncateTo2Decimals(netFee)} 元
                </td>
            `;
            
            // 设置行样式
            if (netFee > 0) {
                // 净收益，绿色背景
                row.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            } else if (netFee < 0) {
                // 净支出，浅红色背景
                row.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
            }
            
            tbody.appendChild(row);
        });
        
        // 添加汇总行
        const netFeeTotal = totalExpenseRaw + totalFeeExemption; // 计算正确的总净额
        
        const summaryRow = document.createElement('tr');
        summaryRow.style.fontWeight = 'bold';
        summaryRow.style.borderTop = '2px solid #e2e8f0';
        summaryRow.style.backgroundColor = '#f8fafc';
        summaryRow.innerHTML = `
            <td>总计</td>
            <td>${totalOrders}</td>
            <td>${truncateTo2Decimals(totalExpenseRaw)} 元</td>
            <td>${truncateTo2Decimals(totalFeeExemption)} 元</td>
            <td style="color:${netFeeTotal >= 0 ? '#10b981' : '#ef4444'}">
                ${netFeeTotal >= 0 ? '+' : ''}${truncateTo2Decimals(netFeeTotal)} 元
            </td>
        `;
        
        tbody.appendChild(summaryRow);
        table.appendChild(tbody);
        diagnosticContent.appendChild(table);
        
        // 添加简单结论
        const conclusion = document.createElement('div');
        conclusion.style.cssText = 'margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;';
        
        const netResult = netFeeTotal >= 0 
            ? `<span style="color:#10b981">净收益 ${truncateTo2Decimals(netFeeTotal)} 元</span>` 
            : `<span style="color:#ef4444">净支出 ${truncateTo2Decimals(Math.abs(netFeeTotal))} 元</span>`;
        
        conclusion.innerHTML = `
            <h4 style="margin-top: 0; font-size: 16px; color: #1e293b;">抖音手续费统计结果</h4>
            <p style="font-size: 15px; margin: 10px 0;">
                <b>实际支付的手续费总额:</b> ${truncateTo2Decimals(Math.abs(totalExpenseRaw))} 元
            </p>
            <p style="font-size: 15px; margin: 10px 0;">
                <b>获得的手续费净收益:</b> ${truncateTo2Decimals(totalFeeExemption)} 元
            </p>
            <p style="font-size: 16px; margin: 15px 0; font-weight: bold;">
                <b>手续费最终结果:</b> ${netResult}
            </p>
        `;
        
        diagnosticContent.appendChild(conclusion);
        
        // 添加简单说明
        const helpText = document.createElement('div');
        helpText.style.cssText = 'margin-top: 15px; font-size: 14px; color: #555;';
        helpText.innerHTML = `
            <p><strong>手续费计算说明：</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li><b>支出合计</b>：抖音订单支出合计，通常为负值</li>
                <li><b>免佣金额</b>：抖音免除的佣金金额</li>
                <li><b>手续费净额</b>：支出合计 + 免佣金额，正值表示整体获利，负值表示整体支出</li>
            </ul>
        `;
        
        diagnosticContent.appendChild(helpText);
    }
    
    // 多赞订单诊断
    function runDuozhanDiagnostics(table, filteredData, diagnosticContent) {
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
            <p>不同计算模式下的结果比较。如果你的人工计算结果和上面某种模式匹配，请在高级选项中选择该计算模式。</p>
            <p>如需更多帮助，请手动计算几笔订单并详细记录金额，以便比对。</p>
        `;
            diagnosticContent.appendChild(helpText);
    }
    
    // 根据不同模式计算每日利润
    function calculateDailyProfitsByMode(orders, mode) {
        const dailyData = new Map();
        const source = dataSource.value;
        
        orders.forEach(order => {
            // 根据数据源选择适当的日期字段
            let creationDate;
            if (source === 'douyin') {
                // 抖音订单尝试多个可能的日期字段
                creationDate = normalizeDate(
                    order['结算时间'] || order['下单时间'] || order['创建时间']
                );
            } else {
                // 多赞订单使用创建时间
                creationDate = normalizeDate(order['创建时间']);
            }
            
            if (!creationDate) return;
            
            let income, expense, profit;
            
            // 根据数据源和计算模式选择不同的计算逻辑
            if (source === 'douyin') {
                // 抖音订单计算逻辑
                income = parseNumber(order['店铺商品小计']);
                const douyinFee = income * 0.05;
                expense = parseNumber(order['小计金额']) + douyinFee;
                profit = income - expense;
            } else {
                // 多赞订单计算逻辑
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
    
    // 更新计算按钮文本的函数
    function updateCalculateButtonText() {
        const source = dataSource.value;
        if (source === 'douyin') {
            calculateBtn.textContent = '手续费计算';
            calculateBtn.innerHTML = '<i class="ri-calculator-line"></i> 手续费计算';
        } else {
            calculateBtn.textContent = '计算利润';
            calculateBtn.innerHTML = '<i class="ri-calculator-line"></i> 计算利润';
        }
    }
    
    // 页面加载时初始化按钮文本
    updateCalculateButtonText();

    // 根据数据源更新表头
    function updateTableHeader(dataType) {
        const headerRow = document.querySelector('#result-table thead tr');
        if (!headerRow) return;
        
        headerRow.innerHTML = '';
        
        // 添加日期列 - 减小宽度
        const dateHeader = document.createElement('th');
        dateHeader.textContent = '日期';
        dateHeader.style.width = '90px'; // 减小日期列宽度
        dateHeader.style.maxWidth = '90px'; 
        headerRow.appendChild(dateHeader);
        
        if (dataType === '抖音手续费') {
            // 抖音手续费表头
            const headers = [
                { text: '手续费净额', width: '110px' },
                { text: '订单数', width: '70px' },  // 减小订单数列宽
                { text: '理论佣金', width: '100px' },
                { text: '免佣金额', width: '100px' }
            ];
            
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header.text;
                if (header.width) {
                    th.style.width = header.width;
                    th.style.minWidth = header.width;
                }
                headerRow.appendChild(th);
            });
        } else {
            // 多赞订单表头
            const headers = [
                { text: '订单利润', width: '110px' },
                { text: '订单数', width: '70px' },  // 减小订单数列宽
                { text: '收入', width: '100px' },
                { text: '支出', width: '100px' }
            ];
            
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header.text;
                if (header.width) {
                    th.style.width = header.width;
                    th.style.minWidth = header.width;
                }
                headerRow.appendChild(th);
            });
        }
        
        // 强制应用表格布局
        setTimeout(() => {
            const table = document.getElementById('result-table');
            if (table) {
                table.style.tableLayout = 'fixed';
                table.style.width = '100%';
            }
        }, 0);
    }
}); 