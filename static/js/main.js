document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const resultSection = document.getElementById('resultSection');
    const resultTableBody = document.getElementById('resultTableBody');
    const totalIncome = document.getElementById('totalIncome');
    const totalExpense = document.getElementById('totalExpense');
    const totalProfit = document.getElementById('totalProfit');
    
    let profitChart = null;
    
    // 获取API端点 - 本地开发或Netlify部署
    const getApiUrl = () => {
        // 检查是否在Netlify环境
        if (window.location.hostname.includes('netlify.app') || 
            window.location.hostname === 'dayprofit.tangzongzi.com') {
            return '/.netlify/functions/process';
        }
        // 本地开发环境
        return '/upload';
    };
    
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 检查文件选择
        if (!fileInput.files || fileInput.files.length === 0) {
            showError('请选择一个文件');
            return;
        }
        
        const file = fileInput.files[0];
        const allowedTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ];
        
        // 验证文件类型
        if (!allowedTypes.includes(file.type) && 
            !file.name.endsWith('.xlsx') && 
            !file.name.endsWith('.xls') && 
            !file.name.endsWith('.csv')) {
            showError('请选择有效的Excel或CSV文件');
            return;
        }
        
        // 隐藏错误和结果，显示加载指示器
        errorMessage.classList.add('d-none');
        resultSection.classList.add('d-none');
        loadingIndicator.classList.remove('d-none');
        uploadBtn.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // 发送文件到API
            const apiUrl = getApiUrl();
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            // 处理响应
            if (!response.ok) {
                throw new Error(data.error || '上传文件时出错');
            }
            
            if (data.success && data.data) {
                displayResults(data.data);
            } else {
                throw new Error('处理文件时出错');
            }
            
        } catch (error) {
            showError(error.message);
        } finally {
            loadingIndicator.classList.add('d-none');
            uploadBtn.disabled = false;
        }
    });
    
    // 显示错误信息
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('d-none');
    }
    
    // 显示计算结果
    function displayResults(data) {
        if (!data || data.length === 0) {
            showError('没有数据可以显示');
            return;
        }
        
        // 清空表格
        resultTableBody.innerHTML = '';
        
        // 计算总计
        let incomeSum = 0;
        let expenseSum = 0;
        let profitSum = 0;
        
        // 准备图表数据
        const dates = [];
        const profits = [];
        const incomes = [];
        const expenses = [];
        
        // 填充表格
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            // 日期
            const dateCell = document.createElement('td');
            dateCell.textContent = row.日期;
            tr.appendChild(dateCell);
            
            // 收入
            const incomeCell = document.createElement('td');
            incomeCell.textContent = formatCurrency(row.收入);
            tr.appendChild(incomeCell);
            
            // 支出
            const expenseCell = document.createElement('td');
            expenseCell.textContent = formatCurrency(row.支出);
            tr.appendChild(expenseCell);
            
            // 利润
            const profitCell = document.createElement('td');
            profitCell.textContent = formatCurrency(row.利润);
            profitCell.classList.add(row.利润 >= 0 ? 'positive-profit' : 'negative-profit');
            tr.appendChild(profitCell);
            
            resultTableBody.appendChild(tr);
            
            // 累加总计
            incomeSum += row.收入;
            expenseSum += row.支出;
            profitSum += row.利润;
            
            // 添加图表数据
            dates.push(row.日期);
            profits.push(row.利润);
            incomes.push(row.收入);
            expenses.push(row.支出);
        });
        
        // 设置总计
        totalIncome.textContent = formatCurrency(incomeSum);
        totalExpense.textContent = formatCurrency(expenseSum);
        totalProfit.textContent = formatCurrency(profitSum);
        totalProfit.classList.add(profitSum >= 0 ? 'positive-profit' : 'negative-profit');
        
        // 创建图表
        createChart(dates, profits, incomes, expenses);
        
        // 显示结果部分
        resultSection.classList.remove('d-none');
    }
    
    // 格式化货币
    function formatCurrency(value) {
        return new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'CNY',
            minimumFractionDigits: 2
        }).format(value);
    }
    
    // 创建利润图表
    function createChart(dates, profits, incomes, expenses) {
        const ctx = document.getElementById('profitChart').getContext('2d');
        
        // 如果图表已存在，销毁它
        if (profitChart) {
            profitChart.destroy();
        }
        
        // 创建新图表
        profitChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: '利润',
                        data: profits,
                        backgroundColor: profits.map(profit => profit >= 0 ? 'rgba(40, 167, 69, 0.7)' : 'rgba(220, 53, 69, 0.7)'),
                        borderColor: profits.map(profit => profit >= 0 ? 'rgb(40, 167, 69)' : 'rgb(220, 53, 69)'),
                        borderWidth: 1,
                        yAxisID: 'y',
                    },
                    {
                        label: '收入',
                        data: incomes,
                        type: 'line',
                        borderColor: 'rgba(13, 110, 253, 0.8)',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1',
                    },
                    {
                        label: '支出',
                        data: expenses,
                        type: 'line',
                        borderColor: 'rgba(255, 193, 7, 0.8)',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1',
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '每日利润图表',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += formatCurrency(context.raw);
                                return label;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '日期'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '利润 (元)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '收入/支出 (元)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }
}); 